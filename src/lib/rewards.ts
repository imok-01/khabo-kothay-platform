import type { Coupon, CouponStatus, ReferralInvite, RewardTransaction } from '../domain/rewards';
import { DEFAULT_REWARD_CONFIG, DEMO_STARTING_BALANCE, DEMO_WELCOME_REASON, type RewardConfig, type RewardKind } from '../domain/rewards';
import { getRewardDefinition } from '../data/rewards';
import { DEMO_USER_IDS } from '../data/demoAccounts';
import { getRewards, getUsers, resetDemoRewards, saveRewards, saveUser, tokenBalance, uid } from '../store/demoDb';

/**
 * Reward ledger operations. All token movement goes through transactions so
 * the balance is always derivable and auditable — no bare counters.
 *
 * Uniqueness/caps are enforced by scanning the ledger, never by hiding a
 * button: the UI reflects these rules, but the rules live here.
 */

/** Balance can never go below zero — earning is blocked too. */
function canAfford(userId: string, delta: number): boolean {
  return tokenBalance(userId) + delta >= 0;
}

export function grantTokens(
  userId: string,
  delta: number,
  reason: string,
  kind: RewardKind,
): RewardTransaction[] {
  const state = getRewards(userId);
  if (!canAfford(userId, delta)) return state.transactions;
  const tx: RewardTransaction = {
    id: uid('tx'),
    delta,
    reason,
    at: new Date().toISOString(),
    kind,
  };
  const next = { ...state, transactions: [tx, ...state.transactions] };
  saveRewards(userId, next);
  return next.transactions;
}

function hasTransaction(userId: string, kind: RewardKind): boolean {
  return getRewards(userId).transactions.some((t) => t.kind === kind);
}

function countTransactions(userId: string, kind: RewardKind): number {
  return getRewards(userId).transactions.filter((t) => t.kind === kind).length;
}

/**
 * Profile-completion reward: +10 exactly once per user, enforced against the
 * ledger. Repeatedly opening/editing/saving the profile can never re-grant.
 */
export function grantProfileCompletionReward(
  userId: string,
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): { granted: boolean; transactions: RewardTransaction[] } {
  if (hasTransaction(userId, 'profile')) {
    return { granted: false, transactions: getRewards(userId).transactions };
  }
  const transactions = grantTokens(userId, config.profileCompletion, 'Profile completed', 'profile');
  return { granted: true, transactions };
}

/** First useful review: +20 exactly once per user. */
export function grantFirstReviewReward(
  userId: string,
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): { granted: boolean; transactions: RewardTransaction[] } {
  if (hasTransaction(userId, 'review')) {
    return { granted: false, transactions: getRewards(userId).transactions };
  }
  const transactions = grantTokens(userId, config.review, 'First useful review', 'review');
  return { granted: true, transactions };
}

/** Favourite reward: +2 per favourite, capped so unfavourite/refavourite can't farm. */
export function grantFavouriteReward(
  userId: string,
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): { granted: boolean; transactions: RewardTransaction[] } {
  if (countTransactions(userId, 'favourite') >= config.favouriteCap) {
    return { granted: false, transactions: getRewards(userId).transactions };
  }
  const transactions = grantTokens(userId, config.favourite, 'Favourited a restaurant', 'favourite');
  return { granted: true, transactions };
}

/**
 * New-cuisine discovery: +5 the first time a cuisine is explored (via
 * favourites), capped so a cuisine can never pay twice.
 */
export function grantCuisineDiscovery(
  userId: string,
  cuisines: string[],
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): { granted: boolean; transactions: RewardTransaction[] } {
  const state = getRewards(userId);
  const fresh = cuisines.filter((c) => !state.discoveredCuisines.includes(c));
  if (fresh.length === 0) return { granted: false, transactions: state.transactions };
  const allowed = fresh.slice(0, config.cuisineDiscoveryCap - state.discoveredCuisines.length);
  if (allowed.length === 0) return { granted: false, transactions: state.transactions };
  const next: typeof state = {
    ...state,
    discoveredCuisines: [...state.discoveredCuisines, ...allowed],
  };
  saveRewards(userId, next);
  const txs: RewardTransaction[] = [];
  for (const c of allowed) {
    txs.push({
      id: uid('tx'),
      delta: config.cuisineDiscovery,
      reason: `Explored a new cuisine — ${c}`,
      at: new Date().toISOString(),
      kind: 'cuisine',
    });
  }
  const all = [...txs, ...next.transactions];
  saveRewards(userId, { ...next, transactions: all });
  return { granted: true, transactions: all };
}

/* ------------------------------------------------------------------ */
/* Redemption                                                          */
/* ------------------------------------------------------------------ */

export interface RedemptionResult {
  ok: boolean;
  error?: 'insufficient' | 'already-redeemed' | 'unknown-reward';
  need?: number;
  coupon?: Coupon;
  transactions: RewardTransaction[];
}

function couponCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${rand}`;
}

/**
 * Redeem a catalogue reward. Guards, in order:
 *  1. the reward must exist;
 *  2. it must not already be redeemed (one coupon per reward);
 *  3. the balance must cover the cost — never deduct otherwise.
 */
export function redeemReward(
  userId: string,
  rewardId: string,
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): RedemptionResult {
  void config;
  const def = getRewardDefinition(rewardId);
  if (!def) return { ok: false, error: 'unknown-reward', transactions: getRewards(userId).transactions };

  const state = getRewards(userId);
  if (state.coupons.some((c) => c.rewardId === rewardId)) {
    return { ok: false, error: 'already-redeemed', transactions: state.transactions };
  }

  const balance = tokenBalance(userId);
  if (balance < def.cost) {
    return { ok: false, error: 'insufficient', need: def.cost - balance, transactions: state.transactions };
  }

  const grantedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + def.validDays * 24 * 60 * 60 * 1000).toISOString();
  const coupon: Coupon = {
    id: uid('coup'),
    code: couponCode(def.codePrefix),
    title: def.title,
    value: def.value,
    description: def.description,
    minBill: def.minBill,
    applicable: def.applicable,
    expiresAt,
    status: 'available',
    grantedAt,
    rewardId: def.id,
    demoNote: 'Demo coupon — not redeemable in real restaurants.',
  };
  const tx: RewardTransaction = {
    id: uid('tx'),
    delta: -def.cost,
    reason: `Redeemed ${def.title}`,
    at: grantedAt,
    kind: 'coupon',
  };
  saveRewards(userId, { ...state, coupons: [coupon, ...state.coupons], transactions: [tx, ...state.transactions] });
  return { ok: true, coupon, transactions: getRewards(userId).transactions };
}

/** Demo action: mark an available coupon as used (no token change). */
export function markCouponUsed(userId: string, couponId: string): Coupon[] {
  const state = getRewards(userId);
  const coupons = state.coupons.map((c) =>
    c.id === couponId && c.status === 'available'
      ? { ...c, status: 'used' as const, usedAt: new Date().toISOString() }
      : c,
  );
  saveRewards(userId, { ...state, coupons });
  return coupons;
}

/** Effective status — expires available coupons when their date has passed. */
export function effectiveCouponStatus(coupon: Coupon, now = new Date()): CouponStatus {
  if (coupon.status === 'used') return 'used';
  if (new Date(coupon.expiresAt).getTime() < now.getTime()) return 'expired';
  return coupon.status;
}

/* ------------------------------------------------------------------ */
/* Referrals                                                            */
/* ------------------------------------------------------------------ */

export function inviteFriend(userId: string, name: string): ReferralInvite[] {
  const state = getRewards(userId);
  const invite: ReferralInvite = { id: uid('ref'), name, status: 'invited', rewarded: false };
  const referrals = [invite, ...state.referrals];
  saveRewards(userId, { ...state, referrals });
  return referrals;
}

/**
 * Demo-only verification: marks an invite as verified and grants the referral
 * reward once per successful referral. No OTP service exists — this is a
 * simulated step, clearly labelled.
 */
export function verifyInvite(
  userId: string,
  inviteId: string,
  config: RewardConfig = DEFAULT_REWARD_CONFIG,
): { referrals: ReferralInvite[]; transactions: RewardTransaction[] } {
  const state = getRewards(userId);
  const invite = state.referrals.find((r) => r.id === inviteId);
  if (!invite || invite.status === 'verified' || invite.rewarded) return { referrals: state.referrals, transactions: state.transactions };
  const referrals = state.referrals.map((r) => (r.id === inviteId ? { ...r, status: 'verified' as const, rewarded: true } : r));
  const tx: RewardTransaction = {
    id: uid('tx'),
    delta: config.referralVerified,
    reason: `Referral reward — ${invite.name} verified`,
    at: new Date().toISOString(),
    kind: 'referral',
  };
  const transactions = [tx, ...state.transactions];
  saveRewards(userId, { ...state, referrals, transactions });
  return { referrals, transactions };
}

/* ------------------------------------------------------------------ */
/* Demo wallet                                                         */
/* ------------------------------------------------------------------ */

export function isDemoUser(userId: string): boolean {
  return DEMO_USER_IDS.includes(userId);
}

/**
 * Demo-only wallet reset: restores the seeded starting balance and clears
 * reward/coupon state so a flow can be demonstrated again. Only available for
 * seeded demo accounts — never for hypothetical production users. Referrals
 * are preserved.
 */
export function resetDemoWallet(userId: string): RewardTransaction[] {
  if (!isDemoUser(userId)) return getRewards(userId).transactions;
  // Preserve referral invitations — the reset only touches reward/coupon state.
  const referrals = getRewards(userId).referrals;
  resetDemoRewards(userId);
  saveRewards(userId, { transactions: [], coupons: [], referrals, discoveredCuisines: [] });
  // A demo reset is an explicit re-demonstration: the profile-completion
  // reward becomes claimable again (still ledger-guarded — exactly once per
  // wallet, never without a reset).
  const user = getUsers().byId[userId];
  if (user) saveUser({ ...user, completionRewardClaimed: false });
  return grantTokens(userId, DEMO_STARTING_BALANCE, DEMO_WELCOME_REASON, 'campaign');
}

/** Ensure a demo account has its seeded starting balance (idempotent). */
export function ensureDemoStartingBalance(userId: string): void {
  if (!isDemoUser(userId)) return;
  const state = getRewards(userId);
  const hasWelcome = state.transactions.some((t) => t.reason === DEMO_WELCOME_REASON);
  if (hasWelcome) return;
  const balance = tokenBalance(userId);
  if (balance < 0) {
    // Repair corrupted demo state: wipe and reseed instead of leaving a
    // negative balance visible.
    resetDemoRewards(userId);
    grantTokens(userId, DEMO_STARTING_BALANCE, DEMO_WELCOME_REASON, 'campaign');
    return;
  }
  grantTokens(userId, DEMO_STARTING_BALANCE, DEMO_WELCOME_REASON, 'campaign');
}
