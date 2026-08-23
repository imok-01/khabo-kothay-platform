import { describe, expect, it } from 'vitest';
import type { Menu } from '../../domain/menu';
import type { MenusRow, MenuItemsRow, PriceObservationsRow } from '../../integrations/supabase/database.types';
import {
  mapOwnerMenu,
  ownerMenuToContent,
  pickWorkingMenu,
  type OwnerMenuItemJson,
  type OwnerObservationJson,
} from '../menu';

function menuRow(status: MenusRow['status'], id = 'm1'): MenusRow {
  return {
    id,
    restaurant_id: 'r1',
    title: 'Test',
    status,
    source_id: null,
    version: 1,
    parent_menu_id: null,
    effective_from: null,
    effective_to: null,
    created_by: 'u1',
    published_by: null,
    published_at: null,
    modified_by: null,
    submitted_by: null,
    submitted_at: null,
    created_at: '2026-01-01T00:00:00Z',
  };
}

describe('pickWorkingMenu', () => {
  it('prefers DRAFT over PENDING_REVIEW over PUBLISHED', () => {
    const menus = [menuRow('PUBLISHED'), menuRow('PENDING_REVIEW'), menuRow('DRAFT')];
    expect(pickWorkingMenu(menus)?.status).toBe('DRAFT');
  });

  it('falls back to PENDING_REVIEW when no draft', () => {
    const menus = [menuRow('PUBLISHED'), menuRow('PENDING_REVIEW')];
    expect(pickWorkingMenu(menus)?.status).toBe('PENDING_REVIEW');
  });

  it('returns undefined for an empty list', () => {
    expect(pickWorkingMenu([])).toBeUndefined();
  });
});

describe('ownerMenuToContent', () => {
  it('emits one item + one observation per dish, linked by id', () => {
    const menu: Menu = {
      restaurantId: 'r1',
      updatedAt: '2026-01-01T00:00:00Z',
      categories: [
        {
          id: 'c1',
          name: 'Starters',
          order: 0,
          dishes: [
            {
              id: 'd1',
              name: 'Samosas',
              description: 'Crispy',
              price: 120,
              available: true,
              featured: true,
              isSignature: false,
              source: 'restaurant',
              lastUpdated: '2026-01-01T00:00:00Z',
              priceHistory: [],
            },
            {
              id: 'd2',
              name: 'Free item',
              price: 0,
              available: false,
              source: 'restaurant',
              lastUpdated: '2026-01-01T00:00:00Z',
              priceHistory: [],
            },
          ],
        },
      ],
    };
    const { items, observations } = ownerMenuToContent(menu);
    expect(items).toHaveLength(2);
    expect(observations).toHaveLength(2);
    const itemA = items[0] as OwnerMenuItemJson;
    const obsA = observations[0] as OwnerObservationJson;
    expect(itemA.item_name).toBe('Samosas');
    expect(itemA.category).toBe('Starters');
    expect(itemA.featured).toBe(true);
    expect(itemA.available).toBe(true);
    expect(obsA.menu_item_id).toBe(itemA.id);
    expect(obsA.price).toBe(120);
    expect(obsA.verification_status).toBe('RESTAURANT_CONFIRMED');
    expect(obsA.currency).toBe('BDT');
    // Zero price is stored as NULL (genuinely unknown), not 0.
    expect((observations[1] as OwnerObservationJson).price).toBeNull();
  });
});

describe('mapOwnerMenu', () => {
  it('maps any-status menu rows into the domain (no lifecycle filter)', () => {
    const row = menuRow('DRAFT', 'draft-1');
    const items: MenuItemsRow[] = [
      {
        id: 'i1',
        menu_id: 'draft-1',
        item_name: 'Biryani',
        description: 'Spicy',
        category: 'Mains',
        available: true,
        featured: false,
        is_signature: true,
        image_url: null,
        last_verified_at: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    const observations: PriceObservationsRow[] = [
      {
        id: 'o1',
        menu_item_id: 'i1',
        price: 250,
        currency: 'BDT',
        source_id: null,
        observed_at: '2026-01-01T00:00:00Z',
        raw_price: null,
        verification_status: 'RESTAURANT_CONFIRMED',
      },
    ];
    const menu = mapOwnerMenu(row, items, observations, []);
    expect(menu.restaurantId).toBe('r1');
    expect(menu.categories).toHaveLength(1);
    expect(menu.categories[0].name).toBe('Mains');
    expect(menu.categories[0].dishes[0].name).toBe('Biryani');
    expect(menu.categories[0].dishes[0].price).toBe(250);
    expect(menu.categories[0].dishes[0].isSignature).toBe(true);
  });
});
