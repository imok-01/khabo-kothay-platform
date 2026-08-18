import type { Menu } from '../domain/menu';

/**
 * Estimated cost for two, derived from a venue's own menu prices. This is an
 * ESTIMATE — it is never labelled "verified" in the UI.
 *
 *  - Only relevant main-food categories count. Drinks, beverages, tea/coffee,
 *    desserts, sides, sauces and add-ons are excluded; the import's free-text
 *    category names are matched conservatively.
 *  - Zero-priced dishes are ignored (unknown ≠ free).
 *  - Obvious price outliers are trimmed (a stray family platter or a
 *    mis-categorised item must not skew the typical dish price).
 *  - The estimate is built from the MEDIAN main-dish price, never the average
 *    — the median is robust to expensive outliers.
 *  - Range = median main-dish price × 2 (two mains, no drinks) up to × 1.2
 *    (a modest extra), rounded to the nearest ৳10. Drinks are deliberately
 *    not modelled until real basket data exists.
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
  /beverage|drinks?|juice|shake|smoothie|mocktail|cocktail|soft.?drink|water|tea|coffee|espresso|latte|cappuccino|dessert|sweets|ice.?cream|pastr|bakery|cake|side|starter|appetizer|salad|fries|chips|naan|roti|paratha|bread|sauce|chutney|dip|add-?on|extra|topping/i;

function roundToTen(n: number): number {
  return Math.max(1, Math.round(n / 10) * 10);
}

function medianOf(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function estimateCostForTwo(menu: Menu | null | undefined): CostEstimate | null {
  if (!menu) return null;

  const prices = menu.categories
    .filter((c) => !EXCLUDED_CATEGORY_RE.test(c.name))
    .flatMap((c) => c.dishes.map((d) => d.price))
    .filter((p) => p > 0);

  if (prices.length === 0) return null;

  const sorted = [...prices].sort((a, b) => a - b);
  const rawMedian = medianOf(sorted);
  // Drop "obvious" outliers — dishes priced above 2× or below half the raw
  // median — before trusting the median. In typical menus this removes a
  // stray family platter or a mis-categorised side, not the everyday dishes.
  const trimmed = sorted.filter((p) => p >= rawMedian / 2 && p <= rawMedian * 2);
  if (trimmed.length === 0) return null;
  const median = medianOf(trimmed);

  return {
    low: roundToTen(median * 2),
    high: roundToTen(median * 2 * 1.2),
    median,
    itemCount: prices.length,
    confidence: prices.length < 5 ? 'low' : prices.length < 15 ? 'medium' : 'high',
  };
}