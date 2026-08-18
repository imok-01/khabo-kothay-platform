import { describe, expect, it } from 'vitest';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';
import type { Restaurant } from '../../types';
import { filterRestaurants, uncoveredFilters } from '../filter';

const bhojohori = restaurants.find((r) => r.id === 'bhojohori-manna')!;
const shiraz = restaurants.find((r) => r.id === 'shiraz-golden-restaurant')!;
const balaji = restaurants.find((r) => r.id === 'havmor-dosa')!;

function withEstimate(
  r: Restaurant,
  estimate: NonNullable<Restaurant['menuEstimate']>,
): Restaurant {
  return { ...r, priceForTwo: 0, menuEstimate: estimate };
}

describe('filterRestaurants', () => {
  it('returns everything with no criteria', () => {
    expect(filterRestaurants(restaurants, {})).toHaveLength(restaurants.length);
  });

  it('filters by location', () => {
    const result = filterRestaurants(restaurants, { location: 'Park Street' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.location === 'Park Street')).toBe(true);
  });

  it('filters by budget', () => {
    const result = filterRestaurants(restaurants, { budget: 'Budget' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.budget === 'Budget')).toBe(true);
  });

  it('filters by cuisine', () => {
    const result = filterRestaurants(restaurants, { cuisine: 'Bengali' });
    expect(result.some((r) => r.id === bhojohori.id)).toBe(true);
    expect(result.every((r) => r.cuisines.includes('Bengali'))).toBe(true);
  });

  it('filters by meal type', () => {
    const result = filterRestaurants(restaurants, { mealType: 'Dessert' });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.mealTypes.includes('Dessert'))).toBe(true);
  });

  it('filters to pure veg when vegOnly is set', () => {
    const result = filterRestaurants(restaurants, { vegOnly: true });
    expect(result.every((r) => r.isVeg)).toBe(true);
    expect(result.map((r) => r.id)).toContain(balaji.id);
  });

  it('matches the query against names and signature dishes', () => {
    expect(filterRestaurants(restaurants, { query: 'kathi roll' }).map((r) => r.id)).toContain('kathi-junction');
    expect(filterRestaurants(restaurants, { query: 'Bhojohori' }).map((r) => r.id)).toContain(bhojohori.id);
  });

  it('is case-insensitive and trims the query', () => {
    expect(filterRestaurants(restaurants, { query: '  BIRYANI ' }).some((r) => r.id === shiraz.id)).toBe(true);
  });

  it('combines multiple criteria (AND)', () => {
    const result = filterRestaurants(restaurants, { location: 'Park Street', budget: 'Mid-range' });
    expect(result.every((r) => r.location === 'Park Street' && r.budget === 'Mid-range')).toBe(true);
  });

  it('supports the open-now filter against an injected clock', () => {
    const at = new Date(2026, 6, 15, 15, 0); // 3 PM
    const open = filterRestaurants(restaurants, { openNow: true }, at);
    // open at 3 PM: Coffee House (9 AM – 8 PM) is, kathi roll stand (4 PM – 11 PM) isn't
    expect(open.some((r) => r.id === 'park-hotel-coffee-house')).toBe(true);
    expect(open.some((r) => r.id === 'kathi-junction')).toBe(false);
    expect(open.some((r) => r.id === 'izakaya')).toBe(false); // opens 6 PM
  });

  it('caps by cost for two', () => {
    const result = filterRestaurants(restaurants, { maxPriceForTwo: 500 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.priceForTwo <= 500)).toBe(true);
    // Arsalan (₹800) is out, Coffee House (₹150) is in
    expect(result.some((r) => r.id === 'arsalan')).toBe(false);
    expect(result.some((r) => r.id === 'park-hotel-coffee-house')).toBe(true);
  });

  it('filters by outdoor seating and delivery', () => {
    const outdoor = filterRestaurants(restaurants, { outdoorSeating: true });
    expect(outdoor.every((r) => r.hasOutdoorSeating)).toBe(true);
    const delivery = filterRestaurants(restaurants, { delivery: true });
    expect(delivery.every((r) => r.hasDelivery)).toBe(true);
  });

  it('filters to non-veg when nonVegOnly is set', () => {
    const result = filterRestaurants(restaurants, { nonVegOnly: true });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => !r.isVeg)).toBe(true);
    expect(result.some((r) => r.id === 'arsalan')).toBe(true);
  });

  it('filters by vibe', () => {
    const dateNight = filterRestaurants(restaurants, { vibe: 'Date night' });
    expect(dateNight.length).toBeGreaterThan(0);
    expect(dateNight.every((r) => r.vibes.includes('Date night'))).toBe(true);
    expect(dateNight.some((r) => r.id === 'zaranj')).toBe(true);
  });

  it('combines price cap with amenity criteria (AND)', () => {
    const result = filterRestaurants(restaurants, { delivery: true, maxPriceForTwo: 500 });
    expect(result.every((r) => r.hasDelivery && r.priceForTwo <= 500)).toBe(true);
  });

  it('matches the budget filter from a menu estimate when there is no curated price', () => {
    // median 450 → per person 450 → Mid-range (estimated).
    const venue = withEstimate(bhojohori, { low: 900, high: 1080, median: 450, itemCount: 6, confidence: 'medium' });
    const result = filterRestaurants([venue], { budget: 'Mid-range' });
    expect(result.map((r) => r.id)).toEqual([bhojohori.id]);
    // The same venue must NOT match another tier.
    expect(filterRestaurants([venue], { budget: 'Premium' })).toHaveLength(0);
  });

  it('matches a price cap from a menu estimate when there is no curated price', () => {
    // estimate base (low) 900 → matches "Under ৳1000", misses "Under ৳500".
    const venue = withEstimate(bhojohori, { low: 900, high: 1080, median: 450, itemCount: 6, confidence: 'medium' });
    expect(filterRestaurants([venue], { maxPriceForTwo: 1000 })).toHaveLength(1);
    expect(filterRestaurants([venue], { maxPriceForTwo: 500 })).toHaveLength(0);
  });

  it('never claims a tier or a price cap for a venue with no price signal at all', () => {
    const unpriced = { ...bhojohori, priceForTwo: 0, menuEstimate: undefined };
    expect(filterRestaurants([unpriced], { budget: 'Budget' })).toHaveLength(0);
    expect(filterRestaurants([unpriced], { maxPriceForTwo: 50000 })).toHaveLength(0);
  });

  it('filters by structured family-friendly metadata', () => {
    const result = filterRestaurants(restaurants, { familyFriendly: true });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.isFamilyFriendly)).toBe(true);
  });

  it('filters by the structured Quiet vibe — never description text', () => {
    const result = filterRestaurants(restaurants, { quiet: true });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.vibes.includes('Quiet'))).toBe(true);
  });

  it('filters availability: open now / opening soon / open later from hours', () => {
    const open = filterRestaurants(restaurants, { availability: 'open' });
    expect(open.every((r) => r.openingHours !== '')).toBe(true);
    // All three states together should be a strict partition of parseable venues.
    const soon = filterRestaurants(restaurants, { availability: 'soon' });
    const later = filterRestaurants(restaurants, { availability: 'later' });
    expect(open.length + soon.length + later.length).toBeLessThanOrEqual(restaurants.length);
  });

  it('applies the distance cap only when an origin is provided', () => {
    const origin = { lat: restaurants[0].lat, lng: restaurants[0].lng };
    const capped = filterRestaurants(restaurants, { withinKm: 1, origin });
    expect(capped.length).toBeGreaterThan(0);
    expect(capped.length).toBeLessThan(restaurants.length);
    // Without an origin the cap is inert — never a false negative.
    expect(filterRestaurants(restaurants, { withinKm: 1 })).toHaveLength(restaurants.length);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterRestaurants(restaurants, { query: 'zzzz-no-such-restaurant' })).toHaveLength(0);
  });
});

describe('uncoveredFilters', () => {
  it('flags a cuisine filter that matches nothing', () => {
    expect(uncoveredFilters(restaurants, { cuisine: 'Fusion-Salad' })).toEqual(['Cuisine: Fusion-Salad']);
  });

  it('does not flag a filter the catalogue supports', () => {
    // The fixture contains delivery venues (e.g. Bhojohori Manna).
    expect(uncoveredFilters(restaurants, { delivery: true })).toEqual([]);
  });

  it('flags a vibe with no matching venue', () => {
    expect(uncoveredFilters(restaurants, { vibe: 'Skydiving' })).toEqual(['Vibe: Skydiving']);
  });

  it('returns nothing when every individual filter is supported', () => {
    // Budget and the price cap each match venues on their own, so neither is
    // "uncovered" — an empty result here would be a combination problem.
    expect(uncoveredFilters(restaurants, { budget: 'Budget', maxPriceForTwo: 300 })).toEqual([]);
  });
});
