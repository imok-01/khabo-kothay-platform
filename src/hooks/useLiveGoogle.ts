import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { GoogleRefreshMeta, LiveGoogleSnapshot } from '../domain/liveGoogle';
import {
  getGoogleRefreshMeta,
  getGoogleSnapshot,
  refreshGooglePlaceData,
  subscribeGoogleRefresh,
} from '../services/googleDataService';

/** Stable idle metadata — returned when no place ID is tracked (avoid re-render loops). */
const IDLE_META: GoogleRefreshMeta = { status: 'idle' };

export interface LiveGoogleState {
  /** Current in-memory snapshot, if one was fetched this session. */
  snapshot?: LiveGoogleSnapshot;
  /** Operational refresh metadata (idle/refreshing/updated/failed/unavailable). */
  meta: GoogleRefreshMeta;
  /** Whether a refresh is currently in flight. */
  refreshing: boolean;
  /** Manually trigger a controlled refresh now. */
  refresh: (force?: boolean) => Promise<LiveGoogleSnapshot | null>;
}

/**
 * Live Google data for one place ID.
 *
 * On mount the hook performs an on-demand refresh only when the session
 * doesn't already hold a fresh snapshot (24h window) — the restaurant page
 * shows current Google rating/count/reviews/hours without re-fetching on
 * every visit, and never polls in the background.
 */
export function useLiveGoogle(placeId: string | undefined): LiveGoogleState {
  const placeIdRef = useRef(placeId);
  placeIdRef.current = placeId;

  const subscribe = useCallback((cb: () => void) => subscribeGoogleRefresh(cb), []);
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (placeIdRef.current ? getGoogleSnapshot(placeIdRef.current) : undefined),
    () => undefined,
  );
  const meta = useSyncExternalStore(
    subscribe,
    () => (placeIdRef.current ? getGoogleRefreshMeta(placeIdRef.current) : IDLE_META),
    () => IDLE_META,
  );

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!placeId) return;
    // On-demand freshness: fetch when we have no snapshot yet. The service's
    // freshness window protects against re-fetching on every page visit.
    void refreshGooglePlaceData(placeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeId]);

  const refresh = useCallback(async (force = true) => {
    if (!placeIdRef.current) return null;
    setRefreshing(true);
    try {
      return await refreshGooglePlaceData(placeIdRef.current, { force });
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { snapshot, meta, refreshing, refresh };
}
