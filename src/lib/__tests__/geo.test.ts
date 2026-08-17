import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance } from '../geo';

describe('distanceKm', () => {
  it('is zero for identical points', () => {
    expect(distanceKm({ lat: 22.56, lng: 88.35 }, { lat: 22.56, lng: 88.35 })).toBe(0);
  });

  it('computes a plausible distance within a city (~1° lat ≈ 111 km)', () => {
    const d = distanceKm({ lat: 22.56, lng: 88.35 }, { lat: 22.66, lng: 88.35 });
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(12);
  });

  it('is symmetric', () => {
    const a = { lat: 22.56, lng: 88.35 };
    const b = { lat: 22.49, lng: 88.34 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 10);
  });
});

describe('formatDistance', () => {
  it('uses metres under 1 km', () => {
    expect(formatDistance(0.4)).toBe('400 m');
  });

  it('uses one decimal under 10 km', () => {
    expect(formatDistance(2.43)).toBe('2.4 km');
  });

  it('rounds beyond 10 km', () => {
    expect(formatDistance(14.2)).toBe('14 km');
  });
});
