import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../../domain/menu';
import { priceChange } from '../menu';
import { getMenuForRestaurant } from '../../data/menus';
// Stable fixture dataset — the pre-migration demo set (see data/demo).
import { restaurants } from '../../data/demo/demo-restaurants';

function dishWith(history: Array<{ price: number; at: string }>): MenuItem {
  return {
    id: 'dish-1',
    name: 'Test Dish',
    price: history[history.length - 1].price,
    available: true,
    source: 'restaurant',
    lastUpdated: history[history.length - 1].at,
    priceHistory: history.map((h, i) => ({
      id: `snap-${i}`,
      price: h.price,
      at: h.at,
      source: 'restaurant' as const,
      recordedBy: 'Restaurant admin',
      status: 'recorded' as const,
    })),
  };
}

describe('priceChange', () => {
  it('returns undefined when there is no prior observation', () => {
    const dish = dishWith([{ price: 320, at: '2026-01-15' }]);
    expect(priceChange(dish)).toBeUndefined();
  });

  it('computes absolute and percentage change between the two latest snapshots', () => {
    const dish = dishWith([
      { price: 280, at: '2025-06-10' },
      { price: 320, at: '2026-01-15' },
      { price: 350, at: '2026-08-01' },
    ]);
    const change = priceChange(dish)!;
    expect(change.previousPrice).toBe(320);
    expect(change.currentPrice).toBe(350);
    expect(change.absoluteChange).toBe(30);
    expect(change.percentChange).toBe(9.4); // 30/320 = 9.375 → 9.4
  });

  it('reports a decrease with a negative percentage', () => {
    const dish = dishWith([
      { price: 400, at: '2025-06-10' },
      { price: 299, at: '2026-08-01' },
    ]);
    const change = priceChange(dish)!;
    expect(change.absoluteChange).toBe(-101);
    expect(change.percentChange).toBe(-25.2); // -101/400 rounded to 1dp
  });

  it('never fabricates a change when snapshots are equal', () => {
    const dish = dishWith([
      { price: 120, at: '2025-01-01' },
      { price: 120, at: '2026-01-01' },
    ]);
    const change = priceChange(dish)!;
    expect(change.absoluteChange).toBe(0);
    expect(change.percentChange).toBe(0);
  });
});

describe('getMenuForRestaurant', () => {
  it('returns the curated seed menu for a seeded restaurant', () => {
    const arsalan = restaurants.find((r) => r.id === 'arsalan')!;
    const menu = getMenuForRestaurant(arsalan);
    expect(menu.categories.length).toBeGreaterThanOrEqual(3);
    const biryani = menu.categories.find((c) => c.name === 'Biryani')!;
    expect(biryani.dishes.some((d) => d.name === 'Mutton Biryani')).toBe(true);
  });

  it('returns an explicit empty menu for unseeded restaurants — never fabricated dishes or history', () => {
    const unseeded = restaurants.find((r) => r.id === 'old-china')!;
    const menu = getMenuForRestaurant(unseeded);
    expect(menu.categories).toEqual([]);
  });
});
