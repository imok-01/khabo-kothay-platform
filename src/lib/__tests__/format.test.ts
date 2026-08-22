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
  it('returns complete address directly without prepending area/city', () => {
    expect(formatAddress({ address: 'House 12/B, 5th Floor, Road 55, Dhaka', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'House 12/B, 5th Floor, Road 55, Dhaka',
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

  it('omits plus-code addresses in favour of area/city', () => {
    expect(formatAddress({ address: 'QCV9+2J', city: 'Dhaka' })).toEqual(['Dhaka']);
    expect(formatAddress({ address: 'QCGG+XMR', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'Gulshan',
      'Dhaka',
    ]);
  });

  it('omits lone road fragments in favour of area/city', () => {
    expect(formatAddress({ address: 'Rd 45', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'Gulshan',
      'Dhaka',
    ]);
    expect(formatAddress({ address: '33 Rd 45', location: 'Gulshan' })).toEqual(['Gulshan']);
    expect(formatAddress({ address: 'Lane No 4' })).toEqual([]);
  });

  it('returns useful address directly without prepending area/city', () => {
    expect(formatAddress({ address: 'Road 45, House 12/B', location: 'Gulshan', city: 'Dhaka' })).toEqual([
      'Road 45, House 12/B',
    ]);
  });
});
