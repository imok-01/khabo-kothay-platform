import type { Menu } from '../domain/menu';
import type { Restaurant } from '../types';
import { restaurants as seedRestaurants } from '../data/restaurants';
import { getMenuForRestaurant } from '../data/menus';
import { getMenuOverride } from '../store/demoDb';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapMenuRows } from '../transformers/menu';
import { resolveRestaurantUuid } from './restaurantRepository';

/**
 * MenuRepository — the seam between menu data and the UI.
 *
 *   MenuSection/pages → menuService → menuRepository → data source
 *
 * Two accessors exist:
 *
 *  - `getEffectiveMenu(restaurant)` — the DEMO-STORE accessor (seed +
 *    admin-authored localStorage overrides). It ALWAYS serves the demo store,
 *    even when Supabase is configured, because its consumers are the demo
 *    admin surfaces (Executive dashboard, Restaurant admin) that manage that
 *    store, plus the build-time prerender snapshot (approved D2). It never
 *    throws.
 *
 *  - `fetchMenuForRestaurant(restaurantId)` — the ASYNC path. Supabase when
 *    configured (menus → menu_items → price_observations through the
 *    transformer), the demo store otherwise. Public pages use this path so
 *    they render real data when the backend is live.
 */
export interface MenuRepository {
  /** Demo-store accessor (seed + localStorage overrides) — never throws. */
  getEffectiveMenu(restaurant: Restaurant): Menu;
  /** Async menu load — Supabase when configured, demo store otherwise. */
  fetchMenuForRestaurant(restaurantId: string): Promise<Menu | null>;
}

/** Demo store implementation: admin-authored override wins over the seed. */
export const mockMenuRepository: MenuRepository = {
  getEffectiveMenu: (restaurant) => getMenuOverride(restaurant.id) ?? getMenuForRestaurant(restaurant),
  async fetchMenuForRestaurant(restaurantId: string): Promise<Menu | null> {
    const restaurant = seedRestaurants.find((r) => r.id === restaurantId);
    if (!restaurant) return null;
    return getMenuOverride(restaurant.id) ?? getMenuForRestaurant(restaurant);
  },
};

/** Supabase implementation — reads menus/menu_items/price_observations. */
class SupabaseMenuRepository implements MenuRepository {
  // Sync accessor = the demo store (see class doc). Supabase has no sync
  // path; the demo admin surfaces and the build snapshot keep using the demo
  // store regardless of which backend is active.
  getEffectiveMenu(restaurant: Restaurant): Menu {
    return mockMenuRepository.getEffectiveMenu(restaurant);
  }

  async fetchMenuForRestaurant(restaurantId: string): Promise<Menu | null> {
    // Route ids are slugs, but the DB keys menus by the restaurant UUID.
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return null;
    const [menus, sources] = await Promise.all([
      queries.selectMenusForRestaurant(uuid),
      queries.selectSourcesForRestaurant(uuid),
    ]);
    if (menus.length === 0) return null;

    const itemsByMenu: Record<string, Awaited<ReturnType<typeof queries.selectMenuItemsForMenu>>> = {};
    const observationsByItem: Record<string, Awaited<ReturnType<typeof queries.selectPriceObservationsForItems>>> = {};
    for (const menu of menus) {
      const items = await queries.selectMenuItemsForMenu(menu.id);
      itemsByMenu[menu.id] = items;
      const observations = await queries.selectPriceObservationsForItems(items.map((i) => i.id));
      for (const o of observations) {
        (observationsByItem[o.menu_item_id] ??= []).push(o);
      }
    }

    return mapMenuRows({ menus, itemsByMenu, observationsByItem, sources }) ?? null;
  }
}

/** Active repository — Supabase when configured, the mock otherwise. */
export const menuRepository: MenuRepository = isSupabaseConfigured()
  ? new SupabaseMenuRepository()
  : mockMenuRepository;
