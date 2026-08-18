import { getAllOffers, getOffersForRestaurant } from '../repositories/OfferProvider';

/**
 * Offers adapter — the hooks-layer seam for the public offer provider.
 * Cards and pages import from here, never from the repository directly.
 */
export { getAllOffers, getOffersForRestaurant };
