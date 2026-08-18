import {
  deleteAdminOffer,
  upsertAdminOffer,
  useAdminOffers,
  type AdminOfferDraft,
} from '../store/demoDb';

/**
 * Admin-offer adapter — the hooks-layer seam for the demo admin-offer store.
 * Owner/executive offer management imports from here, never from the store.
 */
export { deleteAdminOffer, upsertAdminOffer, useAdminOffers, type AdminOfferDraft };
