import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Restaurant } from '../types';
import type { MapBounds } from './areas';
import type { FitTarget, MapViewport } from './refit';

export interface LeafletMapSurfaceProps {
  restaurants: Restaurant[];
  activeId: string | null;
  fitTarget: FitTarget;
  onActiveChange: (id: string | null) => void;
  onViewChange: (viewport: MapViewport) => void;
  onReady: () => void;
}

/** OSM data rendered by CARTO's free Positron tiles — no API key required. */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

function pinIcon(active: boolean): L.DivIcon {
  return L.divIcon({
    className: 'kk-marker',
    html: `<span class="kk-marker__pin${active ? ' kk-marker__pin--active' : ''}" role="img" aria-hidden="true"></span>`,
    iconSize: [22, 26],
    iconAnchor: [11, 26],
  });
}

function boundsToLatLng(bounds: MapBounds): L.LatLngBoundsExpression {
  return [
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng],
  ];
}

function applyFit(map: L.Map, target: FitTarget): void {
  if (target.kind === 'bounds') {
    map.fitBounds(boundsToLatLng(target.bounds), { padding: [48, 48], maxZoom: 16 });
  } else {
    map.setView([target.center.lat, target.center.lng], target.zoom);
  }
}

function readViewport(map: L.Map): MapViewport {
  const bounds = map.getBounds();
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const center = map.getCenter();
  return {
    center: { lat: center.lat, lng: center.lng },
    zoom: map.getZoom(),
    bounds: { minLat: sw.lat, minLng: sw.lng, maxLat: ne.lat, maxLng: ne.lng },
  };
}

export default function LeafletMapSurface({
  restaurants,
  activeId,
  fitTarget,
  onActiveChange,
  onViewChange,
  onReady,
}: LeafletMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const readyRef = useRef(false);

  // Create the map once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;

    const markers = markersRef.current;
    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    // Leaflet fires moveend for pans and zooms alike — one listener covers both.
    map.on('moveend', () => {
      onViewChange(readViewport(map));
    });

    return () => {
      map.remove();
      markers.clear();
      if (mapRef.current === map) mapRef.current = null;
      readyRef.current = false;
    };
  }, [onViewChange]);

  // Sync markers with the result set.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const ids = new Set(restaurants.map((r) => r.id));
    markersRef.current.forEach((marker, id) => {
      if (!ids.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
    for (const r of restaurants) {
      let marker = markersRef.current.get(r.id);
      if (!marker) {
        marker = L.marker([r.lat, r.lng], { icon: pinIcon(false), title: r.name })
          .on('click', () => {
            onActiveChange(r.id);
            map.flyTo([r.lat, r.lng], Math.max(map.getZoom(), 14), { duration: 0.45 });
          });
        marker.addTo(map);
        markersRef.current.set(r.id, marker);
      } else {
        marker.setLatLng([r.lat, r.lng]);
      }
    }
  }, [restaurants, onActiveChange]);

  // Emphasise the active marker (hover sync + marker selection).
  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const isActive = id === activeId;
      marker.setIcon(pinIcon(isActive));
      marker.setZIndexOffset(isActive ? 1000 : 0);
    });
  }, [activeId, restaurants]);

  // Refit when the target changes (filters, neighbourhood, search-this-area).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    applyFit(map, fitTarget);
    if (!readyRef.current) {
      readyRef.current = true;
      onReady();
    }
    onViewChange(readViewport(map));
  }, [fitTarget, onReady, onViewChange]);

  return <div className="map-surface" ref={containerRef} aria-label="Restaurant map" />;
}
