import { beforeEach, describe, expect, it } from 'vitest';
import { getEffectiveIntelligence, deriveIntelligence, attachIntelligence, attachIntelligenceToAll } from '../intelligence';
import { getSuggestions, saveSuggestions, upsertSuggestion, resolveSuggestion } from '../../store/demoDb';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';
import type { IntelligenceSuggestion } from '../../domain/intelligence';
import type { Restaurant } from '../../types';

beforeEach(() => {
  localStorage.clear();
});

function suggestion(partial: Partial<IntelligenceSuggestion>): IntelligenceSuggestion {
  return {
    id: 's-1',
    restaurantId: 'arsalan',
    field: 'specialties',
    add: [],
    remove: [],
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe('getEffectiveIntelligence', () => {
  it('returns the curated seed baseline for every restaurant', () => {
    for (const r of restaurants) {
      const eff = getEffectiveIntelligence(r.id);
      expect(eff.provenance).toBe('seed');
      // curated restaurants all have at least one specialty & occasion
      expect(eff.specialties.length).toBeGreaterThan(0);
      expect(eff.bestFor.length).toBeGreaterThan(0);
    }
  });

  it('ignores pending and rejected suggestions — only approved ones count', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'] }));
    upsertSuggestion(suggestion({ id: 's-2', add: ['Desserts'], status: 'rejected' }));

    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).not.toContain('Fine dining');
    expect(eff.specialties).not.toContain('Desserts');
    expect(eff.provenance).toBe('seed');
  });

  it('applies approved additions on top of the seed', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).toContain('Biryani'); // seed preserved
    expect(eff.specialties).toContain('Fine dining'); // approved add
    expect(eff.provenance).toBe('suggested');
  });

  it('applies approved removals', () => {
    upsertSuggestion(suggestion({ remove: ['Kebab'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties).not.toContain('Kebab');
    expect(eff.specialties).toContain('Biryani');
  });

  it('does not duplicate an addition that already exists in the seed', () => {
    upsertSuggestion(suggestion({ add: ['Biryani'], status: 'approved', resolvedAt: new Date().toISOString() }));
    const eff = getEffectiveIntelligence('arsalan');
    expect(eff.specialties.filter((s) => s === 'Biryani')).toHaveLength(1);
  });

  it('resolveSuggestion transitions pending → approved and the merge reacts live', () => {
    upsertSuggestion(suggestion({ add: ['Fine dining'] }));
    expect(getEffectiveIntelligence('arsalan').specialties).not.toContain('Fine dining');
    resolveSuggestion('s-1', 'approved');
    expect(getEffectiveIntelligence('arsalan').specialties).toContain('Fine dining');
  });
});

describe('attachIntelligence', () => {
  it('populates the intelligence field on restaurant objects', () => {
    const arsalan = restaurants.find((r) => r.id === 'arsalan')!;
    const attached = attachIntelligence(arsalan);
    expect(attached.intelligence?.specialties).toContain('Biryani');
  });

  it('attachIntelligenceToAll covers every restaurant', () => {
    const all = attachIntelligenceToAll(restaurants);
    expect(all.every((r) => r.intelligence)).toBe(true);
    expect(getSuggestions()).toEqual([]);
    expect(saveSuggestions).toBeDefined();
  });
});

describe('deriveIntelligence', () => {
  const base: Restaurant = {
    id: 'derived-fixture',
    name: 'Derived Fixture',
    tagline: '',
    description: '',
    cuisines: [],
    mealTypes: [],
    budget: 'Mid-range',
    priceForTwo: 0,
    location: 'Banani',
    address: '',
    openingHours: '',
    isVeg: false,
    vegUnknown: true,
    hasDelivery: false,
    hasOutdoorSeating: false,
    isFamilyFriendly: false,
    vibes: [],
    lat: 0,
    lng: 0,
    signatureDishes: [],
    google: { placeId: 'p', mapsUri: '', rating: 0, reviewCount: 0, reviews: [], photos: [] },
    khabo: { rating: 0, reviewCount: 0, reviews: [], photos: [], tags: [], highlights: [], signals: [], visitCount: 0, featured: false },
  };

  it('maps verified cuisines/mealTypes/signatureDishes into controlled vocabulary terms', () => {
    const eff = deriveIntelligence({
      ...base,
      cuisines: ['South Indian', 'Pizza'],
      mealTypes: ['Breakfast', 'Lunch'],
      signatureDishes: ['Mysore Masala Dosa', 'Chicken Biryani', 'Fried Prawns'],
      hasDelivery: true,
      isFamilyFriendly: true,
    });
    expect(eff.specialties).toContain('Pizza'); // cuisine
    expect(eff.specialties).toContain('Breakfast'); // mealType
    expect(eff.specialties).toContain('Dosa'); // dish token
    expect(eff.specialties).toContain('Biryani'); // dish token
    expect(eff.specialties).toContain('Seafood'); // prawns token
    expect(eff.specialties).not.toContain('Rolls'); // nothing claimed
    expect(eff.bestFor).toEqual(['Breakfast', 'Lunch']);
    expect(eff.diningFeatures).toContain('Delivery');
    expect(eff.diningFeatures).toContain('Family friendly');
    expect(eff.diningFeatures).not.toContain('Outdoor seating');
    expect(eff.provenance).toBe('derived');
  });

  it('never invents claims for unmatched attributes', () => {
    const eff = deriveIntelligence({
      ...base,
      cuisines: ['Bangladeshi'],
      mealTypes: ['Dinner'],
      signatureDishes: ['Grilled Chicken', 'Mixed Vegetable Curry & Rice'],
    });
    expect(eff.specialties).toContain('Curry'); // explicit dish token
    expect(eff.specialties).not.toContain('Bangladeshi');
    expect(eff.bestFor).toEqual(['Dinner', 'Late night']);
    expect(eff.foodCharacteristics).toEqual([]);
  });

  it('returns an all-empty object when there is nothing verified to derive', () => {
    const eff = deriveIntelligence(base);
    expect(eff.specialties).toEqual([]);
    expect(eff.bestFor).toEqual([]);
    expect(eff.foodCharacteristics).toEqual([]);
    expect(eff.diningFeatures).toEqual([]);
    expect(eff.provenance).toBe('derived');
  });
});

describe('getEffectiveIntelligence with a Restaurant object', () => {
  it('falls back to verified derivation for venues without a curated seed', () => {
    const dhaka: Restaurant = {
      id: 'dhaka-venue',
      name: 'Dhaka Venue',
      tagline: '',
      description: '',
      cuisines: ['Seafood'],
      mealTypes: ['Dessert'],
      budget: 'Mid-range' as const,
      priceForTwo: 0,
      location: 'Gulshan',
      address: '',
      openingHours: '',
      isVeg: false,
      vegUnknown: true,
      hasDelivery: false,
      hasOutdoorSeating: false,
      isFamilyFriendly: false,
      vibes: [],
      lat: 0,
      lng: 0,
      signatureDishes: ['Shahi Saffron Firni'],
      google: { placeId: 'p', mapsUri: '', rating: 4.6, reviewCount: 900, reviews: [], photos: [] },
      khabo: { rating: 0, reviewCount: 0, reviews: [], photos: [], tags: [], highlights: [], signals: [], visitCount: 0, featured: false },
    };
    const eff = getEffectiveIntelligence(dhaka);
    expect(eff.specialties).toContain('Seafood');
    expect(eff.specialties).toContain('Desserts');
    expect(eff.foodCharacteristics).toContain('Dessert-focused');
    expect(eff.provenance).toBe('derived');
  });

  it('keeps the curated seed authoritative when one exists', () => {
    const arsalan = restaurants.find((r) => r.id === 'arsalan')!;
    const eff = getEffectiveIntelligence(arsalan);
    expect(eff.provenance).toBe('seed');
    expect(eff.specialties).toContain('Biryani');
  });
});
