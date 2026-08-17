import { beforeEach, describe, expect, it } from 'vitest';
import {
  grantProfileCompletionReward,
  grantFirstReviewReward,
  grantFavouriteReward,
  grantCuisineDiscovery,
  redeemReward,
  resetDemoWallet,
  ensureDemoStartingBalance,
  isDemoUser,
  markCouponUsed,
  effectiveCouponStatus,
} from '../rewards';
import { getRewards, resetDemoRewards, saveRewards, tokenBalance } from '../../store/demoDb';
import { DEMO_STARTING_BALANCE } from '../../domain/rewards';
import type { Coupon } from '../../domain/rewards';

function inviteForReset(userId: string) {
  const state = getRewards(userId);
  const refs = [...state.referrals, { id: 'ref-x', name: 'Test Friend', status: 'invited' as const, rewarded: false }];
  saveRewards(userId, { ...state, referrals: refs });
}

const DEMO_ID = 'user-ananya';
const NON_DEMO_ID = 'user-created-in-app';

function freshWallet(userId: string) {
  resetDemoRewards(userId);
  ensureDemoStartingBalance(userId);
}

describe('token economy', () => {
  beforeEach(() => {
    freshWallet(DEMO_ID);
    resetDemoRewards(NON_DEMO_ID);
  });

  it('seeds demo accounts with a starting balance', () => {
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE);
  });

  it('does not double-seed the welcome balance', () => {
    ensureDemoStartingBalance(DEMO_ID);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE);
  });

  it('grants the profile-completion reward exactly once', () => {
    const first = grantProfileCompletionReward(DEMO_ID);
    expect(first.granted).toBe(true);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 10);

    // Repeated attempts (edits, re-claims, re-renders) never re-grant.
    const second = grantProfileCompletionReward(DEMO_ID);
    const third = grantProfileCompletionReward(DEMO_ID);
    expect(second.granted).toBe(false);
    expect(third.granted).toBe(false);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 10);

    const profileTxs = getRewards(DEMO_ID).transactions.filter((t) => t.kind === 'profile');
    expect(profileTxs).toHaveLength(1);
  });

  it('grants the first-review reward exactly once', () => {
    grantFirstReviewReward(DEMO_ID);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 20);
    grantFirstReviewReward(DEMO_ID);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 20);
  });

  it('caps the favourite reward', () => {
    for (let i = 0; i < 12; i += 1) grantFavouriteReward(DEMO_ID);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 10 * 2);
  });

  it('pays a new-cuisine reward only once per cuisine', () => {
    grantCuisineDiscovery(DEMO_ID, ['Bengali', 'Biryani']);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 10);
    grantCuisineDiscovery(DEMO_ID, ['Bengali']);
    grantCuisineDiscovery(DEMO_ID, ['Biryani']);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE + 10);
  });

  it('blocks redemption without sufficient balance and never deducts', () => {
    const res = redeemReward(NON_DEMO_ID, 'family'); // costs 150, balance 0
    expect(res.ok).toBe(false);
    expect(res.error).toBe('insufficient');
    expect(tokenBalance(NON_DEMO_ID)).toBe(0);
    expect(getRewards(NON_DEMO_ID).coupons).toHaveLength(0);
    // Balance can never go negative.
    expect(tokenBalance(NON_DEMO_ID)).toBeGreaterThanOrEqual(0);
  });

  it('redeems a reward, deducts exactly the cost, and creates a coupon', () => {
    const before = tokenBalance(DEMO_ID);
    const res = redeemReward(DEMO_ID, 'welcome'); // costs 40
    expect(res.ok).toBe(true);
    expect(res.coupon).toBeDefined();
    expect(res.coupon?.rewardId).toBe('welcome');
    expect(tokenBalance(DEMO_ID)).toBe(before - 40);
    expect(getRewards(DEMO_ID).coupons).toHaveLength(1);
  });

  it('never allows a duplicate redemption of the same reward', () => {
    redeemReward(DEMO_ID, 'welcome');
    const second = redeemReward(DEMO_ID, 'welcome');
    expect(second.ok).toBe(false);
    expect(second.error).toBe('already-redeemed');
    expect(getRewards(DEMO_ID).coupons.filter((c) => c.rewardId === 'welcome')).toHaveLength(1);
  });

  it('reports how many more tokens are needed when blocked', () => {
    const res = redeemReward(NON_DEMO_ID, 'biryani'); // 80 tokens, balance 0
    expect(res.need).toBe(80);
  });

  it('marks coupons as used without touching the balance', () => {
    const res = redeemReward(DEMO_ID, 'welcome');
    const before = tokenBalance(DEMO_ID);
    markCouponUsed(DEMO_ID, res.coupon!.id);
    expect(tokenBalance(DEMO_ID)).toBe(before);
    expect(effectiveCouponStatus(getRewards(DEMO_ID).coupons[0])).toBe('used');
  });

  it('expires coupons past their validity window', () => {
    const expired: Coupon = {
      id: 'c1',
      code: 'KK-OLD',
      title: 'Old',
      value: '₹10',
      description: '',
      minBill: '₹1',
      applicable: 'Nowhere',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      status: 'available',
      grantedAt: new Date(Date.now() - 86400000).toISOString(),
      demoNote: '',
    };
    expect(effectiveCouponStatus(expired)).toBe('expired');
  });

  it('resets a demo wallet back to the starting balance', () => {
    grantProfileCompletionReward(DEMO_ID);
    redeemReward(DEMO_ID, 'welcome');
    inviteForReset(DEMO_ID);
    const txs = resetDemoWallet(DEMO_ID);
    expect(tokenBalance(DEMO_ID)).toBe(DEMO_STARTING_BALANCE);
    expect(txs.some((t) => t.reason === 'Demo welcome balance')).toBe(true);
    expect(getRewards(DEMO_ID).coupons).toHaveLength(0);
    // Referrals are preserved — only reward/coupon state is reset.
    expect(getRewards(DEMO_ID).referrals).toHaveLength(1);
  });

  it('never resets a non-demo wallet', () => {
    resetDemoRewards(NON_DEMO_ID);
    const txs = resetDemoWallet(NON_DEMO_ID);
    expect(tokenBalance(NON_DEMO_ID)).toBe(0);
    expect(txs).toHaveLength(0);
    expect(isDemoUser(NON_DEMO_ID)).toBe(false);
  });
});
