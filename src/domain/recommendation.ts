import type { Budget, Restaurant, Vibe } from '../types';
import type { GeoPoint } from '../lib/geo';
import type { Specialty } from './intelligence';

/**
 * Structured dining intent — what the user is asking for RIGHT NOW.
 *
 * Created by the hero discovery builder (and, in a future phase, by an AI
 * layer that translates free text into this same shape). The recommendation
 * engine ranks restaurants against this intent, then layers personalisation
 * on top when the user is signed in and has real signals.
 */
export interface DiningIntent {
  cuisine?: string;
  specialty?: Specialty;
  location?: string;
  budget?: Budget;
  mealType?: string;
  vibe?: Vibe;
  diet?: 'any' | 'veg' | 'nonveg';
  /** party size: '1' | '2' | '3-4' | '5-8' | '9+' — a soft occasion signal.
   *  Never implies real table availability in the demo. */
  partySize?: string;
  /** dining mode: 'dine-in' | 'delivery' (takeaway isn't in the data model). */
  dining?: 'dine-in' | 'delivery';
  /** availability: 'open' | 'soon' | 'later' — derived from recorded hours. */
  availability?: 'open' | 'soon' | 'later';
  openNow?: boolean;
  /** Free-text search term (leftover after structured NL parsing), matched
   *  only against lightweight, in-memory fields — never heavy tables. */
  query?: string;
}

/** Scoring dimensions — every reason maps back to exactly one of these. */
export type MatchDimension =
  | 'cuisine'
  | 'specialty'
  | 'budget'
  | 'location'
  | 'meal'
  | 'vibe'
  | 'diet'
  | 'open'
  | 'quality'
  | 'popularity'
  | 'offer'
  | 'preference'
  | 'distance'
  | 'party'
  | 'dining'
  | 'search';

export const DIMENSION_LABEL: Record<MatchDimension, string> = {
  cuisine: 'Cuisine',
  specialty: 'Specialty',
  budget: 'Budget',
  location: 'Location',
  meal: 'Dining time',
  vibe: 'Vibe',
  diet: 'Diet',
  open: 'Open now',
  quality: 'Rating',
  popularity: 'Popularity',
  offer: 'Offers',
  preference: 'Your profile',
  distance: 'Distance',
  party: 'Group size',
  dining: 'Dining mode',
  search: 'Search',
};

export interface MatchReason {
  label: string;
  dimension: MatchDimension;
  /** 0–100 contribution of this dimension to the overall match. */
  strength: number;
}

export interface MatchResult {
  /** 0–100 — higher is a better match for the current intent + user. */
  score: number;
  /** True when the score uses genuine personal signals (profile/favourites). */
  personal: boolean;
  /** Short human explanations, generated from the same signals as the score. */
  reasons: MatchReason[];
}

export interface RecommendationContext {
  /** user coordinates, when available */
  location?: GeoPoint | null;
  favorites: Restaurant[];
  recentlyViewed: Restaurant[];
  preferredCuisines: string[];
  preferredBudget?: Budget;
  vegPref?: 'any' | 'veg' | 'nonveg';
  /** neighbourhoods the user explicitly prefers (from their profile) */
  preferredNeighbourhoods?: string[];
  /** food interests (occasions/experiences) from the user's profile */
  diningInterests?: string[];
  /** explicit discovery intent from filters / builder */
  intent?: DiningIntent;
}

export type SurpriseMode = 'any' | 'nearby' | 'under500' | 'tonight';
