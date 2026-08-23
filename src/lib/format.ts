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
 * True when a stored address is a Google plus code (e.g. "QCV9+2J",
 * "QCGG+XMR") — a location reference, not a street address.
 */
function isPlusCode(value: string): boolean {
  return /^[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\b/i.test(value);
}

/**
 * True when a cleaned address is a truncated, meaningless fragment — a lone
 * road/lane reference ("Rd 45", "33 Rd 45", "Lane No 4", "Road No. 11") or a
 * plus code. Such values are presented as an address only when nothing better
 * exists; otherwise they are omitted in favour of the honest fallback.
 */
export function isPoorAddress(value: string): boolean {
  if (isPlusCode(value)) return true;
  if (/^(?:\d+[a-z]?\s+)?(?:rd|road|lane|ave|avenue|st|street)(?:\s+(?:no\.?|nr\.?)\s*\d*|\s*\d+)?$/i.test(value)) {
    return true;
  }
  return value.length < 8;
}

/**
 * Clean, human-readable address lines in preferred display order:
 * [area, city, useful street line]. A street fragment is included only when
 * it is actually useful (not a plus code or a lone road reference). Every
 * line is a verified stored value — a missing part is simply omitted, never
 * invented. When only poor data exists the result is empty so the caller can
 * show an honest fallback.
 *
 * If the cleaned address is already a complete address (not poor), it is
 * returned as-is to avoid duplicating area/city that are already embedded.
 *
 * If the address is a verified address (from verification_records), it is
 * always returned as-is without prepending area/city.
 */
export function formatAddress(place: { address?: string; location?: string; city?: string; isVerified?: boolean }): string[] {
  const area = cleanAddressSegment(place.location ?? '');
  const city = cleanAddressSegment(place.city ?? '');
  const cleaned = place.address ? cleanAddressSegment(place.address) : '';
  const isVerified = place.isVerified === true;

  // If we have a verified address, use it directly — it's already complete and authoritative.
  // Also if we have a meaningful cleaned address, use it directly — it already
  // contains the city/area (e.g. "House 12/B, Road 55, Dhaka"). Prepending
  // area/city again would duplicate them.
  if (isVerified && cleaned) {
    return [cleaned];
  }
  if (cleaned && !isPoorAddress(cleaned)) {
    return [cleaned];
  }

  // Fallback: build from components when only poor/no address exists.
  // Poor addresses (plus codes, road fragments) are omitted entirely.
  const lines: string[] = [];
  if (area) lines.push(area);
  if (city && !lines.includes(city)) lines.push(city);
  if (cleaned && !isPoorAddress(cleaned) && !lines.includes(cleaned)) lines.push(cleaned);
  return lines;
}
