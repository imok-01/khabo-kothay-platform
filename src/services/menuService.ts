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

  // 4.3C ownership workflow — owner/KK write path. Public reads above are
  // unaffected; these only mutate menu-row status + audit columns.
  saveMenuDraft: (restaurantId: string, actor: string): Promise<string | null> =>
    menuRepository.saveMenuDraft(restaurantId, actor),
  submitMenuForReview: (menuId: string, actor: string): Promise<void> =>
    menuRepository.submitMenuForReview(menuId, actor),
  approveMenu: (menuId: string, approver: string): Promise<void> =>
    menuRepository.approveMenu(menuId, approver),
  rejectMenu: (menuId: string, approver: string, reason?: string): Promise<void> =>
    menuRepository.rejectMenu(menuId, approver, reason),
  archiveMenu: (menuId: string, actor: string): Promise<void> =>
    menuRepository.archiveMenu(menuId, actor),

  // 4.3C.4A owner edit flow — load / create / persist editable menu content.
  fetchOwnerMenu: (restaurantId: string) => menuRepository.fetchOwnerMenu(restaurantId),
  createMenuDraft: (restaurantId: string, actor: string) =>
    menuRepository.createMenuDraft(restaurantId, actor),
  saveMenuDraftContent: (menuId: string, menu: Menu, actor: string) =>
    menuRepository.saveMenuDraftContent(menuId, menu, actor),

  // 4.3C.4B executive review queue — list + compare pending submissions.
  fetchPendingMenuReviews: () => menuRepository.fetchPendingMenuReviews(),
  fetchMenuReviewPair: (menuId: string) => menuRepository.fetchMenuReviewPair(menuId),
};
