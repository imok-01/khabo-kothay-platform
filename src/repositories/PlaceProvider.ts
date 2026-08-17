import type { ExternalPlaceData } from '../domain/place';

/**
 * Place data repository seam.
 *
 * The future real implementation calls the official Google Places API (New)
 * using `VITE_GOOGLE_MAPS_API_KEY` — never scrapes Maps pages — and returns
 * `ExternalPlaceData` for a place ID. Until then the demo provider returns
 * null, so the app simply falls back to Khabo Kothay's own community data.
 */
export interface PlaceProvider {
  /** Resolve external (Google) place data for a place ID, or null. */
  fetchPlaceData: (placeId: string) => Promise<ExternalPlaceData | null>;
}

/**
 * Demo mode: no Google data is fabricated or faked as live. The UI renders
 * the graceful fallback (Khabo Kothay ratings/reviews/photos only).
 */
export const demoPlaceProvider: PlaceProvider = {
  fetchPlaceData: async () => null,
};

/**
 * Active provider — swap `demoPlaceProvider` for a `GooglePlacesProvider`
 * when credentials are configured. Keep keys out of the repository.
 */
export const placeProvider: PlaceProvider = demoPlaceProvider;
