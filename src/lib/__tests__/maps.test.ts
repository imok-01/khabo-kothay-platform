import { describe, expect, it } from 'vitest';
import type { Restaurant } from '../../types';
import {
  googleMapsDirectionsUrl,
  googleMapsEmbedUrl,
  googleMapsPlaceUrl,
  googleMapsReviewsUrl,
  googleMapsSearchUrl,
} from '../maps';

const base: Restaurant = {
  id: 'arsalan',
  name: 'Arsalan',
  tagline: '',
  description: '',
  cuisines: ['Biryani'],
  mealTypes: ['Lunch', 'Dinner'],
  budget: 'Premium',
  priceForTwo: 800,
  location: 'Park Street',
  address: '23 Park Street, Kolkata 700016',
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
    rating: 4.5,
    reviewCount: 100,
    reviews: [],
    photos: [],
    tags: [],
    highlights: [],
    signals: [],
    visitCount: 0,
    featured: true,
  },
};

describe('googleMapsPlaceUrl', () => {
  it('uses coordinates when no Place ID is available', () => {
    expect(googleMapsPlaceUrl(base)).toContain('query=22.5546%2C88.3494');
    expect(googleMapsPlaceUrl(base)).toContain('maps/search');
  });

  it('prefers the Google Place ID when present', () => {
    const withPlace = {
      ...base,
      google: {
        placeId: 'ChIJabc123',
        mapsUri: '',
        rating: 4.4,
        reviewCount: 2000,
        reviews: [],
        photos: [],
      },
    };
    const url = googleMapsPlaceUrl(withPlace);
    expect(url).toContain('query_place_id=ChIJabc123');
    expect(url).toContain('query=Arsalan');
  });
});

describe('googleMapsDirectionsUrl', () => {
  it('points at the destination coordinates without an origin', () => {
    const url = googleMapsDirectionsUrl(base);
    expect(url).toContain('api=1');
    expect(url).toContain('destination=22.5546%2C88.3494');
    expect(url).not.toContain('origin=');
  });

  it('adds the user origin only when provided', () => {
    const url = googleMapsDirectionsUrl(base, { lat: 22.52, lng: 88.36 });
    expect(url).toContain('origin=22.52%2C88.36');
  });

  it('uses destination_place_id when the restaurant has one', () => {
    const url = googleMapsDirectionsUrl({
      ...base,
      google: {
        placeId: 'ChIJabc123',
        mapsUri: '',
        rating: 4.4,
        reviewCount: 2000,
        reviews: [],
        photos: [],
      },
    });
    expect(url).toContain('destination_place_id=ChIJabc123');
    expect(url).toContain('destination=Arsalan');
  });
});

describe('googleMapsEmbedUrl', () => {
  it('builds a keyless embed URL at street zoom', () => {
    const url = googleMapsEmbedUrl(base);
    expect(url).toContain('output=embed');
    expect(url).toContain('q=22.5546%2C88.3494');
    expect(url).toContain('z=16');
  });

  it('never leaks an API key', () => {
    expect(googleMapsEmbedUrl(base)).not.toContain('key=');
  });
});

describe('googleMapsSearchUrl', () => {
  it('encodes the query', () => {
    expect(googleMapsSearchUrl('Park Street biryani')).toContain('Park%20Street%20biryani');
  });
});

describe('googleMapsReviewsUrl', () => {
  it('targets the reviews tab via the Place ID', () => {
    const withPlace = {
      ...base,
      google: {
        placeId: 'ChIJabc123',
        mapsUri: '',
        rating: 4.4,
        reviewCount: 2000,
        reviews: [],
        photos: [],
      },
    };
    expect(googleMapsReviewsUrl(withPlace)).toBe('https://search.google.com/local/reviews?placeid=ChIJabc123');
  });

  it('falls back to the place URL without a Place ID', () => {
    expect(googleMapsReviewsUrl(base)).toBe(googleMapsPlaceUrl(base));
  });
});
