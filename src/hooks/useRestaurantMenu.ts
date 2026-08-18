import { useCallback, useEffect, useState } from 'react';
import type { Menu } from '../domain/menu';
import type { Restaurant } from '../types';
import { menuService } from '../services/menuService';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { isPrerender } from '../lib/prerender';

/**
 * Menu loading for public pages.
 *
 *  - Mock mode / build-time prerender: the menu is derived synchronously from
 *    the restaurant object via the demo store (`getEffectiveMenu`) — the menu
 *    renders in the same frame as the restaurant, with no loading flash, and
 *    the prerendered HTML keeps its menu content (approved D2 snapshot).
 *  - Supabase configured (runtime): loads the real menu via
 *    `menuService.fetchMenuForRestaurant` with explicit loading / ready /
 *    empty / error states, plus a retry. `empty` means the database has no
 *    menu rows for the venue (honest "not verified yet" state).
 *
 * Demo admin surfaces do NOT use this hook: they manage the demo store by
 * design and keep using the sync `getEffectiveMenu` accessor.
 */
export interface RestaurantMenuState {
  status: 'loading' | 'ready' | 'empty' | 'error';
  menu: Menu | null;
  reload: () => void;
}

export function useRestaurantMenu(restaurant: Restaurant | undefined): RestaurantMenuState {
  const supabase = isSupabaseConfigured();
  const prerender = isPrerender();
  const useSyncPath = !supabase || prerender;

  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((a) => a + 1), []);
  const [asyncState, setAsyncState] = useState<{ status: RestaurantMenuState['status']; menu: Menu | null }>({
    status: 'loading',
    menu: null,
  });

  // Sync path (mock + prerender): derive directly every render — the menu
  // stays correct as the restaurant changes, with no async fetch and no flash.
  const syncState: RestaurantMenuState = {
    status: restaurant ? 'ready' : 'loading',
    menu: restaurant ? menuService.getEffectiveMenu(restaurant) : null,
    reload,
  };

  useEffect(() => {
    if (useSyncPath) return; // sync derivation handles this mode
    if (!restaurant) {
      setAsyncState({ status: 'loading', menu: null });
      return;
    }
    let cancelled = false;
    setAsyncState({ status: 'loading', menu: null });
    menuService
      .fetchMenuForRestaurant(restaurant.id)
      .then((menu) => {
        if (cancelled) return;
        setAsyncState(menu ? { status: 'ready', menu } : { status: 'empty', menu: null });
      })
      .catch(() => {
        if (!cancelled) setAsyncState({ status: 'error', menu: null });
      });
    return () => {
      cancelled = true;
    };
  }, [restaurant, useSyncPath, attempt]);

  return useSyncPath ? syncState : { ...asyncState, reload };
}
