import type { ExternalPlaceData, KhaboPlaceData, MenuInfo, PriceObservation } from './domain/place';
import type { RestaurantIntelligence } from './domain/intelligence';
import type { CostEstimate } from './lib/costEstimate';

export type Budget = 'Budget' | 'Mid-range' | 'Premium' | 'Luxury';

export type MealType =
  | 'Breakfast'
  | 'Brunch'
  | 'Lunch'
  | 'Snacks'
  | 'Dinner'
  | 'Dessert';

export type Vibe =
  | 'Date night'
  | 'Nightlife'
  | 'Quiet'
  | 'Work-friendly'
  | 'Family'
  | 'Instagram-worthy'
  | 'Late-night'
  | 'Heritage'
  | 'Live music'
  | 'Rooftop';

export const VIBES: Vibe[] = [
  'Date night',
  'Nightlife',
  'Quiet',
  'Work-friendly',
  'Family',
  'Instagram-worthy',
  'Late-night',
  'Heritage',
  'Live music',
  'Rooftop',
];

export interface Restaurant {
  /** Stable internal Khabo Kothay id — never changes when Google data is linked. */
  id: string;
  name: string;
  tagline: string;
  description: string;
  cuisines: string[];
  mealTypes: MealType[];
  budget: Budget;
  priceForTwo: number; // in BDT
  location: string; // neighborhood
  address: string;
  /** City (e.g. "Dhaka"). Absent in mock data — never invented when unknown. */
  city?: string;
  /** Place facts — source-agnostic (Google and our data agree on these). */
  openingHours: string;
  isVeg: boolean;
  /** True when veg status isn't known — never label such venues VEG/NON-VEG. */
  vegUnknown?: boolean;
  hasDelivery: boolean;
  hasOutdoorSeating: boolean;
  isFamilyFriendly: boolean;
  vibes: Vibe[];
  lat: number;
  lng: number;
  signatureDishes: string[];
  /**
   * Google Places data (rating, reviews, photos…). Absent in demo mode — we
   * never fabricate Google content. Populated by a future Places repository.
   */
  google?: ExternalPlaceData;
  /** Khabo Kothay's own community data — ratings, reviews, signals. */
  khabo: KhaboPlaceData;
  /** Readiness: typed menu support (populated by a future menu system). */
  menu?: MenuInfo;
  /** Readiness: our own timestamped price observations, if we ever record them. */
  priceObservations?: PriceObservation[];
  /**
   * Menu-derived cost-for-two estimate, attached at the repository seam so
   * every surface (cards, map popups, detail) shares one source. Computed
   * from the venue's own menu price observations via estimateCostForTwo —
   * it is an ESTIMATE and must never be labelled "verified" in the UI.
   */
  menuEstimate?: CostEstimate;
  /**
   * Structured recommendation metadata — Khabo Kothay executive-approved
   * specialties, occasions, food characteristics and dining features. Populated
   * at load from the intelligence layer; never derived from free text.
   */
  intelligence?: RestaurantIntelligence;
}

export type SortKey = 'recommended' | 'rating' | 'distance' | 'price-low' | 'price-high' | 'popularity';

import { MARKET } from './lib/market';

export const BUDGET_LABEL: Record<Budget, string> = {
  Budget: `${MARKET.currencySymbol} under 200 / person`,
  'Mid-range': `${MARKET.currencySymbol}200 – 500 / person`,
  Premium: `${MARKET.currencySymbol}500 – 1000 / person`,
  Luxury: `${MARKET.currencySymbol}1000+ / person`,
};
