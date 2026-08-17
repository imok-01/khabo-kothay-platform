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
  /** Load favourite restaurant ids. */
  load: (): string[] => favoriteRepository.load(),

  /** Persist the current favourite id list. */
  save: (ids: string[]): void => favoriteRepository.save(ids),

  /** Add an id to the stored list (deduped). */
  add: (id: string): void => {
    const ids = favoriteRepository.load();
    if (!ids.includes(id)) favoriteRepository.save([...ids, id]);
  },

  /** Remove an id from the stored list. */
  remove: (id: string): void => {
    favoriteRepository.save(favoriteRepository.load().filter((x) => x !== id));
  },

  /** True when the id is stored. */
  has: (id: string): boolean => favoriteRepository.load().includes(id),
};
