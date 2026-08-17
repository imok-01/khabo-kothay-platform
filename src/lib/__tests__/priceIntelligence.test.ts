import { describe, expect, it } from 'vitest';
import type { PriceSnapshot } from '../../domain/menu';
import {
  observationsInRange,
  priceStats,
  chartPoints,
  priceInterpretation,
  formatLongDate,
} from '../priceIntelligence';

function snap(price: number, at: string): PriceSnapshot {
  return { id: at, price, at, source: 'restaurant', recordedBy: 'Restaurant admin', status: 'recorded' };
}

const history = [
  snap(280, '2025-06-10'),
  snap(320, '2026-01-15'),
  snap(310, '2026-08-14'),
];

describe('observationsInRange', () => {
  it('keeps everything for All', () => {
    expect(observationsInRange(history, 'All').length).toBe(3);
  });

  it('filters by the reference date without fabricating data', () => {
    const now = new Date('2026-09-01');
    // Jan 15 is more than 6 months before Sep 1; the Aug 14 observation survives.
    expect(observationsInRange(history, '1M', now).map((s) => s.at)).toEqual(['2026-08-14']);
    expect(observationsInRange(history, '6M', now).map((s) => s.at)).toEqual(['2026-08-14']);
    expect(observationsInRange(history, 'All', now).length).toBe(3);
  });
});

describe('priceStats', () => {
  it('computes lowest / average / highest from actual observations', () => {
    const stats = priceStats(history)!;
    expect(stats.lowest).toBe(280);
    expect(stats.average).toBe(303); // (280 + 320 + 310) / 3 = 303.33 → 303
    expect(stats.highest).toBe(320);
    expect(stats.count).toBe(3);
  });

  it('returns null for an empty set', () => {
    expect(priceStats([])).toBeNull();
  });
});

describe('chartPoints', () => {
  it('plots one point per recorded observation — never interpolated', () => {
    const points = chartPoints(history);
    expect(points.map((p) => p.price)).toEqual([280, 320, 310]);
  });
});

describe('priceInterpretation', () => {
  it('notes incomplete history when few observations exist', () => {
    // Two observations is still too few to claim a full pricing pattern.
    const thin = history.slice(0, 2);
    const { notes } = priceInterpretation(thin, 320);
    expect(notes.join(' ')).toContain('may not represent the full pricing pattern');
  });

  it('flags the lowest recorded price honestly', () => {
    const { notes } = priceInterpretation(history, 280);
    expect(notes.join(' ')).toContain('lowest recorded price');
  });

  it('flags the highest recorded price honestly', () => {
    const { notes } = priceInterpretation(history, 320);
    expect(notes.join(' ')).toContain('highest recorded price');
  });

  it('describes a price at the recorded average honestly', () => {
    // Average of 280/320/310 is ≈303.
    const { notes } = priceInterpretation(history, 303);
    expect(notes.join(' ')).toMatch(/close to the recorded average/);
  });

  it('never claims completeness or offer authentication', () => {
    const { headline, notes } = priceInterpretation(history, 310);
    expect(headline).not.toContain('guarantee');
    expect(notes.join(' ')).not.toContain('authentic');
  });
});

describe('formatLongDate', () => {
  it('formats ISO dates in a readable local style', () => {
    expect(formatLongDate('2026-08-14')).toBe('14 Aug 2026');
  });
});
