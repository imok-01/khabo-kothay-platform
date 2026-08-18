import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { budgetDisplay, budgetSymbol, budgetTier, budgetTierForPerPerson, costForTwoValue, priceForTwoDisplay } from '../priceDisplay';

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

describe('priceForTwoDisplay', () => {
  it('labels a curated price as verified, not estimated', () => {
    const display = priceForTwoDisplay(venue({ priceForTwo: 1800 }));
    expect(display.kind).toBe('verified');
    expect(display.label).toBe('৳1,800 for two');
    expect(display.priceForTwo).toBe(1800);
    expect(display.estimate).toBeUndefined();
  });

  it('falls back to the menu-derived estimate when no curated price exists', () => {
    const display = priceForTwoDisplay(
      venue({ menuEstimate: { low: 800, high: 1200, median: 500, itemCount: 6, confidence: 'medium' } }),
    );
    expect(display.kind).toBe('estimated');
    expect(display.label).toBe('৳800 – ৳1,200 estimated for two');
    expect(display.estimate?.itemCount).toBe(6);
  });

  it('never claims an estimate is verified', () => {
    const display = priceForTwoDisplay(
      venue({ menuEstimate: { low: 800, high: 1200, median: 500, itemCount: 6, confidence: 'medium' } }),
    );
    expect(display.kind).not.toBe('verified');
    expect(display.label).toMatch(/estimated for two$/);
  });

  it('says not listed only when there is neither a price nor a menu estimate', () => {
    const display = priceForTwoDisplay(venue());
    expect(display.kind).toBe('notListed');
    expect(display.label).toBe('Price not listed');
  });

  it('keeps a curated price of zero from being presented as a price', () => {
    const display = priceForTwoDisplay(venue({ priceForTwo: 0, menuEstimate: undefined }));
    expect(display.kind).toBe('notListed');
  });
});

describe('budgetTierForPerPerson', () => {
  it('maps the approved per-person ranges', () => {
    expect(budgetTierForPerPerson(199)).toBe('Budget');
    expect(budgetTierForPerPerson(200)).toBe('Mid-range');
    expect(budgetTierForPerPerson(499)).toBe('Mid-range');
    expect(budgetTierForPerPerson(500)).toBe('Premium');
    expect(budgetTierForPerPerson(999)).toBe('Premium');
    expect(budgetTierForPerPerson(1000)).toBe('Luxury');
  });
});

describe('budgetSymbol', () => {
  it('repeats the currency symbol per tier', () => {
    expect(budgetSymbol('Budget')).toBe('৳');
    expect(budgetSymbol('Mid-range')).toBe('৳৳');
    expect(budgetSymbol('Premium')).toBe('৳৳৳');
    expect(budgetSymbol('Luxury')).toBe('৳৳৳৳');
  });
});

describe('budgetTier', () => {
  it('uses the curated budget tier when a verified price exists', () => {
    expect(budgetTier(venue({ priceForTwo: 1800, budget: 'Premium' }))).toBe('Premium');
  });

  it('derives the tier from the menu estimate median when there is no verified price', () => {
    // median 450 → per person 450 → Mid-range.
    expect(budgetTier(venue({ menuEstimate: { low: 900, high: 1080, median: 450, itemCount: 6, confidence: 'medium' } }))).toBe('Mid-range');
  });

  it('is undefined when there is no price signal at all', () => {
    expect(budgetTier(venue())).toBeUndefined();
  });
});

describe('budgetDisplay', () => {
  it('labels a curated budget as verified with the approved per-person range', () => {
    const display = budgetDisplay(venue({ priceForTwo: 900, budget: 'Mid-range' }));
    expect(display.kind).toBe('verified');
    expect(display.label).toBe('৳৳ Mid-range');
    expect(display.sub).toBe('৳200 – 500 / person');
  });

  it('labels a menu-estimated budget with (estimated) and never says verified', () => {
    const display = budgetDisplay(venue({ menuEstimate: { low: 1080, high: 1296, median: 540, itemCount: 8, confidence: 'medium' } }));
    expect(display.kind).toBe('estimated');
    expect(display.label).toBe('৳৳৳ Premium (estimated)');
    expect(display.sub).toContain('estimated from menu prices');
    expect(display.label).not.toContain('verified');
  });

  it('falls back to not listed when there is neither a price nor a menu estimate', () => {
    const display = budgetDisplay(venue());
    expect(display.kind).toBe('notListed');
    expect(display.label).toBe('Not listed');
    expect(display.sub).toBe('No verified price data yet');
  });
});

describe('costForTwoValue', () => {
  it('uses the curated price when present', () => {
    expect(costForTwoValue(venue({ priceForTwo: 1800 }))).toBe(1800);
  });

  it('uses the menu estimate base when there is no curated price', () => {
    expect(costForTwoValue(venue({ menuEstimate: { low: 900, high: 1080, median: 450, itemCount: 6, confidence: 'medium' } }))).toBe(900);
  });

  it('is undefined when there is no price signal', () => {
    expect(costForTwoValue(venue())).toBeUndefined();
  });
});