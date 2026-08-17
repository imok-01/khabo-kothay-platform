/**
 * Dual-source restaurant data model.
 *
 * Every restaurant carries two clearly separated datasets:
 *
 * - `ExternalPlaceData` (google) — data that would come from the Google
 *   Places API (New) once connected: place ID, maps URI, rating, reviews,
 *   photos, contact info. Absent in demo mode (no fabricated Google data).
 * - `KhaboPlaceData` (khabo) — Khabo Kothay's own community layer: our
 *   rating, our reviews, user photos, tags, signals, visit behaviour.
 *
 * The UI must always label which source a rating/review/photo came from.
 */

/* ------------------------------------------------------------------ */
/* Google (external) data                                              */
/* ------------------------------------------------------------------ */

export interface ExternalPlaceData {
  /** Google Place ID — the stable link between our restaurant and Google. */
  placeId: string;
  /** https://maps.google.com/?cid=… or /maps/place/… deep link. */
  mapsUri: string;
  /** Google's own rating (1–5). */
  rating: number;
  /** Number of Google reviews. */
  reviewCount: number;
  /** A limited set of Google reviews (never the full database). */
  reviews: ExternalReview[];
  /** Photo references for the Google Places Photo API (not stored locally). */
  photos: ExternalPhoto[];
  address?: string;
  website?: string;
  phone?: string;
  openingHours?: string;
  /** Google's price level: 0 free … 4 very expensive. */
  priceLevel?: 0 | 1 | 2 | 3 | 4;
  /**
   * When this snapshot was fetched. Caching must respect Google's Maps
   * Platform caching limits — never serve stale place data forever.
   */
  fetchedAt?: string;
}

export interface ExternalReview {
  id: string;
  author: string;
  rating: number;
  /** e.g. "2 months ago" — as provided by the Places API. */
  relativeTime?: string;
  text?: string;
  /** Original untranslated text, kept for translation disclosure. */
  originalText?: string;
  /** True when the API returned a translated version of the text. */
  translated?: boolean;
  language?: string;
  /** Direct link to this review on Google Maps (attribution requirement). */
  sourceUrl: string;
}

export interface ExternalPhoto {
  /** Reference for the Place Photos API — resolve at render time, never store. */
  photoRef?: string;
  /** Direct photo URL (e.g. an lh3.googleusercontent.com link) — used when the
   *  source already provides resolvable URLs instead of API references. */
  imageUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
}

/* ------------------------------------------------------------------ */
/* Khabo Kothay community data                                         */
/* ------------------------------------------------------------------ */

export interface KhaboPlaceData {
  /** Khabo Kothay community rating (1–5), from our own reviews. */
  rating: number;
  reviewCount: number;
  /** Our own community reviews — written by local food lovers, not Google. */
  reviews: KhaboReview[];
  /** User-contributed photos (separate from Google photos). */
  photos: KhaboPhoto[];
  /** Short community tags, e.g. "great biryani", "generous portions". */
  tags: string[];
  /** Editorial highlights (curated by Khabo Kothay). */
  highlights: string[];
  /** Data-backed "why people like it" signals. */
  signals: RestaurantSignal[];
  /** Total recorded visits in the community (a "frequently revisited" signal). */
  visitCount: number;
  /** Featured on the home page / cards. */
  featured: boolean;
}

export interface KhaboReview {
  id: string;
  author: string;
  /** Overall rating the reviewer gave. */
  rating: number;
  date: string;
  comment: string;
  /** Honest visit signal — NOT verification, just the reviewer's own claim. */
  visitStatus?: 'visited' | 'regular';
  /** How many times the reviewer says they've been. */
  visitCount?: number;
  favoriteDishes?: string[];
  tags?: string[];
  foodRating?: number;
  serviceRating?: number;
  ambienceRating?: number;
  valueRating?: number;
  /** Other members who found this review helpful. */
  helpfulCount: number;
  photos?: KhaboPhoto[];
}

export interface KhaboPhoto {
  id: string;
  /** Where the photo lives — an upload provider, not Google's photo store. */
  url: string;
  alt?: string;
  author?: string;
  /** When the photo was added by the community member. */
  addedAt?: string;
}

/* ------------------------------------------------------------------ */
/* Community signals                                                   */
/* ------------------------------------------------------------------ */

/** Machine keys — components map these to icons. */
export type SignalType =
  | 'value'
  | 'portions'
  | 'family'
  | 'dish'
  | 'coffee'
  | 'dessert'
  | 'vibe'
  | 'revisit'
  | 'group'
  | 'popular'
  | 'late'
  | 'date'
  | 'quick'
  | 'heritage'
  | 'service'
  | 'fresh'
  | 'spice'
  | 'quiet'
  | 'work'
  | 'live'
  | 'views'
  | 'photo';

/** Where a signal's evidence comes from — transparency over vibes. */
export type SignalSource = 'reviews' | 'visits' | 'tags' | 'metadata' | 'editorial';

export interface RestaurantSignal {
  id: string;
  type: SignalType;
  /** Human label, e.g. "Great value" or "Popular for biryani". */
  label: string;
  /** 0–100 strength, derived from supporting data in the demo architecture. */
  strength: number;
  /** The evidence sources behind this signal. */
  sources: SignalSource[];
}

/* ------------------------------------------------------------------ */
/* Readiness-only models (future systems, typed now, unused in demo)   */
/* ------------------------------------------------------------------ */

export interface MenuInfo {
  categories: Array<{ name: string; dishes: Array<{ name: string; price?: number; available?: boolean }> }>;
  /** Where the menu came from: website, restaurant-provided, verified upload… */
  source: string;
  lastCheckedAt: string;
}

export interface PriceObservation {
  priceForTwo: number;
  /** Timestamp of OUR observation — never claims history we don't have. */
  at: string;
  source: 'manual' | 'menu' | 'offer' | 'report';
}
