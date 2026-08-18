import type { Restaurant } from '../types';
import type { MealType } from '../types';

/**
 * Cuisine alias mapping — bridges discovery-vocabulary cuisine terms that are
 * NOT present as database cuisine values to the verified data we actually
 * hold. Every alias matches ONLY literal, stored fields:
 *
 *  - `cuisines`     — other database cuisine values that reasonably include
 *                     the term (e.g. South Indian restaurants are tagged
 *                     "Indian" by the import).
 *  - `dishPatterns` — literal tokens matched against the venue's recorded
 *                     signature dishes (e.g. a "Khashir Kacchi Biryani"
 *                     signature dish → the "Biryani" cuisine).
 *  - `mealTypes`    — structured meal types (e.g. "Dessert").
 *
 * A term with no alias never matches — an empty result is honest, never
 * padded with guesses.
 */
export interface CuisineAlias {
  /** Database cuisine values that include this term. */
  cuisines?: string[];
  /** Literal tokens checked against signatureDishes. */
  dishPatterns?: RegExp[];
  /** Structured meal types that include this term. */
  mealTypes?: MealType[];
}

export const CUISINE_ALIASES: Record<string, CuisineAlias> = {
  Biryani: {
    dishPatterns: [/biryani|biriyani/i],
  },
  Mughlai: {
    dishPatterns: [/biryani|biriyani|kebab|kabab|kabob|korma|shahi/i],
  },
  'North Indian': {
    cuisines: ['Indian'],
    dishPatterns: [/tandoori|paneer|naan|butter chicken|dal makhani|kebab|kabab|kabob/i],
  },
  'South Indian': {
    cuisines: ['Indian'],
    dishPatterns: [/\bdosa\b|\bidli\b|\bvada\b|\bsambar\b|\budupi\b/i],
  },
  Continental: {
    dishPatterns: [/continental|pasta|risotto|steak/i],
  },
  'Street Food': {
    cuisines: ['Fast Food'],
    dishPatterns: [/chaat|fuchka|panipuri|momo|\broll\b|kathi/i],
  },
  Café: {
    dishPatterns: [/coffee|latte|espresso|cake|pastry|croissant/i],
  },
  Dessert: {
    mealTypes: ['Dessert'],
    dishPatterns: [/dessert|ice cream|brownie|waffle|pancake|sundae|mousse|firni|zorda/i],
  },
  Lebanese: {
    cuisines: ['Middle Eastern'],
    dishPatterns: [/shawarma|hummus|falafel|tabbouleh|manakish|kebab|kabab/i],
  },
};

/**
 * Whether a restaurant matches a cuisine term, using the direct cuisine value
 * first and the curated alias table as the fallback. Never fuzzy — the alias
 * only consults structured database fields.
 */
export function matchesCuisine(restaurant: Restaurant, term: string): boolean {
  if (restaurant.cuisines.includes(term)) return true;
  const alias = CUISINE_ALIASES[term];
  if (!alias) return false;
  if (
    alias.cuisines &&
    restaurant.cuisines.some((c) => (alias.cuisines as string[]).includes(c))
  ) {
    return true;
  }
  if (
    alias.dishPatterns &&
    restaurant.signatureDishes.some((dish) => alias.dishPatterns!.some((re) => re.test(dish)))
  ) {
    return true;
  }
  if (alias.mealTypes && restaurant.mealTypes.some((m) => alias.mealTypes!.includes(m))) {
    return true;
  }
  return false;
}
