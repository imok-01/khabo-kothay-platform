/**
 * Loads the Google Maps JavaScript API exactly once, from the key in
 * `VITE_GOOGLE_MAPS_API_KEY`. Resolves with the `google.maps` namespace;
 * rejects when the key is missing, the script fails, or it times out —
 * callers then fall back to the no-key Leaflet surface.
 */

const LOAD_TIMEOUT_MS = 10_000;

let pending: Promise<typeof google.maps> | null = null;

declare global {
  interface Window {
    __kkGoogleMapsReady?: () => void;
  }
}

export function getGoogleMapsApiKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
}

export function loadGoogleMaps(): Promise<typeof google.maps> {
  if (pending) return pending;

  pending = new Promise<typeof google.maps>((resolve, reject) => {
    const key = getGoogleMapsApiKey();
    if (!key) {
      reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not configured'));
      return;
    }
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Google Maps script load timed out'));
      }
    }, LOAD_TIMEOUT_MS);

    window.__kkGoogleMapsReady = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__kkGoogleMapsReady`;
    script.async = true;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      reject(new Error('Failed to load the Google Maps script'));
    };
    document.head.appendChild(script);
  });

  return pending;
}
