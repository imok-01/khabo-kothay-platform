import { describe, expect, it } from 'vitest';
import { mapDiscoveryFactRows } from '../discoveryFacts';
import type { RestaurantDiscoveryFactsRow } from '../../integrations/supabase/database.types';

function row(overrides: Partial<RestaurantDiscoveryFactsRow> = {}): RestaurantDiscoveryFactsRow {
  return {
    id: 'fact-1',
    restaurant_id: 'rest-1',
    fact_text: 'Founded in 1965, this old-town eatery is famous for its mutton biryani.',
    fact_type: 'HISTORY',
    confidence: 'HIGH',
    source_type: 'restaurant',
    source_reference: 'interview-2026-01',
    evidence_note: null,
    status: 'APPROVED',
    verified_at: '2026-02-01T00:00:00Z',
    approved_by: 'user-1',
    published_at: '2026-02-01T00:00:00Z',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

describe('mapDiscoveryFactRows', () => {
  it('maps approved rows to minimal domain facts', () => {
    const facts = mapDiscoveryFactRows([row()]);
    expect(facts).toEqual([
      {
        id: 'fact-1',
        restaurantId: 'rest-1',
        factText: 'Founded in 1965, this old-town eatery is famous for its mutton biryani.',
        factType: 'HISTORY',
      },
    ]);
  });

  it('preserves all fact types', () => {
    const facts = mapDiscoveryFactRows([
      row({ id: 'a', fact_type: 'EXPERIENCE' }),
      row({ id: 'b', fact_type: 'CONCEPT' }),
      row({ id: 'c', fact_type: 'LOCATION' }),
      row({ id: 'd', fact_type: 'IDENTITY' }),
      row({ id: 'e', fact_type: 'OTHER' }),
    ]);
    expect(facts.map((f) => f.factType)).toEqual(['EXPERIENCE', 'CONCEPT', 'LOCATION', 'IDENTITY', 'OTHER']);
  });

  it('never exposes confidence, evidence, source or status metadata', () => {
    const facts = mapDiscoveryFactRows([row({ confidence: 'HIGH', evidence_note: 'see field notes' })]);
    expect(facts[0]).not.toHaveProperty('confidence');
    expect(facts[0]).not.toHaveProperty('evidence_note');
    expect(facts[0]).not.toHaveProperty('source_reference');
    expect(facts[0]).not.toHaveProperty('status');
  });

  it('returns an empty list for no rows', () => {
    expect(mapDiscoveryFactRows([])).toEqual([]);
  });
});