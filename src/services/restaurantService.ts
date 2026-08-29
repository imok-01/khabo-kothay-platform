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

/**
 * In-flight sharing, and nothing more.
 *
 * `useRestaurants()` legitimately runs more than once on a page: the header's
 * search needs the catalogue and so does the page under it. Each mount used to
 * start its own load, and the second one was pure waste — the two requests are
 * identical, they leave within a few milliseconds of each other, and on the
 * Supabase path each one costs 16 requests plus a full transform pass over all
 * 206 venues. Measured on Explore and Home: 33 requests where 17 do the work.
 *
 * So a call that finds an identical call already running joins it instead of
 * starting a second one, and both callers resolve with the same value at the
 * same moment. Nothing is cached: the entry is dropped the instant the promise
 * settles, so a later mount, a route change, an admin edit or `reload()` all
 * read fresh data exactly as they did before. That matters — a TTL cache here
 * would be the thing that shows a stale catalogue after an approval.
 */
const inFlight = new Map<string, Promise<unknown>>();

function share<T>(key: string, start: () => Promise<T>): Promise<T> {
  const running = inFlight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const pending: Promise<T> = start().finally(() => {
    if (inFlight.get(key) === pending) inFlight.delete(key);
  });
  inFlight.set(key, pending);
  return pending;
}

export const restaurantService = {
  /** Async catalogue load (UI path). */
  getAll: (): Promise<Restaurant[]> => share('all', () => restaurantRepository.fetchAll()),

  /** Async single-restaurant load (detail pages). */
  getById: (id: string): Promise<Restaurant | undefined> =>
    share(`byId:${id}`, () => restaurantRepository.fetchById(id)),

  /** Sync catalogue — build-time prerender snapshot + demo surfaces (D2). */
  getAllSync: (): Restaurant[] => mockRestaurantRepository.allSync(),

  /** Sync single-restaurant load — prerender snapshot + demo surfaces (D2). */
  getByIdSync: (id: string): Restaurant | undefined => mockRestaurantRepository.byIdSync(id),
};
