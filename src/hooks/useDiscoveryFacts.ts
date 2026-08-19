import { useCallback, useEffect, useState } from 'react';
import type { DiscoveryFact } from '../domain/discoveryFacts';
import { discoveryFactsService } from '../services/discoveryFactsService';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { isPrerender } from '../lib/prerender';

/**
 * Discovery facts loading for public pages.
 *
 *  - Mock mode / build-time prerender: there are no facts in the demo store,
 *    so the sync path honestly reports `empty` and the "Why consider this
 *    place" section stays hidden (no fabricated content, no flash).
 *  - Supabase configured (runtime): loads approved facts via
 *    `discoveryFactsService.fetchApprovedForRestaurant` with explicit loading
 *    / ready / empty / error states, plus a retry. `empty` means the database
 *    has no approved facts for the venue.
 */
export interface DiscoveryFactsState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  facts: DiscoveryFact[];
  reload: () => void;
}

export function useDiscoveryFacts(restaurantId: string | undefined): DiscoveryFactsState {
  const supabase = isSupabaseConfigured();
  const prerender = isPrerender();
  const useSyncPath = !supabase || prerender;

  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const [asyncState, setAsyncState] = useState<{ status: DiscoveryFactsState['status']; facts: DiscoveryFact[] }>({
    status: 'loading',
    facts: [],
  });

  // Sync path (mock + prerender): no discovery facts exist in the demo store,
  // so the section is honestly empty — never invented.
  const syncState: DiscoveryFactsState = {
    status: 'empty',
    facts: [],
    reload,
  };

  useEffect(() => {
    if (useSyncPath) return; // sync path handles this mode
    if (!restaurantId) {
      setAsyncState({ status: 'empty', facts: [] });
      return;
    }
    let cancelled = false;
    setAsyncState({ status: 'loading', facts: [] });
    discoveryFactsService
      .fetchApprovedForRestaurant(restaurantId)
      .then((facts) => {
        if (cancelled) return;
        setAsyncState(facts.length > 0 ? { status: 'ready', facts } : { status: 'empty', facts: [] });
      })
      .catch(() => {
        if (!cancelled) setAsyncState({ status: 'error', facts: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [restaurantId, useSyncPath, attempt]);

  return useSyncPath ? syncState : { ...asyncState, reload };
}