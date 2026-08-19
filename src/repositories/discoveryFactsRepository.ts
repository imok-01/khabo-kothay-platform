import type { DiscoveryFact } from '../domain/discoveryFacts';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapDiscoveryFactRows } from '../transformers/discoveryFacts';
import { resolveRestaurantUuid } from './restaurantRepository';

/**
 * DiscoveryFactsRepository — the seam between discovery facts and the UI.
 *
 *   RestaurantPage → discoveryFactsService → discoveryFactsRepository → data
 *
 * Approved facts live only in Supabase (`restaurant_discovery_facts`). The
 * demo store has no discovery facts, so the mock honestly returns an empty
 * list — the page hides the "Did you know?" section rather than
 * inventing content.
 */
export interface DiscoveryFactsRepository {
  /** Approved facts for one restaurant (route slug or UUID). */
  fetchApprovedForRestaurant(restaurantId: string): Promise<DiscoveryFact[]>;
}

/** Demo store implementation: no discovery facts exist there → empty. */
export const mockDiscoveryFactsRepository: DiscoveryFactsRepository = {
  async fetchApprovedForRestaurant(): Promise<DiscoveryFact[]> {
    return [];
  },
};

/** Supabase implementation — reads approved rows for the restaurant UUID. */
class SupabaseDiscoveryFactsRepository implements DiscoveryFactsRepository {
  async fetchApprovedForRestaurant(restaurantId: string): Promise<DiscoveryFact[]> {
    // Route ids are slugs, but the DB keys facts by the restaurant UUID.
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return [];
    const rows = await queries.selectApprovedDiscoveryFactsForRestaurant(uuid);
    return mapDiscoveryFactRows(rows);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const discoveryFactsRepository: DiscoveryFactsRepository = isSupabaseConfigured()
  ? new SupabaseDiscoveryFactsRepository()
  : mockDiscoveryFactsRepository;