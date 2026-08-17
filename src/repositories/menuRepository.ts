import type { Menu } from '../domain/menu';
import type { Restaurant } from '../types';
import { getMenuForRestaurant } from '../data/menus';
import { getMenuOverride } from '../store/demoDb';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapMenuRows } from '../transformers/menu';

/**
 * MenuRepository — the seam between menu data and the UI.
 *
 *   MenuSection/pages → menuService → menuRepository → data source
 *
 * The current UI path is synchronous (`getEffectiveMenu`), which the mock
 * implementation serves from the seed + demo admin overrides. A future
 * Supabase backend is async, so the interface also exposes an optional async
 * `fetchMenuForRestaurant` — wiring it in later must not change the sync path
 * that the prerenderer depends on.
 */

export interface MenuRepository {
  /** Sync effective menu (mock-backed today; used by UI + prerender). */
  getEffectiveMenu(restaurant: Restaurant): Menu;
  /** Future async path for a real backend (optional). */
  fetchMenuForRestaurant?(restaurantId: string): Promise<Menu | null>;
}

/** Mock implementation: admin-authored override wins over the seeded menu. */
export const mockMenuRepository: MenuRepository = {
  getEffectiveMenu: (restaurant) => getMenuOverride(restaurant.id) ?? getMenuForRestaurant(restaurant),
};

/** Supabase implementation — reads menus/menu_items/price_observations. */
class SupabaseMenuRepository implements MenuRepository {
  getEffectiveMenu(_restaurant: Restaurant): Menu {
    // The sync path has no backend equivalent; Supabase menus must be loaded
    // through the async path and attached before render.
    throw new Error(
      'SupabaseMenuRepository has no sync getEffectiveMenu — load menus via fetchMenuForRestaurant first.',
    );
  }

  async fetchMenuForRestaurant(restaurantId: string): Promise<Menu | null> {
    const [menus, sources] = await Promise.all([
      queries.selectMenusForRestaurant(restaurantId),
      queries.selectSourcesForRestaurant(restaurantId),
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
