import type { Restaurant } from '../types';
import { restaurants as seedRestaurants } from '../data/restaurants';
import { attachIntelligence, attachIntelligenceToAll } from '../lib/intelligence';
import { applyApprovedDraft } from '../lib/restaurantDraft';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapRestaurantRows } from '../transformers/restaurant';

/**
 * RestaurantRepository — the single seam between restaurant data and the
 * rest of the app.
 *
 *   UI/hooks → restaurantService → restaurantRepository → data source
 *
 * Two implementations exist:
 *  - `mockRestaurantRepository` — the current static catalogue (206 Dhaka
 *    venues) with simulated latency + cache. This is the ACTIVE source today
 *    and the one the build-time prerenderer uses.
 *  - `SupabaseRestaurantRepository` — reads the approved v1.1 tables via the
 *    typed query layer and maps rows to domain objects through the
 *    transformers. Only selected when Supabase is configured.
 */

export interface RestaurantRepository {
  /** Async catalogue load (UI path, with latency in the mock). */
  fetchAll(): Promise<Restaurant[]>;
  /** Async single-restaurant load (detail pages). */
  fetchById(id: string): Promise<Restaurant | undefined>;
  /** Sync catalogue — build-time prerender path (effects never run in SSR). */
  allSync(): Restaurant[];
  /** Sync single-restaurant load — prerender path. */
  byIdSync(id: string): Restaurant | undefined;
}

/* ------------------------------------------------------------------ */
/* Mock implementation (current static source)                         */
/* ------------------------------------------------------------------ */

const MIN_LATENCY_MS = 180;
const MAX_LATENCY_MS = 420;
const cache = new Map<string, unknown>();

const delay = () =>
  new Promise((resolve) =>
    setTimeout(resolve, MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)),
  );

async function withLatency<T>(key: string, produce: () => T): Promise<T> {
  await delay();
  if (cache.has(key)) return cache.get(key) as T;
  const value = produce();
  cache.set(key, value);
  return value;
}

export const mockRestaurantRepository: RestaurantRepository = {
  // Executive-approved profile drafts override the base record at this seam,
  // so Explore cards, detail pages and Home all see the same published data.
  allSync: () => attachIntelligenceToAll(seedRestaurants.map((r) => applyApprovedDraft({ ...r }))),
  byIdSync: (id) => {
    const found = seedRestaurants.find((r) => r.id === id);
    return found ? attachIntelligence(applyApprovedDraft({ ...found })) : undefined;
  },
  fetchAll: () => withLatency('restaurants:all', () => mockRestaurantRepository.allSync()),
  fetchById: (id) => withLatency(`restaurants:${id}`, () => mockRestaurantRepository.byIdSync(id)),
};

/* ------------------------------------------------------------------ */
/* Supabase implementation (approved v1.1 schema)                      */
/* ------------------------------------------------------------------ */

interface RestaurantDbBundleRows {
  sources: Awaited<ReturnType<typeof queries.selectSourcesForRestaurant>>;
}

/** Fetch the row bundle for one restaurant (identity + sources + attributes +
 *  tags + images + signals + reviews + menu) so the transformer can compose
 *  the frontend domain object. */
async function fetchBundle(restaurantId: string): Promise<RestaurantDbBundleRows & {
  restaurant: Awaited<ReturnType<typeof queries.selectRestaurantById>>;
  attributes: Awaited<ReturnType<typeof queries.selectAttributesForRestaurant>>;
  aliases: Awaited<ReturnType<typeof queries.selectRestaurantAliasesForRestaurant>>;
  tags: Awaited<ReturnType<typeof queries.selectTagsForRestaurant>>;
  images: Awaited<ReturnType<typeof queries.selectImagesForRestaurant>>;
  reviewSignals: Awaited<ReturnType<typeof queries.selectReviewSignalsForRestaurant>>;
  userReviews: Awaited<ReturnType<typeof queries.selectUserReviewsForRestaurant>>;
}> {
  const [restaurant, sources, attributes, aliases, tags, images, reviewSignals, userReviews] =
    await Promise.all([
      queries.selectRestaurantById(restaurantId),
      queries.selectSourcesForRestaurant(restaurantId),
      queries.selectAttributesForRestaurant(restaurantId),
      queries.selectRestaurantAliasesForRestaurant(restaurantId),
      queries.selectTagsForRestaurant(restaurantId),
      queries.selectImagesForRestaurant(restaurantId),
      queries.selectReviewSignalsForRestaurant(restaurantId),
      queries.selectUserReviewsForRestaurant(restaurantId),
    ]);

  // Menus are deliberately NOT part of the restaurant aggregate — they flow
  // through menuService → menuRepository (see mapRestaurantRows).
  return { restaurant, sources, attributes, aliases, tags, images, reviewSignals, userReviews };
}

class SupabaseRestaurantRepository implements RestaurantRepository {
  allSync(): Restaurant[] {
    // Prerender can't query a live database. When Supabase is configured the
    // build must use a static snapshot source instead (documented risk).
    throw new Error(
      'SupabaseRestaurantRepository has no sync path — the build-time prerender needs a static snapshot source.',
    );
  }

  byIdSync(_id: string): Restaurant | undefined {
    throw new Error(
      'SupabaseRestaurantRepository has no sync path — the build-time prerender needs a static snapshot source.',
    );
  }

  async fetchAll(): Promise<Restaurant[]> {
    const rows = await queries.selectRestaurants('ACTIVE');
    return Promise.all(
      rows.map(async (row) => {
        const bundle = await fetchBundle(row.id);
        return mapRestaurantRows({ ...bundle, restaurant: row });
      }),
    );
  }

  async fetchById(id: string): Promise<Restaurant | undefined> {
    const restaurant = await queries.selectRestaurantById(id);
    if (!restaurant) return undefined;
    const bundle = await fetchBundle(id);
    return mapRestaurantRows({ ...bundle, restaurant });
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const restaurantRepository: RestaurantRepository = isSupabaseConfigured()
  ? new SupabaseRestaurantRepository()
  : mockRestaurantRepository;
