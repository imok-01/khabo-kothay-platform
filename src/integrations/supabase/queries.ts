import { requireSupabase } from './client';
import type {
  FavoritesRow,
  ImageReferencesRow,
  MenuItemsRow,
  MenusRow,
  PriceObservationsRow,
  RestaurantAliasesRow,
  RestaurantAttributesRow,
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

export async function selectRestaurants(status?: RestaurantsRow['status']): Promise<RestaurantsRow[]> {
  const supabase = await requireSupabase();
  let q = supabase.from('restaurants').select('*').order('name');
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
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

export async function selectMenuItemsForMenu(menuId: string): Promise<MenuItemsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('menu_items')
    .select('*')
    .eq('menu_id', menuId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function selectPriceObservationsForItems(itemIds: string[]): Promise<PriceObservationsRow[]> {
  if (itemIds.length === 0) return [];
  const { data, error } = await (await requireSupabase())
    .from('price_observations')
    .select('*')
    .in('menu_item_id', itemIds)
    .order('observed_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export async function selectImagesForRestaurant(
  restaurantId: string,
  status: ImageReferencesRow['status'] = 'ACTIVE',
): Promise<ImageReferencesRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('image_references')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('status', status)
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

export async function selectVerificationRecordsForRestaurant(restaurantId: string): Promise<VerificationRecordsRow[]> {
  const { data, error } = await (await requireSupabase())
    .from('verification_records')
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
