import type { ReviewSamplesRow } from '../integrations/supabase/database.types';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { resolveRestaurantUuid } from './restaurantRepository';

export interface ReviewSample {
  id: string;
  restaurantId: string;
  reviewText: string;
  attribution: string;
  source: string;
  sourceUrl: string | null;
  observedAt: string | null;
}

export interface ReviewSamplesRepository {
  fetchForRestaurant(restaurantId: string): Promise<ReviewSample[]>;
}

function mapRow(row: ReviewSamplesRow): ReviewSample {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    reviewText: row.review_text ?? '',
    attribution: row.attribution ?? 'Google User',
    source: row.source ?? 'Google',
    sourceUrl: row.source_url,
    observedAt: row.observed_at,
  };
}

export const mockReviewSamplesRepository: ReviewSamplesRepository = {
  async fetchForRestaurant(): Promise<ReviewSample[]> {
    return [];
  },
};

class SupabaseReviewSamplesRepository implements ReviewSamplesRepository {
  async fetchForRestaurant(restaurantId: string): Promise<ReviewSample[]> {
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return [];
    const rows = await queries.selectReviewSamplesForRestaurant(uuid);
    // Hard cap 3 — DB has max 3 per venue (2 for BurgerGo), but enforce here too
    return rows.slice(0, 3).map(mapRow);
  }
}

export const reviewSamplesRepository: ReviewSamplesRepository = isSupabaseConfigured()
  ? new SupabaseReviewSamplesRepository()
  : mockReviewSamplesRepository;
