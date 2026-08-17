import type { Restaurant } from '../types';
import { getRestaurantDraft } from '../store/demoDb';

/**
 * Apply an executive-approved restaurant profile draft over the base data.
 * Only published drafts surface to the public page; drafts awaiting review
 * or rejected are never shown. Fields the admin didn't edit fall through to
 * the seed values.
 */
export function applyApprovedDraft(restaurant: Restaurant): Restaurant {
  const draft = getRestaurantDraft(restaurant.id);
  if (!draft || draft.status !== 'published') return restaurant;
  return {
    ...restaurant,
    name: draft.name ?? restaurant.name,
    address: draft.address ?? restaurant.address,
    openingHours: draft.openingHours ?? restaurant.openingHours,
    cuisines: draft.cuisines ?? restaurant.cuisines,
    tagline: draft.tagline ?? restaurant.tagline,
    description: draft.description ?? restaurant.description,
    khabo: draft.highlights
      ? { ...restaurant.khabo, highlights: draft.highlights }
      : restaurant.khabo,
  };
}
