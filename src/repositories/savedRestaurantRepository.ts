import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';

/**
 * SavedRestaurantRepository — the seam between the "Saved" (bookmark) list
 * and storage.
 *
 *   SavedContext → savedRestaurantsService → savedRestaurantRepository → storage
 *
 * "Saved" is a bookmark list (quick access), deliberately distinct from
 * Favourites (a preference signal that shapes recommendations). The mock
 * implementation keeps the current UX: saved ids live in localStorage, keyed
 * by frontend restaurant slug. The Supabase implementation targets the
 * approved `saved_restaurants` table (user_id + restaurant_id, unique).
 * NOTE: `saved_restaurants.restaurant_id` is a restaurant UUID while frontend
 * routes use slugs — the future service layer must map slug ↔ UUID (via the
 * import's stored `slug` attribute) before bookmarks can be database-backed.
 */
export interface SavedRestaurantRepository {
  /** Load saved restaurant ids (frontend slugs) for the current user. */
  load(userId: string | null): string[];
  /** Persist the current saved id list for the current user. */
  save(userId: string | null, ids: string[]): void;
  /** Future async path: a user's saved rows from the DB. */
  fetchIdsForUser?(userId: string): Promise<string[]>;
  /** Future async path: add a saved row. */
  addForUser?(userId: string, restaurantId: string): Promise<void>;
  /** Future async path: remove a saved row. */
  removeForUser?(userId: string, restaurantId: string): Promise<void>;
}

/** Get the storage key for the current user. */
function getStorageKey(userId: string | null): string {
  return userId ? `khabo-kothay:saved-restaurants:${userId}` : 'khabo-kothay:saved-restaurants:anonymous';
}

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export const mockSavedRestaurantRepository: SavedRestaurantRepository = {
  load: (userId: string | null) => readIds(getStorageKey(userId)),
  save: (userId: string | null, ids: string[]) => {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
    } catch {
      // storage unavailable — saved list just won't persist
    }
  },
};

class SupabaseSavedRestaurantRepository implements SavedRestaurantRepository {
  load(userId: string | null): string[] {
    return readIds(getStorageKey(userId));
  }

  save(userId: string | null, ids: string[]): void {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
    } catch {
      // noop
    }
  }

  async fetchIdsForUser(userId: string): Promise<string[]> {
    const rows = await queries.selectSavedRestaurantsForUser(userId);
    return rows.map((r) => r.restaurant_id);
  }

  async addForUser(userId: string, restaurantId: string): Promise<void> {
    await queries.insertSavedRestaurant(userId, restaurantId);
  }

  async removeForUser(userId: string, restaurantId: string): Promise<void> {
    await queries.deleteSavedRestaurant(userId, restaurantId);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const savedRestaurantRepository: SavedRestaurantRepository = isSupabaseConfigured()
  ? new SupabaseSavedRestaurantRepository()
  : mockSavedRestaurantRepository;