import { describe, expect, it } from 'vitest';
import type { DemoUser } from '../../domain/auth';
import { deriveCompletedFields, profileCompletion, foodIdentity, computeBadges, PREFERENCE_LIMITS } from '../profile';

function makeUser(overrides: Partial<DemoUser> = {}): DemoUser {
  return {
    id: 'u1',
    name: '',
    contact: '',
    passwordHash: 'demo-sha256:abc',
    role: 'user',
    restaurantIds: [],
    createdAt: '2026-07-01',
    profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] },
    completedFields: [],
    badges: [],
    referralCode: 'TEST-CODE',
    referrals: [],
    completionRewardClaimed: false,
    ...overrides,
  };
}

describe('profileCompletion', () => {
  it('is 0% for a fresh account', () => {
    expect(profileCompletion(makeUser())).toBe(0);
  });

  it('is 100% when every field is complete', () => {
    const user = makeUser({
      name: 'Ananya',
      contact: 'ananya@example.com',
      profile: { cuisines: ['Bengali'], budget: 'Mid-range', diet: 'veg', neighbourhoods: ['Park Street'], diningInterests: ['Café hopping'] },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests'],
    });
    expect(profileCompletion(user)).toBe(100);
  });

  it('computes partial completion from actually-completed fields', () => {
    const user = makeUser({ completedFields: ['name', 'contact'] });
    // 2 of 7 fields ≈ 29%
    expect(profileCompletion(user)).toBe(29);
  });

  it('derives completed fields from the data itself, not just the stored list', () => {
    const user = makeUser({
      name: 'Rahul',
      contact: 'rahul@example.com',
      profile: { cuisines: ['Biryani'], budget: 'Budget', diet: 'any', neighbourhoods: [], diningInterests: [] },
    });
    const fields = deriveCompletedFields(user);
    expect(fields).toContain('name');
    expect(fields).toContain('contact');
    expect(fields).toContain('cuisines');
    expect(fields).toContain('budget');
    expect(fields).not.toContain('diet'); // still 'any'
    expect(fields).not.toContain('neighbourhoods');
  });
});

describe('foodIdentity', () => {
  it('summarises the user’s profile in plain language', () => {
    const user = makeUser({
      profile: {
        cuisines: ['Bengali', 'Biryani'],
        budget: 'Mid-range',
        diet: 'nonveg',
        neighbourhoods: ['Ballygunge'],
        diningInterests: ['Family dinners'],
      },
    });
    const text = foodIdentity(user);
    expect(text).toContain('Bengali');
    expect(text).toContain('mid-range');
    expect(text).toContain('non-vegetarian');
    expect(text).toContain('Ballygunge');
    expect(text).toContain('family dinners');
  });

  it('asks for input when the profile is empty', () => {
    expect(foodIdentity(makeUser())).toContain('Tell us what you like');
  });

  it('updates dynamically when preferences change', () => {
    const withBengali = makeUser({ profile: { cuisines: ['Bengali'], budget: 'Mid-range', diet: 'any', neighbourhoods: ['Park Street'], diningInterests: [] } });
    const withChinese = makeUser({ profile: { cuisines: ['Chinese'], budget: 'Mid-range', diet: 'any', neighbourhoods: ['Park Street'], diningInterests: [] } });
    expect(foodIdentity(withBengali)).toContain('Bengali');
    expect(foodIdentity(withChinese)).toContain('Chinese');
    expect(foodIdentity(withBengali)).not.toContain('Chinese');
  });

  it('drops interests from the summary when none are selected', () => {
    const user = makeUser({ profile: { cuisines: ['Bengali'], budget: 'Mid-range', diet: 'any', neighbourhoods: [], diningInterests: [] } });
    expect(foodIdentity(user)).not.toContain("You're into");
  });
});

describe('PREFERENCE_LIMITS', () => {
  it('caps selections to avoid preference overload', () => {
    expect(PREFERENCE_LIMITS.cuisines).toBe(5);
    expect(PREFERENCE_LIMITS.neighbourhoods).toBe(3);
    expect(PREFERENCE_LIMITS.interests).toBe(3);
  });
});

describe('computeBadges', () => {
  it('only awards badges backed by real data', () => {
    const none = computeBadges(makeUser(), 0);
    expect(none.map((b) => b.id)).not.toContain('badge-budget-hunter');
    expect(none.map((b) => b.id)).not.toContain('badge-first-review');

    const budgetHunter = computeBadges(makeUser({ profile: { cuisines: [], budget: 'Budget', diet: 'any', neighbourhoods: [], diningInterests: [] } }), 0);
    expect(budgetHunter.map((b) => b.id)).toContain('badge-budget-hunter');

    const reviewer = computeBadges(makeUser(), 1);
    expect(reviewer.map((b) => b.id)).toContain('badge-first-review');

    const regular = computeBadges(makeUser(), 3);
    expect(regular.map((b) => b.id)).toContain('badge-top-reviewer');
  });

  it('de-duplicates stored and computed badges', () => {
    const user = makeUser({
      badges: [{ id: 'badge-first-review', label: 'First review', description: 'Wrote a review', earnedAt: '2026-07-12' }],
    });
    const badges = computeBadges(user, 1);
    expect(badges.filter((b) => b.id === 'badge-first-review')).toHaveLength(1);
  });
});
