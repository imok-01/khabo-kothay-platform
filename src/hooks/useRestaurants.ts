import { useCallback, useEffect, useRef, useState } from 'react';
import type { Restaurant } from '../types';
import { fetchAllRestaurants, fetchRestaurant, getAllRestaurantsSync, getRestaurantSync } from '../lib/api';
import { isPrerender } from '../lib/prerender';

export interface AsyncState<T> {
  status: 'loading' | 'ready' | 'error';
  data: T | null;
}

interface UseRestaurantsResult extends AsyncState<Restaurant[]> {
  reload: () => void;
}

/**
 * Loads the full restaurant catalogue. Returns previous data during a reload
 * so the UI never flashes an empty state on retry.
 */
export function useRestaurants(): UseRestaurantsResult {
  // Prerender: seed the state synchronously — server-side renders never run
  // the loading effect, so the initial state is what ends up in the HTML.
  const [state, setState] = useState<AsyncState<Restaurant[]>>(() =>
    isPrerender()
      ? { status: 'ready', data: getAllRestaurantsSync() }
      : { status: 'loading', data: null },
  );
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setState((s) => ({ status: 'loading', data: s.data }));
    let cancelled = false;
    fetchAllRestaurants()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ status: 'error', data: s.data }));
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, reload };
}

interface UseRestaurantResult extends AsyncState<Restaurant> {
  reload: () => void;
}

export function useRestaurant(id: string | undefined): UseRestaurantResult {
  const [state, setState] = useState<AsyncState<Restaurant>>(() =>
    isPrerender()
      ? { status: 'ready', data: id ? (getRestaurantSync(id) ?? null) : null }
      : { status: 'loading', data: null },
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ status: 'ready', data: null });
      return;
    }
    setState((s) => ({ status: 'loading', data: s.data }));
    let cancelled = false;
    fetchRestaurant(id)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data: data ?? null });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ status: 'error', data: s.data }));
      });
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  return { ...state, reload };
}
