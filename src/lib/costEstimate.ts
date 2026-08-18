import type { Menu } from '../domain/menu';

/**
 * Estimated cost for two, derived from a venue's own menu prices. This is an
 * ESTIMATE — it is never labelled "verified" in the UI.
 *
 *  - Only "main" categories count: obvious non-main categories (beverages,
 *    desserts, shakes…) are excluded; the import's free-text category names
 *    are matched conservatively.
 *  - Zero-priced dishes are ignored (unknown ≠ free).
 *  - Range = median main-dish price × 2 (two mains) up to × 1.5 (a side or
 *    drink), rounded to the nearest ৳10.
 *  - Confidence reflects how many priced dishes the estimate is based on.
 */
export interface CostEstimate {
  /** Low end of the range for two people, in BDT. */
  low: number;
  /** High end of the range for two people, in BDT. */
  high: number;
  /** Median main-dish price (per-person proxy), in BDT. */
  median: number;
  /** Number of priced main-category dishes the estimate uses. */
  itemCount: number;
  confidence: 'low' | 'medium' | 'high';
}

/** Obvious non-main categories — matched against the import's category names. */
const EXCLUDED_CATEGORY_RE =
  /beverage|drinks?|juice|shake|smoothie|mocktail|cocktail|soft.?drink|water|dessert|sweets|ice.?cream|pastr|bakery|cake/i;

function roundToTen(n: number): number {
  return Math.max(1, Math.round(n / 10) * 10);
}

export function estimateCostForTwo(menu: Menu | null | undefined): CostEstimate | null {
  if (!menu) return null;

  const prices = menu.categories
    .filter((c) => !EXCLUDED_CATEGORY_RE.test(c.name))
    .flatMap((c) => c.dishes.map((d) => d.price))
    .filter((p) => p > 0);

  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    low: roundToTen(median * 2),
    high: roundToTen(median * 2 * 1.5),
    median,
    itemCount: prices.length,
    confidence: prices.length < 5 ? 'low' : prices.length < 15 ? 'medium' : 'high',
  };
}