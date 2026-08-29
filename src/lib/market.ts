/**
 * Khabo Kothay — market configuration.
 *
 * Single source of truth for the product's city/country/currency identity.
 * The demo restaurant dataset still points at Kolkata coordinates temporarily;
 * when the real Dhaka dataset is imported those records replace it without
 * touching any of this configuration.
 */
export const MARKET = {
  /** Product brand used in chrome/metadata. The "BD" suffix is gone: the
   *  wordmark, the footer and the page title have to say the same thing, and
   *  "Khabo Kothay" already reads as Bangla. */
  name: 'Khabo Kothay',
  city: 'Dhaka',
  country: 'Bangladesh',
  currency: 'BDT',
  currencySymbol: '৳',
  /** Lakh/crore digit grouping (consistent with Bengali conventions). */
  locale: 'en-IN',
} as const;
