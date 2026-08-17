import type { PriceSnapshot } from '../domain/menu';

/**
 * Price intelligence — pure helpers that derive *everything* from actual
 * recorded observations. Nothing here fabricates data: if a range has no
 * observations, it's disabled; stats and the chart plot only real snapshots.
 */

export type PriceRange = '1M' | '3M' | '6M' | 'All';

export const PRICE_RANGES: PriceRange[] = ['1M', '3M', '6M', 'All'];

const RANGE_MONTHS: Record<Exclude<PriceRange, 'All'>, number> = {
  '1M': 1,
  '3M': 3,
  '6M': 6,
};

export function inRange(at: string, range: PriceRange, now: Date = new Date()): boolean {
  if (range === 'All') return true;
  const months = RANGE_MONTHS[range];
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  return new Date(at).getTime() >= cutoff.getTime();
}

/** Observations within the selected range, oldest first. */
export function observationsInRange(history: PriceSnapshot[], range: PriceRange, now?: Date): PriceSnapshot[] {
  return [...history]
    .filter((s) => inRange(s.at, range, now))
    .sort((a, b) => a.at.localeCompare(b.at));
}

export interface PriceStats {
  lowest: number;
  average: number;
  highest: number;
  count: number;
}

/** Summary stats over the given (already filtered) observations. */
export function priceStats(snapshots: PriceSnapshot[]): PriceStats | null {
  if (snapshots.length === 0) return null;
  const prices = snapshots.map((s) => s.price);
  return {
    lowest: Math.min(...prices),
    average: Math.round(prices.reduce((n, p) => n + p, 0) / prices.length),
    highest: Math.max(...prices),
    count: snapshots.length,
  };
}

export interface ChartPoint {
  price: number;
  at: string;
  label: string;
}

/**
 * Chart points for the line graph. X positions are spread evenly across the
 * visible span (dates are sparse, so equal spacing reads better than a true
 * time axis and never implies missing intermediate data).
 */
export function chartPoints(snapshots: PriceSnapshot[]): ChartPoint[] {
  return snapshots.map((s) => ({
    price: s.price,
    at: s.at,
    label: formatShortDate(s.at),
  }));
}

/** "2026-08-14" → "14 Aug 2026" */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "2026-08-14" → "Aug" (short label for chart axes) */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

export interface Interpretation {
  headline: string;
  notes: string[];
}

/**
 * Honest interpretation built only from recorded data. Never claims the
 * history is complete — and never claims an offer is "authenticated".
 */
export function priceInterpretation(snapshots: PriceSnapshot[], currentPrice: number): Interpretation {
  const stats = priceStats(snapshots);
  if (!stats) {
    return {
      headline: 'No recorded observations available.',
      notes: ['This dish has no recorded price history yet.'],
    };
  }

  const notes: string[] = [];
  if (snapshots.length < 3) {
    notes.push(`Only ${snapshots.length} price observation${snapshots.length === 1 ? '' : 's'} ${snapshots.length === 1 ? 'is' : 'are'} available, so this history may not represent the full pricing pattern.`);
  }

  if (currentPrice <= stats.lowest) {
    notes.push('Today\u2019s price is the lowest recorded price in the available history.');
  } else if (currentPrice >= stats.highest) {
    notes.push('Today\u2019s price is the highest recorded price in the available history.');
  } else {
    const diffRatio = (currentPrice - stats.average) / stats.average;
    if (diffRatio <= -0.01) {
      notes.push('Today\u2019s price is slightly below the recorded average.');
    } else if (diffRatio >= 0.01) {
      notes.push('Today\u2019s price is above the recorded average.');
    } else {
      notes.push('Today\u2019s price is close to the recorded average.');
    }
  }

  return { headline: 'What the record shows', notes };
}
