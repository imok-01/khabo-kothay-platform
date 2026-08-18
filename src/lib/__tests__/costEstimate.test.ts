import { describe, expect, it } from 'vitest';
import type { Menu } from '../../domain/menu';
import { estimateCostForTwo } from '../costEstimate';

function menu(categories: Array<{ name: string; prices: number[] }>): Menu {
  return {
    restaurantId: 'r1',
    updatedAt: '',
    categories: categories.map((c, i) => ({
      id: `cat-${i}`,
      name: c.name,
      order: i,
      dishes: c.prices.map((price, j) => ({
        id: `dish-${i}-${j}`,
        name: `Dish ${i}-${j}`,
        price,
        available: true,
        source: 'restaurant',
        lastUpdated: '',
        priceHistory: [],
      })),
    })),
  };
}

describe('estimateCostForTwo', () => {
  it('returns null when there is no menu', () => {
    expect(estimateCostForTwo(null)).toBeNull();
    expect(estimateCostForTwo(undefined)).toBeNull();
  });

  it('returns null when no priced main dishes exist', () => {
    expect(estimateCostForTwo(menu([{ name: 'Starters', prices: [0, 0] }]))).toBeNull();
    expect(estimateCostForTwo(menu([]))).toBeNull();
  });

  it('computes the range from the median main-dish price × 2', () => {
    // Median of [100, 120, 140] = 120 → low 240, high 290 (×2 × 1.2).
    const estimate = estimateCostForTwo(menu([{ name: 'Main Courses', prices: [100, 120, 140] }]));
    expect(estimate?.low).toBe(240);
    expect(estimate?.high).toBe(290);
    expect(estimate?.median).toBe(120);
  });

  it('excludes obvious non-main categories (drinks, desserts)', () => {
    const estimate = estimateCostForTwo(
      menu([
        { name: 'Mains', prices: [300, 320] },
        { name: 'Cold Drinks', prices: [10, 15] },
        { name: 'Desserts', prices: [5, 8] },
      ]),
    );
    expect(estimate?.itemCount).toBe(2);
  });

  it('excludes tea/coffee, sides, sauces and add-ons', () => {
    const estimate = estimateCostForTwo(
      menu([
        { name: 'Main Course', prices: [300, 320, 340] },
        { name: 'Tea & Coffee', prices: [30, 40] },
        { name: 'Starters', prices: [80, 90] },
        { name: 'Sides', prices: [50, 60] },
        { name: 'Sauces & Dips', prices: [20] },
        { name: 'Add-ons', prices: [25, 30] },
      ]),
    );
    expect(estimate?.itemCount).toBe(3);
  });

  it('trims obvious price outliers before trusting the median', () => {
    // Raw median of [300, 400, 500, 700, 2000] = 500; the 2000 family platter
    // is >2× that and is dropped → median 450 → low 900, high 1080.
    const estimate = estimateCostForTwo(menu([{ name: 'Mains', prices: [300, 400, 500, 700, 2000] }]));
    expect(estimate?.median).toBe(450);
    expect(estimate?.low).toBe(900);
    expect(estimate?.high).toBe(1080);
    expect(estimate?.itemCount).toBe(5);
  });

  it('ignores zero-priced dishes (unknown ≠ free)', () => {
    const estimate = estimateCostForTwo(menu([{ name: 'Mains', prices: [200, 0, 220] }]));
    expect(estimate?.itemCount).toBe(2);
    expect(estimate?.median).toBe(210);
  });

  it('labels confidence from the number of dishes', () => {
    expect(estimateCostForTwo(menu([{ name: 'Mains', prices: [100, 200] }]))?.confidence).toBe('low');
    expect(estimateCostForTwo(menu([{ name: 'Mains', prices: Array.from({ length: 8 }, (_, i) => 100 + i) }]))?.confidence).toBe('medium');
    expect(estimateCostForTwo(menu([{ name: 'Mains', prices: Array.from({ length: 20 }, (_, i) => 100 + i) }]))?.confidence).toBe('high');
  });

  it('never reports zero for a tiny median', () => {
    const estimate = estimateCostForTwo(menu([{ name: 'Mains', prices: [2, 2] }]));
    expect(estimate?.low).toBeGreaterThan(0);
  });
});