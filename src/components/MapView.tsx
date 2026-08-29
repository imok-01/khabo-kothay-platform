import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Navigation, Scan, X } from 'lucide-react';
import type { Restaurant } from '../types';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import { formatDistance } from '../lib/geo';
import { selectRestaurantPhotos } from '../lib/photos';
import MapSurface from '../map/MapProvider';
import { computeFit, hasDrifted, type MapViewport } from '../map/refit';
import type { MapBounds } from '../map/areas';
import RestaurantImage from './RestaurantImage';
import RatingStars from './RatingStars';

/**
 * The atlas — Khabo Kothay's dining map.
 *
 * The mechanics here (fit targets, drift detection, the refit-on-reveal
 * observer) are unchanged; what changed is that the map is now presented as a
 * curated object rather than an embed. Everything painted on top of the tiles
 * lives in the `atlas` namespace so `explore-scene.css` is its only owner — the
 * older `.map-preview` / `.map-controls` rules in index.css no longer match
 * anything and retire on their own.
 */
interface MapViewProps {
  restaurants: Restaurant[];
  /** distance per restaurant from the user's reference point, if available */
  distances?: Map<string, number>;
  /** match score per restaurant, when a match is meaningful — labels the pins */
  scores?: Map<string, number>;
  activeId: string | null;
  /**
   * The subset of `activeId` that opens the preview card over the map.
   *
   * A hovered list card sets `activeId` so its pin lights up, and that is all it
   * should cost. Opening the preview mounts a card and requests a 220px photo,
   * so tying it to a cursor passing over the grid meant a mount, a fetch and a
   * decode per card crossed — a per-frame bill during a scroll. Pin clicks pass
   * this; hovers do not. Defaults to `activeId` so other callers keep the old
   * behaviour without opting in.
   */
  previewId?: string | null;
  onActiveChange: (id: string | null) => void;
  /** active neighbourhood filter, if any — the map centres on it */
  focusArea?: string;
  /** committed "search this area" viewport, if any */
  areaBounds?: MapBounds | null;
  /** null clears the committed area */
  onSearchArea?: (bounds: MapBounds | null) => void;
  /** short line for the map's own plate, e.g. "Gulshan" */
  areaLabel?: string;
}

export default function MapView({
  restaurants,
  distances,
  scores,
  activeId,
  previewId,
  onActiveChange,
  focusArea,
  areaBounds,
  onSearchArea,
  areaLabel,
}: MapViewProps) {
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [ready, setReady] = useState(false);
  const [fitNonce, setFitNonce] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const committedRef = useRef<MapViewport | null>(null);
  const justFitRef = useRef(false);
  const wasHiddenRef = useRef(true);
  const firstObservationRef = useRef(true);

  const fitTarget = useMemo(
    () => computeFit(restaurants, focusArea, areaBounds),
    // Re-centre bumps `fitNonce` to force a refit of the same target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restaurants, focusArea, areaBounds, fitNonce],
  );

  // After a refit, the next reported viewport is the new "committed" view.
  useEffect(() => {
    justFitRef.current = true;
  }, [fitTarget]);

  // On mobile the map panel mounts hidden (list mode) — the first fit then
  // happens against a 0×0 container. Refit once it actually becomes visible
  // so the initial viewport is computed from real dimensions.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const hidden = rect.width === 0 || rect.height === 0;
      // First observation just records the mount state (desktop maps are
      // visible immediately; mobile ones start hidden).
      if (firstObservationRef.current) {
        firstObservationRef.current = false;
        wasHiddenRef.current = hidden;
        return;
      }
      if (wasHiddenRef.current && !hidden) setFitNonce((n) => n + 1);
      wasHiddenRef.current = hidden;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleViewChange = useCallback((v: MapViewport) => {
    setViewport(v);
    if (justFitRef.current) {
      justFitRef.current = false;
      committedRef.current = v;
    } else if (!committedRef.current) {
      committedRef.current = v;
    }
  }, []);

  const handleReady = useCallback(() => setReady(true), []);

  const drifted = useMemo(
    () => Boolean(viewport && committedRef.current && hasDrifted(viewport, committedRef.current)),
    [viewport],
  );

  const previewKey = previewId === undefined ? activeId : previewId;
  const active = previewKey ? restaurants.find((r) => r.id === previewKey) : undefined;
  const activeScore = active ? scores?.get(active.id) : undefined;

  const handleSearchArea = () => {
    if (viewport && onSearchArea) onSearchArea(viewport.bounds);
  };

  return (
    <div className="atlas__canvas" ref={containerRef}>
      <MapSurface
        restaurants={restaurants}
        activeId={activeId}
        fitTarget={fitTarget}
        onActiveChange={onActiveChange}
        onViewChange={handleViewChange}
        onReady={handleReady}
        scores={scores}
      />

      {/* A drawn edge, not a browser frame: the tiles fade into the paper at the
          rim so the map reads as part of the page. Never interactive. */}
      <span className="atlas__vignette" aria-hidden="true" />

      {/* The map states what it is showing, the way a printed map has a title
          block. Hidden while a venue is selected — the card says it better. */}
      {ready && restaurants.length > 0 && !active && (
        <div className="atlas__plate">
          <strong>{restaurants.length}</strong>
          <span>{restaurants.length === 1 ? 'place' : 'places'}{areaLabel ? ` · ${areaLabel}` : ''}</span>
        </div>
      )}

      {!ready && (
        <div className="atlas__loading" role="status" aria-live="polite">
          <span className="atlas__spinner" aria-hidden="true" />
          <span>Drawing the map…</span>
        </div>
      )}

      {ready && restaurants.length === 0 && areaBounds && (
        <div className="atlas__empty">
          <p>Nothing on this stretch of the map yet.</p>
          {onSearchArea && (
            <button type="button" className="atlas__btn" onClick={() => onSearchArea(null)}>
              Show all of Dhaka
            </button>
          )}
        </div>
      )}

      {drifted && ready && restaurants.length > 0 && (
        <div className="atlas__controls" role="group" aria-label="Map controls">
          {onSearchArea && (
            <button type="button" className="atlas__btn" onClick={handleSearchArea}>
              <Scan size={14} aria-hidden="true" /> Search this area
            </button>
          )}
          <button
            type="button"
            className="atlas__btn atlas__btn--quiet"
            onClick={() => setFitNonce((n) => n + 1)}
            title="Re-centre on the current results"
          >
            <Crosshair size={14} aria-hidden="true" /> Re-centre
          </button>
        </div>
      )}

      {active && (
        <div className="atlas__card" role="dialog" aria-label={`${active.name} preview`}>
          <button
            type="button"
            className="atlas__card-close"
            onClick={() => onActiveChange(null)}
            aria-label="Close preview"
          >
            <X size={14} />
          </button>
          <div className="atlas__card-media">
            <RestaurantImage source={selectRestaurantPhotos(active, 'card').photos[0]} name={active.name} width={220} />
            {activeScore !== undefined && (
              <span className="atlas__card-score">
                <strong>{Math.round(activeScore)}</strong> match
              </span>
            )}
          </div>
          <div className="atlas__card-body">
            <h3>{active.name}</h3>
            <RatingStars rating={active.khabo.rating > 0 ? active.khabo.rating : (active.google?.rating ?? 0)} showValue />
            <div className="atlas__card-meta">
              <span>{active.cuisines.slice(0, 2).join(' · ') || active.location || 'Dhaka'}</span>
              <span aria-hidden="true">·</span>
              <span>{priceForTwoDisplay(active).label}</span>
              {distances?.has(active.id) && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatDistance(distances.get(active.id)!)}</span>
                </>
              )}
            </div>
            <div className="atlas__card-cta">
              <Link to={`/restaurant/${active.id}`} className="atlas__go">
                View details
              </Link>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${active.lat}%2C${active.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="atlas__nav"
                aria-label={`Open ${active.name} in Google Maps`}
              >
                <Navigation size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
