import type { Menu } from '../domain/menu';
import type { Json, MenuStatus, MenusRow } from '../integrations/supabase/database.types';
import type { Restaurant } from '../types';
import { restaurants as seedRestaurants } from '../data/restaurants';
import { getMenuForRestaurant } from '../data/menus';
import { getMenuOverride } from '../store/demoDb';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import * as queries from '../integrations/supabase/queries';
import { mapMenuRows, mapOwnerMenu, ownerMenuToContent, pickWorkingMenu } from '../transformers/menu';
import { resolveRestaurantUuid } from './restaurantRepository';
import { isDevSimulation, assertDevSimulationNotProduction } from '../lib/devSimulation';
import { DEV_DEMO_RESTAURANT, DEV_DEMO_MENU } from '../data/devSimulation';

// Production safety: never load the dev simulation in a production build.
assertDevSimulationNotProduction();

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

  /**
   * 4.3C ownership workflow — owner/KK write path. These mutate ONLY menu rows
   * (status + audit columns) and never feed the public read selection, which
   * stays PUBLISHED/ACTIVE-only (see transformers/menu.ts). Supabase when
   * configured; the mock mirrors status to an isolated in-memory registry so
   * dev can exercise the flow without ever leaking drafts into public reads.
   */
  /** Create/refresh a DRAFT for a restaurant; returns the new draft menu id. */
  saveMenuDraft(restaurantId: string, actor: string): Promise<string | null>;
  /** Owner submits a DRAFT for KK review (DRAFT → PENDING_REVIEW). */
  submitMenuForReview(menuId: string, actor: string): Promise<void>;
  /** KK executive approves → PUBLISHED (the ONLY path to public visibility). */
  approveMenu(menuId: string, approver: string): Promise<void>;
  /** KK executive rejects → ARCHIVED (never deleted; owner may resubmit). */
  rejectMenu(menuId: string, approver: string, reason?: string): Promise<void>;
  /** Archive a PUBLISHED menu (takes it out of public view). */
  archiveMenu(menuId: string, actor: string): Promise<void>;

  /**
   * 4.3C.4A owner edit flow — load the editable ("working") menu for a
   * restaurant: the latest DRAFT, else PENDING_REVIEW, else PUBLISHED. Returns
   * the domain `Menu`, its lifecycle `status`, and the backing `menuId`.
   */
  fetchOwnerMenu(restaurantId: string): Promise<{
    menu: Menu | null;
    status: MenuStatus | null;
    menuId: string | null;
  }>;

  /** Create a new empty DRAFT menu row for a restaurant; returns its id. */
  createMenuDraft(restaurantId: string, actor: string): Promise<string | null>;

  /** Persist full menu content (items + observations) under a DRAFT menu row. */
  saveMenuDraftContent(menuId: string, menu: Menu, actor: string): Promise<void>;

  /**
   * 4.3C.4B executive review queue — list submissions awaiting decision.
   * Returns lightweight rows (no content) for the queue table.
   */
  fetchPendingMenuReviews(): Promise<Array<{
    menuId: string;
    restaurantId: string;
    restaurantName: string;
    title: string | null;
    submittedAt: string | null;
    submittedBy: string | null;
  }>>;

  /**
   * 4.3C.4B executive review detail — load the submitted menu alongside the
   * restaurant's currently PUBLISHED menu so the executive can compare them.
   */
  fetchMenuReviewPair(menuId: string): Promise<{
    submitted: Menu | null;
    published: Menu | null;
    restaurantId: string | null;
  }>;
}

/**
 * Isolated demo-side workflow registry. The mock (no-Supabase) path keeps
 * draft/review status here so development can exercise the 4.3C lifecycle
 * without a backend. It is deliberately NOT the same store that powers public
 * reads (`getMenuOverride`/`getMenuForRestaurant`), so a demo DRAFT can never
 * surface on a public page. Demo data stays isolated from production.
 */
const demoDraftRegistry = new Map<string, { restaurantId: string; status: MenuStatus }>();

/** Demo store implementation: admin-authored override wins over the seed. */
export const mockMenuRepository: MenuRepository = {
  getEffectiveMenu: (restaurant) => {
    if (isDevSimulation() && restaurant.id === DEV_DEMO_RESTAURANT.id) {
      return getMenuOverride(restaurant.id) ?? DEV_DEMO_MENU;
    }
    return getMenuOverride(restaurant.id) ?? getMenuForRestaurant(restaurant);
  },
  async fetchMenuForRestaurant(restaurantId: string): Promise<Menu | null> {
    if (isDevSimulation() && restaurantId === DEV_DEMO_RESTAURANT.id) {
      return getMenuOverride(restaurantId) ?? DEV_DEMO_MENU;
    }
    const restaurant = seedRestaurants.find((r) => r.id === restaurantId);
    if (!restaurant) return null;
    return getMenuOverride(restaurant.id) ?? getMenuForRestaurant(restaurant);
  },

  async saveMenuDraft(restaurantId: string, _actor: string): Promise<string | null> {
    const id = `demo-draft-${restaurantId}-${Date.now()}`;
    demoDraftRegistry.set(id, { restaurantId, status: 'DRAFT' });
    return id;
  },
  async submitMenuForReview(menuId: string, _actor: string): Promise<void> {
    const d = demoDraftRegistry.get(menuId);
    if (d) d.status = 'PENDING_REVIEW';
  },
  async approveMenu(menuId: string, _approver: string): Promise<void> {
    const d = demoDraftRegistry.get(menuId);
    if (d) d.status = 'PUBLISHED';
  },
  async rejectMenu(menuId: string, _approver: string, _reason?: string): Promise<void> {
    const d = demoDraftRegistry.get(menuId);
    if (d) d.status = 'ARCHIVED';
  },
  async archiveMenu(menuId: string, _actor: string): Promise<void> {
    const d = demoDraftRegistry.get(menuId);
    if (d) d.status = 'ARCHIVED';
  },

  async fetchOwnerMenu(restaurantId: string): Promise<{ menu: Menu | null; status: MenuStatus | null; menuId: string | null }> {
    if (isDevSimulation() && restaurantId === DEV_DEMO_RESTAURANT.id) {
      const override = getMenuOverride(restaurantId);
      return { menu: override ?? DEV_DEMO_MENU, status: 'PUBLISHED', menuId: override ? 'override' : null };
    }
    const r = seedRestaurants.find((x) => x.id === restaurantId);
    const menu = r ? getMenuOverride(r.id) ?? getMenuForRestaurant(r) : null;
    return { menu, status: menu ? 'PUBLISHED' : null, menuId: null };
  },

  async createMenuDraft(_restaurantId: string, _actor: string): Promise<string | null> {
    return `demo-draft-${_restaurantId}-${Date.now()}`;
  },

  async saveMenuDraftContent(_menuId: string, _menu: Menu, _actor: string): Promise<void> {
    // The demo path persists through the demo store directly (MenuEditorTab),
    // so the DB-backed content writer is a no-op here. The status registry
    // still tracks the draft so the flow can be exercised without a backend.
    if (_menuId) demoDraftRegistry.set(_menuId, { restaurantId: '', status: 'DRAFT' });
  },

  // 4.3C.4B — no backend in mock mode; the queue is honestly empty.
  async fetchPendingMenuReviews() {
    return [];
  },
  async fetchMenuReviewPair(_menuId: string) {
    return { submitted: null, published: null, restaurantId: null };
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

  async saveMenuDraft(restaurantId: string, actor: string): Promise<string | null> {
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return null;
    const menus = await queries.selectMenusForRestaurant(uuid);
    const published = menus.find((m) => m.status === 'PUBLISHED');
    const draft: Omit<MenusRow, 'id'> = {
      restaurant_id: uuid,
      title: published?.title ?? null,
      status: 'DRAFT',
      source_id: null,
      created_at: new Date().toISOString(),
      // New version branches from the live published menu so it stays visible
      // while the draft is edited (parent_menu_id links the lineage).
      version: (published?.version ?? 0) + 1,
      parent_menu_id: published?.id ?? null,
      effective_from: null,
      effective_to: null,
      created_by: actor,
      published_by: null,
      published_at: null,
      modified_by: actor,
      submitted_by: null,
      submitted_at: null,
    };
    const row = await queries.insertMenu(draft);
    return row.id;
  }

  async submitMenuForReview(menuId: string, actor: string): Promise<void> {
    await queries.updateMenu(menuId, {
      status: 'PENDING_REVIEW',
      modified_by: actor,
      submitted_by: actor,
      submitted_at: new Date().toISOString(),
    });
  }

  async approveMenu(menuId: string, approver: string): Promise<void> {
    // The single, enforced path to public visibility. Approval reuses the
    // published_* audit columns; the draft never auto-publishes.
    await queries.updateMenu(menuId, {
      status: 'PUBLISHED',
      published_by: approver,
      published_at: new Date().toISOString(),
    });
  }

  async rejectMenu(menuId: string, _approver: string, _reason?: string): Promise<void> {
    // Rejected → ARCHIVED (never deleted). Owner may later create a new DRAFT.
    await queries.updateMenu(menuId, { status: 'ARCHIVED' });
  }

  async archiveMenu(menuId: string, _actor: string): Promise<void> {
    await queries.updateMenu(menuId, { status: 'ARCHIVED' });
  }

  async fetchOwnerMenu(restaurantId: string): Promise<{ menu: Menu | null; status: MenuStatus | null; menuId: string | null }> {
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return { menu: null, status: null, menuId: null };
    const [menus, sources] = await Promise.all([
      queries.selectMenusForRestaurant(uuid),
      queries.selectSourcesForRestaurant(uuid),
    ]);
    const working = pickWorkingMenu(menus);
    if (!working) return { menu: null, status: null, menuId: null };
    const items = await queries.selectMenuItemsForMenu(working.id);
    const observations = items.length
      ? await queries.selectPriceObservationsForItems(items.map((i) => i.id))
      : [];
    return {
      menu: mapOwnerMenu(working, items, observations, sources),
      status: working.status,
      menuId: working.id,
    };
  }

  async createMenuDraft(restaurantId: string, actor: string): Promise<string | null> {
    const uuid = await resolveRestaurantUuid(restaurantId);
    if (!uuid) return null;
    const menus = await queries.selectMenusForRestaurant(uuid);
    const published = menus.find((m) => m.status === 'PUBLISHED');
    const draft: Omit<MenusRow, 'id'> = {
      restaurant_id: uuid,
      title: published?.title ?? null,
      status: 'DRAFT',
      source_id: null,
      created_at: new Date().toISOString(),
      version: (published?.version ?? 0) + 1,
      parent_menu_id: published?.id ?? null,
      effective_from: null,
      effective_to: null,
      created_by: actor,
      published_by: null,
      published_at: null,
      modified_by: actor,
      submitted_by: null,
      submitted_at: null,
    };
    const row = await queries.insertMenu(draft);
    return row.id;
  }

  async saveMenuDraftContent(menuId: string, menu: Menu, actor: string): Promise<void> {
    // Keep the row in DRAFT and stamp the modifier; the content writer replaces
    // items + observations atomically under RLS ownership checks.
    await queries.updateMenu(menuId, { status: 'DRAFT', modified_by: actor });
    const { items, observations } = ownerMenuToContent(menu);
    await queries.upsertMenuContent(menuId, items as unknown as Json[], observations as unknown as Json[]);
  }

  async fetchPendingMenuReviews() {
    const menus = await queries.selectMenusByStatus('PENDING_REVIEW');
    if (menus.length === 0) return [];
    const ids = await queries.selectRestaurantIds();
    const nameById = new Map(ids.map((r) => [r.id, r.name]));
    return menus.map((m) => ({
      menuId: m.id,
      restaurantId: m.restaurant_id,
      restaurantName: nameById.get(m.restaurant_id) ?? 'Unknown restaurant',
      title: m.title ?? null,
      submittedAt: m.submitted_at ?? null,
      submittedBy: m.submitted_by ?? null,
    }));
  }

  async fetchMenuReviewPair(menuId: string) {
    const target = await queries.selectMenuById(menuId);
    if (!target) return { submitted: null, published: null, restaurantId: null };
    const uuid = target.restaurant_id;
    const [menus, sources] = await Promise.all([
      queries.selectMenusForRestaurant(uuid),
      queries.selectSourcesForRestaurant(uuid),
    ]);
    const pending = menus.find((m) => m.id === menuId) ?? menus.find((m) => m.status === 'PENDING_REVIEW');
    const published = menus.find((m) => m.status === 'PUBLISHED');
    const build = async (row?: MenusRow): Promise<Menu | null> => {
      if (!row) return null;
      const items = await queries.selectMenuItemsForMenu(row.id);
      const observations = items.length
        ? await queries.selectPriceObservationsForItems(items.map((i) => i.id))
        : [];
      return mapOwnerMenu(row, items, observations, sources);
    };
    const [submitted, publishedMenu] = await Promise.all([build(pending), build(published)]);
    return { submitted, published: publishedMenu, restaurantId: uuid };
  }
}

/** Active repository — dev simulation forces the mock store; Supabase otherwise. */
export const menuRepository: MenuRepository = isDevSimulation()
  ? mockMenuRepository
  : isSupabaseConfigured()
    ? new SupabaseMenuRepository()
    : mockMenuRepository;
