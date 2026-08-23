import { requireSupabase } from './client';
import type {
  FavoritesRow,
  ImageReferencesRow,
  Json,
  MenuItemsRow,
  MenusRow,
  PriceObservationsRow,
  RestaurantAliasesRow,
  RestaurantAttributesRow,
  RestaurantDiscoveryFactsRow,
  RestaurantSourcesRow,
  RestaurantTagsRow,
  RestaurantsRow,
  ReviewSamplesRow,
  ReviewSignalsRow,
  RolesRow,
  SavedRestaurantsRow,
  UserProfilesRow,
  UserReviewsRow,
  VerificationRecordsRow,
} from './database.types';

/**
 * Typed query layer against the approved Khabo Kothay schema.
 *
 * Every function here is a thin, row-level SELECT/INSERT/DELETE against the
 * tables from KHABO_KOTHAY_DATABASE_FOUNDATION_v1.1_FINAL_MIGRATION.sql.
 * Aggregate composition (rows → domain objects) happens in the repository +
 * transformer layers, never here.
 *
 * None of these functions run today: the active repositories use the mock
 * source unless Supabase is configured. They exist so the future backend
 * swap is a one-line repository selection, not a rewrite.
 */

/* ------------------------------------------------------------------ */
/* Restaurants + identity                                              */
/* ------------------------------------------------------------------ */

/**
 * All restaurants, optionally filtered by lifecycle status. The FULL_IMPORT_v2
 * pipeline marks every venue `UNKNOWN` (lifecycle not yet classified) — that
 * must NOT hide a restaurant from discovery, so callers should omit the
 * status filter unless they explicitly want a lifecycle subset.
 */
export async function selectRestaurants(status?: RestaurantsRow['status']): Promise<RestaurantsRow[]> {
  const supabase = await requireSupabase();
  let q = supabase.from('restaurants').select('*').order('name');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Lightweight id + name pairs — used to resolve a route slug to a UUID. */
export async function selectRestaurantIds(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await (await requireSupabase())
    .from('restaurants')
    .select('id, name');
  if (error) throw error;
  return data ?? [];
}

export async function selectRestaurantById(id: string): Promise<RestaurantsRow | null> {
  const { data, error } = await (await requireSupabase())
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function selectSourcesForRestaurant(restaurantId: string): Promise<RestaurantSourcesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('restaurant_sources')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

export async function selectRestaurantAliasesForRestaurant(restaurantId: string): Promise<RestaurantAliasesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('restaurant_aliases')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

export async function selectAttributesForRestaurant(restaurantId: string): Promise<RestaurantAttributesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('restaurant_attributes')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

export async function selectTagsForRestaurant(restaurantId: string): Promise<RestaurantTagsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('restaurant_tags')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Batched variants — used by the catalogue path to avoid N+1 queries  */
/* ------------------------------------------------------------------ */

/** Split an id list into chunks that stay safely under PostgREST's URL-length limits. */
function chunkIds(ids: string[], size = 80): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

async function inChunks<T extends { restaurant_id: string }>(
  table: 'restaurant_sources' | 'restaurant_aliases' | 'restaurant_attributes' | 'restaurant_tags' | 'review_signals',
  ids: string[],
): Promise<T[]> {
  if (ids.length === 0) return [];
  const parts = await Promise.all(
    chunkIds(ids).map(async (chunk) => {
      const { data, error } = await (await requireSupabase())
        .from(table)
        .select('*')
        .in('restaurant_id', chunk);
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    }),
  );
  return parts.flat();
}

/**
 * Rows per page. PostgREST caps responses at ~1,000 rows by default and a
 * larger request is SILENTLY truncated rather than rejected — the batched
 * catalogue queries must page so no venue's rows are ever dropped.
 */
const PAGE_SIZE = 1000;

/**
 * Fetch every row matching an `.in(id, …)` filter, paging past PostgREST's
 * ~1,000-row response cap with `.range()`. Stops when a page returns fewer
 * than `PAGE_SIZE` rows (the final page). `orderBy` is the primary sort; the
 * row `id` is appended as a deterministic tie-breaker so page boundaries never
 * split or drop rows that share the same sort key (import timestamps are not
 * unique).
 */
async function inPages<T extends { id: string }>(
  table: 'menu_items' | 'price_observations',
  column: 'menu_id' | 'menu_item_id',
  ids: string[],
  orderBy: string,
): Promise<T[]> {
  if (ids.length === 0) return [];
  const parts = await Promise.all(
    chunkIds(ids).map(async (chunk) => {
      const supabase = await requireSupabase();
      const rows: T[] = [];
      let from = 0;
      for (;;) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .in(column, chunk)
          .order(orderBy, { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const page = (data ?? []) as unknown as T[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return rows;
    }),
  );
  return parts.flat();
}

/** All sources for many restaurants in a handful of batched requests. */
export async function selectSourcesForRestaurants(restaurantIds: string[]): Promise<RestaurantSourcesRow[]> {
  return inChunks<RestaurantSourcesRow>('restaurant_sources', restaurantIds);
}

export async function selectRestaurantAliasesForRestaurants(restaurantIds: string[]): Promise<RestaurantAliasesRow[]> {
  return inChunks<RestaurantAliasesRow>('restaurant_aliases', restaurantIds);
}

export async function selectAttributesForRestaurants(restaurantIds: string[]): Promise<RestaurantAttributesRow[]> {
  return inChunks<RestaurantAttributesRow>('restaurant_attributes', restaurantIds);
}

export async function selectTagsForRestaurants(restaurantIds: string[]): Promise<RestaurantTagsRow[]> {
  return inChunks<RestaurantTagsRow>('restaurant_tags', restaurantIds);
}

export async function selectReviewSignalsForRestaurants(restaurantIds: string[]): Promise<ReviewSignalsRow[]> {
  return inChunks<ReviewSignalsRow>('review_signals', restaurantIds);
}

/** Images for many restaurants (status filter preserved). */
export async function selectImagesForRestaurants(
  restaurantIds: string[],
  statuses: ImageReferencesRow['status'][] = ['ACTIVE', 'PENDING'],
): Promise<ImageReferencesRow[]> {
  if (restaurantIds.length === 0) return [];
  const parts = await Promise.all(
    chunkIds(restaurantIds).map(async (chunk) => {
      let q = (await requireSupabase())
        .from('image_references')
        .select('*')
        .in('restaurant_id', chunk)
        .in('status', statuses)
        .order('created_at', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    }),
  );
  return parts.flat();
}

/** KK user reviews for many restaurants. */
export async function selectUserReviewsForRestaurants(restaurantIds: string[]): Promise<UserReviewsRow[]> {
  if (restaurantIds.length === 0) return [];
  const parts = await Promise.all(
    chunkIds(restaurantIds).map(async (chunk) => {
      const { data, error } = await (await requireSupabase())
        .from('user_reviews')
        .select('*')
        .in('restaurant_id', chunk)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }),
  );
  return parts.flat();
}

/* ------------------------------------------------------------------ */
/* Menus + pricing                                                     */
/* ------------------------------------------------------------------ */

export async function selectMenusForRestaurant(restaurantId: string): Promise<MenusRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('menus')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** A single menu row by id (executive review uses this to anchor a detail load). */
export async function selectMenuById(menuId: string): Promise<MenusRow | null> {
  const { data, error } = await (await requireSupabase())
    .from('menus')
    .select('*')
    .eq('id', menuId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** All menus in a given lifecycle status — used by the executive review queue. */
export async function selectMenusByStatus(status: MenusRow['status']): Promise<MenusRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('menus')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function selectMenuItemsForMenu(menuId: string): Promise<MenuItemsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('menu_items')
    .select('*')
    .eq('menu_id', menuId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** All menus for many restaurants (batched — catalogue path, no N+1). */
export async function selectMenusForRestaurants(restaurantIds: string[]): Promise<MenusRow[]> {
  if (restaurantIds.length === 0) return [];
  const parts = await Promise.all(
    chunkIds(restaurantIds).map(async (chunk) => {
      const { data, error } = await (await requireSupabase())
        .from('menus')
        .select('*')
        .in('restaurant_id', chunk)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }),
  );
  return parts.flat();
}

/** All items for many menus (batched — catalogue path, no N+1). */
export async function selectMenuItemsForMenus(menuIds: string[]): Promise<MenuItemsRow[]> {
  return inPages<MenuItemsRow>('menu_items', 'menu_id', menuIds, 'created_at');
}

export async function selectPriceObservationsForItems(itemIds: string[]): Promise<PriceObservationsRow[]> {
  return inPages<PriceObservationsRow>('price_observations', 'menu_item_id', itemIds, 'observed_at');
}

/**
 * Owner / KK write path for the 4.3C menu lifecycle. `insertMenu` creates a
 * DRAFT (or any status the caller is permitted to write under RLS); `updateMenu`
 * applies a PATCH (status transitions, audit columns). Both are row-level and
 * type narrow — aggregate composition stays in the repository/transformer layer.
 * They do not run unless Supabase is configured.
 */
export async function insertMenu(menu: Omit<MenusRow, 'id'>): Promise<MenusRow> {
  const { data, error } = await (await requireSupabase())
    .from('menus')
    .insert(menu)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function updateMenu(menuId: string, patch: Partial<MenusRow>): Promise<MenusRow | null> {
  const { data, error } = await (await requireSupabase())
    .from('menus')
    .update(patch)
    .eq('id', menuId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Owner menu content write — proxies to the `upsert_menu_content` RPC, which
 * atomically replaces a menu's items + price observations within a single
 * transaction. The function runs SECURITY INVOKER, so RLS still scopes every
 * statement to the calling owner's restaurant (see PROPOSED_1_12). `items` and
 * `observations` are plain JSON arrays shaped by `ownerMenuToContent`.
 */
export async function upsertMenuContent(menuId: string, items: Json[], observations: Json[]): Promise<void> {
  const supabase = await requireSupabase();
  const { error } = await supabase.rpc('upsert_menu_content', {
    p_menu_id: menuId,
    p_items: items,
    p_observations: observations,
  });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export async function selectImagesForRestaurant(
  restaurantId: string,
  statuses: ImageReferencesRow['status'][] = ['ACTIVE', 'PENDING'],
): Promise<ImageReferencesRow[]> {
  // Status handling decision (approved): ACTIVE + PENDING images are displayed.
  // PENDING means "available, not yet verified" — the UI may show the image but
  // must never claim it is verified. Imported references are PENDING by design;
  // filtering only ACTIVE would hide every available photo. REJECTED/ARCHIVED
  // images are never shown.
  let q = (await requireSupabase())
    .from('image_references')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .in('status', statuses)
    .order('created_at', { ascending: true });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Discovery facts                                                     */
/* ------------------------------------------------------------------ */

/**
 * Approved discovery facts for one restaurant. The anon RLS policy already
 * hides everything but APPROVED; the explicit filter keeps this query honest
 * even if policies ever change.
 */
export async function selectApprovedDiscoveryFactsForRestaurant(
  restaurantId: string,
): Promise<RestaurantDiscoveryFactsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('restaurant_discovery_facts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Reviews (external signals + KK user reviews, kept separate)         */
/* ------------------------------------------------------------------ */

export async function selectReviewSignalsForRestaurant(restaurantId: string): Promise<ReviewSignalsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('review_signals')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

/**
 * Verification records for one restaurant, read through the anon-safe
 * `verification_records_public` view (see PROPOSED_1_7_verification_public_view.sql).
 *
 * The base `verification_records` table stays RLS-restricted (anon reads
 * denied) so admin/owner data never leaks. The view projects only the public
 * columns (field_name, field_value, status, verification_source, verified_at)
 * and runs as the view owner (security_invoker = false), so the frontend can
 * render a "verified address" badge on detail pages without any admin access.
 */
export async function selectVerificationRecordsForRestaurant(restaurantId: string): Promise<VerificationRecordsRow[]> {
  // Read through the anon-safe `verification_records_public` view. The cast to
  // the `verification_records` table name is type-only (erased at runtime, so
  // PostgREST still targets the view); the view's row shape matches the table
  // exactly. We avoid registering the view in the generated `Database` type to
  // keep the fragile Views/insert inference untouched (PROPOSED_1_7 creates it).
  const { data, error } = await (await requireSupabase())
    .from('verification_records_public' as 'verification_records')
    .select('*')
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
  return data ?? [];
}

export async function selectReviewSamplesForRestaurant(restaurantId: string): Promise<ReviewSamplesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('review_samples')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('observed_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function selectUserReviewsForRestaurant(restaurantId: string): Promise<UserReviewsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('user_reviews')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertUserReview(
  restaurantId: string,
  userId: string,
  rating: number,
  reviewText: string | null,
): Promise<UserReviewsRow> {
  const { data, error } = await (await requireSupabase())
    .from('user_reviews')
    .insert({ restaurant_id: restaurantId, user_id: userId, rating, review_text: reviewText })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* Users / favorites                                                   */
/* ------------------------------------------------------------------ */

export async function selectProfileForUser(userId: string): Promise<UserProfilesRow | null> {
  const { data, error } = await (await requireSupabase())
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertUserProfile(userId: string, displayName: string | null, phoneNumber: string | null): Promise<UserProfilesRow> {
  const { data, error } = await (await requireSupabase())
    .from('user_profiles')
    .insert({ user_id: userId, display_name: displayName, phone_number: phoneNumber })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function selectRolesForUser(userId: string): Promise<RolesRow[]> {
  const { data, error } = await (await requireSupabase()).from('roles').select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function selectFavoritesForUser(userId: string): Promise<FavoritesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('favorites')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function selectSavedRestaurantsForUser(userId: string): Promise<SavedRestaurantsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('saved_restaurants')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function insertFavorite(userId: string, restaurantId: string): Promise<void> {
  const { error } = await (await requireSupabase())
    .from('favorites')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error) throw error;
}

export async function deleteFavorite(userId: string, restaurantId: string): Promise<void> {
  const { error } = await (await requireSupabase())
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

export async function insertSavedRestaurant(userId: string, restaurantId: string): Promise<void> {
  const { error } = await (await requireSupabase())
    .from('saved_restaurants')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error) throw error;
}

export async function deleteSavedRestaurant(userId: string, restaurantId: string): Promise<void> {
  const { error } = await (await requireSupabase())
    .from('saved_restaurants')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}
