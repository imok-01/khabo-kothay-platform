import type { DiscoveryFact, DiscoveryFactType } from '../domain/discoveryFacts';
import type { RestaurantDiscoveryFactsRow } from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved discovery fact rows → frontend domain facts.
 *
 * Only the fields the UI is allowed to show are carried over. Confidence,
 * evidence, source URLs and other internal metadata never leave the database
 * layer — the domain object is deliberately minimal.
 */

export function mapDiscoveryFactRows(rows: RestaurantDiscoveryFactsRow[]): DiscoveryFact[] {
  return rows.map((row) => ({
    id: row.id,
    restaurantId: row.restaurant_id,
    factText: row.fact_text,
    factType: row.fact_type as DiscoveryFactType,
  }));
}