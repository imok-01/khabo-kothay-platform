/**
 * Tokens / rewards / coupons / referrals.
 *
 * Everything here is a demo simulation: tokens cannot be redeemed for real
 * value, coupons cannot be used in real restaurants, and referral
 * verification is simulated. The ledger model (transactions, not a bare
 * balance) is what makes the system extensible to a real rewards backend.
 *
 * Economy rules enforced by `lib/rewards.ts`:
 *  - the profile-completion reward is granted at most once (ledger check);
 *  - the first-review reward is granted at most once;
 *  - repeatable earners (favourites, new cuisines) are capped;
 *  - redemptions are blocked unless the balance covers the cost, so a token
 *    balance can never go negative.
 */

export type RewardKind = 'profile' | 'review' | 'favourite' | 'cuisine' | 'visit' | 'photo' | 'referral' | 'coupon' | 'campaign';

export interface RewardTransaction {
  id: string;
  /** Positive = earned, negative = spent/redeemed. */
  delta: number;
  reason: string;
  at: string;
  kind: RewardKind;
}

/** A reward a user can redeem from the wallet. */
export interface RewardDefinition {
  id: string;
  /** Short title, e.g. "৳100 OFF Biryani". */
  title: string;
  /** Value shown on the card, e.g. "৳100 OFF". */
  value: string;
  /** Token cost to redeem. */
  cost: number;
  /** Minimum bill the demo coupon applies to. */
  minBill: string;
  /** Where the demo coupon applies. */
  applicable: string;
  /** Validity in days from redemption. */
  validDays: number;
  description: string;
  /** Prefix for the generated demo coupon code. */
  codePrefix: string;
  /** Grouping label, e.g. "Biryani". */
  tag: string;
}

export type CouponStatus = 'available' | 'used' | 'expired';

export interface Coupon {
  id: string;
  code: string;
  title: string;
  value: string;
  description: string;
  minBill: string;
  applicable: string;
  /** ISO date the coupon stops being usable. */
  expiresAt: string;
  status: CouponStatus;
  /** When the coupon was granted. */
  grantedAt: string;
  /** ISO date it was used, when applicable. */
  usedAt?: string;
  /** Which catalogue reward produced this coupon. */
  rewardId?: string;
  /** Demo note shown next to the coupon. */
  demoNote: string;
}

export interface ReferralInvite {
  id: string;
  name: string;
  status: 'invited' | 'verified';
  rewarded: boolean;
}

/**
 * Config for token rewards — the executive admin can adjust these.
 * One-off values are enforced as one-off; repeatable values carry a cap so
 * the demo can never be farmed.
 */
export interface RewardConfig {
  /** +N once, only at 100% profile completion. */
  profileCompletion: number;
  /** +N once, only for the user's very first review. */
  review: number;
  /** +N per restaurant favourited. */
  favourite: number;
  /** Max number of favourite rewards ever granted. */
  favouriteCap: number;
  /** +N per new cuisine discovered via favourites. */
  cuisineDiscovery: number;
  /** Max number of cuisine-discovery rewards ever granted. */
  cuisineDiscoveryCap: number;
  /** +N per verified referral. */
  referralVerified: number;
  /** Future: +N per useful photo upload (not wired in the demo). */
  photo: number;
}

export const DEFAULT_REWARD_CONFIG: RewardConfig = {
  profileCompletion: 10,
  review: 20,
  favourite: 2,
  favouriteCap: 10,
  cuisineDiscovery: 5,
  cuisineDiscoveryCap: 10,
  referralVerified: 30,
  photo: 10,
};

/** Demo starting balance — enough to demonstrate several redemptions. */
export const DEMO_STARTING_BALANCE = 100;
export const DEMO_WELCOME_REASON = 'Demo welcome balance';
