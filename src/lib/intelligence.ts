import type { Restaurant } from '../types';
import type { RestaurantIntelligence } from '../domain/intelligence';
import { seedIntelligence } from '../data/intelligence';
import { getSuggestions } from '../store/demoDb';

const FIELDS = ['specialties', 'bestFor', 'foodCharacteristics', 'diningFeatures'] as const;

function empty(provenance: RestaurantIntelligence['provenance']): RestaurantIntelligence {
  return { specialties: [], bestFor: [], foodCharacteristics: [], diningFeatures: [], provenance };
}

/**
 * Effective (executive-approved) recommendation metadata for a restaurant.
 *
 * Baseline is the curated seed table; approved restaurant-admin suggestions
 * are layered on top (additions first, then removals). Nothing a restaurant
 * merely *suggests* ever appears here — only suggestions an executive has
 * approved. Reads are live, so an approval updates the recommendation engine
 * immediately without a reload.
 */
export function getEffectiveIntelligence(restaurantId: string): RestaurantIntelligence {
  const seed = seedIntelligence(restaurantId);
  const base: RestaurantIntelligence = seed
    ? {
        specialties: [...seed.specialties],
        bestFor: [...seed.bestFor],
        foodCharacteristics: [...seed.foodCharacteristics],
        diningFeatures: [...seed.diningFeatures],
        provenance: 'seed',
      }
    : empty('seed');

  const approved = getSuggestions().filter(
    (s) => s.restaurantId === restaurantId && s.status === 'approved',
  );
  if (approved.length === 0) return base;

  const effective: RestaurantIntelligence = { ...base, provenance: 'suggested' };
  for (const field of FIELDS) {
    let values = [...base[field]] as string[];
    for (const s of approved) {
      if (s.field !== field) continue;
      for (const v of s.add) if (!values.includes(v)) values.push(v);
      values = values.filter((v) => !s.remove.includes(v));
    }
    effective[field] = values as never;
  }
  return effective;
}

/** Attach effective intelligence to a restaurant object (shareable snapshot). */
export function attachIntelligence(restaurant: Restaurant): Restaurant {
  return { ...restaurant, intelligence: getEffectiveIntelligence(restaurant.id) };
}

/** Attach effective intelligence to every restaurant in a list. */
export function attachIntelligenceToAll(list: Restaurant[]): Restaurant[] {
  return list.map(attachIntelligence);
}
