import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { resolveRestaurantSlug } from '../repositories/restaurantRepository';
import { getAllRestaurantsSync } from './useRestaurantData';
import type { Restaurant } from '../types';

/**
 * Owner-venue resolution for navigation / admin surfaces.
 *
 * The session carries `restaurantIds` which are database UUIDs
 * (`roles.restaurant_id`), but the `Restaurant` domain is keyed by slug.
 * When Supabase is configured we resolve each UUID back to its slug and look
 * the venue up in the published catalogue (no schema change — pure mapping).
 * In mock / test mode we keep matching against the slug ids directly.
 */
export function useOwnerRestaurants(
  restaurantIds: string[] | undefined,
): { restaurants: Restaurant[]; loading: boolean } {
  const configured = isSupabaseConfigured();
  const [state, setState] = useState<{ restaurants: Restaurant[]; loading: boolean }>(() => {
    if (!configured) {
      return {
        restaurants: getAllRestaurantsSync().filter((r) => restaurantIds?.includes(r.id)),
        loading: false,
      };
    }
    return { restaurants: [], loading: true };
  });

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    (async () => {
      const list: Restaurant[] = [];
      const all = getAllRestaurantsSync();
      for (const uuid of restaurantIds ?? []) {
        const slug = await resolveRestaurantSlug(uuid);
        if (!slug) continue;
        const r = all.find((x) => x.id === slug);
        if (r) list.push(r);
      }
      if (!cancelled) setState({ restaurants: list, loading: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [configured, (restaurantIds ?? []).join(',')]);

  return state;
}

/**
 * Single-venue convenience wrapper used by the Navbar. Returns the first owned
 * restaurant, or undefined while resolving / when none are assigned.
 */
export function useOwnerRestaurant(restaurantIds: string[] | undefined): Restaurant | undefined {
  const { restaurants } = useOwnerRestaurants(restaurantIds);
  return restaurants[0];
}
