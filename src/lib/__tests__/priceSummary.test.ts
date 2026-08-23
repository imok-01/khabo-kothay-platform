import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import type { Menu, MenuItem } from '../../domain/menu';
import { priceSummary } from '../priceDisplay';

function venue(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'r1',
    name: 'Pizzaburg Gulshan',
    tagline: '',
    description: '',
    cuisines: ['Pizza'],
    mealTypes: ['Lunch'],
    budget: 'Mid-range',
    priceForTwo: 0,
    location: 'Gulshan',
    address: '',
    openingHours: '',
    isVeg: false,
    hasDelivery: false,
    hasOutdoorSeating: false,
    isFamilyFriendly: false,
    vibes: [],
    lat: 0,
    lng: 0,
    signatureDishes: [],
    khabo: { rating: 0, reviewCount: 0, reviews: [], photos: [], tags: [], highlights: [], signals: [], visitCount: 0, featured: false },
    ...overrides,
  };
}

function dish(price: number): MenuItem {
  return {
    id: `d${price}`,
    name: `Dish ${price}`,
    price,
    available: true,
    source: 'restaurant',
    lastUpdated: '2026-01-01',
    priceHistory: [],
  };
}

const mainMenu: Menu = {
  restaurantId: 'r1',
  updatedAt: '2026-01-01',
  categories: [
    { id: 'c1', name: 'Mains', order: 0, dishes: [dish(480), dish(500), dish(500), dish(520), dish(530), dish(550)] },
  ],
};

describe('priceSummary', () => {
  it('uses the verified curated price for two when no menu estimate exists', () => {
    const s = priceSummary(venue({ priceForTwo: 1800, budget: 'Mid-range' }));
    expect(s.kind).toBe('verified');
    expect(s.spendLabel).toBe('About ৳1,800 for two (approx., no drinks)');
    // A single value must never become a fake range.
    expect(s.perPersonLabel).toBeUndefined();
    expect(s.evidence).toContain('confirm the current menu');
  });

  it('prefers a menu-derived estimate with sufficient confidence and shows a real per-person range', () => {
    const s = priceSummary(venue({ priceForTwo: 1800, budget: 'Mid-range' }), mainMenu);
    expect(s.kind).toBe('estimated');
    expect(s.spendLabel).toMatch(/estimated from menu prices$/);
    expect(s.perPersonLabel).toBeDefined();
    expect(s.perPersonLabel).toMatch(/per person$/);
    expect(s.evidence).toContain('not a verified total');
  });

  it('never labels an estimate as verified', () => {
    const s = priceSummary(venue({ budget: 'Mid-range' }), mainMenu);
    expect(s.kind).not.toBe('verified');
    expect(s.kind).toBe('estimated');
  });

  it('shows the honest fallback when there is no price signal', () => {
    const s = priceSummary(venue());
    expect(s.kind).toBe('notListed');
    expect(s.spendLabel).toBe('Price not listed yet');
    expect(s.perPersonLabel).toBeUndefined();
    expect(s.evidence).toContain('still recording');
  });

  it('ignores a low-confidence menu estimate and falls through to the verified price', () => {
    const s = priceSummary(
      venue({
        priceForTwo: 1800,
        menuEstimate: { low: 800, high: 1200, median: 500, itemCount: 2, confidence: 'low' },
      }),
    );
    expect(s.kind).not.toBe('estimated');
    expect(s.kind).toBe('verified');
    expect(s.spendLabel).toBe('About ৳1,800 for two (approx., no drinks)');
    expect(s.perPersonLabel).toBeUndefined();
  });

  it('ignores a low-confidence menu estimate with no verified price and shows not listed', () => {
    const s = priceSummary(
      venue({ menuEstimate: { low: 800, high: 1200, median: 500, itemCount: 2, confidence: 'low' } }),
    );
    expect(s.kind).toBe('notListed');
  });

  it('always surfaces the budget tier even when the spend expectation is estimated or missing', () => {
    expect(priceSummary(venue({ priceForTwo: 1800, budget: 'Premium' }), mainMenu).tierLabel).toBe('৳৳৳ Premium');
    expect(priceSummary(venue({ budget: 'Mid-range' })).tierLabel).toBe('Not listed');
  });
});
