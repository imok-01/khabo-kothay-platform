import { useEffect, useState } from 'react';
import type { Restaurant } from '../types';
import type { FitTarget, MapViewport } from './refit';
import { getGoogleMapsApiKey, loadGoogleMaps } from './loadGoogleMaps';
import LeafletMapSurface from './LeafletMapSurface';
import GoogleMapSurface from './GoogleMapSurface';

export interface MapSurfaceProps {
  restaurants: Restaurant[];
  activeId: string | null;
  fitTarget: FitTarget;
  onActiveChange: (id: string | null) => void;
  onViewChange: (viewport: MapViewport) => void;
  onReady: () => void;
  /** match score per restaurant, when a match is meaningful — drives the pin tier */
  scores?: Map<string, number>;
}

/**
 * Chooses the map implementation:
 * - Google Maps JS API when `VITE_GOOGLE_MAPS_API_KEY` is configured;
 * - otherwise the fully interactive Leaflet/OSM fallback (no key needed).
 *
 * The two surfaces implement the same props contract, so pages never know
 * which provider is rendering. If the Google script can't load, the app
 * degrades to Leaflet instead of breaking.
 */
export default function MapSurface(props: MapSurfaceProps) {
  const [mode, setMode] = useState<'loading' | 'google' | 'leaflet'>(() =>
    getGoogleMapsApiKey() ? 'loading' : 'leaflet',
  );

  useEffect(() => {
    if (!getGoogleMapsApiKey()) return;
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (!cancelled) setMode('google');
      })
      .catch(() => {
        if (!cancelled) setMode('leaflet');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === 'google') return <GoogleMapSurface {...props} />;
  if (mode === 'leaflet') return <LeafletMapSurface {...props} />;
  return null; // waiting for the keyed provider to resolve — overlay shows
}
