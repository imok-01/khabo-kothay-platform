import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { resolveRestaurantSlug } from '../repositories/restaurantRepository';
import { selectRestaurantById } from '../integrations/supabase/queries';
import { getAllRestaurantsSync } from './useRestaurantData';
import { isDevSimulation } from '../lib/devSimulation';
import type { Restaurant } from '../types';
import type { KhaboPlaceData } from '../domain/place';

/**
 * Build a minimal `Restaurant` domain object for a venue that exists only in the
 * database (e.g. a restaurant created through the application→approval flow and
 * not yet published to the public discovery catalogue). The owner dashboard only
 * needs id/name plus a few editable fields, so sensible empty defaults are used
 * for everything else.
 */
function restaurantFromDbRow(row: {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  area: string | null;
  phone: string | null;
  website: string | null;
}): Restaurant {
  const khabo: KhaboPlaceData = {
    rating: 0,
    reviewCount: 0,
    reviews: [],
    photos: [],
    tags: [],
    highlights: [],
    signals: [],
    visitCount: 0,
    featured: false,
  };
  return {
    id: row.id,
    name: row.name,
    tagline: '',
    description: row.description ?? '',
    cuisines: [],
    mealTypes: [],
    budget: 'Budget',
    priceForTwo: 0,
    location: row.area ?? '',
    address: row.address ?? '',
    openingHours: '',
    isVeg: false,
    vegUnknown: true,
    hasDelivery: false,
    hasOutdoorSeating: false,
    isFamilyFriendly: false,
    vibes: [],
    lat: 0,
    lng: 0,
    signatureDishes: [],
    khabo,
  };
}

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
  // In the dev simulation the restaurant catalogue is the mock store (which
  // includes the isolated KK Demo Restaurant keyed by slug), so resolve owned
  // venues directly from the sync catalogue rather than via Supabase UUIDs.
  const sim = isDevSimulation();
  const configured = isSupabaseConfigured() && !sim;
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
      for (const id of restaurantIds ?? []) {
        // The session may carry a database UUID (production admins) or a
        // catalogue slug (dev/demo admin accounts). A slug is already usable
        // as the domain key, so resolve the UUID path only when the id is not
        // already a known catalogue slug.
        let slug: string | undefined;
        if (all.some((x) => x.id === id)) {
          slug = id;
        } else {
          try {
            slug = (await resolveRestaurantSlug(id)) ?? undefined;
          } catch {
            slug = undefined;
          }
        }
        if (slug) {
          const r = all.find((x) => x.id === slug);
          if (r) {
            list.push(r);
            continue;
          }
        }
        // Fallback: a venue that exists only in the database (e.g. created via
        // the application→approval flow and not yet in the public catalogue).
        // Resolve it directly so its owner can still manage it.
        try {
          const row = await selectRestaurantById(id);
          if (row) list.push(restaurantFromDbRow(row));
        } catch {
          /* ignore unresolvable ids */
        }
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
