import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import { selectRestaurantPhotos } from '../photos';

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'arsalan', // a real demo entry so the demo-image fallback resolves
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

describe('selectRestaurantPhotos', () => {
  it('falls back to demo imagery with an honest source label', () => {
    const sel = selectRestaurantPhotos(makeRestaurant(), 'card');
    expect(sel.leadSource).toBe('demo');
    expect(sel.photos.length).toBeGreaterThan(0);
    expect(sel.photos[0].provider).toBe('unsplash');
  });

  it('prefers Khabo Kothay community photos over demo imagery', () => {
    const withKhabo = makeRestaurant({
      khabo: {
        rating: 4.6,
        reviewCount: 128,
        reviews: [],
        photos: [{ id: 'p1', url: 'https://cdn.example.com/photo.jpg', author: 'Ananya' }],
        tags: [],
        highlights: [],
        signals: [],
        visitCount: 500,
        featured: false,
      },
    });
    const sel = selectRestaurantPhotos(withKhabo, 'card');
    expect(sel.leadSource).toBe('khabo');
    expect(sel.photos[0].provider).toBe('khabo');
    expect(sel.photos[0].imageUrl).toBe('https://cdn.example.com/photo.jpg');
  });

  it('prioritises Google photos and never mixes demo placeholders alongside them', () => {
    const withGoogle = makeRestaurant({
      google: {
        placeId: 'ChIJabc123',
        mapsUri: 'https://maps.google.com/?cid=1',
        rating: 4.3,
        reviewCount: 2481,
        reviews: [],
        photos: [{ photoRef: 'ref-1' }, { photoRef: 'ref-2' }],
      },
    });
    const sel = selectRestaurantPhotos(withGoogle, 'gallery');
    expect(sel.leadSource).toBe('google-photos');
    expect(sel.photos.every((p) => p.provider === 'google-photos')).toBe(true);
    expect(sel.photos[0].photoRef).toBe('ref-1');
    // Google photos resolve via the Places Photo API — no static URL baked in.
    expect(sel.photos[0].imageUrl).toBe('');
    expect(sel.photos[0].attribution).toBe('Photos from Google Maps');
  });

  it('returns a single lead photo for cards', () => {
    const sel = selectRestaurantPhotos(makeRestaurant(), 'card');
    expect(sel.photos).toHaveLength(1);
  });
});
