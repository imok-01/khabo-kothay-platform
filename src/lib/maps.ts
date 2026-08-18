import type { Restaurant } from '../types';
import type { GeoPoint } from './geo';

/**
 * Google Maps URL builders.
 *
 * All map URLs for a restaurant are derived here from the restaurant entity
 * (coordinates + optional Google Place ID) so that components never scatter
 * coordinates or query strings around the codebase. When `placeId` is
 * populated (future Places API integration), the URLs target the exact
 * establishment; otherwise they fall back to coordinate search.
 */

function coordinates(restaurant: Restaurant): { lat: number; lng: number } {
  return { lat: restaurant.lat, lng: restaurant.lng };
}

/**
 * Deep link into Google Maps showing the restaurant on the map. Prefers the
 * official Google place deep link (`mapsUri`, from the Places API); falls
 * back to a place-ID query, then coordinates.
 */
export function googleMapsPlaceUrl(restaurant: Restaurant): string {
  if (restaurant.google?.mapsUri) return restaurant.google.mapsUri;
  if (restaurant.google?.placeId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(restaurant.google.placeId)}&query=${encodeURIComponent(restaurant.name)}`;
  }
  const { lat, lng } = coordinates(restaurant);
  return `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`;
}

/**
 * Deep link to the venue's reviews on Google. Uses the stable Google Place ID
 * via the reviews endpoint (which lands on the reviews tab rather than the
 * place profile); falls back to the plain place URL when no Place ID exists.
 */
export function googleMapsReviewsUrl(restaurant: Restaurant): string {
  if (restaurant.google?.placeId) {
    return `https://search.google.com/local/reviews?placeid=${encodeURIComponent(restaurant.google.placeId)}`;
  }
  return googleMapsPlaceUrl(restaurant);
}

/**
 * Navigation deep link: Google Maps with the restaurant as destination and
 * (when provided) the user's device location as origin. When no origin is
 * passed, Google Maps prompts for a starting point — never fabricate one.
 */
export function googleMapsDirectionsUrl(restaurant: Restaurant, origin?: GeoPoint): string {
  const params = new URLSearchParams({ api: '1' });
  if (origin) params.set('origin', `${origin.lat},${origin.lng}`);
  if (restaurant.google?.placeId) {
    params.set('destination_place_id', restaurant.google.placeId);
    params.set('destination', restaurant.name);
  } else {
    params.set('destination', `${restaurant.lat},${restaurant.lng}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Embeddable map (iframe `output=embed`) — used on the restaurant detail
 * page. No API key required; shows the establishment at street level.
 */
export function googleMapsEmbedUrl(restaurant: Restaurant, zoom = 16): string {
  const { lat, lng } = coordinates(restaurant);
  return `https://www.google.com/maps?q=${lat}%2C${lng}&z=${zoom}&output=embed`;
}

/** General Google Maps search — used for fallbacks and "open in maps". */
export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
