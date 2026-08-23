import { useCallback, useEffect, useState } from 'react';
import type { ReviewSample } from '../repositories/reviewSamplesRepository';
import { reviewSamplesService } from '../services/reviewSamplesService';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { isPrerender } from '../lib/prerender';

export interface ReviewSamplesState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  samples: ReviewSample[];
  reload: () => void;
}

export function useReviewSamples(restaurantId: string | undefined): ReviewSamplesState {
  const supabase = isSupabaseConfigured();
  const prerender = isPrerender();
  const useSyncPath = !supabase || prerender;

  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const [asyncState, setAsyncState] = useState<{ status: ReviewSamplesState['status']; samples: ReviewSample[] }>({
    status: 'loading',
    samples: [],
  });

  const syncState: ReviewSamplesState = {
    status: 'empty',
    samples: [],
    reload,
  };

  useEffect(() => {
    if (useSyncPath) return;
    if (!restaurantId) {
      setAsyncState({ status: 'empty', samples: [] });
      return;
    }
    let cancelled = false;
    setAsyncState({ status: 'loading', samples: [] });
    reviewSamplesService
      .fetchForRestaurant(restaurantId)
      .then((samples) => {
        if (cancelled) return;
        setAsyncState(samples.length > 0 ? { status: 'ready', samples } : { status: 'empty', samples: [] });
      })
      .catch(() => {
        if (!cancelled) setAsyncState({ status: 'error', samples: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, useSyncPath, attempt]);

  return useSyncPath ? syncState : { ...asyncState, reload };
}
