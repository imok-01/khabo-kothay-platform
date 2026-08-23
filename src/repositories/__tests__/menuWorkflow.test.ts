import { beforeEach, describe, expect, it, vi } from 'vitest';

// Force the Supabase repository implementation so we exercise the real
// 4.3C lifecycle boundary (the same trick as menuEgress.test.ts).
vi.mock('../../integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: async () => null,
  requireSupabase: async () => ({} as never),
}));

// owner/KK resolution is mocked to identity (route id === uuid for the test).
vi.mock('../restaurantRepository', () => ({
  resolveRestaurantUuid: async (id: string) => id,
}));

vi.mock('../../integrations/supabase/queries', () => {
  // In-memory menu store so the workflow transitions are observable end-to-end
  // through the real transformer (fetchMenuForRestaurant).
  const menus: any[] = [];
  const itemsByMenu: Record<string, any[]> = {};
  const observationsByItem: Record<string, any[]> = {};
  const sources: any[] = [];

  return {
    selectMenusForRestaurant: vi.fn(async (rid: string) => menus.filter((m) => m.restaurant_id === rid)),
    selectMenuItemsForMenu: vi.fn(async (mid: string) => itemsByMenu[mid] ?? []),
    selectPriceObservationsForItems: vi.fn(async (ids: string[]) =>
      ids.flatMap((id) => observationsByItem[id] ?? []),
    ),
    selectSourcesForRestaurant: vi.fn(async () => sources),
    insertMenu: vi.fn(async (m: Record<string, unknown>) => {
      const row = { ...m, id: (m.id as string) ?? `gen-${menus.length + 1}` };
      menus.push(row);
      return row;
    }),
    updateMenu: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const i = menus.findIndex((m) => m.id === id);
      if (i < 0) return null;
      menus[i] = { ...menus[i], ...patch, id };
      return menus[i];
    }),
    // Expose the store for assertions.
    __store: { menus, itemsByMenu, observationsByItem, sources },
  };
});

import * as queries from '../../integrations/supabase/queries';
import { menuRepository } from '../menuRepository';

const RID = 'rest-1';

function seedPublished() {
  const store = (queries as any).__store;
  store.menus.push({
    id: 'm-pub',
    restaurant_id: RID,
    title: 'Live menu',
    status: 'PUBLISHED',
    source_id: null,
    created_at: '2026-01-01T00:00:00Z',
    version: 1,
    parent_menu_id: null,
    effective_from: null,
    effective_to: null,
    created_by: 'owner-1',
    published_by: 'exec-1',
    published_at: '2026-01-02T00:00:00Z',
    modified_by: null,
    submitted_by: null,
    submitted_at: null,
  });
  store.itemsByMenu['m-pub'] = [
    { id: 'item-pub', menu_id: 'm-pub', item_name: 'Chicken Biryani', description: null, category: 'Biryani', created_at: null, available: null, featured: null, is_signature: null, image_url: null, last_verified_at: null },
  ];
}

describe('Menu ownership workflow (4.3C)', () => {
  beforeEach(() => {
    const store = (queries as any).__store;
    store.menus.length = 0;
    Object.keys(store.itemsByMenu).forEach((k) => delete store.itemsByMenu[k]);
    Object.keys(store.observationsByItem).forEach((k) => delete store.observationsByItem[k]);
    vi.clearAllMocks();
  });

  it('owner cannot publish directly: submit moves DRAFT → PENDING_REVIEW only', async () => {
    const draftId = await menuRepository.saveMenuDraft(RID, 'owner-1');
    expect(draftId).toBeTruthy();
    expect((queries as any).__store.menus.find((m: any) => m.id === draftId).status).toBe('DRAFT');

    await menuRepository.submitMenuForReview(draftId!, 'owner-1');

    const patch = vi.mocked(queries.updateMenu).mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(patch.status).toBe('PENDING_REVIEW');
    expect(patch).not.toHaveProperty('published_by');
    expect((queries as any).__store.menus.find((m: any) => m.id === draftId).status).toBe('PENDING_REVIEW');
  });

  it('KK approval is required before a menu becomes public', async () => {
    const draftId = await menuRepository.saveMenuDraft(RID, 'owner-1');
    await menuRepository.submitMenuForReview(draftId!, 'owner-1');

    // Before approval the menu is NOT public (PENDING_REVIEW is hidden).
    expect(await menuRepository.fetchMenuForRestaurant(RID)).toBeNull();

    // Only approveMenu moves it to PUBLISHED.
    await menuRepository.approveMenu(draftId!, 'exec-1');
    const patch = vi.mocked(queries.updateMenu).mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(patch.status).toBe('PUBLISHED');
    expect(patch.published_by).toBe('exec-1');

    // Now it is public.
    expect(await menuRepository.fetchMenuForRestaurant(RID)).not.toBeNull();
  });

  it('published menu stays visible while a new DRAFT is edited', async () => {
    seedPublished();

    // Sanity: the live published menu is public.
    expect(await menuRepository.fetchMenuForRestaurant(RID)).not.toBeNull();

    // Owner edits → a DRAFT branching from the published menu.
    const draftId = await menuRepository.saveMenuDraft(RID, 'owner-1');
    const draft = (queries as any).__store.menus.find((m: any) => m.id === draftId);
    expect(draft.status).toBe('DRAFT');
    expect(draft.parent_menu_id).toBe('m-pub');

    // The published menu is STILL the one served publicly (draft hidden).
    const pub = await menuRepository.fetchMenuForRestaurant(RID);
    expect(pub).not.toBeNull();
    expect(pub!.categories[0].dishes.some((d: any) => d.name === 'Chicken Biryani')).toBe(true);
  });

  it('rejected menu becomes ARCHIVED (never deleted) and leaves no public menu', async () => {
    const draftId = await menuRepository.saveMenuDraft(RID, 'owner-1');
    await menuRepository.submitMenuForReview(draftId!, 'owner-1');
    await menuRepository.rejectMenu(draftId!, 'exec-1', 'needs photos');

    const patch = vi.mocked(queries.updateMenu).mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(patch.status).toBe('ARCHIVED');

    const row = (queries as any).__store.menus.find((m: any) => m.id === draftId);
    expect(row.status).toBe('ARCHIVED');
    // No public menu remains.
    expect(await menuRepository.fetchMenuForRestaurant(RID)).toBeNull();
  });

  it('archiveMenu removes a PUBLISHED menu from public view', async () => {
    seedPublished();
    expect(await menuRepository.fetchMenuForRestaurant(RID)).not.toBeNull();

    await menuRepository.archiveMenu('m-pub', 'exec-1');
    expect((queries as any).__store.menus.find((m: any) => m.id === 'm-pub').status).toBe('ARCHIVED');
    expect(await menuRepository.fetchMenuForRestaurant(RID)).toBeNull();
  });
});
