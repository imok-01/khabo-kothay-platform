import type { Menu, MenuItem, PriceChange } from '../domain/menu';
import { menuService } from '../services/menuService';
import type { Restaurant } from '../types';

/**
 * Derive the price change between the two most recent recorded snapshots.
 * Returns undefined when there is no prior observation — never fabricates one.
 */
export function priceChange(dish: MenuItem): PriceChange | undefined {
  const sorted = [...dish.priceHistory].sort((a, b) => a.at.localeCompare(b.at));
  if (sorted.length < 2) return undefined;
  const prev = sorted[sorted.length - 2];
  const cur = sorted[sorted.length - 1];
  const absoluteChange = cur.price - prev.price;
  const percentChange = prev.price === 0 ? undefined : Math.round((absoluteChange / prev.price) * 1000) / 10;
  return {
    previousPrice: prev.price,
    currentPrice: cur.price,
    absoluteChange,
    percentChange,
    previousAt: prev.at,
    currentAt: cur.at,
  };
}

/**
 * The effective menu for a restaurant: an admin-authored override wins over
 * the seeded menu. Components call this instead of reading seeds directly;
 * the implementation lives in the menuService → menuRepository layer.
 */
export function getEffectiveMenu(restaurant: Restaurant): Menu {
  return menuService.getEffectiveMenu(restaurant);
}
