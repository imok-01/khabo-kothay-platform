import { describe, expect, it } from 'vitest';
import type { Menu, MenuItem, MenuCategory, MenuSource } from '../../domain/menu';
import { diffMenus } from '../menu';

const src: MenuSource = 'restaurant';

function dish(name: string, overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: `d-${name}`,
    name,
    price: 0,
    available: true,
    source: src,
    lastUpdated: '2026-01-01',
    priceHistory: [],
    ...overrides,
  };
}

function menu(categories: MenuCategory[]): Menu {
  return { restaurantId: 'r1', categories, updatedAt: '2026-01-01' };
}

describe('diffMenus', () => {
  it('detects an added dish', () => {
    const published = menu([{ id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const submitted = menu([
      { id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 }), dish('Soup', { price: 120 })] },
    ]);
    const diff = diffMenus(submitted, published);
    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(0);
    expect(diff.changedCount).toBe(0);
    const added = diff.categories[0].dishes.find((d) => d.name === 'Soup');
    expect(added?.status).toBe('added');
  });

  it('detects a removed dish', () => {
    const published = menu([
      { id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 }), dish('Salad', { price: 90 })] },
    ]);
    const submitted = menu([{ id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const diff = diffMenus(submitted, published);
    expect(diff.removedCount).toBe(1);
    const removed = diff.categories[0].dishes.find((d) => d.name === 'Salad');
    expect(removed?.status).toBe('removed');
  });

  it('detects price, availability and description changes', () => {
    const published = menu([
      { id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300, available: true, description: 'spicy' })] },
    ]);
    const submitted = menu([
      {
        id: 'c1',
        name: 'Mains',
        order: 0,
        dishes: [dish('Curry', { price: 350, available: false, description: 'mild' })],
      },
    ]);
    const diff = diffMenus(submitted, published);
    expect(diff.changedCount).toBe(1);
    const changed = diff.categories[0].dishes[0];
    expect(changed.status).toBe('changed');
    const fields = changed.changes.map((c) => c.field);
    expect(fields).toContain('price');
    expect(fields).toContain('available');
    expect(fields).toContain('description');
  });

  it('detects a category move as a change (not add+remove)', () => {
    const published = menu([{ id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const submitted = menu([{ id: 'c2', name: 'Starters', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const diff = diffMenus(submitted, published);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.changedCount).toBe(1);
    expect(diff.categories[0].dishes[0].changes.some((c) => c.field === 'category')).toBe(true);
  });

  it('reports unchanged when identical', () => {
    const m = menu([{ id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const diff = diffMenus(m, m);
    expect(diff.addedCount).toBe(0);
    expect(diff.removedCount).toBe(0);
    expect(diff.changedCount).toBe(0);
  });

  it('handles a first-ever submission (no published menu)', () => {
    const submitted = menu([{ id: 'c1', name: 'Mains', order: 0, dishes: [dish('Curry', { price: 300 })] }]);
    const diff = diffMenus(submitted, null);
    expect(diff.addedCount).toBe(1);
    expect(diff.removedCount).toBe(0);
  });
});
