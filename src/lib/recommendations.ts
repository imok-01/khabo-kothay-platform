import type { Restaurant, SortKey } from '../types';
import { restaurantService } from '../services/restaurantService';
import { distanceKm, type GeoPoint } from './geo';
import { effectiveRating, effectiveReviewCount } from './ratings';

export interface RecommendationWeights {
  cuisine: number;
  budget: number;
  location: number;
  mealType: number;
  rating: number;
}

const DEFAULT_WEIGHTS: RecommendationWeights = {
  // Cuisine is the dominant signal — a same-street café must never outrank
  // the same-cuisine house a neighbourhood away.
  cuisine: 8,
  budget: 3,
  location: 2,
  mealType: 2,
  rating: 1,
};

/**
 * Content-based similarity scoring between two restaurants.
 * Returns a score in [0, ~10] — higher means more similar.
 */
export function similarityScore(
  a: Restaurant,
  b: Restaurant,
  weights: RecommendationWeights = DEFAULT_WEIGHTS,
): number {
  if (a.id === b.id) return 0;

  let score = 0;

  // Shared cuisines are the strongest signal.
  const sharedCuisines = a.cuisines.filter((c) => b.cuisines.includes(c)).length;
  const maxCuisines = Math.max(a.cuisines.length, b.cuisines.length, 1);
  score += weights.cuisine * (sharedCuisines / maxCuisines);

  // Same budget tier.
  if (a.budget === b.budget) score += weights.budget;

  // Same neighbourhood (or a modest neighbourhood bonus is skipped — exact match only).
  if (a.location === b.location) score += weights.location;

  // Shared meal types.
  const sharedMeals = a.mealTypes.filter((m) => b.mealTypes.includes(m)).length;
  const maxMeals = Math.max(a.mealTypes.length, b.mealTypes.length, 1);
  score += weights.mealType * (sharedMeals / maxMeals);

  // Slight preference for highly rated restaurants (best genuine rating).
  score += weights.rating * ((effectiveRating(a) + effectiveRating(b)) / 10);

  return score;
}

/**
 * Restaurants most similar to `source` (excluding itself), ranked by score.
 */
export function recommendSimilar(
  source: Restaurant,
  count = 4,
  pool: Restaurant[] = restaurantService.getAllSync(),
): Restaurant[] {
  return pool
    .filter((r) => r.id !== source.id)
    .map((r) => ({ restaurant: r, score: similarityScore(source, r) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, count)
    .map(({ restaurant }) => restaurant);
}

/**
 * Personalised picks based on a user's favourite cuisines / restaurants.
 * If the user has no favourites yet, falls back to the highest-rated,
 * most popular restaurants.
 */
export function recommendForUser(
  favoriteIds: string[],
  count = 6,
  pool: Restaurant[] = restaurantService.getAllSync(),
): Restaurant[] {
  const favs = pool.filter((r) => favoriteIds.includes(r.id));

  if (favs.length === 0) {
    // Fallback: top rated with a popularity tie-break.
    return [...pool]
      .sort(
        (a, b) =>
          effectiveRating(b) * Math.log(effectiveReviewCount(b) + 1) -
          effectiveRating(a) * Math.log(effectiveReviewCount(a) + 1),
      )
      .slice(0, count);
  }

  // Score every candidate against the user's whole favourite set.
  return pool
    .filter((r) => !favoriteIds.includes(r.id))
    .map((r) => {
      const favScore = favs.reduce(
        (sum, fav) => sum + similarityScore(fav, r),
        0,
      );
      return { restaurant: r, score: favScore };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, count)
    .map(({ restaurant }) => restaurant);
}

/**
 * A "surprise me" pick: a highly rated restaurant that is a bit off the
 * beaten path — random among the top half of the pool.
 */
export function surprisePick(pool: Restaurant[] = restaurantService.getAllSync()): Restaurant {
  const topHalf = pool
    .filter((r) => effectiveRating(r) >= 4.0)
    .sort((a, b) => effectiveRating(b) - effectiveRating(a))
    .slice(0, Math.max(6, Math.ceil(pool.length / 2)));
  return topHalf[Math.floor(Math.random() * topHalf.length)];
}

/**
 * Rank restaurants by the sort key a user chose on the explore page.
 * `reference` is required for the distance sort and is ignored otherwise.
 */
export function sortRestaurants(
  list: Restaurant[],
  sortBy: SortKey,
  reference?: GeoPoint,
): Restaurant[] {
  const sorted = [...list];
  // Venues with unknown pricing sort after priced ones in price orders.
  const priced = (r: Restaurant) => (r.priceForTwo > 0 ? r.priceForTwo : Number.POSITIVE_INFINITY);
  switch (sortBy) {
    case 'rating':
      return sorted.sort((a, b) => effectiveRating(b) - effectiveRating(a) || effectiveReviewCount(b) - effectiveReviewCount(a));
    case 'price-low':
      return sorted.sort((a, b) => priced(a) - priced(b));
    case 'price-high':
      return sorted.sort((a, b) => priced(b) - priced(a));
    case 'distance':
      return reference
        ? sorted.sort((a, b) => distanceKm(reference, a) - distanceKm(reference, b))
        : sorted;
    case 'popularity':
      return sorted.sort((a, b) => effectiveReviewCount(b) - effectiveReviewCount(a));
    default:
      return sorted.sort(
        (a, b) =>
          effectiveRating(b) * Math.log(effectiveReviewCount(b) + 1) -
          effectiveRating(a) * Math.log(effectiveReviewCount(a) + 1),
      );
  }
}
