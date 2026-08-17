import { describe, expect, it } from 'vitest';
import { formatCurrency, pluralize } from '../format';

describe('formatCurrency', () => {
  it('formats amounts with the market currency symbol (BDT)', () => {
    expect(formatCurrency(300)).toBe('৳300');
    expect(formatCurrency(900)).toBe('৳900');
  });

  it('uses lakh/crore digit grouping for thousands', () => {
    expect(formatCurrency(1500)).toBe('৳1,500');
    expect(formatCurrency(234000)).toBe('৳2,34,000');
  });

  it('rounds fractional amounts', () => {
    expect(formatCurrency(1299.6)).toBe('৳1,300');
  });
});

describe('pluralize', () => {
  it('keeps the singular form for one', () => {
    expect(pluralize(1, 'place')).toBe('place');
  });

  it('adds s for zero or many', () => {
    expect(pluralize(0, 'place')).toBe('places');
    expect(pluralize(5, 'place')).toBe('places');
  });
});
