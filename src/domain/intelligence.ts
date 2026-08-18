/**
 * Structured restaurant intelligence — the trusted recommendation metadata.
 *
 * This is deliberately NOT free text. Every attribute is a member of a small
 * controlled vocabulary so the recommendation engine can reason over it
 * deterministically, and so a future backend can serve it as typed columns
 * or structured API fields.
 *
 * Authority model: the data in `data/intelligence.ts` is the Khabo Kothay
 * executive-approved baseline. Restaurant admins can SUGGEST changes through
 * the suggestion store; nothing a restaurant claims becomes recommendation
 * metadata until an executive approves it. The engine only ever reads the
 * effective (approved) metadata — never restaurant descriptions, taglines or
 * keyword matches.
 */

/** Structured specialties — what this kitchen is actually known for. */
export type Specialty =
  | 'Biryani'
  | 'Kebab'
  | 'Dosa'
  | 'Pizza'
  | 'Desserts'
  | 'Coffee'
  | 'Seafood'
  | 'Rolls'
  | 'Sourdough'
  | 'Thali'
  | 'Breakfast'
  | 'Tiffin'
  | 'Momos'
  | 'Dim Sum'
  | 'Wok'
  | 'Awadhi'
  | 'Chaat'
  | 'Burgers'
  | 'Curry'
  | 'Kolkata-style'
  | 'Fine dining';

export const SPECIALTIES: Specialty[] = [
  'Biryani',
  'Kebab',
  'Dosa',
  'Pizza',
  'Desserts',
  'Coffee',
  'Seafood',
  'Rolls',
  'Sourdough',
  'Thali',
  'Breakfast',
  'Tiffin',
  'Momos',
  'Dim Sum',
  'Wok',
  'Awadhi',
  'Chaat',
  'Burgers',
  'Curry',
  'Kolkata-style',
  'Fine dining',
];

/** What the venue is genuinely suited to — occasion or time of day. */
export type BestFor =
  | 'Date night'
  | 'Family dinner'
  | 'Friends'
  | 'Solo dining'
  | 'Work/study'
  | 'Celebration'
  | 'Late night'
  | 'Quick bite'
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner';

export const BEST_FOR: BestFor[] = [
  'Date night',
  'Family dinner',
  'Friends',
  'Solo dining',
  'Work/study',
  'Celebration',
  'Late night',
  'Quick bite',
  'Breakfast',
  'Lunch',
  'Dinner',
];

/** Food characteristics that shape what kind of meal this is. */
export type FoodCharacteristic =
  | 'Spicy'
  | 'Mild'
  | 'Large portions'
  | 'Vegetarian-friendly'
  | 'Dessert-focused'
  | 'Quick bites'
  | 'Healthy'
  | 'Rich & hearty';

export const FOOD_CHARACTERISTICS: FoodCharacteristic[] = [
  'Spicy',
  'Mild',
  'Large portions',
  'Vegetarian-friendly',
  'Dessert-focused',
  'Quick bites',
  'Healthy',
  'Rich & hearty',
];

/** Structured dining features (independent of the filter booleans). */
export type DiningFeature =
  | 'Delivery'
  | 'Takeaway'
  | 'Outdoor seating'
  | 'Family friendly'
  | 'Pet friendly'
  | 'Reservations'
  | 'Live music';

export const DINING_FEATURES: DiningFeature[] = [
  'Delivery',
  'Takeaway',
  'Outdoor seating',
  'Family friendly',
  'Pet friendly',
  'Reservations',
  'Live music',
];

export interface RestaurantIntelligence {
  specialties: Specialty[];
  bestFor: BestFor[];
  foodCharacteristics: FoodCharacteristic[];
  diningFeatures: DiningFeature[];
  /**
   * Provenance of the current metadata. 'seed' = curated by Khabo Kothay;
   * 'suggested' = a restaurant-admin suggestion merged after executive
   * approval; 'verified' = derived on the frontend from verified database
   * attributes (cuisines / mealTypes / signatureDishes). Kept so the UI can
   * be honest about who defined the attributes.
   */
  provenance: 'seed' | 'suggested' | 'verified';
}

/** A pending restaurant-admin request to change recommendation attributes. */
export interface IntelligenceSuggestion {
  id: string;
  restaurantId: string;
  /** Attribute key being requested, e.g. 'specialties' or 'bestFor'. */
  field: keyof Pick<RestaurantIntelligence, 'specialties' | 'bestFor' | 'foodCharacteristics' | 'diningFeatures'>;
  /** Values the restaurant wants added or removed. */
  add: string[];
  remove: string[];
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  resolvedAt?: string;
}
