import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../lib/geo';

export type GeoStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable';

/** Fallback reference point used when the user doesn't share their location. */
export const CITY_CENTRE: GeoPoint = { lat: 23.8103, lng: 90.4125 };

/** If the browser never answers the permission prompt, stop waiting. */
const LOCATION_TIMEOUT_MS = 7000;

interface UseGeolocationResult {
  status: GeoStatus;
  /** user coords when available, otherwise the city-centre fallback */
  reference: GeoPoint;
  /** explicitly request the user's location — never called automatically */
  request: () => void;
}

/**
 * Location access is strictly opt-in: nothing prompts for permission until
 * the user chooses a location feature. `reference` falls back to the city
 * centre so the app keeps working even when location is denied.
 */
export function useGeolocation(): UseGeolocationResult {
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const request = useCallback(() => {
    clearTimer();
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    timerRef.current = window.setTimeout(() => {
      // The prompt may never resolve (e.g. embedded webviews) — degrade to
      // the city-centre fallback rather than spinning forever.
      setStatus('denied');
    }, LOCATION_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimer();
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus('ready');
      },
      () => {
        clearTimer();
        setStatus('denied');
      },
      { timeout: LOCATION_TIMEOUT_MS, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => clearTimer, []);

  return { status, reference: coords ?? CITY_CENTRE, request };
}
