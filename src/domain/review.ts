/**
 * KK community review — the review a Khabo Kothay user writes about a
 * restaurant. Deliberately separate from external review signals (Google
 * etc.), which stay in `domain/place.ts` (`ExternalPlaceData`/`review_signals`).
 *
 * Mirrors the approved `user_reviews` table shape plus the demo-only fields
 * the current UI uses. `store/demoDb` re-exports this type for backward
 * compatibility — components should prefer this module going forward.
 */
export interface UserReview {
  id: string;
  restaurantId: string;
  userId: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  visitStatus?: 'visited' | 'regular';
  visitCount?: number;
  favoriteDishes?: string[];
  helpfulCount: number;
  /** Editable by the author only. */
  edited?: boolean;
}
