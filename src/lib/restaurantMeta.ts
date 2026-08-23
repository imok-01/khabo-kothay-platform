import type { Restaurant } from '../types';
import { MARKET } from './market';

/**
 * Single source of truth for Restaurant Detail page metadata.
 *
 * Both the client (via the `usePageMeta` hook) and the build-time prerender
 * pipeline (`scripts/prerender.mjs`) consume this builder so the crawler-facing
 * HTML and the runtime <head> can never drift apart. It is intentionally
 * framework-agnostic: no React, no DOM, no `window`.
 *
 * Every value is derived strictly from real restaurant data. The safeguards the
 * rest of the app follows are preserved here:
 *   - ratings/review counts are only emitted when a genuine Google record exists
 *     (`google.rating` + `google.reviewCount > 0`); nothing is fabricated;
 *   - no "verified"/"popular" claims are invented.
 */

export interface RestaurantMetaOptions {
  /** Canonical origin, e.g. `https://khabo-kothay.vercel.app` or `window.location.origin`. */
  origin: string;
  /** Pre-resolved OG image URL — already width-optimized for prerender, or the gallery lead for the client. */
  image?: string;
}

export interface RestaurantMeta {
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogImage?: string;
  twitterCard: string;
  jsonLd: Record<string, unknown>;
}

/**
 * Restaurant description — same wording used for the <meta description>, the
 * OG description and the Twitter description. Capped at 320 chars to stay within
 * typical crawler limits; the genuine Google rating sentence is appended only
 * when a real review count exists.
 */
function buildDescription(r: Restaurant): string {
  const loc = r.location || 'Dhaka';
  const bits = [`${r.name} is a ${r.budget} restaurant in ${loc}.`];
  if (r.tagline) bits.push(r.tagline);
  if (r.cuisines.length > 0) bits.push(`Known for ${r.cuisines.slice(0, 3).join(', ')}.`);
  let desc = bits.join(' ');
  if (r.google?.rating && r.google.reviewCount > 0) {
    desc += ` Rated ${r.google.rating} stars by ${r.google.reviewCount} Google reviewers.`;
  }
  return desc.slice(0, 320);
}

/** Schema.org Restaurant JSON-LD. Mirrors the prerender pipeline exactly. */
function buildJsonLd(r: Restaurant, canonical: string, image?: string): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    url: canonical,
  };
  if (image) data.image = image;
  if (r.address || r.location) {
    data.address = {
      '@type': 'PostalAddress',
      ...(r.address ? { streetAddress: r.address } : {}),
      ...(r.location ? { addressLocality: r.location } : {}),
      addressCountry: 'BD',
    };
  }
  if (r.lat && r.lng) {
    data.geo = { '@type': 'GeoCoordinates', latitude: r.lat, longitude: r.lng };
  }
  if (Array.isArray(r.cuisines) && r.cuisines.length > 0) data.servesCuisine = r.cuisines;
  if (r.budget) data.priceRange = r.budget;
  if (r.google?.rating && r.google.reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: r.google.rating,
      reviewCount: r.google.reviewCount,
      bestRating: 5,
    };
  }
  return data;
}

/**
 * Build the full metadata object for a restaurant detail page. The consumer is
 * responsible for serialization concerns (HTML-escaping the JSON-LD, etc.).
 */
export function buildRestaurantMeta(restaurant: Restaurant, options: RestaurantMetaOptions): RestaurantMeta {
  const { origin, image } = options;
  const canonical = `${origin}/restaurant/${restaurant.id}`;
  return {
    title: `${restaurant.name} · ${MARKET.name}`,
    description: buildDescription(restaurant),
    canonical,
    ogType: 'restaurant',
    ogImage: image || undefined,
    twitterCard: 'summary_large_image',
    jsonLd: buildJsonLd(restaurant, canonical, image || undefined),
  };
}
