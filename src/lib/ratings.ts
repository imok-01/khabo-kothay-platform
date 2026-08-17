import type { Restaurant } from '../types';

/**
 * Rating source model. Every rating shown to the user is labelled with its
 * source — a Google rating is never presented as a Khabo Kothay rating.
 */
export interface RatingSourceRow {
  source: 'google' | 'khabo';
  label: string;
  rating: number;
  reviewCount: number;
}

/** "1,240" stays as-is; "12,400" → "12k", "2,481" → "2.5k". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}

/**
 * The rating rows for a restaurant in display order: Google first when its
 * data is available, then Khabo Kothay's own community rating — only when
 * the community has actually reviewed the place (never a fabricated 0.0).
 */
export function ratingSources(restaurant: Restaurant): RatingSourceRow[] {
  const rows: RatingSourceRow[] = [];
  if (restaurant.google) {
    rows.push({
      source: 'google',
      label: 'Google',
      rating: restaurant.google.rating,
      reviewCount: restaurant.google.reviewCount,
    });
  }
  if (restaurant.khabo.reviewCount > 0) {
    rows.push({
      source: 'khabo',
      label: 'Khabo Kothay',
      rating: restaurant.khabo.rating,
      reviewCount: restaurant.khabo.reviewCount,
    });
  }
  return rows;
}

/**
 * Ranking signal: the best rating we genuinely hold. Uses the Khabo Kothay
 * community rating when it exists, otherwise the Google rating — never 0 for
 * a place Google has rated. Display code must keep the two sources labelled
 * separately; this helper is only for ranking/sorting/filters.
 */
export function effectiveRating(restaurant: Restaurant): number {
  if (restaurant.khabo.reviewCount > 0) return restaurant.khabo.rating;
  return restaurant.google?.rating ?? 0;
}

/** Ranking signal: the review count behind `effectiveRating`. */
export function effectiveReviewCount(restaurant: Restaurant): number {
  if (restaurant.khabo.reviewCount > 0) return restaurant.khabo.reviewCount;
  return restaurant.google?.reviewCount ?? 0;
}
