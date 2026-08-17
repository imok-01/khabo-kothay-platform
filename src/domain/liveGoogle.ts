/**
 * Live Google Places data — the normalized result of a Place Details (New)
 * refresh, keyed by the stable Google Place ID.
 *
 * This is a SEPARATE layer from the imported seed `ExternalPlaceData`:
 *
 * - `google` (seed)      — the snapshot imported with the dataset.
 * - `liveGoogle` (live)  — what a controlled Place Details refresh returned
 *                          most recently for the same place ID.
 *
 * Rules honoured here:
 *   - The live snapshot never carries photos (image system is out of scope).
 *   - Reviews are limited to what Place Details (New) returns (max 5) and
 *     carry Google author attribution + a link back to the source.
 *   - Nothing is persisted to a local database; the snapshot lives in memory
 *     for the session and is refetched on demand per the freshness policy.
 *   - Missing fields stay undefined — never replaced with fabricated values.
 */

/** Google business status (Place Details `businessStatus`). */
export type GoogleBusinessStatus =
  | 'OPERATIONAL'
  | 'CLOSED_TEMPORARILY'
  | 'CLOSED_PERMANENTLY';

/** A Google review as returned by Place Details (New). */
export interface LiveGoogleReview {
  /** Reviewer display name (author attribution, required by Google). */
  author: string;
  /** Rating the reviewer gave (1–5). */
  rating: number;
  /** e.g. "2 months ago" — as provided by the API. */
  relativeTime?: string;
  text?: string;
  /** Original untranslated text — kept for translation disclosure. */
  originalText?: string;
  /** True when the API returned a translated version of the text. */
  translated?: boolean;
  language?: string;
  /** Direct link to the review on Google Maps. */
  sourceUrl: string;
}

/** Daily opening period within a week (minutes from local midnight). */
export interface LiveGooglePeriod {
  /** 0 = Sunday … 6 = Saturday. */
  day: number;
  openMinutes?: number;
  closeMinutes?: number;
  /** True when the venue is open 24 hours that day. */
  openAllDay?: boolean;
}

/** Normalized current/regular opening hours. */
export interface LiveGoogleHours {
  /** Google's `openNow` flag — true/closed only when Google says so. */
  openNow?: boolean;
  /** Human-readable periods, e.g. ["Monday: 12:00–22:00"]. */
  weekdayText: string[];
  /** Machine-readable periods (for "opens at…" calculations). */
  periods: LiveGooglePeriod[];
}

/** Price positioning from Place Details (New) — restaurant-level, NOT dish. */
export interface LiveGooglePrice {
  /** Google's price level 0 (free) … 4 (very expensive). */
  priceLevel?: 0 | 1 | 2 | 3 | 4;
}

/** The complete normalized live snapshot for one place. */
export interface LiveGoogleSnapshot {
  /** Stable Google Place ID. */
  placeId: string;
  rating?: number;
  userRatingCount?: number;
  /** Up to 5 reviews as returned by Place Details (New). */
  reviews: LiveGoogleReview[];
  businessStatus?: GoogleBusinessStatus;
  currentHours?: LiveGoogleHours;
  regularHours?: LiveGoogleHours;
  price?: LiveGooglePrice;
  websiteUri?: string;
  phone?: string;
  googleMapsUri?: string;
  formattedAddress?: string;
  /** When this snapshot was fetched (operational metadata, ISO string). */
  fetchedAt: string;
}

/* ------------------------------------------------------------------ */
/* Refresh status — operational metadata only                          */
/* ------------------------------------------------------------------ */

export type GoogleRefreshStatus =
  | 'idle' // never attempted
  | 'refreshing' // a refresh is in flight
  | 'updated' // last refresh succeeded
  | 'failed' // last refresh errored
  | 'unavailable'; // not attempted (no key / not configured)

export interface GoogleRefreshMeta {
  status: GoogleRefreshStatus;
  /** ISO timestamp of the last attempt (successful or not). */
  lastAttemptedAt?: string;
  /** ISO timestamp of the last successful refresh. */
  lastSuccessfulAt?: string;
  /** Human-readable error, kept off the public UI (admin only). */
  lastError?: string;
}
