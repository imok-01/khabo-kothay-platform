import { getAllRestaurantsSync } from './useRestaurantData';
import type { Restaurant } from '../types';

/**
 * Owner-venue lookup for navigation.
 *
 * Takes the session's `restaurantIds` so the caller's session source
 * (AuthContext) stays authoritative. Synchronous over the published
 * catalogue — identical timing to the old inline Navbar lookup, no loading
 * flash. When Supabase supplies ownership, this hook swaps to that source
 * without touching the Navbar.
 */
export function useOwnerRestaurant(restaurantIds: string[] | undefined): Restaurant | undefined {
  const firstId = restaurantIds?.[0];
  if (!firstId) return undefined;
  return getAllRestaurantsSync().find((r) => r.id === firstId);
}
