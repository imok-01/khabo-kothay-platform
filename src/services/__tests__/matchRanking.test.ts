import { describe, expect, it } from 'vitest';
// The real catalogue, not a fixture: the property under test is about ordering a
// list of 200-odd venues, and a five-row fixture cannot exhibit the sort
// behaviour that matters.
import { restaurants } from '../../data/restaurants';
import { matchScore, hasPersonalizationSignals } from '../recommendationService';
import type { DiningIntent, RecommendationContext } from '../../domain/recommendation';

/**
 * Ranking by a precomputed score must order the list exactly as ranking by a
 * freshly-computed one.
 *
 * Explore used to call `matchScore` from inside its sort comparator. A
 * comparator runs O(n log n) times, so ordering 206 venues asked for roughly
 * 1,600 scores to place 206 of them — and the cards then computed all 206 again
 * for their reasons. It now scores each venue once into a map and both the order
 * and the reasons read from that.
 *
 * That substitution is only safe because `matchScore` is pure over
 * `(restaurant, context)`. This asserts the property rather than trusting it: if
 * a future signal makes the score depend on call order, on a clock, or on
 * anything else outside its two arguments, the two orderings diverge here
 * instead of quietly reshuffling the results page.
 */

function ctx(intent: DiningIntent, extra: Partial<RecommendationContext> = {}): RecommendationContext {
  return { favorites: [], recentlyViewed: [], preferredCuisines: [], vegPref: 'any', intent, ...extra };
}

const CONTEXTS: Array<[string, RecommendationContext]> = [
  ['a free-text craving', ctx({ query: 'best biryani in banani' })],
  ['a cuisine and budget intent', ctx({ cuisine: 'Thai', budget: 'Mid-range', mealType: 'Dinner' })],
  ['a vibe with preferences', ctx({ vibe: 'Date night' }, { preferredCuisines: ['Italian'], preferredBudget: 'Premium' })],
  ['interests only', ctx({}, { diningInterests: ['Family dinners', 'Café hopping'] })],
];

describe('memoised match ranking', () => {
  it('scores every venue exactly once for a full-catalogue ranking', () => {
    const c = CONTEXTS[0][1];
    let calls = 0;
    const scores = new Map<string, number>();
    for (const r of restaurants) {
      calls += 1;
      scores.set(r.id, matchScore(r, c).score);
    }
    expect(calls).toBe(restaurants.length);
    // The comparator it replaced would have run this many times instead.
    expect(restaurants.length * Math.log2(restaurants.length)).toBeGreaterThan(restaurants.length * 5);
  });

  for (const [label, c] of CONTEXTS) {
    it(`orders identically to a comparator that recomputes — ${label}`, () => {
      expect(hasPersonalizationSignals(c) || Object.keys(c.intent ?? {}).length > 0).toBe(true);

      const recomputed = [...restaurants].sort((a, b) => matchScore(b, c).score - matchScore(a, c).score);

      const scores = new Map<string, number>();
      for (const r of restaurants) scores.set(r.id, matchScore(r, c).score);
      const memoised = [...restaurants].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

      expect(memoised.map((r) => r.id)).toEqual(recomputed.map((r) => r.id));
    });
  }

  it('returns the same score for a venue however many times it is asked', () => {
    const c = CONTEXTS[1][1];
    for (const r of restaurants.slice(0, 40)) {
      const first = matchScore(r, c);
      const second = matchScore(r, c);
      expect(second.score).toBe(first.score);
      expect(second.reasons.map((x) => x.label)).toEqual(first.reasons.map((x) => x.label));
    }
  });
});
