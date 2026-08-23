import { useUserReviews } from '../store/demoDb';
import { reviewService } from '../services/reviewService';
import { upsertFlag, useFlags } from './useReports';

/**
 * Reviews adapter — the hooks-layer seam for user reviews and review
 * moderation (flags). Components/pages import from here, never from the demo
 * store or the review service directly. Report persistence (restaurant flags)
 * is handled by useReports (Supabase when configured).
 */
export { reviewService, upsertFlag, useFlags, useUserReviews };
