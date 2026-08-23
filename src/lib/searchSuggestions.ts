import type { Restaurant } from '../types';
import { SPECIALTIES } from '../domain/intelligence';

export type SuggestionType = 'Restaurant' | 'Cuisine' | 'Area' | 'Specialty';

export interface SearchSuggestion {
  type: SuggestionType;
  value: string;
  /** stable key for list rendering */
  id: string;
}

export interface SuggestionOptions {
  restaurants: Restaurant[];
  cuisines: readonly string[];
  neighborhoods: readonly string[];
  /** total cap; defaults to 8 */
  limit?: number;
}

/**
 * Build lightweight, zero-egress search suggestions from in-memory data only:
 * restaurant names, curated cuisines, neighbourhoods and specialties. No
 * Supabase, no menu/price/review loading. Empty query → no suggestions.
 */
export function getSuggestions(query: string, opts: SuggestionOptions): SearchSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const limit = opts.limit ?? 8;

  const names: SearchSuggestion[] = opts.restaurants
    .filter((r) => r.name.toLowerCase().includes(q))
    .slice(0, 4)
    .map((r) => ({ type: 'Restaurant', value: r.name, id: `r-${r.id}` }));

  const cuisines: SearchSuggestion[] = opts.cuisines
    .filter((c) => c.toLowerCase().includes(q))
    .slice(0, 3)
    .map((c) => ({ type: 'Cuisine', value: c, id: `c-${c}` }));

  const areas: SearchSuggestion[] = opts.neighborhoods
    .filter((n) => n.toLowerCase().includes(q))
    .slice(0, 3)
    .map((n) => ({ type: 'Area', value: n, id: `a-${n}` }));

  const specialties: SearchSuggestion[] = SPECIALTIES.filter((s) => s.toLowerCase().includes(q))
    .slice(0, 3)
    .map((s) => ({ type: 'Specialty', value: s, id: `s-${s}` }));

  return [...names, ...cuisines, ...areas, ...specialties].slice(0, limit);
}
