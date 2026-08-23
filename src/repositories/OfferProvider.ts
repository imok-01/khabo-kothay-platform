import { offers as seedOffers } from '../data/offers';
import type { Offer } from '../domain/offers';
import { getAdminOffers } from '../store/demoDb';
import { isDevSimulation } from '../lib/devSimulation';
import { DEV_DEMO_OFFERS } from '../data/devSimulation';

/**
 * OfferProvider abstraction — the UI never imports the mock dataset directly,
 * so a backend offer feed can replace it without touching components.
 *
 * The provider merges two sources:
 *  - seeded demo offers (treated as approved platform offers), and
 *  - restaurant-admin-created offers, which only appear publicly once the
 *    executive has approved them (draft/pending/rejected never surface).
 */
export interface OfferProvider {
  getAll: () => Offer[];
  getForRestaurant: (restaurantId: string) => Offer[];
}

function allOffers(): Offer[] {
  // Isolated dev-simulation offers only exist when the simulation is enabled.
  const dev = isDevSimulation() ? DEV_DEMO_OFFERS : [];
  const seeded: Offer[] = seedOffers.map((o) => ({ ...o, source: 'seed', status: 'approved' }));
  const admin = getAdminOffers()
    .filter((o) => o.status === 'approved')
    .map<Offer>((o) => ({
      id: o.id,
      restaurantId: o.restaurantId,
      title: o.title,
      discountLabel: o.discountLabel,
      value: o.value,
      validity: o.validity,
      terms: o.terms,
      applicableMealTypes: ['Lunch', 'Dinner'],
      isMock: true,
      source: 'admin',
      status: 'approved',
    }));
  return [...dev, ...seeded, ...admin];
}

const mockOfferProvider: OfferProvider = {
  getAll: () => allOffers(),
  getForRestaurant: (restaurantId) => allOffers().filter((o) => o.restaurantId === restaurantId),
};

export const offerProvider: OfferProvider = mockOfferProvider;
export const getAllOffers = () => offerProvider.getAll();
export const getOffersForRestaurant = (id: string) => offerProvider.getForRestaurant(id);
