import type { UserReview } from '../domain/review';
import { reviewRepository } from '../repositories/reviewRepository';

/**
 * ReviewService — KK community reviews only.
 *
 *   components/pages → reviewService → reviewRepository → data source
 *
 * External reputation signals are NOT routed through here — they stay on the
 * restaurant (review_signals) and are rendered with source labels. This keeps
 * the spec's external-vs-community review separation in the data layer.
 */
export const reviewService = {
  /** All KK user reviews for a restaurant. */
  getForRestaurant: (restaurantId: string): UserReview[] =>
    reviewRepository.getForRestaurant(restaurantId),

  /** All KK user reviews across the catalogue. */
  getAll: (): UserReview[] => reviewRepository.getAll(),

  /** Create or update a review. */
  upsert: (review: UserReview): void => reviewRepository.upsert(review),

  /** Delete a review. */
  remove: (id: string): void => reviewRepository.remove(id),

  /** Future async path when reviews live in a backend. */
  fetchForRestaurant: (restaurantId: string): Promise<Awaited<ReturnType<NonNullable<typeof reviewRepository.fetchUserReviewsForRestaurant>>>> | undefined =>
    reviewRepository.fetchUserReviewsForRestaurant?.(restaurantId),

  /** Future async path: insert a KK user review. */
  insertForUser: (
    restaurantId: string,
    userId: string,
    rating: number,
    reviewText: string | null,
  ): Promise<void> | undefined => reviewRepository.insertForUser?.(restaurantId, userId, rating, reviewText),
};
