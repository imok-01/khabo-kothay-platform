import type { Restaurant } from '../types';
import { restaurants as seedRestaurants } from '../data/restaurants';
import { attachIntelligence, attachIntelligenceToAll } from '../lib/intelligence';
import { estimateCostForTwo } from '../lib/costEstimate';
import { applyApprovedDraft } from '../lib/restaurantDraft';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapRestaurantRows, slugify } from '../transformers/restaurant';
import { mockMenuRepository } from './menuRepository';
import { isDevSimulation, assertDevSimulationNotProduction } from '../lib/devSimulation';
import { DEV_DEMO_RESTAURANT } from '../data/devSimulation';

// Production safety: never load the dev simulation in a production build.
assertDevSimulationNotProduction();

/**
 * RestaurantRepository — the single seam between restaurant data and the
 * rest of the app.
 *
 *   UI/hooks → restaurantService → restaurantRepository → data source
 *
 * Two implementations exist:
 *  - `mockRestaurantRepository` — the static catalogue (206 Dhaka venues) with
 *    simulated latency + cache. It serves the no-backend path and, through
 *    `allSync`, the build-time prerenderer (which cannot query a database).
 *  - `SupabaseRestaurantRepository` — the ACTIVE source whenever Supabase is
 *    configured. Reads the approved v1.1 tables via the typed query layer and
 *    maps rows to domain objects through the transformers, then fills any field
 *    the import did not carry from the static snapshot (see
 *    `fillFromSnapshot`) so no previously visible data is lost.
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

/**
 * Enforce the catalogue/detail data contract: strip heavy, detail-only data
 * (currently KK community review *text*) from a restaurant before it enters
 * any catalogue / search / card surface. Summary signals such as
 * `reviewCount` are preserved — only the review bodies are removed. This is
 * the single enforcement point so the boundary is provable and testable.
 */
export function toCatalogueView(r: Restaurant): Restaurant {
  if (r.khabo.reviews.length === 0) return r;
  return { ...r, khabo: { ...r.khabo, reviews: [] } };
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

/**
 * Catalogue source. In dev simulation the isolated KK Demo Restaurant is
 * appended (never mutating the 206 real venues); otherwise the static seed is
 * used untouched.
 */
function seedList(): Restaurant[] {
  return isDevSimulation() ? [...seedRestaurants, DEV_DEMO_RESTAURANT] : seedRestaurants;
}

export const mockRestaurantRepository: RestaurantRepository = {
  // Executive-approved profile drafts override the base record at this seam,
  // so Explore cards, detail pages and Home all see the same published data.
  allSync: () =>
    attachIntelligenceToAll(
      seedList().map((r) => toCatalogueView(withMenuEstimate(applyApprovedDraft({ ...r })))),
    ),
  byIdSync: (id) => {
    const found = seedList().find((r) => r.id === id);
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
/* Static snapshot gap-filling                                         */
/* ------------------------------------------------------------------ */

/** The static catalogue indexed by route slug (its `id` already is the slug). */
const snapshotBySlug = new Map(seedRestaurants.map((r) => [r.id, r]));

/**
 * Fill fields the live row does not carry from the static snapshot in
 * `src/data/restaurants.ts`. Both sources came from the same collection pass,
 * so this recovers data the product has always displayed — it never invents a
 * value, and the live row always wins where it has one.
 *
 * Why it is needed: the import populated `restaurant_attributes` with opening
 * hours (203/207), signature dishes, menu estimates and meal types — but never
 * `budget` or `priceForTwo`, and `cuisines` for only 100 of 207 venues. Reading
 * the backend alone therefore blanked the price tier for 113 venues (each one
 * collapsing to the transformer's `'Mid-range'` default, which breaks the
 * budget filter and the ৳ symbols) and dropped cuisines for 8.
 *
 * `hasStoredBudget` reports whether the bundle actually carried a `budget`
 * attribute: the transformer has no way to express "no tier recorded" — it
 * defaults to `'Mid-range'`, which is indistinguishable from a real Mid-range —
 * so the caller passes that fact in rather than guessing here.
 *
 * Booleans are deliberately only ever filled in the positive direction, and
 * only for flags the transformer never maps at all (`isFamilyFriendly`,
 * `hasOutdoorSeating`). `hasDelivery` is left alone because the live value is
 * derived from the authoritative `service_options` string, where a `false` is a
 * recorded "no" rather than a gap.
 */
function fillFromSnapshot(live: Restaurant, hasStoredBudget: boolean): Restaurant {
  const snap = snapshotBySlug.get(live.id);
  if (!snap) return live;

  const filled: Restaurant = { ...live };
  if (filled.cuisines.length === 0) filled.cuisines = snap.cuisines;
  if (filled.mealTypes.length === 0) filled.mealTypes = snap.mealTypes;
  if (filled.vibes.length === 0) filled.vibes = snap.vibes;
  if (filled.signatureDishes.length === 0) filled.signatureDishes = snap.signatureDishes;
  if (!filled.tagline) filled.tagline = snap.tagline;
  if (!filled.description) filled.description = snap.description;
  if (!filled.openingHours) filled.openingHours = snap.openingHours;
  if (!filled.location) filled.location = snap.location;
  if (!filled.address) filled.address = snap.address;
  if (!filled.lat || !filled.lng) {
    filled.lat = snap.lat;
    filled.lng = snap.lng;
  }
  if (!hasStoredBudget) filled.budget = snap.budget;
  if (filled.priceForTwo === 0) filled.priceForTwo = snap.priceForTwo;
  if (snap.isFamilyFriendly) filled.isFamilyFriendly = true;
  if (snap.hasOutdoorSeating) filled.hasOutdoorSeating = true;
  if ((filled.google?.photos?.length ?? 0) === 0 && (snap.google?.photos?.length ?? 0) > 0) {
    filled.google = filled.google ? { ...filled.google, photos: snap.google!.photos } : snap.google;
  }
  return filled;
}

/** True when the bundle recorded an explicit budget tier (see above). */
const hasBudgetAttribute = (attributes: Array<{ attribute_key: string }>): boolean =>
  attributes.some((a) => a.attribute_key === 'budget');

/* ------------------------------------------------------------------ */
/* Supabase implementation (approved v1.1 schema)                      */
/* ------------------------------------------------------------------ */

interface RestaurantDbBundleRows {
  sources: Awaited<ReturnType<typeof queries.selectSourcesForRestaurant>>;
}

/** Fetch the row bundle for one restaurant (identity + sources + attributes +
 *  tags + images + signals + reviews + menu) so the transformer
 *  can compose the frontend domain object. */
async function fetchBundle(restaurantId: string): Promise<RestaurantDbBundleRows & {
  restaurant: Awaited<ReturnType<typeof queries.selectRestaurantById>>;
  attributes: Awaited<ReturnType<typeof queries.selectAttributesForRestaurant>>;
  aliases: Awaited<ReturnType<typeof queries.selectRestaurantAliasesForRestaurant>>;
  tags: Awaited<ReturnType<typeof queries.selectTagsForRestaurant>>;
  images: Awaited<ReturnType<typeof queries.selectImagesForRestaurant>>;
  reviewSignals: Awaited<ReturnType<typeof queries.selectReviewSignalsForRestaurant>>;
  userReviews: Awaited<ReturnType<typeof queries.selectUserReviewsForRestaurant>>;
  /** Public verification records (via the anon-safe view) — drives `address_verified`. */
  verificationRecords: Awaited<ReturnType<typeof queries.selectVerificationRecordsForRestaurant>>;
}> {
  const [restaurant, sources, attributes, aliases, tags, images, reviewSignals, userReviews, verificationRecords] =
    await Promise.all([
      queries.selectRestaurantById(restaurantId),
      queries.selectSourcesForRestaurant(restaurantId),
      queries.selectAttributesForRestaurant(restaurantId),
      queries.selectRestaurantAliasesForRestaurant(restaurantId),
      queries.selectTagsForRestaurant(restaurantId),
      queries.selectImagesForRestaurant(restaurantId),
      queries.selectReviewSignalsForRestaurant(restaurantId),
      queries.selectUserReviewsForRestaurant(restaurantId),
      // Anon-safe read of the public verification view. If the view is not yet
      // deployed, the table is RLS-restricted, or the query otherwise fails,
      // degrade gracefully to no records — the detail page must never break on
      // a missing verification badge. `address_verified` simply stays null
      // until the view (PROPOSED_1_7) is applied.
      queries.selectVerificationRecordsForRestaurant(restaurantId).catch(() => []),
    ]);

  // Menus are deliberately NOT part of the restaurant aggregate — they flow
  // through menuService → menuRepository (see mapRestaurantRows).
  return { restaurant, sources, attributes, aliases, tags, images, reviewSignals, userReviews, verificationRecords };
}

class SupabaseRestaurantRepository implements RestaurantRepository {
  // Prerender can't query a live database, so the sync path serves the static
  // snapshot in src/data/restaurants.ts — the "static snapshot source" this
  // class previously demanded by throwing. Only the build-time renderer uses
  // it; in the browser every page goes through the async paths below, so the
  // live catalogue still reaches the UI on hydration.
  allSync(): Restaurant[] {
    return mockRestaurantRepository.allSync();
  }

  byIdSync(id: string): Restaurant | undefined {
    return mockRestaurantRepository.byIdSync(id);
  }

  async fetchAll(): Promise<Restaurant[]> {
    // No lifecycle-status filter: FULL_IMPORT_v2 marks every venue `UNKNOWN`
    // (not yet classified), which must not hide restaurants from discovery.
    const rows = await queries.selectRestaurants();
    const ids = rows.map((r) => r.id);

    // Batched fetch: one request per table (chunked) instead of an N+1
    // fan-out per restaurant. 206 restaurants x 7 tables would otherwise
    // fire ~1,400 parallel requests and exhaust the browser connection pool
    // (ERR_INSUFFICIENT_RESOURCES).
    // NOTE: menu_items and price_observations are no longer fetched here.
    // The menuEstimate is read from the stored restaurant_attributes.
    // `restaurant_tags` is also excluded — the `Restaurant` domain object has
    // no `tags` field and `mapRestaurantRows` never reads it, so fetching it
    // on the catalogue load was dead egress.
    // `userReviews` (KK community review *text*) is deliberately NOT fetched
    // here — review text is detail-only (loaded via fetchBundle on the
    // restaurant detail page). Fetching it into the catalogue would be heavy
    // egress with no discovery value; the catalogue carries only the summary
    // `reviewCount`. Enforced below by toCatalogueView.
    const [sources, aliases, attributes, images, reviewSignals] = await Promise.all([
      queries.selectSourcesForRestaurants(ids),
      queries.selectRestaurantAliasesForRestaurants(ids),
      queries.selectAttributesForRestaurants(ids),
      queries.selectImagesForRestaurants(ids),
      queries.selectReviewSignalsForRestaurants(ids),
    ]);

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
    const imagesMap = byRestaurant(images);
    const signalsMap = byRestaurant(reviewSignals);

    return rows
      // The isolated KK Demo Restaurant lives in the same backend as a normal
      // row, so it is filtered out unless the dev simulation is active. Demo
      // data must never reach a production read.
      .filter((row) => isDevSimulation() || slugify(row.name) !== DEV_DEMO_RESTAURANT.id)
      .map((row) => {
        const attributes = attributesMap.get(row.id) ?? [];
        return toCatalogueView(
          attachIntelligence(
            fillFromSnapshot(
              mapRestaurantRows({
                restaurant: row,
                sources: sourcesMap.get(row.id) ?? [],
                aliases: aliasesMap.get(row.id) ?? [],
                attributes,
                images: imagesMap.get(row.id) ?? [],
                reviewSignals: signalsMap.get(row.id) ?? [],
                // userReviews intentionally omitted — detail-only.
              }),
              hasBudgetAttribute(attributes),
            ),
          ),
        );
      });
  }

  async fetchById(id: string): Promise<Restaurant | undefined> {
    // Demo venue: only resolvable while the dev simulation is on (see fetchAll).
    if (!isDevSimulation() && id === DEV_DEMO_RESTAURANT.id) return undefined;
    const uuid = await resolveRestaurantUuid(id);
    if (!uuid) return undefined;
    const restaurant = await queries.selectRestaurantById(uuid);
    if (!restaurant) return undefined;
    const bundle = await fetchBundle(uuid);

    // menuEstimate is now read from attributes by the transformer.
    // Menus are fetched separately by useRestaurantMenu for the detail page display.
    return attachIntelligence(
      fillFromSnapshot(
        mapRestaurantRows({ ...bundle, restaurant }),
        hasBudgetAttribute(bundle.attributes),
      ),
    );
  }
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

/**
 * Reverse of `resolveRestaurantUuid`: given a database UUID, return the
 * frontend route slug. Used by the owner-restaurant resolution so a session
 * carrying `roles.restaurant_id` (a UUID) can be mapped back to the `Restaurant`
 * domain object (which is keyed by slug). Tries a direct UUID lookup first.
 */
export async function resolveRestaurantSlug(uuid: string): Promise<string | null> {
  const row = await queries.selectRestaurantById(uuid);
  return row ? slugify(row.name) : null;
}

/**
 * Active repository — Supabase whenever it is configured, the static catalogue
 * otherwise.
 *
 * The dev simulation deliberately does NOT switch the source. Its isolated demo
 * venue is a row in the same backend (`kk-demo-restaurant`), so it is layered by
 * the queries themselves rather than by swapping the whole catalogue out.
 * Gating the source on `isDevSimulation()` is what hid the imported data behind
 * the static snapshot: opening hours (203 venues), multi-photo galleries (206),
 * signature dishes, menu estimates and every published menu.
 */
export const restaurantRepository: RestaurantRepository = isSupabaseConfigured()
  ? new SupabaseRestaurantRepository()
  : mockRestaurantRepository;
