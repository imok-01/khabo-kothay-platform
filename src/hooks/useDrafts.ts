import {
  getRestaurantDraft,
  resolveSuggestion,
  upsertRestaurantDraft,
  upsertSuggestion,
  useRestaurantDrafts,
  useSuggestions,
  type RestaurantDraft,
} from '../store/demoDb';

/**
 * Draft/suggestion adapter — the hooks-layer seam for the restaurant-draft
 * and intelligence-suggestion workflow (owner edits → executive approval).
 */
export {
  getRestaurantDraft,
  resolveSuggestion,
  upsertRestaurantDraft,
  upsertSuggestion,
  useRestaurantDrafts,
  useSuggestions,
  type RestaurantDraft,
};
