import { describe, expect, it } from 'vitest';
import { restaurants } from '../../data/restaurants';
import { SEED_MENUS, allSeededRestaurantIds, getMenuForRestaurant } from '../../data/menus';
import { menuRepository } from '../../repositories/menuRepository';
import type { Restaurant } from '../../types';

// Production Dhaka catalogue ids vs the Kolkata demo seed keys.
const productionIds = new Set(restaurants.map((r) => r.id));
const seedIds = allSeededRestaurantIds();

describe('Menu demo / production isolation', () => {
  it('SEED_MENUS keys never overlap production Dhaka restaurant IDs', () => {
    const overlap = seedIds.filter((id) => productionIds.has(id));
    expect(
      overlap,
      `Demo menu ID conflicts with production restaurant ID: ${overlap.join(', ')}`,
    ).toEqual([]);
  });

  it('getMenuForRestaurant returns an honest empty menu for every production restaurant (never a demo seed)', () => {
    for (const r of restaurants) {
      const menu = getMenuForRestaurant(r);
      expect(menu.restaurantId).toBe(r.id);
      expect(menu.categories).toEqual([]);
      const isSeedObject = Object.values(SEED_MENUS).some((m) => m === menu);
      expect(isSeedObject).toBe(false);
    }
  });

  it('seed menus resolve ONLY for their fixture (Kolkata) IDs', () => {
    for (const id of seedIds) {
      const menu = getMenuForRestaurant({ id } as unknown as Restaurant);
      expect(SEED_MENUS[id]).toBeDefined();
      expect(menu.restaurantId).toBe(id);
      expect(menu.categories.length).toBeGreaterThan(0);
    }
  });

  it('the active repository serves an empty menu for a production restaurant (no seed leak)', () => {
    // In test mode the mock repository is active; it must not surface Kolkata
    // demo menus for Dhaka production venues. (The Supabase repository reads
    // menus directly from the database and never imports SEED_MENUS.)
    for (const r of restaurants) {
      const menu = menuRepository.getEffectiveMenu(r);
      expect(menu.categories).toEqual([]);
    }
  });
});
