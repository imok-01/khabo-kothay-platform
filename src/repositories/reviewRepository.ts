import type { UserReview } from '../domain/review';
import type { KhaboReview } from '../domain/place';
import { getUserReviews, upsertUserReview, deleteUserReview } from '../store/demoDb';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapUserReviewRows } from '../transformers/review';
import { isDevSimulation, assertDevSimulationNotProduction } from '../lib/devSimulation';
import { DEV_DEMO_REVIEWS, KK_DEMO_RESTAURANT_ID } from '../data/devSimulation';

// Production safety: never load the dev simulation in a production build.
assertDevSimulationNotProduction();

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
  getForRestaurant: (restaurantId) => {
    const stored = getUserReviews().filter((r) => r.restaurantId === restaurantId);
    const dev = isDevSimulation() && restaurantId === KK_DEMO_RESTAURANT_ID ? DEV_DEMO_REVIEWS : [];
    return [...stored, ...dev];
  },
  getAll: () => [...getUserReviews(), ...(isDevSimulation() ? DEV_DEMO_REVIEWS : [])],
  upsert: (review) => upsertUserReview(review),
  remove: (id) => deleteUserReview(id),
};

class SupabaseReviewRepository implements ReviewRepository {
  // KK user reviews are part of the demo auth system until Supabase Auth is
  // wired (a separate approved step). The sync paths keep serving the demo
  // store — same D2 pattern as the user repository — so the detail page's
  // review section never crashes while Supabase serves restaurant data.
  // The async paths below are the Supabase future paths.
  getForRestaurant(restaurantId: string): UserReview[] {
    return getUserReviews().filter((r) => r.restaurantId === restaurantId);
  }

  getAll(): UserReview[] {
    return getUserReviews();
  }

  upsert(review: UserReview): void {
    upsertUserReview(review);
  }

  remove(id: string): void {
    deleteUserReview(id);
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

/** Active repository — dev simulation forces the mock store; Supabase otherwise. */
export const reviewRepository: ReviewRepository = isDevSimulation()
  ? mockReviewRepository
  : isSupabaseConfigured()
    ? new SupabaseReviewRepository()
    : mockReviewRepository;
