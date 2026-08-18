import { describe, expect, it } from 'vitest';
import { mapMenuRows, menuCostEstimate, type MenuDbBundle } from '../menu';
import type { MenuItemsRow, MenusRow, PriceObservationsRow, RestaurantSourcesRow } from '../../integrations/supabase/database.types';

function bundle(): MenuDbBundle {
  const menu: MenusRow = {
    id: 'menu-1',
    restaurant_id: 'rest-1',
    title: 'Main menu',
    status: 'ACTIVE',
    source_id: 'src-web',
    created_at: '2026-01-01T00:00:00Z',
  };
  const items: MenuItemsRow[] = [
    { id: 'item-1', menu_id: 'menu-1', item_name: 'Chicken Biryani', description: 'Fragrant basmati', category: 'Biryani', created_at: null },
    { id: 'item-2', menu_id: 'menu-1', item_name: 'Mutton Biryani', description: null, category: 'Biryani', created_at: null },
    { id: 'item-3', menu_id: 'menu-1', item_name: 'Firni', description: null, category: null, created_at: null },
  ];
  const observations: PriceObservationsRow[] = [
    { id: 'obs-1', menu_item_id: 'item-1', price: 280, currency: 'BDT', source_id: 'src-web', observed_at: '2025-06-10T00:00:00Z', raw_price: 'Tk 280', verification_status: 'UNVERIFIED' },
    { id: 'obs-2', menu_item_id: 'item-1', price: 320, currency: 'BDT', source_id: 'src-web', observed_at: '2026-01-15T00:00:00Z', raw_price: 'Tk 320', verification_status: 'UNVERIFIED' },
    // NULL price — genuinely unknown, must stay unknown (→ price 0 / not listed)
    { id: 'obs-3', menu_item_id: 'item-2', price: null, currency: 'BDT', source_id: null, observed_at: '2026-01-15T00:00:00Z', raw_price: null, verification_status: 'UNVERIFIED' },
  ];
  const sources: RestaurantSourcesRow[] = [
    { id: 'src-web', restaurant_id: 'rest-1', source_type: 'website', source_identifier: null, source_url: null, created_at: null },
  ];
  return {
    menus: [menu],
    itemsByMenu: { 'menu-1': items },
    observationsByItem: {
      'item-1': observations.filter((o) => o.menu_item_id === 'item-1'),
      'item-2': observations.filter((o) => o.menu_item_id === 'item-2'),
    },
    sources,
  };
}

describe('mapMenuRows', () => {
  it('maps the latest price observation as the dish price', () => {
    const menu = mapMenuRows(bundle())!;
    const biryani = menu.categories.find((c) => c.name === 'Biryani')!.dishes.find((d) => d.name === 'Chicken Biryani')!;
    expect(biryani.price).toBe(320);
    expect(biryani.priceHistory).toHaveLength(2);
    expect(biryani.priceHistory[0].price).toBe(280);
    expect(biryani.priceHistory[0].status).toBe('recorded');
  });

  it('keeps a NULL price observation unknown instead of fabricating one', () => {
    const menu = mapMenuRows(bundle())!;
    const mutton = menu.categories.find((c) => c.name === 'Biryani')!.dishes.find((d) => d.name === 'Mutton Biryani')!;
    expect(mutton.price).toBe(0);
  });

  it('groups by category in first-appearance order and labels uncategorized as Other', () => {
    const menu = mapMenuRows(bundle())!;
    expect(menu.categories.map((c) => c.name)).toEqual(['Biryani', 'Other']);
    expect(menu.categories[0].order).toBe(0);
    expect(menu.categories[1].order).toBe(1);
  });

  it('prefers the ACTIVE menu when several exist', () => {
    const b = bundle();
    b.menus = [
      { ...b.menus[0], id: 'menu-old', status: 'UNKNOWN' },
      { ...b.menus[0], id: 'menu-new', status: 'ACTIVE' },
    ];
    b.itemsByMenu = { 'menu-new': b.itemsByMenu['menu-1'], 'menu-old': [] };
    const menu = mapMenuRows(b)!;
    expect(menu.categories.length).toBeGreaterThan(0);
  });

  it('returns undefined when the restaurant has no menus', () => {
    expect(mapMenuRows({ menus: [], itemsByMenu: {}, observationsByItem: {}, sources: [] })).toBeUndefined();
  });

  it('never surfaces a NEEDS_REVIEW price as a displayed price', () => {
    const b = bundle();
    // Replace the item-1 observations: latest is ambiguous (NEEDS_REVIEW),
    // earlier one is a normal machine extract (UNVERIFIED).
    b.observationsByItem['item-1'] = [
      { id: 'obs-a', menu_item_id: 'item-1', price: 280, currency: 'BDT', source_id: 'src-web', observed_at: '2025-06-10T00:00:00Z', raw_price: 'Tk 280', verification_status: 'UNVERIFIED' },
      { id: 'obs-b', menu_item_id: 'item-1', price: null, currency: 'BDT', source_id: null, observed_at: '2026-01-15T00:00:00Z', raw_price: 'Tk 494 / Tk 549', verification_status: 'NEEDS_REVIEW' },
    ];
    const menu = mapMenuRows(b)!;
    const biryani = menu.categories.find((c) => c.name === 'Biryani')!.dishes.find((d) => d.name === 'Chicken Biryani')!;
    // The ambiguous observation is excluded from display entirely — the
    // previous verified extract is shown instead, never the ambiguous one.
    expect(biryani.priceHistory).toHaveLength(1);
    expect(biryani.priceHistory[0].price).toBe(280);
    expect(biryani.price).toBe(280);
  });
});

describe('menuCostEstimate', () => {
  it('derives the range from the venue menu prices, same as the detail page', () => {
    // Prices: Chicken Biryani 320, Mutton Biryani unknown (0), Firni unknown.
    // Only the 320 price counts → median 320 → low 640, high 770 (×2 × 1.2).
    expect(menuCostEstimate(bundle())).toEqual({
      low: 640,
      high: 770,
      median: 320,
      itemCount: 1,
      confidence: 'low',
    });
  });

  it('returns undefined when the venue has no menu rows', () => {
    expect(menuCostEstimate({ menus: [], itemsByMenu: {}, observationsByItem: {}, sources: [] })).toBeUndefined();
  });
});
