import type { Restaurant } from '../types';
import type { ExternalPlaceData, ExternalReview } from '../domain/place';
import type { LiveGoogleSnapshot } from '../domain/liveGoogle';

/**
 * Display-layer merge: overlay a live Google snapshot onto a restaurant's
 * imported `google` data for rendering purposes only.
 *
 * Ownership rules honoured here:
 *   - Live Google values win over the imported seed for the fields Google
 *     actually returned (rating, count, reviews, hours, status, price level,
 *     website, phone, maps URI, address).
 *   - Missing live fields fall back to the imported seed — never to
 *     fabricated values.
 *   - `photos` come from the seed exactly as-is (image system untouched).
 *   - Khabo Kothay fields are never touched by this function.
 */
export function mergeLiveGoogle(
  restaurant: Restaurant,
  snapshot?: LiveGoogleSnapshot,
): ExternalPlaceData | undefined {
  const base = restaurant.google;
  if (!base) return undefined;
  if (!snapshot) return base;

  const reviews: ExternalReview[] = snapshot.reviews.map((r) => ({
    id: `live-${r.author}-${r.rating}-${r.relativeTime ?? ''}`,
    author: r.author,
    rating: r.rating,
    relativeTime: r.relativeTime,
    text: r.text,
    originalText: r.originalText,
    translated: r.translated,
    language: r.language,
    sourceUrl: r.sourceUrl,
  }));

  return {
    ...base,
    placeId: base.placeId,
    mapsUri: snapshot.googleMapsUri ?? base.mapsUri,
    rating: snapshot.rating ?? base.rating,
    reviewCount: snapshot.userRatingCount ?? base.reviewCount,
    reviews,
    // Curated/imported address wins over the live Google formatted address —
    // the live string is raw Google data that may be truncated (e.g. "The
    // Westin, Main"). Live Google fills the gap only when nothing curated
    // exists. The page's formatAddress priority mirrors this rule.
    address: base.address ?? snapshot.formattedAddress,
    website: snapshot.websiteUri ?? base.website,
    phone: snapshot.phone ?? base.phone,
    openingHours: snapshot.currentHours?.weekdayText.join(', ') || snapshot.regularHours?.weekdayText.join(', ') || base.openingHours,
    priceLevel: snapshot.price?.priceLevel ?? base.priceLevel,
    fetchedAt: snapshot.fetchedAt ?? base.fetchedAt,
    // Photos deliberately carried through untouched.
    photos: base.photos,
  };
}

/** Business status → friendly label for the UI (Google's own vocabulary). */
export function businessStatusLabel(status?: string): string | undefined {
  switch (status) {
    case 'OPERATIONAL':
      return 'Operational';
    case 'CLOSED_TEMPORARILY':
      return 'Temporarily closed';
    case 'CLOSED_PERMANENTLY':
      return 'Permanently closed';
    default:
      return undefined;
  }
}

/**
 * Open-state from live Google data: prefers Google's `currentOpeningHours`
 * flag; falls back to the recorded seed hours parser result. Returns
 * undefined only when neither source can say anything truthful.
 */
export function liveOpenNowLabel(
  snapshot: LiveGoogleSnapshot | undefined,
  seedLabel: string | undefined,
): string | undefined {
  if (snapshot?.currentHours && snapshot.currentHours.openNow !== undefined) {
    return snapshot.currentHours.openNow ? 'Open now' : 'Closed now';
  }
  return seedLabel;
}
