/**
 * Khabo Kothay BD — market configuration.
 *
 * Single source of truth for the product's city/country/currency identity.
 * The demo restaurant dataset still points at Kolkata coordinates temporarily;
 * when the real Dhaka dataset is imported those records replace it without
 * touching any of this configuration.
 */
export const MARKET = {
  /** Product brand used in chrome/metadata. */
  name: 'Khabo Kothay BD',
  city: 'Dhaka',
  country: 'Bangladesh',
  currency: 'BDT',
  currencySymbol: '৳',
  /** Lakh/crore digit grouping (consistent with Bengali conventions). */
  locale: 'en-IN',
} as const;
