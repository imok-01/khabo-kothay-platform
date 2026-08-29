import { describe, expect, it } from 'vitest';
import type { DemoUser } from '../../domain/auth';
import { deriveCompletedFields, profileCompletion, foodIdentity, computeBadges, PREFERENCE_LIMITS, PROFILE_FIELDS } from '../profile';

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
      profile: {
        cuisines: ['Bengali'], budget: 'Mid-range', diet: 'veg', neighbourhoods: ['Park Street'],
        diningInterests: ['Café hopping'], spice: 'medium', mealTimes: ['Dinner'], travel: 'city',
      },
      completedFields: ['name', 'contact', 'cuisines', 'budget', 'neighbourhoods', 'diet', 'interests', 'spice', 'mealTimes', 'travel'],
    });
    expect(profileCompletion(user)).toBe(100);
  });

  it('computes partial completion from actually-completed fields', () => {
    const user = makeUser({ completedFields: ['name', 'contact'] });
    // 2 of 10 fields
    expect(profileCompletion(user)).toBe(20);
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

  /**
   * The three questions that took the profile from 7 fields to 10. Each is
   * optional on `UserPreferences`, which is what lets every profile stored
   * before them stay valid — so the thing worth asserting is that absence
   * reads as unanswered rather than as an answer.
   */
  it('treats the three newer questions as unanswered while they are absent', () => {
    const fields = deriveCompletedFields(makeUser({ name: 'Rahul' }));
    expect(fields).not.toContain('spice');
    expect(fields).not.toContain('mealTimes');
    expect(fields).not.toContain('travel');
  });

  it('counts spice, meal times and travel range once they are set', () => {
    const user = makeUser({
      profile: {
        cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [],
        spice: 'hot', mealTimes: ['Dinner', 'Late-night bites'], travel: 'walk',
      },
    });
    const fields = deriveCompletedFields(user);
    expect(fields).toContain('spice');
    expect(fields).toContain('mealTimes');
    expect(fields).toContain('travel');
    // An empty array is not an answer, unlike a present-but-empty field.
    expect(deriveCompletedFields(makeUser({ profile: { ...user.profile, mealTimes: [] } }))).not.toContain('mealTimes');
  });

  it('asks ten questions, and every one of them is answerable', () => {
    // The meter is `answered / PROFILE_FIELDS.length`, so a field with no way
    // to answer it would cap the profile below 100% forever — which is the
    // shape of the `diet: 'any'` trap, and the reason the three new fields
    // use absence rather than a neutral value for "not answered".
    expect(PROFILE_FIELDS).toHaveLength(10);
    expect(new Set(PROFILE_FIELDS.map((f) => f.key)).size).toBe(10);
  });

  /**
   * Completion is not a ratchet. Deriving used to start from the stored
   * `completedFields` and only add, so a field stayed "answered" after its last
   * value was removed — and since ProfilePage writes the derived list back on
   * every save, the stale entry outlived the data. A question the diner can see
   * is empty has to read as unanswered.
   */
  it('un-answers a field whose values have been removed', () => {
    const user = makeUser({
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [], mealTimes: [] },
      completedFields: ['cuisines', 'budget', 'neighbourhoods', 'interests', 'spice', 'mealTimes', 'travel'],
    });
    expect(deriveCompletedFields(user)).toEqual([]);
  });

  it('keeps a recorded diet answer, because “any” cannot be told from unasked', () => {
    const recorded = makeUser({ profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] }, completedFields: ['diet'] });
    expect(deriveCompletedFields(recorded)).toContain('diet');

    const neverAsked = makeUser({ profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] } });
    expect(deriveCompletedFields(neverAsked)).not.toContain('diet');
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

  /**
   * Spice, meal times and travel range are stored but deliberately not wired
   * into recommendation scoring, so this sentence is the one consequence the
   * profile page is allowed to promise for them. That makes it behaviour worth
   * pinning rather than incidental copy.
   */
  it('spells the three newer answers back as prose', () => {
    const text = foodIdentity(makeUser({
      profile: {
        cuisines: ['Bengali'], budget: 'Mid-range', diet: 'any', neighbourhoods: [], diningInterests: [],
        spice: 'hot', mealTimes: ['Dinner', 'Late-night bites'], travel: 'city',
      },
    }));
    expect(text).toContain('proper heat');
    // An English list, not a join(', ') — and lowercased mid-sentence.
    expect(text).toContain('dinner and late-night bites');
    expect(text).toContain('cross the city');
  });

  it('says nothing about heat, hours or distance while they are unanswered', () => {
    const text = foodIdentity(makeUser({ profile: { cuisines: ['Bengali'], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [] } }));
    expect(text).toContain('Bengali');
    expect(text).not.toContain('heat');
    expect(text).not.toContain('eat out at');
    expect(text).not.toContain('walking distance');
  });

  it('still speaks when the rhythm answers are the only ones given', () => {
    // No cuisines/budget/diet means the first sentence is empty, so the
    // rhythm clause has to open the paragraph and stay grammatical.
    const text = foodIdentity(makeUser({
      profile: { cuisines: [], budget: undefined, diet: 'any', neighbourhoods: [], diningInterests: [], travel: 'walk' },
    }));
    expect(text).toContain('You would rather it was walking distance');
    expect(text).toContain('Tell us what you like');
    expect(text).not.toContain('You usually prefer');
  });
});

describe('PREFERENCE_LIMITS', () => {
  it('caps selections to avoid preference overload', () => {
    expect(PREFERENCE_LIMITS.cuisines).toBe(5);
    expect(PREFERENCE_LIMITS.neighbourhoods).toBe(3);
    expect(PREFERENCE_LIMITS.interests).toBe(3);
    expect(PREFERENCE_LIMITS.mealTimes).toBe(3);
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

  it('awards Heat Seeker only at full heat', () => {
    const base = { cuisines: [], budget: undefined, diet: 'any' as const, neighbourhoods: [], diningInterests: [] };
    const hot = computeBadges(makeUser({ profile: { ...base, spice: 'hot' } }), 0);
    expect(hot.map((b) => b.id)).toContain('badge-heat-seeker');

    const medium = computeBadges(makeUser({ profile: { ...base, spice: 'medium' } }), 0);
    expect(medium.map((b) => b.id)).not.toContain('badge-heat-seeker');
  });

  it('treats any of the three newer answers as enough to start exploring', () => {
    // badge-food-explorer is the "you have told us something" badge, so each
    // new question has to count towards it or answering one would look ignored.
    const base = { cuisines: [], budget: undefined, diet: 'any' as const, neighbourhoods: [], diningInterests: [] };
    for (const profile of [
      { ...base, spice: 'mild' as const },
      { ...base, mealTimes: ['Lunch'] },
      { ...base, travel: 'area' as const },
    ]) {
      expect(computeBadges(makeUser({ profile }), 0).map((b) => b.id)).toContain('badge-food-explorer');
    }
  });
});
