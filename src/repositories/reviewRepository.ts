import type { UserReview } from '../domain/review';
import type { KhaboReview } from '../domain/place';
import { getUserReviews, upsertUserReview, deleteUserReview } from '../store/demoDb';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapUserReviewRows } from '../transformers/review';

/**
 * ReviewRepository — KK community reviews only.
 *
 * External reputation (Google ratings/review counts) is NOT part of this
 * repository — it lives on the restaurant (review_signals via the restaurant
 * transformer) and stays visually separated in the UI (RatingSource etc.).
 * This matches the spec: external review signals and KK user reviews must
 * never be merged.
 */

export interface ReviewRepository {
  /** All KK user reviews for a restaurant (mock-backed today). */
  getForRestaurant(restaurantId: string): UserReview[];
  /** All KK user reviews across the catalogue. */
  getAll(): UserReview[];
  /** Create or update a review by id. */
  upsert(review: UserReview): void;
  /** Delete a review by id. */
  remove(id: string): void;
  /** Future async path: user_reviews rows for a restaurant. */
  fetchUserReviewsForRestaurant?(restaurantId: string): Promise<KhaboReview[]>;
  /** Future async path: insert a KK user review. */
  insertForUser?(restaurantId: string, userId: string, rating: number, reviewText: string | null): Promise<void>;
}

/** Mock implementation — demo localStorage store. */
export const mockReviewRepository: ReviewRepository = {
  getForRestaurant: (restaurantId) => getUserReviews().filter((r) => r.restaurantId === restaurantId),
  getAll: () => getUserReviews(),
  upsert: (review) => upsertUserReview(review),
  remove: (id) => deleteUserReview(id),
};

class SupabaseReviewRepository implements ReviewRepository {
  // Sync paths have no backend equivalent; Supabase reviews flow through the
  // async methods below. Throwing keeps a misconfiguration loud.
  getForRestaurant(_restaurantId: string): UserReview[] {
    throw new Error('SupabaseReviewRepository has no sync path — use fetchUserReviewsForRestaurant.');
  }

  getAll(): UserReview[] {
    throw new Error('SupabaseReviewRepository has no sync path.');
  }

  upsert(_review: UserReview): void {
    throw new Error('SupabaseReviewRepository has no sync path — use insertForUser.');
  }

  remove(_id: string): void {
    throw new Error('SupabaseReviewRepository has no sync path.');
  }

  async fetchUserReviewsForRestaurant(restaurantId: string): Promise<KhaboReview[]> {
    const rows = await queries.selectUserReviewsForRestaurant(restaurantId);
    return mapUserReviewRows(rows);
  }

  async insertForUser(
    restaurantId: string,
    userId: string,
    rating: number,
    reviewText: string | null,
  ): Promise<void> {
    await queries.insertUserReview(restaurantId, userId, rating, reviewText);
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const reviewRepository: ReviewRepository = isSupabaseConfigured()
  ? new SupabaseReviewRepository()
  : mockReviewRepository;
