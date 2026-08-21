import { favoriteRepository } from '../repositories/favoriteRepository';

/**
 * FavoritesService — the app's entry point for the user's saved restaurants.
 *
 *   FavoritesContext → favoritesService → favoriteRepository → storage
 *
 * Today this is localStorage keyed by restaurant slug (existing UX preserved).
 * When the approved `favorites` table backs this, the repository swap happens
 * here — the context/UI keep the same `string[]` of ids.
 */
export const favoritesService = {
  /** Load favourite restaurant ids for the current user. */
  load: (userId: string | null): string[] => favoriteRepository.load(userId),

  /** Persist the current favourite id list for the current user. */
  save: (userId: string | null, ids: string[]): void => favoriteRepository.save(userId, ids),

  /** Add an id to the stored list (deduped). */
  add: (userId: string | null, id: string): void => {
    const ids = favoriteRepository.load(userId);
    if (!ids.includes(id)) favoriteRepository.save(userId, [...ids, id]);
  },

  /** Remove an id from the stored list. */
  remove: (userId: string | null, id: string): void => {
    favoriteRepository.save(userId, favoriteRepository.load(userId).filter((x) => x !== id));
  },

  /** True when the id is stored. */
  has: (userId: string | null, id: string): boolean => favoriteRepository.load(userId).includes(id),
};