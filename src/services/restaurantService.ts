import type { Restaurant } from '../types';
import { restaurantRepository, mockRestaurantRepository } from '../repositories/restaurantRepository';

/**
 * RestaurantService — the app's single entry point for restaurant data.
 *
 *   hooks/pages → restaurantService → restaurantRepository → data source
 *
 * The UI never talks to the data source (static dataset today, Supabase
 * later) directly. Swapping the backend is a repository selection, not a
 * rewrite of callers.
 *
 * SYNC vs ASYNC (approved D2 decision):
 *  - The sync accessors (`getAllSync` / `getByIdSync`) ALWAYS serve the mock
 *    dataset. They back the build-time prerender snapshot (which cannot query
 *    a live database at build time) and the demo admin surfaces. Because the
 *    mock ids are generator slugify(name) and the Supabase route ids are the
 *    same function over the same names (verified 206/206), the snapshot and
 *    the live database produce identical route ids — links and favourites
 *    don't drift. The sync path must never throw.
 *  - The async accessors (`getAll` / `getById`) route to Supabase when it is
 *    configured, and to the mock (with simulated latency) otherwise. This is
 *    the path every public page uses at runtime.
 */
export const restaurantService = {
  /** Async catalogue load (UI path). */ 
  getAll: (): Promise<Restaurant[]> => restaurantRepository.fetchAll(),

  /** Async single-restaurant load (detail pages). */
  getById: (id: string): Promise<Restaurant | undefined> => restaurantRepository.fetchById(id),

  /** Sync catalogue — build-time prerender snapshot + demo surfaces (D2). */
  getAllSync: (): Restaurant[] => mockRestaurantRepository.allSync(),

  /** Sync single-restaurant load — prerender snapshot + demo surfaces (D2). */
  getByIdSync: (id: string): Restaurant | undefined => mockRestaurantRepository.byIdSync(id),
};
