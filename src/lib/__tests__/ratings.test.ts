import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { formatCount, ratingSources } from '../ratings';

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'test-place',
    name: 'Test Place',
    tagline: '',
    description: '',
    cuisines: ['Biryani'],
    mealTypes: ['Lunch', 'Dinner'],
    budget: 'Mid-range',
    priceForTwo: 800,
    location: 'Park Street',
    address: '1 Park Street',
    openingHours: '12:00 PM – 11:00 PM',
    isVeg: false,
    hasDelivery: true,
    hasOutdoorSeating: false,
    isFamilyFriendly: true,
    vibes: ['Family'],
    lat: 22.5546,
    lng: 88.3494,
    signatureDishes: [],
    khabo: {
      rating: 4.6,
      reviewCount: 128,
      reviews: [],
      photos: [],
      tags: [],
      highlights: [],
      signals: [],
      visitCount: 500,
      featured: false,
    },
    ...overrides,
  };
}

describe('ratingSources', () => {
  it('returns only the Khabo Kothay rating when no Google data exists', () => {
    const rows = ratingSources(makeRestaurant());
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('khabo');
    expect(rows[0].label).toBe('Khabo Kothay');
    expect(rows[0].rating).toBe(4.6);
    expect(rows[0].reviewCount).toBe(128);
  });

  it('lists Google first when external data is present, clearly labelled', () => {
    const withGoogle = makeRestaurant({
      google: {
        placeId: 'ChIJabc123',
        mapsUri: 'https://maps.google.com/?cid=1',
        rating: 4.3,
        reviewCount: 2481,
        reviews: [],
        photos: [],
      },
    });
    const rows = ratingSources(withGoogle);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ source: 'google', label: 'Google', rating: 4.3, reviewCount: 2481 });
    expect(rows[1]).toMatchObject({ source: 'khabo', label: 'Khabo Kothay', rating: 4.6 });
  });
});

describe('formatCount', () => {
  it('keeps numbers under 1000 as-is', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(128)).toBe('128');
    expect(formatCount(999)).toBe('999');
  });

  it('compresses thousands with one decimal, dropping a trailing zero', () => {
    expect(formatCount(2481)).toBe('2.5k');
    expect(formatCount(1200)).toBe('1.2k');
    expect(formatCount(2000)).toBe('2k');
  });

  it('rounds counts of 10k and above', () => {
    expect(formatCount(12400)).toBe('12k');
    expect(formatCount(14800)).toBe('15k');
  });
});
