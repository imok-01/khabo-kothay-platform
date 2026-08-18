import { MARKET } from './market';

/** Formats an amount as the market's currency, e.g. ৳1,500 (lakh grouping). */
export function formatCurrency(amount: number): string {
  return `${MARKET.currencySymbol}${Math.round(amount).toLocaleString(MARKET.locale)}`;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural ?? `${singular}s`;
}

/**
 * Trims a raw address part, collapses internal whitespace, normalises
 * comma spacing and strips trailing commas/punctuation (the import stores
 * messy Google strings like "Tower , 7th floor,").
 */
export function cleanAddressSegment(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/[,\s]+$/, '');
}

/**
 * Clean, human-readable address lines: [street, area, city]. Every line is a
 * verified stored value — a missing part is simply omitted, never invented.
 */
export function formatAddress(place: { address?: string; location?: string; city?: string }): string[] {
  const lines: string[] = [];
  const cleaned = place.address ? cleanAddressSegment(place.address) : '';
  if (cleaned) lines.push(cleaned);
  for (const part of [place.location, place.city]) {
    const p = cleanAddressSegment(part ?? '');
    if (p && !lines.includes(p)) lines.push(p);
  }
  return lines;
}
