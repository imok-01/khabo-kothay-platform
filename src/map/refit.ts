import type { Restaurant } from '../types';
import type { GeoPoint } from '../lib/geo';
import {
  CITY_BOUNDS,
  CITY_ZOOM,
  NEIGHBORHOOD_POINTS,
  NEIGHBORHOOD_ZOOM,
  type MapBounds,
} from './areas';
import { CITY_CENTRE } from '../hooks/useGeolocation';

/** How the map should frame the current result set. */
export type FitTarget =
  | { kind: 'bounds'; bounds: MapBounds }
  | { kind: 'center'; center: GeoPoint; zoom: number };

export function boundsOf(points: GeoPoint[]): MapBounds {
  if (points.length === 0) return CITY_BOUNDS;
  return {
    minLat: Math.min(...points.map((p) => p.lat)),
    maxLat: Math.max(...points.map((p) => p.lat)),
    minLng: Math.min(...points.map((p) => p.lng)),
    maxLng: Math.max(...points.map((p) => p.lng)),
  };
}

/**
 * Decide where the map should look, in priority order:
 * 1. a "search this area" viewport the user committed to,
 * 2. a neighbourhood filter (centre on that neighbourhood),
 * 3. a single result (street zoom),
 * 4. a handful of results (fit their bounds),
 * 5. nothing (whole of Dhaka).
 */
export function computeFit(
  restaurants: Restaurant[],
  focusArea?: string,
  areaBounds?: MapBounds | null,
): FitTarget {
  if (areaBounds) return { kind: 'bounds', bounds: areaBounds };
  if (focusArea && NEIGHBORHOOD_POINTS[focusArea as keyof typeof NEIGHBORHOOD_POINTS]) {
    return {
      kind: 'center',
      center: NEIGHBORHOOD_POINTS[focusArea as keyof typeof NEIGHBORHOOD_POINTS],
      zoom: NEIGHBORHOOD_ZOOM,
    };
  }
  if (restaurants.length === 1) {
    return { kind: 'center', center: { lat: restaurants[0].lat, lng: restaurants[0].lng }, zoom: 16 };
  }
  if (restaurants.length > 1) {
    return { kind: 'bounds', bounds: boundsOf(restaurants.map((r) => ({ lat: r.lat, lng: r.lng }))) };
  }
  return { kind: 'center', center: CITY_CENTRE, zoom: CITY_ZOOM };
}

/** Viewport reported by map surfaces after any pan/zoom/fit. */
export interface MapViewport {
  center: GeoPoint;
  zoom: number;
  bounds: MapBounds;
}

/** Whether the user has moved the map meaningfully away from the last fit. */
export function hasDrifted(current: MapViewport, committed: MapViewport): boolean {
  const dLat = Math.abs(current.center.lat - committed.center.lat);
  const dLng = Math.abs(current.center.lng - committed.center.lng);
  // ~0.5 km at Dhaka's latitude, or a >1.25 zoom step away
  return dLat > 0.0045 || dLng > 0.0045 || Math.abs(current.zoom - committed.zoom) > 1.25;
}
