import { restaurantService } from '../services/restaurantService';
import type { Restaurant } from '../types';

/**
 * Async data repository (public API used by hooks + the prerenderer).
 *
 * This module is a thin facade over `restaurantService` (→
 * `restaurantRepository`). The mock repository serves the static dataset with
 * a realistic network delay and cache, so the UI exercises real loading,
 * error and retry paths while staying fully self-contained. When Supabase is
 * configured, the repository swap happens below this layer — hooks, pages and
 * the prerenderer do not change.
 */

/** Synchronous accessors — used by the build-time prerenderer (effects never
 * run server-side, so the async loading path can't be used there). */
export const getAllRestaurantsSync = (): Restaurant[] => restaurantService.getAllSync();

export const getRestaurantSync = (id: string): Restaurant | undefined =>
  restaurantService.getByIdSync(id);

export const fetchAllRestaurants = (): Promise<Restaurant[]> => restaurantService.getAll();

export const fetchRestaurant = (id: string): Promise<Restaurant | undefined> =>
  restaurantService.getById(id);
