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
  /** match score per restaurant, when a match is meaningful — drives the pin tier */
  scores?: Map<string, number>;
}

/**
 * The KK pin as an SVG data URI.
 *
 * This mirrors the Leaflet surface's three tiers (strong / warm / plain) so the
 * product looks the same whichever provider is mounted — but it is drawn rather
 * than styled, because a Google marker is an image and cannot take CSS. The
 * espresso-and-saffron pair is the brand's action/emphasis split: ink is the
 * pin, gold marks a strong match.
 */
const STRONG_MATCH = 70;
const WARM_MATCH = 45;

function pinSvg(active: boolean, score?: number): string {
  const strong = score !== undefined && score >= STRONG_MATCH;
  const warm = score !== undefined && score >= WARM_MATCH && !strong;
  const fill = active ? '#1c1710' : strong ? '#2a2318' : warm ? '#3d3324' : '#574a35';
  const ring = strong ? '#e08c14' : active ? '#f0a833' : '#fdf9f1';
  const label = score !== undefined && (strong || active) ? Math.round(score) : null;
  const w = label !== null ? 34 : 22;
  const h = label !== null ? 40 : 26;
  const body =
    label !== null
      ? `<rect x="1" y="1" width="32" height="26" rx="13" fill="${fill}" stroke="${ring}" stroke-width="2"/>` +
        `<path d="M17 27l5 11-10 0z" fill="${fill}"/>` +
        `<text x="17" y="18" text-anchor="middle" font-family="Manrope, sans-serif" font-size="13" font-weight="700" fill="#fdf9f1">${label}</text>`
      : `<path d="M11 0C5.5 0 1 4.5 1 10c0 7 10 16 10 16s10-9 10-16C21 4.5 16.5 0 11 0z" fill="${fill}" stroke="${ring}" stroke-width="1.8"/>` +
        `<circle cx="11" cy="10" r="3.4" fill="#fdf9f1"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${label !== null ? '34 40' : '22 26'}">${body}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function pinSize(active: boolean, score: number | undefined, gm: typeof google.maps): google.maps.Size {
  const labelled = score !== undefined && (score >= STRONG_MATCH || active);
  const scale = active ? 1.18 : 1;
  return labelled
    ? new gm.Size(Math.round(34 * scale), Math.round(40 * scale))
    : new gm.Size(Math.round(22 * scale), Math.round(26 * scale));
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
  scores,
}: GoogleMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const googleRef = useRef<typeof google.maps | null>(null);
  const markersRef = useRef(new Map<string, google.maps.Marker>());
  const readyRef = useRef(false);
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

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
        const score = scoresRef.current?.get(r.id);
        marker = new gm.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          title: r.name,
          icon: { url: pinSvg(false, score), scaledSize: pinSize(false, score, gm) },
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

  // Emphasise the active marker (hover sync + marker selection) and carry the
  // match tier.
  //
  // Narrowed to the two markers that changed when the selection is all that
  // moved — the same fix as LeafletMapSurface, and it matters more here: each
  // pass rebuilds an SVG data URL per marker, so a full sweep on every highlight
  // was hundreds of string builds charged to whatever caused the highlight.
  const paintedRef = useRef<{
    active: string | null;
    restaurants: Restaurant[] | null;
    scores: Map<string, number> | undefined;
  }>({ active: null, restaurants: null, scores: undefined });
  useEffect(() => {
    const gm = googleRef.current;
    if (!gm) return;
    const repaint = (marker: google.maps.Marker, id: string) => {
      const isActive = id === activeId;
      const score = scores?.get(id);
      marker.setIcon({ url: pinSvg(isActive, score), scaledSize: pinSize(isActive, score, gm) });
      marker.setZIndex(isActive ? 1000 : score !== undefined ? Math.round(score) : 0);
    };
    const previous = paintedRef.current;
    const selectionOnly =
      previous.restaurants === restaurants && previous.scores === scores;
    paintedRef.current = { active: activeId, restaurants, scores };
    if (selectionOnly) {
      for (const id of [previous.active, activeId]) {
        if (!id) continue;
        const marker = markersRef.current.get(id);
        if (marker) repaint(marker, id);
      }
      return;
    }
    markersRef.current.forEach(repaint);
  }, [activeId, restaurants, scores]);

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
