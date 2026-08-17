import { useEffect, useRef } from 'react';
import type { Restaurant } from '../types';
import type { MapBounds } from './areas';
import type { FitTarget, MapViewport } from './refit';
import { loadGoogleMaps } from './loadGoogleMaps';

export interface GoogleMapSurfaceProps {
  restaurants: Restaurant[];
  activeId: string | null;
  fitTarget: FitTarget;
  onActiveChange: (id: string | null) => void;
  onViewChange: (viewport: MapViewport) => void;
  onReady: () => void;
}

/** Brand-green pin (SVG data URI) so the map matches Khabo Kothay. */
function pinSvg(active: boolean): string {
  const fill = active ? '#04402b' : '#0b6b45';
  const size = active ? 26 : 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${Math.round(size * 1.18)}" viewBox="0 0 22 26"><path d="M11 0C5.5 0 1 4.5 1 10c0 7 10 16 10 16s10-9 10-16C21 4.5 16.5 0 11 0z" fill="${fill}" stroke="#ffffff" stroke-width="1.8"/><circle cx="11" cy="10" r="3.4" fill="#ffffff"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function boundsToGoogle(bounds: MapBounds, gm: typeof google.maps): google.maps.LatLngBounds {
  return new gm.LatLngBounds({ lat: bounds.minLat, lng: bounds.minLng }, { lat: bounds.maxLat, lng: bounds.maxLng });
}

const FIT_PADDING = { top: 48, bottom: 48, left: 48, right: 48 };
const MAX_ZOOM = 16;

function applyFit(map: google.maps.Map, target: FitTarget, gm: typeof google.maps): void {
  if (target.kind === 'bounds') {
    map.fitBounds(boundsToGoogle(target.bounds, gm), FIT_PADDING);
    // fitBounds can zoom deeper than we want for a handful of nearby pins.
    const zoom = map.getZoom();
    if (zoom !== undefined && zoom > MAX_ZOOM) map.setZoom(MAX_ZOOM);
  } else {
    map.setCenter({ lat: target.center.lat, lng: target.center.lng });
    map.setZoom(target.zoom);
  }
}

function readViewport(map: google.maps.Map): MapViewport | null {
  const bounds = map.getBounds();
  const center = map.getCenter();
  const zoom = map.getZoom();
  if (!bounds || !center || zoom === undefined) return null;
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    center: { lat: center.lat(), lng: center.lng() },
    zoom,
    bounds: { minLat: sw.lat(), minLng: sw.lng(), maxLat: ne.lat(), maxLng: ne.lng() },
  };
}

export default function GoogleMapSurface({
  restaurants,
  activeId,
  fitTarget,
  onActiveChange,
  onViewChange,
  onReady,
}: GoogleMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const googleRef = useRef<typeof google.maps | null>(null);
  const markersRef = useRef(new Map<string, google.maps.Marker>());
  const readyRef = useRef(false);

  useEffect(() => {
    let disposed = false;
    const markers = markersRef.current;
    let map: google.maps.Map | null = null;
    loadGoogleMaps()
      .then((gm) => {
        if (disposed || !containerRef.current) return;
        googleRef.current = gm;
        map = new gm.Map(containerRef.current, {
          center: { lat: 22.5645, lng: 88.343 },
          zoom: 12,
          gestureHandling: 'greedy',
          fullscreenControl: false,
          streetViewControl: true,
          mapTypeControl: false,
        });
        mapRef.current = map;
        map.addListener('idle', () => {
          const vp = readViewport(map!);
          if (vp) onViewChange(vp);
        });
      })
      .catch(() => {
        // The resolver falls back to Leaflet; nothing to do here.
      });
    return () => {
      disposed = true;
      map?.unbindAll?.();
      markers.clear();
      if (mapRef.current === map) mapRef.current = null;
      googleRef.current = null;
      readyRef.current = false;
    };
  }, [onViewChange]);

  // Sync markers with the result set.
  useEffect(() => {
    const map = mapRef.current;
    const gm = googleRef.current;
    if (!map || !gm) return;
    const ids = new Set(restaurants.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!ids.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    });
    for (const r of restaurants) {
      let marker = markersRef.current.get(r.id);
      if (!marker) {
        marker = new gm.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          title: r.name,
          icon: { url: pinSvg(false), scaledSize: new gm.Size(22, 26) },
        });
        marker.addListener('click', () => {
          onActiveChange(r.id);
          map.panTo({ lat: r.lat, lng: r.lng });
        });
        markersRef.current.set(r.id, marker);
      } else {
        marker.setPosition({ lat: r.lat, lng: r.lng });
      }
    }
  }, [restaurants, onActiveChange]);

  // Emphasise the active marker (hover sync + marker selection).
  useEffect(() => {
    const gm = googleRef.current;
    if (!gm) return;
    markersRef.current.forEach((marker, id) => {
      const isActive = id === activeId;
      marker.setIcon({ url: pinSvg(isActive), scaledSize: new gm.Size(isActive ? 26 : 22, isActive ? 30 : 26) });
      marker.setZIndex(isActive ? 1000 : 0);
    });
  }, [activeId, restaurants]);

  // Refit when the target changes.
  useEffect(() => {
    const map = mapRef.current;
    const gm = googleRef.current;
    if (!map || !gm) return;
    applyFit(map, fitTarget, gm);
    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
    const vp = readViewport(map);
    if (vp) onViewChange(vp);
  }, [fitTarget, onReady, onViewChange]);

  return <div className="map-surface" ref={containerRef} aria-label="Restaurant map" />;
}
