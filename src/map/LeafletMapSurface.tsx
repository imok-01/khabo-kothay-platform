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
  /** match score per restaurant, when a match is meaningful — drives the pin tier */
  scores?: Map<string, number>;
}

/** OSM data rendered by CARTO's free Positron tiles — no API key required. */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>';

/**
 * Every pin gets the SAME 40×46 icon box, whatever it displays.
 *
 * That is deliberate. The pin has three appearances — a plain teardrop, a
 * teardrop carrying its match score, and the enlarged active state — and if the
 * box changed with the appearance, Leaflet would have to be handed a new
 * `iconSize`/`iconAnchor` on every hover, which means `setIcon()`, which means a
 * brand-new DOM node. A replaced node cannot transition, so the "smooth marker
 * transition" the design asks for is impossible that way.
 *
 * With one box, the appearance is entirely a matter of classes and text on a
 * node that persists, so hover, selection and score changes are CSS transitions
 * on a stable element. `paintPin` below is the only thing that touches it after
 * creation.
 *
 * The cost of a uniform box is that most of it is empty space, and an empty
 * 40×46 hit area would steal clicks from neighbouring pins in a dense
 * neighbourhood. So `.kk-marker` turns pointer events off and `.kk-pin` turns
 * them back on — only the drawn pin is clickable.
 */
const ICON_SIZE: L.PointExpression = [40, 46];
const ICON_ANCHOR: L.PointExpression = [20, 46];

/** Score at which a pin is worth labelling on the map rather than left as a dot. */
const STRONG_MATCH = 70;
const WARM_MATCH = 45;

function tierClass(score: number | undefined): string {
  if (score === undefined) return '';
  if (score >= STRONG_MATCH) return ' kk-pin--strong';
  if (score >= WARM_MATCH) return ' kk-pin--warm';
  return ' kk-pin--faint';
}

function pinHtml(score: number | undefined, active: boolean): string {
  const label = score === undefined ? '' : String(Math.round(score));
  return (
    `<span class="kk-pin${active ? ' kk-pin--active' : ''}${tierClass(score)}" role="img" aria-hidden="true">` +
    `<span class="kk-pin__body"><span class="kk-pin__score">${label}</span></span>` +
    `</span>`
  );
}

function pinIcon(score: number | undefined, active: boolean): L.DivIcon {
  return L.divIcon({
    className: 'kk-marker',
    html: pinHtml(score, active),
    iconSize: ICON_SIZE,
    iconAnchor: ICON_ANCHOR,
  });
}

/**
 * Re-dress an existing pin in place. Returns false when the marker has no
 * element yet (not on the map), so the caller can fall back to `setIcon`.
 */
function paintPin(marker: L.Marker, score: number | undefined, active: boolean): boolean {
  const pin = marker.getElement()?.firstElementChild as HTMLElement | null;
  if (!pin) return false;
  pin.className = `kk-pin${active ? ' kk-pin--active' : ''}${tierClass(score)}`;
  const label = pin.querySelector('.kk-pin__score');
  if (label) label.textContent = score === undefined ? '' : String(Math.round(score));
  return true;
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
  scores,
}: LeafletMapSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef(new Map<string, L.Marker>());
  const readyRef = useRef(false);
  // Read by the create effect so a changed score map never forces markers to be
  // torn down and rebuilt — the paint effect below owns appearance.
  const scoresRef = useRef(scores);
  scoresRef.current = scores;

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
        marker = L.marker([r.lat, r.lng], {
          icon: pinIcon(scoresRef.current?.get(r.id), false),
          title: r.name,
          // Fresh pins fade up in place (see .kk-pin animation); a keyboard
          // user reaches the venues through the result list, which is why the
          // pin itself stays out of the tab order.
          keyboard: false,
        }).on('click', () => {
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

  // Appearance only: hover/selection emphasis and the match-score tier. This
  // repaints the existing pin element rather than replacing the icon, so the
  // change is a CSS transition instead of a swap.
  //
  // When only the selection moved, only the two pins that changed are touched.
  // The loop used to run over every marker on every `activeId` change, which on
  // a full result set is a few hundred style writes — synchronous, inside an
  // effect, and therefore on the critical path of whatever caused the change. A
  // pointer crossing the results grid caused it dozens of times a second.
  const paintedRef = useRef<{
    active: string | null;
    restaurants: Restaurant[] | null;
    scores: Map<string, number> | undefined;
  }>({ active: null, restaurants: null, scores: undefined });
  useEffect(() => {
    const repaint = (marker: L.Marker, id: string) => {
      const isActive = id === activeId;
      const score = scores?.get(id);
      if (!paintPin(marker, score, isActive)) marker.setIcon(pinIcon(score, isActive));
      marker.setZIndexOffset(isActive ? 1000 : score !== undefined ? Math.round(score) : 0);
    };
    const previous = paintedRef.current;
    // Identity comparison, not a dependency list: these are the same memoised
    // objects until the result set or the scoring genuinely changes, so an
    // unchanged pair means the selection is the only thing that moved. On the
    // first run `restaurants` is null and the full sweep runs.
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
