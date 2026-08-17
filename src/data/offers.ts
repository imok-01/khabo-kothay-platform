import type { Offer } from '../domain/offers';

/**
 * Active offer data.
 *
 * The previous demo offers belonged to the old demo restaurants and were
 * removed with that dataset — imported real restaurants must not inherit fake
 * offers. No verified offers exist yet for the Dhaka venues, so the list is
 * empty; real offers (platform-verified or executive-approved) arrive with the
 * real data phase. The provider and UI architecture are unchanged.
 *
 * `source`/`status` are filled in by the provider (approved platform offers).
 */
export const offers: Array<Omit<Offer, 'source' | 'status'>> = [];
