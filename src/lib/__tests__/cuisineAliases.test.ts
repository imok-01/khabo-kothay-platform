import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { CUISINE_ALIASES, matchesCuisine } from '../cuisineAliases';

function venue(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'test-venue',
    name: 'Test Venue',
    tagline: '',
    description: '',
    cuisines: [],
    mealTypes: ['Lunch', 'Dinner'],
    budget: 'Mid-range',
    priceForTwo: 0,
    location: 'Gulshan',
    address: 'House 12',
    openingHours: '12:00 PM – 10:30 PM',
    isVeg: false,
    hasDelivery: false,
    hasOutdoorSeating: false,
    isFamilyFriendly: false,
    vibes: [],
    lat: 23.79,
    lng: 90.4,
    signatureDishes: [],
    khabo: {
      rating: 0,
      reviewCount: 0,
      reviews: [],
      photos: [],
      tags: [],
      highlights: [],
      signals: [],
      visitCount: 0,
      featured: false,
    },
    ...overrides,
  };
}

describe('CUISINE_ALIASES', () => {
  it('only aliases terms that need a bridge (not direct database cuisines)', () => {
    expect(CUISINE_ALIASES['Bengali']).toBeUndefined();
    expect(CUISINE_ALIASES['Chinese']).toBeUndefined();
    expect(CUISINE_ALIASES['Biryani']).toBeDefined();
  });
});

describe('matchesCuisine', () => {
  it('matches the direct cuisine value first', () => {
    const r = venue({ cuisines: ['Italian'] });
    expect(matchesCuisine(r, 'Italian')).toBe(true);
  });

  it('bridges Biryani through a literal signature dish', () => {
    const r = venue({ cuisines: ['Bangladeshi'], signatureDishes: ['Khashir Kacchi Biryani (Plain)'] });
    expect(matchesCuisine(r, 'Biryani')).toBe(true);
  });

  it('bridges North Indian through the Indian cuisine tag', () => {
    const r = venue({ cuisines: ['Indian'] });
    expect(matchesCuisine(r, 'North Indian')).toBe(true);
  });

  it('bridges South Indian through dosa tokens', () => {
    const r = venue({ cuisines: ['Bengali'], signatureDishes: ['Masala Dosa'] });
    expect(matchesCuisine(r, 'South Indian')).toBe(true);
  });

  it('bridges Street Food through Fast Food venues', () => {
    const r = venue({ cuisines: ['Fast Food'] });
    expect(matchesCuisine(r, 'Street Food')).toBe(true);
  });

  it('bridges Dessert through the Dessert meal type', () => {
    const r = venue({ cuisines: ['Italian'], mealTypes: ['Dessert'] });
    expect(matchesCuisine(r, 'Dessert')).toBe(true);
  });

  it('does not match when neither the cuisine nor any alias fits', () => {
    const r = venue({ cuisines: ['Bangladeshi'], signatureDishes: ['Shorshe Ilish'] });
    expect(matchesCuisine(r, 'Lebanese')).toBe(false);
    expect(matchesCuisine(r, 'Continental')).toBe(false);
  });
});