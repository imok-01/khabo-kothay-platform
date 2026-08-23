import { describe, it, expect } from 'vitest';
import type { Restaurant } from '../../types';
import { toCatalogueView, mockRestaurantRepository } from '../restaurantRepository';

function makeRestaurant(over: Partial<Restaurant> = {}): Restaurant {
  const khabo = {
    rating: 0,
    reviewCount: 0,
    reviews: [],
    photos: [],
    tags: [],
    highlights: [],
    signals: [],
    visitCount: 0,
    featured: false,
  };
  return {
    id: 'x',
    name: 'X',
    tagline: '',
    description: '',
    cuisines: [],
    mealTypes: [],
    budget: 'Mid-range',
    priceForTwo: 0,
    location: '',
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
    google: { placeId: '', mapsUri: '', rating: 0, reviewCount: 0, reviews: [], photos: [] },
    khabo,
    ...over,
  } as Restaurant;
}

const sampleReview = {
  id: 'r1',
  author: 'Member',
  rating: 4,
  date: '2026-01-01',
  comment: 'Great food',
  helpfulCount: 0,
};

describe('toCatalogueView (catalogue/detail contract)', () => {
  it('strips KK review text but preserves the reviewCount summary', () => {
    const withReviews = makeRestaurant({
      khabo: { ...makeRestaurant().khabo, reviewCount: 5, reviews: [sampleReview] },
    });
    const out = toCatalogueView(withReviews);

    expect(out.khabo.reviews).toEqual([]);
    expect(out.khabo.reviewCount).toBe(5);
    expect(out.id).toBe(withReviews.id);
  });

  it('returns the same reference when no review text is present', () => {
    const empty = makeRestaurant();
    expect(toCatalogueView(empty)).toBe(empty);
  });

  it('mock catalogue never carries review text (enforced boundary)', () => {
    const all = mockRestaurantRepository.allSync();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((r) => r.khabo.reviews.length === 0)).toBe(true);
  });
});
