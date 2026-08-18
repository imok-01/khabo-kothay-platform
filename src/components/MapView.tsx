import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, Maximize2, Navigation, X } from 'lucide-react';
import type { Restaurant } from '../types';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import { formatDistance } from '../lib/geo';
import { selectRestaurantPhotos } from '../lib/photos';
import MapSurface from '../map/MapProvider';
import { computeFit, hasDrifted, type MapViewport } from '../map/refit';
import type { MapBounds } from '../map/areas';
import RestaurantImage from './RestaurantImage';
import RatingStars from './RatingStars';  interface MapViewProps {
    restaurants: Restaurant[];
    /** distance per restaurant from the user's reference point, if available */
    distances?: Map<string, number>;
    activeId: string | null;
    onActiveChange: (id: string | null) => void;
    /** active neighbourhood filter, if any — the map centres on it */
    focusArea?: string;
    /** committed "search this area" viewport, if any */
    areaBounds?: MapBounds | null;
    /** null clears the committed area */
    onSearchArea?: (bounds: MapBounds | null) => void;
  }

export default function MapView({
  restaurants,
  distances,
  activeId,
  onActiveChange,
  focusArea,
  areaBounds,
  onSearchArea,
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

  const active = restaurants.find((r) => r.id === activeId);

  const handleSearchArea = () => {
    if (viewport && onSearchArea) onSearchArea(viewport.bounds);
  };

  return (
    <div className="map-canvas" ref={containerRef}>
      <MapSurface
        restaurants={restaurants}
        activeId={activeId}
        fitTarget={fitTarget}
        onActiveChange={onActiveChange}
        onViewChange={handleViewChange}
        onReady={handleReady}
      />

      {!ready && (
        <div className="map-loading" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>Loading map…</span>
        </div>
      )}

      {ready && restaurants.length === 0 && areaBounds && (
        <div className="map-unavailable">
          <p>No restaurants in this area.</p>
          {onSearchArea && (
            <button type="button" className="btn btn--ghost" onClick={() => onSearchArea(null)}>
              Show all of Dhaka
            </button>
          )}
        </div>
      )}

      {drifted && ready && restaurants.length > 0 && (
        <div className="map-controls" role="group" aria-label="Map controls">
          {onSearchArea && (
            <button type="button" className="map-controls__btn" onClick={handleSearchArea}>
              <Maximize2 size={13} aria-hidden="true" /> Search this area
            </button>
          )}
          <button
            type="button"
            className="map-controls__btn map-controls__btn--ghost"
            onClick={() => setFitNonce((n) => n + 1)}
            title="Re-centre on the current results"
          >
            <Crosshair size={13} aria-hidden="true" /> Re-centre
          </button>
        </div>
      )}

      {active && (
        <div className="map-preview" role="dialog" aria-label={`${active.name} preview`}>
          <div className="map-preview__media">
            <RestaurantImage source={selectRestaurantPhotos(active, 'card').photos[0]} name={active.name} width={160} />
          </div>
          <div className="map-preview__body">
            <h3>{active.name}</h3>
            <RatingStars rating={active.khabo.rating > 0 ? active.khabo.rating : (active.google?.rating ?? 0)} showValue />
            <div className="map-preview__meta">
              <span>{active.cuisines.slice(0, 2).join(' · ')}</span>
              <span>·</span>
              <span>{priceForTwoDisplay(active).label}</span>
              {distances?.has(active.id) && (
                <>
                  <span>·</span>
                  <span>{formatDistance(distances.get(active.id)!)}</span>
                </>
              )}
            </div>
            <div className="map-preview__cta">
              <Link to={`/restaurant/${active.id}`} className="btn btn--primary">
                View details
              </Link>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${active.lat}%2C${active.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--ghost"
                aria-label={`Open ${active.name} in Google Maps`}
              >
                <Navigation size={13} aria-hidden="true" />
              </a>
              <button
                type="button"
                className="map-preview__close"
                onClick={() => onActiveChange(null)}
                aria-label="Close preview"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
