import { BUDGET_LABEL, type Budget, type Restaurant } from '../types';
import type { CostEstimate } from './costEstimate';
import { estimateCostForTwo } from './costEstimate';
import type { Menu } from '../domain/menu';
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
 *                  observations (৳800 – ৳1,200 estimated for two). Never
 *                  labelled "verified".
 *  - `notListed` — no price data at all ("Price not listed").
 */
export interface PriceForTwoDisplay {
  kind: 'verified' | 'estimated' | 'notListed';
  /** Human-readable label, e.g. "৳1,800 for two" / "৳800 – ৳1,200 estimated for two". */
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
      label: `${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)} estimated for two`,
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

/**
 * Single honest "how expensive?" summary for a restaurant detail page.
 *
 * It composes the existing honesty-ladder helpers (`budgetDisplay`,
 * `priceForTwoDisplay`) with the menu-derived estimate so the page shows one
 * consistent story instead of two disconnected stats. Priority for the SPEND
 * expectation (most → least confident):
 *
 *  1. Menu-derived estimate with sufficient confidence (medium/high) →
 *     "Typical ৳X–Y for two · estimated from menu prices" plus a real
 *     per-person range derived from that band.
 *  2. Verified curated `priceForTwo` → "About ৳X for two (approx., no drinks)".
 *     A single value is NEVER expanded into a fake range, so no per-person band.
 *  3. No price signal at all → "Price not listed yet".
 *
 * The budget tier (`tierLabel`) always reflects `budgetDisplay`, so the
 * categorical signal is never lost. Estimates are never labelled "verified".
 *
 * `amount` / `amountNote` are the same spend expectation split at the seam
 * between the number and the words about it. `spendLabel` reads as a sentence
 * and is kept for anywhere that wants one; the detail page's decision bar wants
 * a figure it can set in display type, and "About ৳1,800 for two (approx., no
 * drinks)" at 13px grey is what "the stats are plain text" meant. The split is
 * presentational only — no new price data is derived here, and both are absent
 * when there is no price to state.
 */
export interface PriceSummary {
  kind: 'verified' | 'estimated' | 'notListed';
  /** Budget tier line, e.g. "৳৳ Mid-range". */
  tierLabel: string;
  /** Spend expectation, e.g. "About ৳1,800 for two (approx., no drinks)". */
  spendLabel: string;
  /** Just the money, e.g. "৳1,800" or "৳900 – ৳1,400". Absent when unpriced. */
  amount?: string;
  /** What the money buys, e.g. "for two, approx. · no drinks". */
  amountNote?: string;
  /** Per-person hint — present ONLY when a real price range exists. */
  perPersonLabel?: string;
  /** Honesty / source note shown beneath the price block. */
  evidence: string;
}

export function priceSummary(restaurant: Restaurant, menu?: Menu | null): PriceSummary {
  const tier = budgetDisplay(restaurant);

  // Priority 1 — menu-derived estimate with enough supporting dishes.
  const estimate = restaurant.menuEstimate ?? (menu ? estimateCostForTwo(menu) : null);
  if (estimate && estimate.confidence !== 'low') {
    // `budgetDisplay` only sees `restaurant.menuEstimate`. When the estimate
    // arrived via the `menu` argument instead, its tier is still "Not listed" —
    // which put "Not listed" on the same row as a ৳800 – ৳960 band. The tier is
    // derived from the estimate we actually used, by the same ladder
    // `budgetDisplay` would have used, and stays labelled "(estimated)".
    const tierLabel =
      tier.kind === 'notListed'
        ? `${budgetSymbol(budgetTierForPerPerson(estimate.median))} ${budgetTierForPerPerson(estimate.median)} (estimated)`
        : tier.label;
    return {
      kind: 'estimated',
      tierLabel,
      spendLabel: `${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)} for two · estimated from menu prices`,
      amount: `${formatCurrency(estimate.low)} – ${formatCurrency(estimate.high)}`,
      // No "estimated from menu prices" here: the Provenance badge directly
      // below the figure already reads "Estimated from menu", and saying it
      // twice in one cell is what made this stat a paragraph.
      amountNote: 'for two',
      perPersonLabel: `about ${formatCurrency(Math.round(estimate.low / 2))} – ${formatCurrency(Math.round(estimate.high / 2))} per person`,
      evidence: 'Estimated from this restaurant’s recorded menu prices — not a verified total.',
    };
  }

  // Priority 2 — verified curated price for two (never a fabricated range).
  if (restaurant.priceForTwo > 0) {
    return {
      kind: 'verified',
      tierLabel: tier.label,
      spendLabel: `About ${formatCurrency(restaurant.priceForTwo)} for two (approx., no drinks)`,
      amount: formatCurrency(restaurant.priceForTwo),
      amountNote: 'for two, approx. · no drinks',
      evidence: 'Approximate cost for two — confirm the current menu at the restaurant.',
    };
  }

  // Priority 3 — nothing to show.
  return {
    kind: 'notListed',
    tierLabel: tier.label,
    spendLabel: 'Price not listed yet',
    evidence: 'Our team is still recording this restaurant’s prices.',
  };
}