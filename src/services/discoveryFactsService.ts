import type { DiscoveryFact } from '../domain/discoveryFacts';
import { discoveryFactsRepository } from '../repositories/discoveryFactsRepository';

/**
 * DiscoveryFactsService — the app's entry point for approved discovery facts.
 *
 *   RestaurantPage → discoveryFactsService → discoveryFactsRepository → data
 *
 * Components must not import the repository or the query layer directly; they
 * ask this service for facts so the backend swap stays a one-line repository
 * selection.
 */
export const discoveryFactsService = {
  /** Approved facts for one restaurant — Supabase when configured, empty otherwise. */
  fetchApprovedForRestaurant: (restaurantId: string): Promise<DiscoveryFact[]> =>
    discoveryFactsRepository.fetchApprovedForRestaurant(restaurantId),
};