import type { KhaboReview } from '../domain/place';
import type { ReviewSignalsRow, UserReviewsRow } from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved review rows → the frontend's SEPARATED
 * review models. The spec is explicit that external reputation signals
 * (review_signals) and KK community reviews (user_reviews) must never be
 * merged — this module keeps that boundary.
 *
 * - `review_signals` → summarized external reputation (rating, review count).
 * - `user_reviews`  → KK community reviews only.
 */

/** External reputation summary for one source (e.g. google). */
export function mapReviewSignal(rows: ReviewSignalsRow[], source: string):
  | { rating: number; reviewCount: number }
  | undefined {
  const signal = rows.find((s) => s.source?.toLowerCase().includes(source.toLowerCase()));
  if (!signal) return undefined;
  return {
    rating: signal.rating ?? 0,
    reviewCount: signal.review_count ?? 0,
  };
}

/** Aggregate KK community reviews into a rating/count summary (0 when none). */
export function aggregateKhaboReviews(rows: UserReviewsRow[]): {
  rating: number;
  reviewCount: number;
} {
  const rated = rows.filter((r) => r.rating !== null);
  const rating = rated.length > 0
    ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
    : 0;
  return { rating, reviewCount: rows.length };
}

/** KK user reviews → frontend KhaboReview (author names need a future join). */
export function mapUserReviewRows(rows: UserReviewsRow[]): KhaboReview[] {
  return rows.map((r) => ({
    id: r.id,
    author: 'Khabo Kothay member',
    rating: r.rating ?? 0,
    date: r.created_at ?? '',
    comment: r.review_text ?? '',
    helpfulCount: 0,
  }));
}
