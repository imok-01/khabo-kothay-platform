import { upsertFlag, useFlags, useUserReviews } from '../store/demoDb';
import { reviewService } from '../services/reviewService';

/**
 * Reviews adapter — the hooks-layer seam for user reviews and review
 * moderation (flags). Components/pages import from here, never from the demo
 * store or the review service directly.
 */
export { reviewService, upsertFlag, useFlags, useUserReviews };
