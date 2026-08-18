import { describe, expect, it } from 'vitest';
import { deliveryFromServiceOptions, mapRestaurantRows, type RestaurantDbBundle } from '../restaurant';
import type {
  ImageReferencesRow,
  RestaurantAttributesRow,
  RestaurantSourcesRow,
  RestaurantsRow,
  ReviewSignalsRow,
} from '../../integrations/supabase/database.types';

function baseBundle(overrides: Partial<RestaurantDbBundle> = {}): RestaurantDbBundle {
  const restaurant: RestaurantsRow = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Seasonal Tastes',
    description: null,
    address: 'The Westin, Main Gulshan',
    city: 'Dhaka',
    area: 'Gulshan',
    latitude: 23.7933656,
    longitude: 90.4146485,
    phone: null,
    website: 'https://seasonaltastes.example.com',
    status: 'ACTIVE',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  const sources: RestaurantSourcesRow[] = [
    {
      id: 'src-1',
      restaurant_id: restaurant.id,
      source_type: 'google',
      source_identifier: 'ChIJnZL9x7XHVTcRjmRUVqzzp2s',
      source_url: 'https://maps.google.com/?cid=123',
      created_at: null,
    },
  ];
  const attributes: RestaurantAttributesRow[] = [
    { id: 'a1', restaurant_id: restaurant.id, attribute_key: 'slug', attribute_value: 'seasonal-tastes', created_at: null },
    { id: 'a2', restaurant_id: restaurant.id, attribute_key: 'cuisines', attribute_value: ['Bengali', 'Biryani'], created_at: null },
    { id: 'a3', restaurant_id: restaurant.id, attribute_key: 'priceForTwo', attribute_value: 1800, created_at: null },
    { id: 'a4', restaurant_id: restaurant.id, attribute_key: 'budget', attribute_value: 'Premium', created_at: null },
    { id: 'a5', restaurant_id: restaurant.id, attribute_key: 'mealTypes', attribute_value: ['Lunch', 'Made-up meal'], created_at: null },
  ];
  const images: ImageReferencesRow[] = [
    { id: 'img-1', restaurant_id: restaurant.id, image_url: 'https://lh3.googleusercontent.com/x', source: 'google', status: 'ACTIVE', change_request_id: null, created_at: null },
  ];
  const reviewSignals: ReviewSignalsRow[] = [
    { id: 'sig-1', restaurant_id: restaurant.id, source: 'google', rating: 4.6, review_count: 1479, observed_at: null },
  ];
  return { restaurant, sources, attributes, images, reviewSignals, ...overrides };
}

describe('mapRestaurantRows', () => {
  it('uses the stored slug attribute as the stable frontend id', () => {
    const r = mapRestaurantRows(baseBundle());
    expect(r.id).toBe('seasonal-tastes');
  });

  it('derives a deterministic slug when no slug attribute exists', () => {
    const bundle = baseBundle({ attributes: [] });
    expect(mapRestaurantRows(bundle).id).toBe('seasonal-tastes');
  });

  it('maps google identity from restaurant_sources and review_signals', () => {
    const r = mapRestaurantRows(baseBundle());
    expect(r.google?.placeId).toBe('ChIJnZL9x7XHVTcRjmRUVqzzp2s');
    expect(r.google?.rating).toBe(4.6);
    expect(r.google?.reviewCount).toBe(1479);
    expect(r.google?.photos).toHaveLength(1);
  });

  it('only surfaces a website when the import stored one (Website CTA gating)', () => {
    const withWebsite = mapRestaurantRows(baseBundle());
    expect(withWebsite.google?.website).toBe('https://seasonaltastes.example.com');

    const noWebsite = mapRestaurantRows(baseBundle({ restaurant: { ...baseBundle().restaurant, website: null } }));
    expect(noWebsite.google?.website).toBeUndefined();
  });

  it('never invents price — missing priceForTwo attribute stays 0', () => {
    const bundle = baseBundle({ attributes: baseBundle().attributes.filter((a) => a.attribute_key !== 'priceForTwo') });
    expect(mapRestaurantRows(bundle).priceForTwo).toBe(0);
  });

  it('keeps meal types inside the controlled vocabulary only', () => {
    const r = mapRestaurantRows(baseBundle());
    expect(r.mealTypes).toEqual(['Lunch']);
  });

  it('does not create a google block when there is no google source', () => {
    const r = mapRestaurantRows(baseBundle({ sources: [] }));
    expect(r.google).toBeUndefined();
  });

  it('aggregates khabo rating from khabo review signals when present', () => {
    const bundle = baseBundle({
      reviewSignals: [
        ...baseBundle().reviewSignals,
        { id: 'sig-2', restaurant_id: bundleRestaurantId(), source: 'khabo', rating: 4.2, review_count: 12, observed_at: null },
      ],
    });
    expect(mapRestaurantRows(bundle).khabo.rating).toBe(4.2);
    expect(mapRestaurantRows(bundle).khabo.reviewCount).toBe(12);
  });

  it('maps the city for the address formatter', () => {
    expect(mapRestaurantRows(baseBundle()).city).toBe('Dhaka');
  });

  it('stays false for delivery when nothing is recorded', () => {
    expect(mapRestaurantRows(baseBundle()).hasDelivery).toBe(false);
  });

  it('derives hasDelivery from verified service_options when no boolean exists', () => {
    const bundle = baseBundle({
      attributes: [
        ...baseBundle().attributes,
        { id: 'a7', restaurant_id: bundleRestaurantId(), attribute_key: 'service_options', attribute_value: 'Dine-in, Delivery', created_at: null },
      ],
    });
    expect(mapRestaurantRows(bundle).hasDelivery).toBe(true);
  });

  it('does not treat takeaway as home delivery', () => {
    const bundle = baseBundle({
      attributes: [
        ...baseBundle().attributes,
        { id: 'a8', restaurant_id: bundleRestaurantId(), attribute_key: 'service_options', attribute_value: 'Dine-in, Takeaway', created_at: null },
      ],
    });
    expect(mapRestaurantRows(bundle).hasDelivery).toBe(false);
  });

  it('lets an explicit delivery boolean win over service_options', () => {
    const bundle = baseBundle({
      attributes: [
        ...baseBundle().attributes,
        { id: 'a9', restaurant_id: bundleRestaurantId(), attribute_key: 'service_options', attribute_value: 'Dine-in, Delivery', created_at: null },
        { id: 'a10', restaurant_id: bundleRestaurantId(), attribute_key: 'hasDelivery', attribute_value: false, created_at: null },
      ],
    });
    expect(mapRestaurantRows(bundle).hasDelivery).toBe(false);
  });
});

describe('deliveryFromServiceOptions', () => {
  it('is true only for literal delivery wording', () => {
    expect(deliveryFromServiceOptions('Dine-in, Delivery')).toBe(true);
    expect(deliveryFromServiceOptions('No-contact delivery')).toBe(true);
    expect(deliveryFromServiceOptions('Dine-in')).toBe(false);
    expect(deliveryFromServiceOptions('In-store pick-up, Takeaway')).toBe(false);
    expect(deliveryFromServiceOptions(undefined)).toBe(false);
    expect(deliveryFromServiceOptions('')).toBe(false);
  });
});

function bundleRestaurantId(): string {
  return baseBundle().restaurant.id;
}
