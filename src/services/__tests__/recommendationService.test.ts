import { beforeEach, describe, expect, it, vi } from 'vitest';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';
import { matchesCuisine } from '../../lib/cuisineAliases';
import { filterRestaurants } from '../../lib/filter';
import { matchScore, topMatches, hasPersonalizationSignals } from '../recommendationService';
import type { DiningIntent, RecommendationContext } from '../../domain/recommendation';

beforeEach(() => {
  localStorage.clear();
});

const byId = (id: string) => restaurants.find((r) => r.id === id)!;

function ctx(intent: DiningIntent, extra: Partial<RecommendationContext> = {}): RecommendationContext {
  return { favorites: [], recentlyViewed: [], preferredCuisines: [], vegPref: 'any', intent, ...extra };
}

describe('food interest signals', () => {
  it('a Family dinners interest boosts venues with family-friendly metadata', () => {
    const family = byId('6-ballygunge-place');
    const counter = byId('kathi-junction');
    const c = ctx({}, { diningInterests: ['Family dinners'] });
    const mFamily = matchScore(family, c);
    const mCounter = matchScore(counter, c);
    expect(mFamily.reasons.some((r) => r.dimension === 'preference' && r.label.includes('Family dinners'))).toBe(true);
    expect(mCounter.reasons.some((r) => r.dimension === 'preference' && r.label.includes('Family dinners'))).toBe(false);
  });

  it('interests with no structured equivalent never invent a boost', () => {
    const c = ctx({}, { diningInterests: ['Home-style food'] });
    const reasons = matchScore(byId('6-ballygunge-place'), c).reasons;
    expect(reasons.some((r) => r.label.includes('Home-style food'))).toBe(false);
  });

  it('interests alone count as genuine personalisation signals', () => {
    expect(hasPersonalizationSignals(ctx({}, { diningInterests: ['Date nights'] }))).toBe(true);
  });
});

describe('advanced intent signals', () => {
  it('a large party rewards venues with group-friendly structured metadata', () => {
    const family = byId('6-ballygunge-place');
    const solo = byId('kathi-junction');
    const c = ctx({ partySize: '9+' });
    const mFamily = matchScore(family, c);
    const mSolo = matchScore(solo, c);
    // The signal itself: family venue earns the party dimension, the counter
    // joint does not — even though its text mentions large orders.
    expect(mFamily.reasons.some((r) => r.dimension === 'party' && r.label === 'Handles a group well')).toBe(true);
    expect(mSolo.reasons.some((r) => r.dimension === 'party')).toBe(false);
    // And it nudges the family venue's score above its own no-intent baseline.
    const baseline = matchScore(family, ctx({}));
    expect(mFamily.score).toBeGreaterThan(baseline.score);
  });

  it('delivery intent rewards venues that actually deliver', () => {
    const delivers = byId('arsalan');
    const dineOnly = byId('mocambo');
    const c = ctx({ dining: 'delivery' });
    expect(matchScore(delivers, c).reasons.some((r) => r.dimension === 'dining')).toBe(true);
    expect(matchScore(dineOnly, c).reasons.some((r) => r.dimension === 'dining')).toBe(false);
  });

  it('availability states are derived from recorded hours, never invented', () => {
    // The venue is open at 3 PM — 'open' matches, 'soon'/'later' do not.
    // Pin the clock so the assertion is time-of-day independent.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T15:00:00'));
    try {
      const c = ctx({ availability: 'open' });
      expect(matchScore(byId('arsalan'), c).reasons.some((r) => r.dimension === 'open')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('soft signals never fabricate a personal match', () => {
    const c = ctx({ partySize: '2', dining: 'delivery' });
    expect(hasPersonalizationSignals(c)).toBe(false);
  });
});

describe('intent ranking (guest)', () => {
  it('CASE 1 — ranks by structured intent without inventing a personal score', () => {
    const intent: DiningIntent = { cuisine: 'Biryani', specialty: 'Biryani', location: 'Park Street', budget: 'Mid-range', mealType: 'Dinner' };
    const ranked = topMatches(restaurants, ctx(intent), restaurants.length);

    expect(ranked[0].match.personal).toBe(false);
    // Arsalan: Biryani + Park Street + Mid-range + Dinner — the perfect intent fit.
    expect(ranked[0].restaurant.id).toBe('arsalan');

    const dims = ranked[0].match.reasons.map((r) => r.dimension);
    expect(dims).toContain('cuisine');
    expect(dims).toContain('specialty');
    expect(dims).toContain('location');
    expect(dims).toContain('meal');
  });

  it('CASE 3 — changing one selection changes the ranking logically', () => {
    const biryani = topMatches(
      restaurants,
      ctx({ cuisine: 'Biryani', specialty: 'Biryani', location: 'Park Street', budget: 'Mid-range', mealType: 'Dinner' }),
      3,
    ).map((r) => r.restaurant.id);

    const pizza = topMatches(
      restaurants,
      ctx({ cuisine: 'Italian', specialty: 'Pizza', location: 'New Town', budget: 'Mid-range', mealType: 'Dinner' }),
      3,
    ).map((r) => r.restaurant.id);

    expect(biryani[0]).toBe('arsalan');
    expect(pizza[0]).toBe('serafina');
    expect(biryani[0]).not.toBe(pizza[0]);
  });

  it('is deterministic — same inputs, same score', () => {
    const c = ctx({ cuisine: 'Biryani', specialty: 'Biryani', location: 'Park Street', budget: 'Mid-range', mealType: 'Dinner' });
    expect(matchScore(byId('arsalan'), c).score).toBe(matchScore(byId('arsalan'), c).score);
    expect(matchScore(byId('arsalan'), c).reasons).toEqual(matchScore(byId('arsalan'), c).reasons);
  });

  it('CASE 4 — a description mentioning biryani never creates a biryani specialist', () => {
    // Dada Boudi's description talks about mutton biryani, but its curated
    // intelligence marks it as a tiffin joint — it must not be surfaced as
    // a biryani pick.
    const dada = byId('dada-boudi');
    const c = ctx({ specialty: 'Biryani' });
    const m = matchScore(dada, c);

    expect(m.reasons.some((r) => r.dimension === 'specialty')).toBe(false);
    expect(matchScore(byId('arsalan'), c).score).toBeGreaterThan(m.score);
  });

  it('CASE 5 — a quiet match comes only from structured metadata, never text', () => {
    const noisy = byId('szechuan-park'); // vibes: Late-night, Nightlife
    const quiet = byId('mainland-china'); // vibes include Quiet
    const c = ctx({ vibe: 'Quiet' });

    const mNoisy = matchScore(noisy, c);
    const mQuiet = matchScore(quiet, c);

    expect(mNoisy.reasons.some((r) => r.dimension === 'vibe')).toBe(false);
    expect(mQuiet.reasons.some((r) => r.dimension === 'vibe')).toBe(true);
    expect(mQuiet.score).toBeGreaterThan(mNoisy.score);
  });

  it('CASE 6 — no profile data means no fake personal score', () => {
    const c = ctx({}, { preferredCuisines: [], preferredBudget: undefined, vegPref: 'any', favorites: [], preferredNeighbourhoods: [] });
    expect(hasPersonalizationSignals(c)).toBe(false);
    expect(matchScore(byId('trincas'), c).personal).toBe(false);
  });

  it('CASE 7 — filters refine the set without destroying ranking', () => {
    const filtered = filterRestaurants(restaurants, { cuisine: 'Biryani' });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => matchesCuisine(r, 'Biryani'))).toBe(true);

    const ranked = topMatches(filtered, ctx({ cuisine: 'Biryani', location: 'College Street', budget: 'Budget' }), filtered.length);
    expect(ranked[0].restaurant.id).toBe('shiraz-golden-restaurant');
  });

  it('meal intent matches structured occasion/specialty metadata', () => {
    const dessert = ctx({ mealType: 'Dessert' });
    expect(matchScore(byId('gulab-sweets'), dessert).reasons.some((r) => r.dimension === 'meal')).toBe(true);

    const breakfast = ctx({ mealType: 'Breakfast' });
    expect(matchScore(byId('flury-s'), breakfast).reasons.some((r) => r.dimension === 'meal')).toBe(true);
  });
});

describe('personalisation', () => {
  it('CASE 2 — a real profile turns on personal scoring and shifts the ranking', () => {
    const c = ctx(
      { cuisine: 'Biryani', location: 'Park Street', mealType: 'Dinner' },
      { preferredCuisines: ['Bengali', 'Biryani'], preferredBudget: 'Mid-range', preferredNeighbourhoods: ['Ballygunge'] },
    );

    const ranked = topMatches(restaurants, c, 6);
    expect(ranked[0].match.personal).toBe(true);
    // The Bengali + Ballygunge preference surfaces a Bengali house in the top picks.
    expect(ranked.map((r) => r.restaurant.id)).toContain('bhojohori-manna');

    // Preference reasons are generated from the same signals as the score.
    const bengali = ranked.find((r) => r.restaurant.id === 'bhojohori-manna')!.match;
    expect(bengali.reasons.some((r) => r.dimension === 'preference' && r.label.includes('Bengali'))).toBe(true);
  });

  it('explicit favourite restaurants strengthen the personal signal', () => {
    const c = ctx({}, { favorites: [byId('oh-calcutta'), byId('6-ballygunge-place')], preferredCuisines: [] });
    expect(hasPersonalizationSignals(c)).toBe(true);
    // Bengali favourites pull another Bengali house to the top.
    const ranked = topMatches(restaurants, c, 5);
    expect(ranked.map((r) => r.restaurant.id)).toContain('bhojohori-manna');
  });

  it('a vegetarian preference is enforced as a hard diet dimension', () => {
    const c = ctx({ diet: 'veg' });
    expect(matchScore(byId('havmor-dosa'), c).reasons.some((r) => r.dimension === 'diet')).toBe(true);
    expect(matchScore(byId('arsalan'), c).reasons.some((r) => r.dimension === 'diet')).toBe(false);
  });
});
