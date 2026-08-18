import type { Restaurant } from '../types';
import { restaurants as seedRestaurants } from '../data/restaurants';
import { attachIntelligence, attachIntelligenceToAll } from '../lib/intelligence';
import { estimateCostForTwo, type CostEstimate } from '../lib/costEstimate';
import { applyApprovedDraft } from '../lib/restaurantDraft';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapRestaurantRows, slugify } from '../transformers/restaurant';
import { menuCostEstimate } from '../transformers/menu';
import { mockMenuRepository } from './menuRepository';
import type {
  MenuItemsRow,
  MenusRow,
  PriceObservationsRow,
  RestaurantSourcesRow,
} from '../integrations/supabase/database.types';

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
  allSync: () =>
    attachIntelligenceToAll(seedRestaurants.map((r) => withMenuEstimate(applyApprovedDraft({ ...r })))),
  byIdSync: (id) => {
    const found = seedRestaurants.find((r) => r.id === id);
    return found ? attachIntelligence(withMenuEstimate(applyApprovedDraft({ ...found }))) : undefined;
  },
  fetchAll: () => withLatency('restaurants:all', () => mockRestaurantRepository.allSync()),
  fetchById: (id) => withLatency(`restaurants:${id}`, () => mockRestaurantRepository.byIdSync(id)),
};

/**
 * Menu-derived cost-for-two estimate attached to the domain object at the
 * repository seam. Uses the same demo-store menu accessor the detail page
 * renders, so cards and detail pages agree — and it never fabricates a price:
 * when the venue has no menu data the estimate stays absent and the UI says
 * "Price not listed".
 */
function withMenuEstimate(restaurant: Restaurant): Restaurant {
  const estimate = estimateCostForTwo(mockMenuRepository.getEffectiveMenu(restaurant));
  return estimate ? { ...restaurant, menuEstimate: estimate } : restaurant;
}

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
    // No lifecycle-status filter: FULL_IMPORT_v2 marks every venue `UNKNOWN`
    // (not yet classified), which must not hide restaurants from discovery.
    const rows = await queries.selectRestaurants();
    const ids = rows.map((r) => r.id);

    // Batched fetch: one request per table (chunked) instead of an N+1
    // fan-out per restaurant. 206 restaurants x 8 tables would otherwise
    // fire ~1,600 parallel requests and exhaust the browser connection pool
    // (ERR_INSUFFICIENT_RESOURCES).
    const [sources, aliases, attributes, tags, images, reviewSignals, userReviews, menus] = await Promise.all([
      queries.selectSourcesForRestaurants(ids),
      queries.selectRestaurantAliasesForRestaurants(ids),
      queries.selectAttributesForRestaurants(ids),
      queries.selectTagsForRestaurants(ids),
      queries.selectImagesForRestaurants(ids),
      queries.selectReviewSignalsForRestaurants(ids),
      queries.selectUserReviewsForRestaurants(ids),
      queries.selectMenusForRestaurants(ids),
    ]);

    // Menu price observations for the whole catalogue — used to attach the
    // menu-derived cost estimate to every restaurant, so cards (which only
    // ever hold the Restaurant domain object) can show a real price instead
    // of "Price not listed".
    const menuItems = await queries.selectMenuItemsForMenus(menus.map((m) => m.id));
    const observations = await queries.selectPriceObservationsForItems(menuItems.map((i) => i.id));

    const byRestaurant = <T extends { restaurant_id: string }>(list: T[]): Map<string, T[]> => {
      const map = new Map<string, T[]>();
      for (const item of list) {
        const bucket = map.get(item.restaurant_id) ?? [];
        bucket.push(item);
        map.set(item.restaurant_id, bucket);
      }
      return map;
    };
    const sourcesMap = byRestaurant(sources);
    const aliasesMap = byRestaurant(aliases);
    const attributesMap = byRestaurant(attributes);
    const tagsMap = byRestaurant(tags);
    const imagesMap = byRestaurant(images);
    const signalsMap = byRestaurant(reviewSignals);
    const reviewsMap = byRestaurant(userReviews);
    const menusByRestaurant = byRestaurant(menus);
    const itemsByMenu = groupBy(menuItems, (i) => i.menu_id);
    const observationsByItem = groupBy(observations, (o) => o.menu_item_id);

    return rows
      .map((row) =>
        attachIntelligence(
          mapRestaurantRows({
            restaurant: row,
            sources: sourcesMap.get(row.id) ?? [],
            aliases: aliasesMap.get(row.id) ?? [],
            attributes: attributesMap.get(row.id) ?? [],
            tags: tagsMap.get(row.id) ?? [],
            images: imagesMap.get(row.id) ?? [],
            reviewSignals: signalsMap.get(row.id) ?? [],
            userReviews: reviewsMap.get(row.id) ?? [],
            menuEstimate: menuEstimateForRestaurant(row.id, menusByRestaurant, itemsByMenu, observationsByItem, sourcesMap.get(row.id) ?? []),
          }),
        ),
      );
  }

  async fetchById(id: string): Promise<Restaurant | undefined> {
    const uuid = await resolveRestaurantUuid(id);
    if (!uuid) return undefined;
    const restaurant = await queries.selectRestaurantById(uuid);
    if (!restaurant) return undefined;
    const bundle = await fetchBundle(uuid);

    // Same menu-derived estimate as the catalogue path, so a restaurant
    // fetched by id carries the identical price source as its card.
    const menus = await queries.selectMenusForRestaurant(uuid);
    const menuItems = await queries.selectMenuItemsForMenus(menus.map((m) => m.id));
    const observations = await queries.selectPriceObservationsForItems(menuItems.map((i) => i.id));
    const menuEstimate = menuEstimateForRestaurant(
      uuid,
      new Map([[uuid, menus]]),
      groupBy(menuItems, (i) => i.menu_id),
      groupBy(observations, (o) => o.menu_item_id),
      bundle.sources,
    );

    return attachIntelligence(mapRestaurantRows({ ...bundle, restaurant, menuEstimate }));
  }
}

/** Group a row list by an arbitrary key (menu id, item id…). */
function groupBy<T, K extends string>(list: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of list) {
    const k = key(item);
    const bucket = map.get(k) ?? [];
    bucket.push(item);
    map.set(k, bucket);
  }
  return map;
}

/**
 * Menu-derived cost estimate for one restaurant from the catalogue's grouped
 * menu rows. Reuses the same Menu mapping + estimate the detail page uses
 * (menuCostEstimate → mapMenuRows + estimateCostForTwo) so every surface
 * agrees on the number. Returns undefined (honest "no data") when the venue
 * has no menu rows.
 */
function menuEstimateForRestaurant(
  restaurantId: string,
  menusByRestaurant: Map<string, MenusRow[]>,
  itemsByMenu: Map<string, MenuItemsRow[]>,
  observationsByItem: Map<string, PriceObservationsRow[]>,
  sources: RestaurantSourcesRow[],
): CostEstimate | undefined {
  const menus = menusByRestaurant.get(restaurantId) ?? [];
  if (menus.length === 0) return undefined;

  const itemsByMenuFor: Record<string, MenuItemsRow[]> = {};
  const observationsByItemFor: Record<string, PriceObservationsRow[]> = {};
  for (const menu of menus) {
    const items = itemsByMenu.get(menu.id) ?? [];
    itemsByMenuFor[menu.id] = items;
    for (const item of items) {
      observationsByItemFor[item.id] = observationsByItem.get(item.id) ?? [];
    }
  }

  return menuCostEstimate({ menus, itemsByMenu: itemsByMenuFor, observationsByItem: observationsByItemFor, sources });
}

/**
 * Resolve a frontend route id to the database UUID.
 *
 * Route ids are slugs derived from the restaurant name (`slugify`, the same
 * function the mock dataset uses), while the database primary key is a UUID.
 * Try a direct UUID lookup first (cheap, and correct once slugs are ever
 * stored explicitly); otherwise scan the id+name pairs and match the
 * deterministic slug. If no row resolves, return null (404 path).
 *
 * Only hit the UUID column when the id is actually UUID-shaped — PostgREST
 * answers 400 for any other value, which would throw instead of falling
 * through to slug resolution.
 */
export async function resolveRestaurantUuid(id: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    const direct = await queries.selectRestaurantById(id);
    if (direct) return direct.id;
  }
  const pairs = await queries.selectRestaurantIds();
  const match = pairs.find((p) => slugify(p.name) === id);
  return match?.id ?? null;
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const restaurantRepository: RestaurantRepository = isSupabaseConfigured()
  ? new SupabaseRestaurantRepository()
  : mockRestaurantRepository;
