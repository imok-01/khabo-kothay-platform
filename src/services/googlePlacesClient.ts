import type {
  GoogleBusinessStatus,
  LiveGoogleHours,
  LiveGoogleReview,
  LiveGoogleSnapshot,
} from '../domain/liveGoogle';

/**
 * Places API (New) client — the ONLY place in the app that talks to Google
 * for live place data. Nothing else calls `places.googleapis.com`.
 *
 * - Uses the official Place Details (New) REST endpoint — never scrapes Maps.
 * - Always sends an explicit `X-Goog-FieldMask`; no `*` requests.
 * - Photos are deliberately NOT requested (image system is out of scope).
 * - Keys come from `import.meta.env`; the key must be a browser key
 *   restricted to the app's HTTP referrers (same posture as the existing
 *   Maps JS key). A future server-side proxy can replace this module without
 *   touching any component.
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-details
 */

export type GooglePlacesErrorCode =
  | 'missing-key'
  | 'network'
  | 'not-found'
  | 'permission'
  | 'rate-limited'
  | 'quota'
  | 'server'
  | 'parse';

export class GooglePlacesError extends Error {
  readonly code: GooglePlacesErrorCode;
  readonly httpStatus?: number;

  constructor(code: GooglePlacesErrorCode, message: string, httpStatus?: number) {
    super(message);
    this.name = 'GooglePlacesError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/**
 * Browser-restricted Places API key. Falls back to the existing Maps key so
 * a single Google Cloud key with both APIs enabled works out of the box.
 */
export function getGooglePlacesApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export const isGooglePlacesConfigured = (): boolean => Boolean(getGooglePlacesApiKey());

/* ------------------------------------------------------------------ */
/* Field masks — minimum fields, minimum calls                         */
/* ------------------------------------------------------------------ */

/** Fields needed for the summary refresh (no reviews). */
const SUMMARY_MASK = [
  'places.id',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.currentOpeningHours',
  'places.regularOpeningHours',
  'places.priceLevel',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.googleMapsUri',
  'places.formattedAddress',
].join(',');

/** Adds the review set (max 5) plus attribution fields. */
const REVIEWS_MASK = [
  'places.reviews.authorAttribution.displayName',
  'places.reviews.rating',
  'places.reviews.text',
  'places.reviews.originalText',
  'places.reviews.publishTime',
  'places.reviews.relativePublishTimeDescription',
].join(',');

const ENDPOINT = 'https://places.googleapis.com/v1/places';

/* ------------------------------------------------------------------ */
/* HTTP                                                               */
/* ------------------------------------------------------------------ */

interface PlaceDetailsResponse {
  id?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: GoogleBusinessStatus;
  currentOpeningHours?: {
    openNow?: boolean;
    weekdayDescriptions?: string[];
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
  };
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>;
  };
  priceLevel?: 0 | 1 | 2 | 3 | 4;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  formattedAddress?: string;
  reviews?: Array<{
    authorAttribution?: { displayName?: string };
    rating?: number;
    text?: { text?: string; languageCode?: string };
    originalText?: { text?: string; languageCode?: string };
    publishTime?: string;
    relativePublishTimeDescription?: string;
  }>;
  error?: { code?: number; status?: string; message?: string };
}

async function request<T>(path: string, mask: string): Promise<T> {
  const key = getGooglePlacesApiKey();
  if (!key) {
    throw new GooglePlacesError('missing-key', 'Google Places API key is not configured');
  }

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(path)}?languageCode=en`, {
      headers: {
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': mask,
      },
    });
  } catch (err) {
    throw new GooglePlacesError('network', `Network error contacting Google Places: ${(err as Error).message}`);
  }

  let body: PlaceDetailsResponse;
  try {
    body = (await res.json()) as PlaceDetailsResponse;
  } catch {
    throw new GooglePlacesError('parse', 'Google Places returned a non-JSON response', res.status);
  }

  if (!res.ok) {
    const status = body.error?.status ?? '';
    const message = body.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 404 || status === 'NOT_FOUND') {
      throw new GooglePlacesError('not-found', `Place not found: ${message}`, res.status);
    }
    if (res.status === 403 || status === 'PERMISSION_DENIED') {
      throw new GooglePlacesError('permission', `Permission denied: ${message}`, res.status);
    }
    if (res.status === 429) {
      throw new GooglePlacesError(
        status === 'RESOURCE_EXHAUSTED' ? 'quota' : 'rate-limited',
        `Rate limited: ${message}`,
        res.status,
      );
    }
    throw new GooglePlacesError('server', `Google Places error: ${message}`, res.status);
  }

  return body as T;
}

/* ------------------------------------------------------------------ */
/* Normalization                                                       */
/* ------------------------------------------------------------------ */

function normalizeHours(input?: PlaceDetailsResponse['currentOpeningHours']): LiveGoogleHours | undefined {
  if (!input) return undefined;
  return {
    openNow: input?.openNow,
    weekdayText: input?.weekdayDescriptions ?? [],
    periods: (input?.periods ?? []).map((p) => {
      const open = p.open ? { day: p.open.day ?? 0, openMinutes: (p.open.hour ?? 0) * 60 + (p.open.minute ?? 0) } : undefined;
      const close = p.close ? { day: p.close.day ?? 0, closeMinutes: (p.close.hour ?? 0) * 60 + (p.close.minute ?? 0) } : undefined;
      return {
        day: open?.day ?? close?.day ?? 0,
        openMinutes: open?.openMinutes,
        closeMinutes: close?.closeMinutes,
        openAllDay: !open && !close,
      };
    }),
  };
}

function normalizeReviews(input?: PlaceDetailsResponse['reviews']): LiveGoogleReview[] {
  if (!input) return [];
  return input
    .filter((r) => r.authorAttribution?.displayName || r.text?.text)
    .map((r) => {
      const author = r.authorAttribution?.displayName ?? 'Google reviewer';
      const translated = Boolean(r.originalText?.text && r.text?.text && r.originalText.text !== r.text.text);
      return {
        author,
        rating: r.rating ?? 0,
        relativeTime: r.relativePublishTimeDescription,
        text: r.text?.text,
        originalText: r.originalText?.text,
        translated,
        language: r.originalText?.languageCode ?? r.text?.languageCode,
        // Place Details (New) returns reviews without per-review URLs — the
        // correct attribution is a link to the place on Google Maps.
        sourceUrl: `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent('')}`, // filled by caller
      };
    });
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetches the summary fields for a place (rating, count, status, hours,
 * price level, website, phone, maps URI, address) — no reviews.
 */
export async function fetchPlaceSummary(placeId: string): Promise<PlaceDetailsResponse> {
  return request<PlaceDetailsResponse>(placeId, SUMMARY_MASK);
}

/**
 * Fetches the full detail set including the review list (max 5, as returned
 * by Place Details New). Used by the full refresh path.
 */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetailsResponse> {
  const body = await request<PlaceDetailsResponse>(placeId, `${SUMMARY_MASK},${REVIEWS_MASK}`);
  return body;
}

/** Normalize a raw Place Details response into a `LiveGoogleSnapshot`. */
export function normalizePlaceDetails(body: PlaceDetailsResponse, placeId: string): LiveGoogleSnapshot {
  const snapshot: LiveGoogleSnapshot = {
    placeId,
    rating: body.rating,
    userRatingCount: body.userRatingCount,
    reviews: normalizeReviews(body.reviews),
    businessStatus: body.businessStatus,
    currentHours: normalizeHours(body.currentOpeningHours),
    regularHours: normalizeHours(body.regularOpeningHours),
    price: body.priceLevel !== undefined ? { priceLevel: body.priceLevel } : undefined,
    websiteUri: body.websiteUri,
    phone: body.nationalPhoneNumber,
    googleMapsUri: body.googleMapsUri,
    formattedAddress: body.formattedAddress,
    fetchedAt: new Date().toISOString(),
  };
  // Link each review to this place on Google Maps (attribution requirement).
  const mapsUri = body.googleMapsUri ?? `https://www.google.com/maps/search/?api=1&query=place_id:${encodeURIComponent(placeId)}`;
  snapshot.reviews = snapshot.reviews.map((r) => ({ ...r, sourceUrl: mapsUri }));
  return snapshot;
}

/** Get the place ID embedded in a Google Maps URI, when present. */
export function placeIdFromMapsUri(uri: string): string | undefined {
  const m = uri.match(/place_id=([^&?#]+)/i) ?? uri.match(/[?&]placeid=([^&?#]+)/i);
  return m ? decodeURIComponent(m[1]) : undefined;
}
