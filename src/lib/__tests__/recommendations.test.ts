import { describe, expect, it } from 'vitest';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';
import { distanceKm } from '../geo';
import {
  recommendForUser,
  recommendSimilar,
  similarityScore,
  sortRestaurants,
  surprisePick,
} from '../recommendations';

const bhojohori = restaurants.find((r) => r.id === 'bhojohori-manna')!; // Bengali, Seafood, Ballygunge
const ohCalcutta = restaurants.find((r) => r.id === 'oh-calcutta')!; // Bengali, Seafood, Ballygunge
const shiraz = restaurants.find((r) => r.id === 'shiraz-golden-restaurant')!; // Biryani, College Street
const balaji = restaurants.find((r) => r.id === 'havmor-dosa')!; // South Indian, Budget

describe('similarityScore', () => {
  it('scores identical-cuisine same-area venues higher than unrelated ones', () => {
    const near = similarityScore(bhojohori, ohCalcutta);
    const far = similarityScore(bhojohori, balaji);
    expect(near).toBeGreaterThan(far);
  });

  it('is symmetric', () => {
    expect(similarityScore(bhojohori, shiraz)).toBeCloseTo(similarityScore(shiraz, bhojohori));
  });

  it('returns zero for the same restaurant', () => {
    expect(similarityScore(bhojohori, bhojohori)).toBe(0);
  });
});

describe('recommendSimilar', () => {
  it('never includes the source restaurant', () => {
    const recs = recommendSimilar(bhojohori, 4, restaurants);
    expect(recs.some((r) => r.id === bhojohori.id)).toBe(false);
  });

  it('ranks the most similar restaurant first', () => {
    const recs = recommendSimilar(bhojohori, 4, restaurants);
    // 6 Ballygunge Place shares cuisines, neighbourhood and meals with
    // Bhojohori Manna and carries a marginally higher rating, so it wins
    // over Oh! Calcutta (which is one budget tier more expensive).
    expect(recs[0].id).toBe('6-ballygunge-place');
    expect(recs.slice(0, 3).map((r) => r.id)).toContain(ohCalcutta.id);
  });

  it('respects the requested count', () => {
    expect(recommendSimilar(bhojohori, 3, restaurants)).toHaveLength(3);
  });
});

describe('recommendForUser', () => {
  it('falls back to popular picks when there are no favourites', () => {
    const recs = recommendForUser([], 5, restaurants);
    expect(recs).toHaveLength(5);
    // most popular venue by rating × log(reviews) should come first
    expect(recs[0].id).toBe('arsalan');
  });

  it('excludes the user\'s favourites from the results', () => {
    const recs = recommendForUser([balaji.id], 10, restaurants);
    expect(recs.some((r) => r.id === balaji.id)).toBe(false);
  });

  it('prefers venues similar to the favourites', () => {
    const recs = recommendForUser([ohCalcutta.id], 5, restaurants);
    // 6 Ballygunge Place shares cuisines, neighbourhood AND budget tier with
    // Oh! Calcutta, so it outranks Bhojohori Manna (same food, cheaper tier).
    expect(recs[0].id).toBe('6-ballygunge-place');
    expect(recs.slice(0, 3).map((r) => r.id)).toContain(bhojohori.id);
  });
});

describe('sortRestaurants', () => {
  it('sorts by price ascending / descending', () => {
    const low = sortRestaurants(restaurants, 'price-low');
    expect(low[0].priceForTwo).toBeLessThanOrEqual(low[1].priceForTwo);
    const high = sortRestaurants(restaurants, 'price-high');
    expect(high[0].priceForTwo).toBeGreaterThanOrEqual(high[1].priceForTwo);
  });

  it('sorts by rating with review-count tie-break', () => {
    const rated = sortRestaurants(restaurants, 'rating');
    expect(rated[0].khabo.rating).toBeGreaterThanOrEqual(rated[1].khabo.rating);
  });

  it('sorts by distance from a reference point', () => {
    const nearParkStreet = { lat: 22.5546, lng: 88.3494 };
    const sorted = sortRestaurants(restaurants, 'distance', nearParkStreet);
    expect(sorted[0].location).toBe('Park Street');
    // every venue is at least as far as the previous one
    for (let i = 1; i < sorted.length; i++) {
      const d1 = distanceKm(nearParkStreet, sorted[i - 1]);
      const d2 = distanceKm(nearParkStreet, sorted[i]);
      expect(d2).toBeGreaterThanOrEqual(d1);
    }
  });

  it('sorts by popularity (review count)', () => {
    const sorted = sortRestaurants(restaurants, 'popularity');
    expect(sorted[0].id).toBe('arsalan'); // 5210 reviews
    expect(sorted[0].khabo.reviewCount).toBeGreaterThanOrEqual(sorted[1].khabo.reviewCount);
  });

  it('does not mutate the input list', () => {
    const copy = [...restaurants];
    sortRestaurants(restaurants, 'price-low');
    expect(restaurants).toEqual(copy);
  });
});

describe('surprisePick', () => {
  it('returns a valid, decently rated restaurant from the pool', () => {
    const pick = surprisePick(restaurants);
    expect(restaurants.some((r) => r.id === pick.id)).toBe(true);
    expect(pick.khabo.rating).toBeGreaterThanOrEqual(4.0);
  });
});
