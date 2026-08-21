import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';

/**
 * FavoriteRepository — the seam between favourites state and storage.
 *
 *   FavoritesContext → favoritesService → favoriteRepository → storage
 *
 * The mock implementation preserves the CURRENT UX exactly: favourites live
 * in localStorage, keyed by frontend restaurant slug. The Supabase
 * implementation targets the approved `favorites` table (user_id +
 * restaurant_id, unique). NOTE: `favorites.restaurant_id` is a restaurant
 * UUID while frontend routes use slugs — the future service layer must map
 * slug ↔ UUID (via the import's stored `slug` attribute) before favourites
 * can be backed by the database. This is a documented mapping step, not a
 * schema change.
 */

export interface FavoriteRepository {
  /** Load favourite restaurant ids (frontend slugs) for the current user. */
  load(userId: string | null): string[];
  /** Persist the current favourite id list for the current user. */
  save(userId: string | null, ids: string[]): void;
  /** Future async path: a user's favourite rows from the DB. */
  fetchIdsForUser?(userId: string): Promise<string[]>;
  /** Future async path: add a favourite row. */
  addForUser?(userId: string, restaurantId: string): Promise<void>;
  /** Future async path: remove a favourite row. */
  removeForUser?(userId: string, restaurantId: string): Promise<void>;
}

/** Get the storage key for the current user. */
function getStorageKey(userId: string | null): string {
  return userId ? `khabo-kothay:favorites:${userId}` : 'khabo-kothay:favorites:anonymous';
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

export const mockFavoriteRepository: FavoriteRepository = {
  load: (userId: string | null) => readIds(getStorageKey(userId)),
  save: (userId: string | null, ids) => {
    try {
      localStorage.setItem(getStorageKey(userId), JSON.stringify(ids));
    } catch {
      // storage unavailable — favourites just won't persist
    }
  },
};

class SupabaseFavoriteRepository implements FavoriteRepository {
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
    const rows = await queries.selectFavoritesForUser(userId);
    return rows.map((r) => r.restaurant_id);
  }

  async addForUser(userId: string, restaurantId: string): Promise<void> {
    await queries.insertFavorite(userId, restaurantId);
  }

  async removeForUser(userId: string, restaurantId: string): Promise<void> {
    await queries.deleteFavorite(userId, restaurantId);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const favoriteRepository: FavoriteRepository = isSupabaseConfigured()
  ? new SupabaseFavoriteRepository()
  : mockFavoriteRepository;
