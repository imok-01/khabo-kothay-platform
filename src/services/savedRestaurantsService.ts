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
  /** Load saved restaurant ids. */
  load: (): string[] => savedRestaurantRepository.load(),

  /** Persist the current saved id list. */
  save: (ids: string[]): void => savedRestaurantRepository.save(ids),

  /** Add an id to the stored list (deduped). */
  add: (id: string): void => {
    const ids = savedRestaurantRepository.load();
    if (!ids.includes(id)) savedRestaurantRepository.save([...ids, id]);
  },

  /** Remove an id from the stored list. */
  remove: (id: string): void => {
    savedRestaurantRepository.save(savedRestaurantRepository.load().filter((x) => x !== id));
  },

  /** True when the id is stored. */
  has: (id: string): boolean => savedRestaurantRepository.load().includes(id),
};
