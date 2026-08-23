import { getAllOffers, getOffersForRestaurant } from '../repositories/OfferProvider';

// Feature flag — set VITE_ENABLE_OFFERS=true to surface real, verified offers.
// Default OFF for pilot: no demo/invented offers are shown anywhere.
export const OFFERS_ENABLED = import.meta.env.VITE_ENABLE_OFFERS === 'true';

/**
 * Offers adapter — the hooks-layer seam for the public offer provider.
 * Cards and pages import from here, never from the repository directly.
 */
export { getAllOffers, getOffersForRestaurant };
