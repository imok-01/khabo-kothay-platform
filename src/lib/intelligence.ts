import type { Restaurant } from '../types';
import type { BestFor, DiningFeature, FoodCharacteristic, RestaurantIntelligence, Specialty } from '../domain/intelligence';
import { seedIntelligence } from '../data/intelligence';
import { getSuggestions } from '../store/demoDb';

const FIELDS = ['specialties', 'bestFor', 'foodCharacteristics', 'diningFeatures'] as const;

function empty(provenance: RestaurantIntelligence['provenance']): RestaurantIntelligence {
  return { specialties: [], bestFor: [], foodCharacteristics: [], diningFeatures: [], provenance };
}

/* ------------------------------------------------------------------ */
/* Verified-attribute derivation                                       */
/* ------------------------------------------------------------------ */

/**
 * Derived intelligence — built ONLY from verified database attributes the
 * transformer already carries (cuisines, mealTypes, signatureDishes, and the
 * dining booleans). Every value lands in a controlled vocabulary term, and
 * each is backed by a literal, verified fact:
 *
 *  - cuisine 'Pizza' → specialty 'Pizza' (a Pizza venue is known for pizza)
 *  - mealType 'Dessert' → specialty 'Desserts' + 'Dessert-focused'
 *  - a signature dish literally containing a curated token (e.g. "Kacchi
 *    Biryani" → 'Biryani') → that specialty
 *
 * Signature-dish matching is a STRICT token allowlist — never fuzzy text, and
 * never a description scrape. Unmapped dishes contribute nothing rather than
 * a guessed claim.
 */
const CUISINE_SPECIALTIES: Record<string, Specialty> = {
  Pizza: 'Pizza',
  Burgers: 'Burgers',
  Seafood: 'Seafood',
};

const MEAL_SPECIALTIES: Record<string, Specialty> = {
  Breakfast: 'Breakfast',
  Brunch: 'Breakfast',
  Dessert: 'Desserts',
};

const MEAL_BEST_FOR: Record<string, BestFor[]> = {
  Breakfast: ['Breakfast'],
  Brunch: ['Breakfast', 'Lunch'],
  Lunch: ['Lunch'],
  Snacks: ['Quick bite'],
  Dinner: ['Dinner', 'Late night'],
};

const MEAL_CHARACTERISTICS: Record<string, FoodCharacteristic> = {
  Dessert: 'Dessert-focused',
  Snacks: 'Quick bites',
};

const DISH_SPECIALTIES: Array<[RegExp, Specialty]> = [
  [/biryani|biriyani/i, 'Biryani'],
  [/kebab|kabab|kabob/i, 'Kebab'],
  [/\bdosa\b/i, 'Dosa'],
  [/pizza/i, 'Pizza'],
  [/burger/i, 'Burgers'],
  [/coffee/i, 'Coffee'],
  [/\broll\b/i, 'Rolls'],
  [/momo/i, 'Momos'],
  [/dumpling|dim sum|jiaozi/i, 'Dim Sum'],
  [/noodle|chowmein|udon|ramen|wok/i, 'Wok'],
  [/chaat/i, 'Chaat'],
  [/curry/i, 'Curry'],
  [/thali/i, 'Thali'],
  [/sourdough/i, 'Sourdough'],
  [/tiffin/i, 'Tiffin'],
  [/awadhi/i, 'Awadhi'],
  [/seafood|sashimi|prawn|shrimp|squid|calamari|\bfish\b|loitta|bhetki|chingri|ilish|shutki|chitol/i, 'Seafood'],
  [/firni|zorda|mousse|brownie|waffle|pancake|sundae|ice cream|dessert/i, 'Desserts'],
  [/breakfast|omelette|french toast/i, 'Breakfast'],
  [/kolkata/i, 'Kolkata-style'],
  [/fine dining/i, 'Fine dining'],
];

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Map the verified attributes a restaurant already carries into structured
 * recommendation metadata. Returns an all-empty (provenance 'verified')
 * object when there is nothing to derive — it never invents.
 */
export function deriveIntelligence(r: Restaurant): RestaurantIntelligence {
  const specialties = unique<Specialty>([
    ...r.cuisines.flatMap((c) => (CUISINE_SPECIALTIES[c] ? [CUISINE_SPECIALTIES[c]] : [])),
    ...r.mealTypes.flatMap((m) => (MEAL_SPECIALTIES[m] ? [MEAL_SPECIALTIES[m]] : [])),
    ...r.signatureDishes.flatMap((dish) =>
      DISH_SPECIALTIES.filter(([re]) => re.test(dish)).map(([, s]) => s),
    ),
  ]);

  const bestFor = unique<BestFor>(r.mealTypes.flatMap((m) => MEAL_BEST_FOR[m] ?? []));

  const foodCharacteristics = unique<FoodCharacteristic>(
    r.mealTypes.flatMap((m) => (MEAL_CHARACTERISTICS[m] ? [MEAL_CHARACTERISTICS[m]] : [])),
  );

  const diningFeatures = unique<DiningFeature>([
    ...(r.hasDelivery ? ['Delivery' as const] : []),
    ...(r.hasOutdoorSeating ? ['Outdoor seating' as const] : []),
    ...(r.isFamilyFriendly ? ['Family friendly' as const] : []),
  ]);

  return { specialties, bestFor, foodCharacteristics, diningFeatures, provenance: 'verified' };
}

/**
 * Effective (executive-approved) recommendation metadata for a restaurant.
 *
 * Baseline is the curated seed table; approved restaurant-admin suggestions
 * are layered on top (additions first, then removals). Nothing a restaurant
 * merely *suggests* ever appears here — only suggestions an executive has
 * approved. Reads are live, so an approval updates the recommendation engine
 * immediately without a reload.
 *
 * When given a full `Restaurant` object (not a bare id) and the venue has no
 * curated seed — the Dhaka catalogue today — the baseline falls back to
 * `deriveIntelligence`, so recommendation/specialty surfaces run on verified
 * database attributes instead of an empty (or wrong-city) seed.
 */
export function getEffectiveIntelligence(restaurant: Restaurant | string): RestaurantIntelligence {
  const id = typeof restaurant === 'string' ? restaurant : restaurant.id;
  const seed = seedIntelligence(id);
  const derived = typeof restaurant === 'string' ? undefined : deriveIntelligence(restaurant);

  const base: RestaurantIntelligence = seed
    ? {
        specialties: [...seed.specialties],
        bestFor: [...seed.bestFor],
        foodCharacteristics: [...seed.foodCharacteristics],
        diningFeatures: [...seed.diningFeatures],
        provenance: 'seed',
      }
    : derived
      ? { ...derived }
      : empty('seed');

  const approved = getSuggestions().filter(
    (s) => s.restaurantId === id && s.status === 'approved',
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
  return { ...restaurant, intelligence: getEffectiveIntelligence(restaurant) };
}

/** Attach effective intelligence to every restaurant in a list. */
export function attachIntelligenceToAll(list: Restaurant[]): Restaurant[] {
  return list.map(attachIntelligence);
}
