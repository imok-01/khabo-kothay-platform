import type { Menu } from '../domain/menu';
import type { Restaurant } from '../types';
import { menuRepository } from '../repositories/menuRepository';

/**
 * MenuService — the app's entry point for menu data.
 *
 *   MenuSection/pages → menuService → menuRepository → data source
 *
 * Components must not import the menu seed or the demo override store
 * directly; they ask this service for the effective menu.
 */
export const menuService = {
  /** Effective menu for a restaurant (seed/admin-override today). */
  getEffectiveMenu: (restaurant: Restaurant): Menu => menuRepository.getEffectiveMenu(restaurant),

  /** Future async path when the menu lives in a backend. */
  fetchMenuForRestaurant: (restaurantId: string): Promise<Menu | null> | undefined =>
    menuRepository.fetchMenuForRestaurant?.(restaurantId),
};
