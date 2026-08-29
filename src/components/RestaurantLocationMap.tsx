import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import type { Restaurant } from '../types';
import MapSurface from '../map/MapProvider';
import { computeFit } from '../map/refit';
import { googleMapsPlaceUrl } from '../lib/maps';
import { Button } from './ui';

/**
 * The venue map on the restaurant page.
 *
 * This used to be `<iframe src={googleMapsEmbedUrl(restaurant)}>` and it had
 * been rendering an empty 240px box. The cause is not in this app: the
 * `?output=embed` URL now 301s to `/maps/embed?…&pb=…`, and the **redirect**
 * response carries `X-Frame-Options: SAMEORIGIN`, which Chrome enforces on
 * every hop of a frame's navigation chain. Nothing surfaces — no console
 * error, no failed request, and the CSS box is the right size — so it survived
 * every gate this project runs. The full measurement is in `lib/maps.ts`.
 *
 * The replacement is not another embed. It is the same map surface `/explore`
 * draws (`map/MapProvider`: Google Maps JS when a key is configured, Leaflet +
 * CARTO tiles otherwise, no key required), so the product has exactly one map
 * implementation and this page can never break independently of the atlas
 * again. `computeFit` already answers the single-venue case with street zoom,
 * which is why no fit logic is written here.
 *
 * Deliberately NOT the atlas: no "search this area", no drift/re-centre
 * controls, no preview card. There is one pin and you already know whose it
 * is. What the page owes you instead is the address and the two ways out, and
 * those live in the plate below the tiles — the working actions the iframe
 * version had, kept exactly. Distance is deliberately absent: the decision bar
 * at the top of the page already states "… from you", and saying it twice in
 * one scroll is the padding this page is being cleaned of.
 */

export interface RestaurantLocationMapProps {
  restaurant: Restaurant;
  /** First line of the resolved address — the plate's headline. */
  addressLine?: string;
  /** Directions handler — geolocation-aware, owned by the page. */
  onDirections: () => void;
  /** True while the browser is being asked for a location. */
  locating?: boolean;
}

export default function RestaurantLocationMap({
  restaurant,
  addressLine,
  onDirections,
  locating = false,
}: RestaurantLocationMapProps) {
  const [ready, setReady] = useState(false);

  // One venue, so the marker set never changes. Memoised because
  // `LeafletMapSurface`'s marker effect keys on the array identity — a fresh
  // array each render would tear the pin down and rebuild it every time the
  // page re-renders (and this page re-renders on every live-Google tick).
  const only = useMemo(() => [restaurant], [restaurant]);
  const fitTarget = useMemo(() => computeFit(only), [only]);

  const handleReady = useCallback(() => setReady(true), []);
  // The surfaces report every pan and every pin press. This map has no
  // "search this area" and one pin, so both are no-ops rather than state.
  const noop = useCallback(() => undefined, []);

  return (
    <section className={`venue-map ${ready ? 'venue-map--ready' : ''}`} aria-label={`Where ${restaurant.name} is`}>
      <div className="venue-map__canvas">
        <MapSurface
          restaurants={only}
          activeId={null}
          fitTarget={fitTarget}
          onActiveChange={noop}
          onViewChange={noop}
          onReady={handleReady}
        />
        {/* The tiles dissolve into the paper at the rim, the same drawn edge
            the atlas uses, so the map reads as part of the page rather than a
            window cut into it. Never interactive. */}
        <span className="venue-map__vignette" aria-hidden="true" />
        {!ready && (
          <div className="venue-map__loading" role="status" aria-live="polite">
            <span className="venue-map__spinner" aria-hidden="true" />
            <span>Drawing the map…</span>
          </div>
        )}
      </div>

      <div className="venue-map__plate">
        <p className="venue-map__address">
          <MapPin size={14} aria-hidden="true" />
          <span>{addressLine || `${restaurant.name}, Dhaka`}</span>
        </p>
        <div className="venue-map__actions">
          <Button
            variant="primary"
            size="sm"
            icon={Navigation}
            busy={locating}
            onClick={onDirections}
          >
            {locating ? 'Getting your location…' : 'Directions'}
          </Button>
          <Button
            variant="subtle"
            size="sm"
            href={googleMapsPlaceUrl(restaurant)}
            target="_blank"
            rel="noopener noreferrer"
            iconAfter={ExternalLink}
          >
            Google Maps
          </Button>
        </div>
      </div>
    </section>
  );
}
