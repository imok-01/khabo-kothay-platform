import { beforeEach, describe, expect, it, vi } from 'vitest';

// Force the Supabase repository implementations (normally selected only when
// Supabase is configured) so we can assert on the real egress boundary.
vi.mock('../../integrations/supabase/client', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: async () => null,
  requireSupabase: async () => ({} as never),
}));

vi.mock('../../integrations/supabase/queries', () => {
  const empty = () => Promise.resolve([]);
  return {
    selectRestaurants: vi.fn(() => Promise.resolve([])),
    selectRestaurantIds: vi.fn(() => Promise.resolve([])),
    selectSourcesForRestaurants: vi.fn(empty),
    selectRestaurantAliasesForRestaurants: vi.fn(empty),
    selectAttributesForRestaurants: vi.fn(empty),
    selectImagesForRestaurants: vi.fn(empty),
    selectReviewSignalsForRestaurants: vi.fn(empty),
    selectSourcesForRestaurant: vi.fn(empty),
    selectMenusForRestaurant: vi.fn(empty),
    selectMenuItemsForMenu: vi.fn(empty),
    selectPriceObservationsForItems: vi.fn(empty),
    selectMenusForRestaurants: vi.fn(empty),
    selectMenuItemsForMenus: vi.fn(empty),
    selectImagesForRestaurant: vi.fn(empty),
    selectReviewSignalsForRestaurant: vi.fn(empty),
    selectUserReviewsForRestaurant: vi.fn(empty),
    selectUserReviewsForRestaurants: vi.fn(empty),
    selectAttributesForRestaurant: vi.fn(empty),
    selectTagsForRestaurant: vi.fn(empty),
    selectRestaurantAliasesForRestaurant: vi.fn(empty),
    selectRestaurantById: vi.fn(async () => ({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'X',
    })),
  };
});

import * as queries from '../../integrations/supabase/queries';
import { restaurantRepository } from '../restaurantRepository';
import { menuRepository } from '../menuRepository';

const UUID = '11111111-1111-1111-1111-111111111111';

describe('Menu egress boundary (catalogue vs detail)', () => {
  beforeEach(() => {
    // Each test asserts on its own menu-query call counts.
    vi.clearAllMocks();
  });

  it('catalogue fetchAll does NOT load any menu data', async () => {
    const result = await restaurantRepository.fetchAll();
    expect(result).toEqual([]);

    // These are the detail-only menu queries — must never fire on the
    // catalogue path (Homepage / Search / Explore / Cards / Map).
    expect(vi.mocked(queries.selectMenusForRestaurant).mock.calls.length).toBe(0);
    expect(vi.mocked(queries.selectMenusForRestaurants).mock.calls.length).toBe(0);
    expect(vi.mocked(queries.selectMenuItemsForMenus).mock.calls.length).toBe(0);
    expect(vi.mocked(queries.selectPriceObservationsForItems).mock.calls.length).toBe(0);
    expect(vi.mocked(queries.selectMenuItemsForMenu).mock.calls.length).toBe(0);
  });

  it('detail fetchMenuForRestaurant CAN load menu data (detail-only allowed)', async () => {
    const result = await menuRepository.fetchMenuForRestaurant(UUID);
    // No rows in the mock → null, but the menu query must have been attempted,
    // proving the detail path is allowed to reach menu tables.
    expect(result).toBeNull();
    expect(vi.mocked(queries.selectMenusForRestaurant).mock.calls.length).toBeGreaterThan(0);
  });

  it('catalogue and detail use disjoint menu-query behaviour', async () => {
    await restaurantRepository.fetchAll();
    const catalogueCalls = vi.mocked(queries.selectMenusForRestaurant).mock.calls.length;

    await menuRepository.fetchMenuForRestaurant(UUID);
    const detailCalls = vi.mocked(queries.selectMenusForRestaurant).mock.calls.length;

    expect(catalogueCalls).toBe(0);
    expect(detailCalls).toBeGreaterThan(catalogueCalls);
  });
});
