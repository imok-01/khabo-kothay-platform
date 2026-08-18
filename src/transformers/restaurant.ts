import type { Budget, MealType, Restaurant, Vibe } from '../types';
import type { ExternalPlaceData, ExternalPhoto, KhaboPlaceData, KhaboReview, PriceObservation } from '../domain/place';
import type { RestaurantIntelligence } from '../domain/intelligence';
import type {
  ImageReferencesRow,
  RestaurantAliasesRow,
  RestaurantAttributesRow,
  RestaurantSourcesRow,
  RestaurantTagsRow,
  RestaurantsRow,
  ReviewSignalsRow,
  UserReviewsRow,
  VerificationRecordsRow,
  VerificationStatus,
} from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved database rows → frontend domain objects.
 *
 * The database is normalized (restaurants + restaurant_sources +
 * restaurant_attributes + restaurant_tags + review_signals + image_references);
 * the frontend consumes one combined `Restaurant` domain object. This module
 * does ONLY that mapping — it never invents values.
 *
 * HONESTY RULES (mirror the spec's UNKNOWN ≠ TRUE / UNVERIFIED ≠ VERIFIED):
 *  - Missing price → `priceForTwo: 0` (the UI already renders "Not listed").
 *  - Missing meal types / cuisines / vibes → empty arrays (UI hides them).
 *  - A `google` block exists only when a google source row exists; rating /
 *    review count come from review_signals only when actually present.
 *  - `website` is surfaced only when the import has stored a verified value
 *    (the Website CTA stays gated on it).
 */

export interface RestaurantDbBundle {
  restaurant: RestaurantsRow;
  sources: RestaurantSourcesRow[];
  attributes: RestaurantAttributesRow[];
  aliases?: RestaurantAliasesRow[];
  tags?: RestaurantTagsRow[];
  images: ImageReferencesRow[];
  reviewSignals: ReviewSignalsRow[];
  /** KK user reviews — optional, detail views fetch them. */
  userReviews?: UserReviewsRow[];
  intelligence?: RestaurantIntelligence;
}

/* ------------------------------------------------------------------ */
/* Attribute helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Attribute values are stored JSON-encoded (the generator writes
 * `JSON.stringify(val)` into the JSONB column), so a string value arrives as
 * `"\"Restaurant\""` — a JSON string literal. Decode it so `attrString` /
 * `attrStringArray` / `attrNumber` / `attrBool` see real values. Non-JSON
 * strings (e.g. a plain URL) pass through untouched.
 */
function decodeAttributeValue(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function attr(bundle: RestaurantDbBundle, key: string): unknown {
  return decodeAttributeValue(
    bundle.attributes.find((a) => a.attribute_key === key)?.attribute_value ?? null,
  );
}

function attrString(bundle: RestaurantDbBundle, key: string): string | undefined {
  const v = attr(bundle, key);
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function attrNumber(bundle: RestaurantDbBundle, key: string): number | undefined {
  const v = attr(bundle, key);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function attrBool(bundle: RestaurantDbBundle, key: string): boolean | undefined {
  const v = attr(bundle, key);
  return typeof v === 'boolean' ? v : undefined;
}

function attrStringArray(bundle: RestaurantDbBundle, key: string): string[] {
  const v = attr(bundle, key);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Keep only members of a controlled vocabulary — never free text. */
function pick<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

/**
 * Slugify — MUST stay byte-identical to the dataset generator's slugify
 * (scripts/generate-dhaka-data.mjs): NFKD normalize, strip non-ASCII,
 * collapse non-alphanumerics to '-', trim, cap at 64 chars. The mock dataset
 * ids are generator slugify(name) (verified 206/206), so deriving the same
 * slug from the database name keeps route ids identical between the mock and
 * Supabase sources — no broken links, no favourites drift.
 *
 * Exported so the repository can resolve a route slug back to the database
 * row (fetchById) using the same deterministic function.
 */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return slug || 'restaurant';
}

/** The stable frontend id: stored `slug` attribute → alias → derived slug. */
function resolveSlug(bundle: RestaurantDbBundle): string {
  const stored = attrString(bundle, 'slug');
  if (stored) return stored;
  const alias = bundle.aliases?.find((a) => a.alias_name.trim())?.alias_name.trim();
  if (alias) return slugify(alias);
  return slugify(bundle.restaurant.name);
}

/* ------------------------------------------------------------------ */
/* Google (external) mapping                                           */
/* ------------------------------------------------------------------ */

function mapGooglePhotos(rows: ImageReferencesRow[]): ExternalPhoto[] {
  return rows
    .filter((r) => r.source?.toLowerCase().includes('google'))
    .map((r) => ({ imageUrl: r.image_url, alt: undefined }));
}

export function mapGoogleBlock(bundle: RestaurantDbBundle): ExternalPlaceData | undefined {
  // The approved import stores source_type as 'GOOGLE_PLACES'; the frontend
  // only surfaces a google block when an actual Google source row exists.
  const googleSource = bundle.sources.find((s) => s.source_type.toLowerCase().includes('google'));
  if (!googleSource?.source_identifier) return undefined;

  const googleSignal = bundle.reviewSignals.find((s) => s.source?.toLowerCase().includes('google'));
  const photos = mapGooglePhotos(bundle.images);

  return {
    placeId: googleSource.source_identifier,
    mapsUri: googleSource.source_url ?? '',
    rating: googleSignal?.rating ?? 0,
    reviewCount: googleSignal?.review_count ?? 0,
    reviews: [],
    photos,
    address: bundle.restaurant.address ?? undefined,
    website: bundle.restaurant.website?.trim() ? bundle.restaurant.website : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Khabo Kothay (community) mapping                                    */
/* ------------------------------------------------------------------ */

export function mapKhaboBlock(bundle: RestaurantDbBundle): KhaboPlaceData {
  const khaboSignal = bundle.reviewSignals.find((s) => s.source?.toLowerCase().includes('khabo'));
  const userReviews = bundle.userReviews ?? [];

  const reviews: KhaboReview[] = userReviews.map((r) => ({
    id: r.id,
    author: 'Khabo Kothay member',
    rating: r.rating ?? 0,
    date: r.created_at ?? '',
    comment: r.review_text ?? '',
    helpfulCount: 0,
  }));

  const fromReviews = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return {
    rating: khaboSignal?.rating ?? fromReviews,
    reviewCount: khaboSignal?.review_count ?? reviews.length,
    reviews,
    photos: [],
    tags: [],
    highlights: [],
    signals: [],
    visitCount: 0,
    featured: false,
  };
}

/* ------------------------------------------------------------------ */
/* Main mapping                                                        */
/* ------------------------------------------------------------------ */

export function mapRestaurantRows(bundle: RestaurantDbBundle): Restaurant {
  const r = bundle.restaurant;

  const priceForTwo = attrNumber(bundle, 'priceForTwo') ?? 0;
  const storedBudget = attrString(bundle, 'budget') as Budget | undefined;
  const budget: Budget = storedBudget ?? 'Mid-range';
  const mealTypes = pick(attrStringArray(bundle, 'mealTypes'), [
    'Breakfast',
    'Brunch',
    'Lunch',
    'Snacks',
    'Dinner',
    'Dessert',
  ] satisfies MealType[]);
  const vibes = pick(attrStringArray(bundle, 'vibes'), [
    'Date night',
    'Nightlife',
    'Quiet',
    'Work-friendly',
    'Family',
    'Instagram-worthy',
    'Late-night',
    'Heritage',
    'Live music',
    'Rooftop',
  ] satisfies Vibe[]);

  const isVeg = attrBool(bundle, 'isVeg') ?? false;

  return {
    id: resolveSlug(bundle),
    name: r.name,
    tagline: attrString(bundle, 'tagline') ?? '',
    description: r.description ?? '',
    cuisines: attrStringArray(bundle, 'cuisines'),
    mealTypes,
    budget,
    priceForTwo,
    location: r.area ?? attrString(bundle, 'location') ?? '',
    address: r.address ?? '',
    // The pipeline stores the hours under the snake_case key; accept both
    // spellings so mock-shaped data (camelCase) keeps working too.
    openingHours: attrString(bundle, 'opening_hours') ?? attrString(bundle, 'openingHours') ?? '',
    isVeg,
    vegUnknown: attrBool(bundle, 'vegUnknown') ?? (attr(bundle, 'isVeg') === null),
    hasDelivery: attrBool(bundle, 'hasDelivery') ?? false,
    hasOutdoorSeating: attrBool(bundle, 'hasOutdoorSeating') ?? false,
    isFamilyFriendly: attrBool(bundle, 'isFamilyFriendly') ?? false,
    vibes,
    lat: r.latitude ?? 0,
    lng: r.longitude ?? 0,
    signatureDishes: attrStringArray(bundle, 'signatureDishes'),
    google: mapGoogleBlock(bundle),
    khabo: mapKhaboBlock(bundle),
    // NOTE: menus are NOT attached here — they flow through menuService →
    // menuRepository (seed/admin-override today, Supabase menus later).
    intelligence: bundle.intelligence,
  };
}

/* ------------------------------------------------------------------ */
/* Verification (spec trust layer — connection point, not UI yet)      */
/* ------------------------------------------------------------------ */

/** Field-level verification status, per the spec's trust layer. */
export interface VerificationFieldStatus {
  field: string;
  status: VerificationStatus;
  source?: string;
  verifiedAt?: string;
}

/**
 * Map verification_records rows to field-level status. This is the connection
 * point for a future verification UI — it is deliberately NOT attached to the
 * domain `Restaurant` today (what the UI shows is a product decision).
 * Information and confidence stay separate, per the spec.
 */
export function mapVerificationStatuses(rows: VerificationRecordsRow[]): VerificationFieldStatus[] {
  return rows.map((r) => ({
    field: r.field_name ?? 'restaurant',
    status: r.status,
    source: r.verification_source ?? undefined,
    verifiedAt: r.verified_at ?? undefined,
  }));
}

/** Optional readiness mapping: recorded price observations for a venue. */
export function mapPriceObservationRows(
  rows: Array<{ price: number | null; observed_at: string | null; source: string | null }>,
): PriceObservation[] {
  return rows
    .filter((r) => typeof r.price === 'number')
    .map((r) => ({
      priceForTwo: r.price ?? 0,
      at: r.observed_at ?? '',
      source: r.source === 'menu' ? 'menu' : r.source === 'offer' ? 'offer' : 'report',
    }));
}
