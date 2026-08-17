import type { GeoPoint } from '../lib/geo';
import { NEIGHBORHOODS } from '../services/taxonomyService';

/** Reference point used to centre the map on a neighbourhood. Centres are the
 *  mean coordinates of the real imported venues in each area. */
export const NEIGHBORHOOD_POINTS: Record<(typeof NEIGHBORHOODS)[number], GeoPoint> = {
  Gulshan: { lat: 23.78577, lng: 90.41604 },
  Banani: { lat: 23.79106, lng: 90.40669 },
};

/** Zoom level when the user filters to a single neighbourhood. */
export const NEIGHBORHOOD_ZOOM = 14;

/** Zoom level when showing all of Dhaka. */
export const CITY_ZOOM = 12;

/** Rough bounding box of greater Dhaka, for "fit all" fallbacks. */
export const CITY_BOUNDS: { minLat: number; maxLat: number; minLng: number; maxLng: number } = {
  minLat: 23.66,
  maxLat: 23.92,
  minLng: 90.3,
  maxLng: 90.5,
};

/** Map bounds expressed as lat/lng corners (shared by map surfaces). */
export interface MapBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export function isWithinBounds(point: GeoPoint, bounds: MapBounds): boolean {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}
