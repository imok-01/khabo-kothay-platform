import { savedRestaurantRepository } from '../repositories/savedRestaurantRepository';

/**
 * SavedRestaurantsService — the app's entry point for the user's bookmarked
 * ("Saved") restaurants.
 *
 *   SavedContext → savedRestaurantsService → savedRestaurantRepository → storage
 *
 * Today this is localStorage keyed by restaurant slug (existing UX pattern).
 * When the approved `saved_restaurants` table backs this, the repository swap
 * happens here — the context/UI keep the same `string[]` of ids.
 */
export const savedRestaurantsService = {
  /** Load saved restaurant ids for the current user. */
  load: (userId: string | null): string[] => savedRestaurantRepository.load(userId),

  /** Persist the current saved id list for the current user. */
  save: (userId: string | null, ids: string[]): void => savedRestaurantRepository.save(userId, ids),

  /** Add an id to the stored list (deduped). */
  add: (userId: string | null, id: string): void => {
    const ids = savedRestaurantRepository.load(userId);
    if (!ids.includes(id)) savedRestaurantRepository.save(userId, [...ids, id]);
  },

  /** Remove an id from the stored list. */
  remove: (userId: string | null, id: string): void => {
    savedRestaurantRepository.save(userId, savedRestaurantRepository.load(userId).filter((x) => x !== id));
  },

  /** True when the id is stored. */
  has: (userId: string | null, id: string): boolean => savedRestaurantRepository.load(userId).includes(id),
};