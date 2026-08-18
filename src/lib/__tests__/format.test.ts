import { describe, expect, it } from 'vitest';
import { cleanAddressSegment, formatAddress, formatCurrency, pluralize } from '../format';

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

describe('cleanAddressSegment', () => {
  it('trims and collapses internal whitespace', () => {
    expect(cleanAddressSegment('  The   Westin,   Main   ')).toBe('The Westin, Main');
  });

  it('strips trailing commas and whitespace', () => {
    expect(cleanAddressSegment('Tower , 7th floor,')).toBe('Tower, 7th floor');
    expect(cleanAddressSegment('House 12/B, 5th Floor, Rd 55,')).toBe('House 12/B, 5th Floor, Rd 55');
  });

  it('returns an empty string for blank input', () => {
    expect(cleanAddressSegment('   ')).toBe('');
  });
});

describe('formatAddress', () => {
  it('builds [street, area, city] lines from stored values', () => {
    expect(formatAddress({ address: 'House 12/B', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'House 12/B',
      'Gulshan',
      'Dhaka',
    ]);
  });

  it('omits missing parts instead of inventing them', () => {
    expect(formatAddress({ address: 'House 12/B' })).toEqual(['House 12/B']);
    expect(formatAddress({})).toEqual([]);
  });

  it('does not repeat an identical part', () => {
    expect(formatAddress({ address: 'Gulshan', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'Gulshan',
      'Dhaka',
    ]);
  });
});
