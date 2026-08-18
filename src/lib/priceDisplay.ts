import { BUDGET_LABEL, type Budget, type Restaurant } from '../types';
import type { CostEstimate } from './costEstimate';
import { formatCurrency } from './format';
import { MARKET } from './market';

/**
 * Single shared source for the price line shown on card surfaces.
 *
 * Every surface (restaurant cards, map popups, compare) asks this one helper
 * instead of reading `priceForTwo` directly, so a venue's price is rendered
 * consistently everywhere.
 *
 * Honesty ladder (never claim more than the data supports):
 *  - `verified`  — curated `priceForTwo` attribute (৳1,800 for two).
 *  - `estimated` — menu-derived range from the venue's own menu price
 *                  observations (৳800 – ৳1,200 estimated). Never labelled
 *                  "verified".
 *  - `notListed` — no price data at all ("Price not listed").
 */
export interface PriceForTwoDisplay {
  kind: 'verified' | 'estimated' | 'notListed';
  /** Human-readable label, e.g. "৳1,800 for two" / "৳800 – ৳1,200 estimated". */
  label: string;
  /** The verified curated amount, when present. */
  priceForTwo?: number;
  /** The menu-derived estimate, when present. */
  estimate?: CostEstimate;
}

export function priceForTwoDisplay(restaurant: Restaurant): PriceForTwoDisplay {
  if (restaurant.priceForTwo > 0) {
    return {
      kind: 'verified',
      label: `${formatCurrency(restaurant.priceForTwo)} for two`,
      priceForTwo: restaurant.priceForTwo,
    };
  }

  const estimate = restaurant.menuEstimate;
  if (estimate) {
    return {
      kind: 'estimated',
      label: `${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)} estimated`,
      estimate,
    };
  }

  return { kind: 'notListed', label: 'Price not listed' };
}

/**
 * Approved per-person budget tiers (mirrors BUDGET_LABEL):
 *  Budget  — under ৳200/person
 *  Mid-range — ৳200–500/person
 *  Premium — ৳500–1000/person
 *  Luxury  — ৳1000+/person
 */
export function budgetTierForPerPerson(perPerson: number): Budget {
  if (perPerson < 200) return 'Budget';
  if (perPerson < 500) return 'Mid-range';
  if (perPerson < 1000) return 'Premium';
  return 'Luxury';
}

/** Currency-symbol ladder shown beside a budget tier (৳ / ৳৳ / ৳৳৳ / ৳৳৳৳). */
export function budgetSymbol(tier: Budget): string {
  return MARKET.currencySymbol.repeat(tier === 'Budget' ? 1 : tier === 'Mid-range' ? 2 : tier === 'Premium' ? 3 : 4);
}

/**
 * The budget tier a venue qualifies for, whether the tier is verified
 * (curated attribute behind a real priceForTwo) or estimated from its own
 * menu. Returns undefined when there is no price signal at all.
 */
export function budgetTier(restaurant: Restaurant): Budget | undefined {
  if (restaurant.priceForTwo > 0) return restaurant.budget;
  const estimate = restaurant.menuEstimate;
  if (estimate) return budgetTierForPerPerson(estimate.median);
  return undefined;
}

/**
 * Single shared source for the Budget stat.
 *
 * Honesty ladder (never claim more than the data supports):
 *  - `verified`  — curated `priceForTwo` attribute exists → curated tier,
 *                  labelled with the verified per-person range.
 *  - `estimated` — no verified price, menu-derived estimate → tier derived
 *                  from the per-person median, always labelled "(estimated)".
 *  - `notListed` — no price data at all.
 */
export interface BudgetDisplay {
  kind: 'verified' | 'estimated' | 'notListed';
  /** The budget tier, when a price signal exists. */
  tier?: Budget;
  /** Primary stat value, e.g. "৳৳ Mid-range" / "৳৳৳ Premium (estimated)" / "Not listed". */
  label: string;
  /** Supporting line, e.g. "৳200 – 500 / person" or "No verified price data yet". */
  sub?: string;
}

export function budgetDisplay(restaurant: Restaurant): BudgetDisplay {
  if (restaurant.priceForTwo > 0) {
    const tier = restaurant.budget;
    return {
      kind: 'verified',
      tier,
      label: `${budgetSymbol(tier)} ${tier}`,
      sub: BUDGET_LABEL[tier],
    };
  }

  const estimate = restaurant.menuEstimate;
  if (estimate) {
    const tier = budgetTierForPerPerson(estimate.median);
    return {
      kind: 'estimated',
      tier,
      label: `${budgetSymbol(tier)} ${tier} (estimated)`,
      sub: `${formatCurrency(estimate.low / 2)} – ${formatCurrency(estimate.high / 2)} / person · estimated from menu prices`,
    };
  }

  return { kind: 'notListed', label: 'Not listed', sub: 'No verified price data yet' };
}

/**
 * Representative cost-for-two used by price filters: the curated price when
 * present, otherwise the menu estimate's base (median × 2). undefined when
 * there is no price signal — such venues never match a price cap.
 */
export function costForTwoValue(restaurant: Restaurant): number | undefined {
  if (restaurant.priceForTwo > 0) return restaurant.priceForTwo;
  return restaurant.menuEstimate?.low;
}