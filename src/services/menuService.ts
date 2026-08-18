import type { Menu } from '../domain/menu';
import type { Restaurant } from '../types';
import { menuRepository } from '../repositories/menuRepository';

/**
 * MenuService — the app's entry point for menu data.
 *
 *   MenuSection/pages → menuService → menuRepository → data source
 *
 * Two accessors (mirroring the repository):
 *  - `getEffectiveMenu` — demo-store accessor (seed + admin overrides). Used
 *    by demo admin surfaces and the build-time prerender; never throws.
 *  - `fetchMenuForRestaurant` — async path. Supabase when configured, the
 *    demo store otherwise. Public pages use this so they render real data
 *    when the backend is live.
 *
 * Components must not import the menu seed or the demo override store
 * directly; they ask this service for the menu.
 */
export const menuService = {
  /** Demo-store effective menu for a restaurant (seed/admin override). */
  getEffectiveMenu: (restaurant: Restaurant): Menu => menuRepository.getEffectiveMenu(restaurant),

  /** Async menu load — Supabase when configured, demo store otherwise. */
  fetchMenuForRestaurant: (restaurantId: string): Promise<Menu | null> =>
    menuRepository.fetchMenuForRestaurant(restaurantId),
};
