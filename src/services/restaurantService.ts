import type { Restaurant } from '../types';
import { restaurantRepository } from '../repositories/restaurantRepository';

/**
 * RestaurantService — the app's single entry point for restaurant data.
 *
 *   hooks/pages → restaurantService → restaurantRepository → data source
 *
 * The UI never talks to the data source (static dataset today, Supabase
 * later) directly. Swapping the backend is a repository selection, not a
 * rewrite of callers.
 */
export const restaurantService = {
  /** Async catalogue load (UI path). */
  getAll: (): Promise<Restaurant[]> => restaurantRepository.fetchAll(),

  /** Async single-restaurant load (detail pages). */
  getById: (id: string): Promise<Restaurant | undefined> => restaurantRepository.fetchById(id),

  /** Sync catalogue — build-time prerender path. */
  getAllSync: (): Restaurant[] => restaurantRepository.allSync(),

  /** Sync single-restaurant load — prerender path. */
  getByIdSync: (id: string): Restaurant | undefined => restaurantRepository.byIdSync(id),
};
