import type { MealType, Restaurant, Vibe } from '../types';
import type { GeoPoint } from './geo';
import { isOpenNow, minutesUntilOpen } from './openHours';
import { getEffectiveIntelligence } from './intelligence';
import { distanceKm } from './geo';
import { effectiveRating } from './ratings';

export interface FilterCriteria {
  query?: string;
  location?: string;
  budget?: string;
  cuisine?: string;
  /** structured specialty (e.g. Biryani) — matches approved metadata only */
  specialty?: string;
  mealType?: string;
  vegOnly?: boolean;
  nonVegOnly?: boolean;
  openNow?: boolean;
  /** availability from recorded hours: 'open' | 'soon' | 'later' */
  availability?: 'open' | 'soon' | 'later';
  /** cost-for-two cap in BDT */
  maxPriceForTwo?: number;
  outdoorSeating?: boolean;
  delivery?: boolean;
  /** structured dining features — never inferred from descriptions */
  familyFriendly?: boolean;
  quiet?: boolean;
  vibe?: string;
  /** minimum rating (e.g. 4.3 = "4.3★ and up") */
  minRating?: number;
  /** distance cap in km — only meaningful when an origin is supplied */
  withinKm?: number;
  /** origin for the distance cap (the user's shared location, or undefined) */
  origin?: GeoPoint;
}

/**
 * Pure filtering over a restaurant list. `now` is injectable so tests (and
 * the open-now filter) can run against a fixed instant.
 */
export function filterRestaurants(
  list: Restaurant[],
  criteria: FilterCriteria,
  now: Date = new Date(),
): Restaurant[] {
  const q = (criteria.query ?? '').trim().toLowerCase();
  return list.filter((r) => {
    if (criteria.location && r.location !== criteria.location) return false;
    // Budget filters only consider venues whose price we actually know — an
    // unpriced restaurant is never claimed to be (or not to be) a tier.
    if (criteria.budget && (r.priceForTwo <= 0 || r.budget !== criteria.budget)) return false;
    if (criteria.cuisine && !r.cuisines.includes(criteria.cuisine)) return false;
    if (criteria.specialty && !(r.intelligence ?? getEffectiveIntelligence(r)).specialties.includes(criteria.specialty as never)) return false;
    if (criteria.mealType && !r.mealTypes.includes(criteria.mealType as MealType)) return false;
    if (criteria.vegOnly && (!r.isVeg || r.vegUnknown)) return false;
    if (criteria.nonVegOnly && (r.isVeg || r.vegUnknown)) return false;
    if (criteria.openNow && !isOpenNow(r.openingHours, now)) return false;
    if (criteria.availability === 'open' && !isOpenNow(r.openingHours, now)) return false;
    if (criteria.availability === 'soon') {
      const until = minutesUntilOpen(r.openingHours, now);
      if (until === null || until === 0 || until > 60) return false;
    }
    if (criteria.availability === 'later') {
      const until = minutesUntilOpen(r.openingHours, now);
      if (until === null || until === 0 || until <= 60) return false;
    }
    // Unknown price (priceForTwo <= 0) never matches a cost cap.
    if (criteria.maxPriceForTwo !== undefined && (r.priceForTwo <= 0 || r.priceForTwo > criteria.maxPriceForTwo)) return false;
    if (criteria.outdoorSeating && !r.hasOutdoorSeating) return false;
    if (criteria.delivery && !r.hasDelivery) return false;
    if (criteria.familyFriendly && !r.isFamilyFriendly) return false;
    if (criteria.quiet && !r.vibes.includes('Quiet' as Vibe)) return false;
    if (criteria.vibe && !r.vibes.includes(criteria.vibe as Vibe)) return false;
    if (criteria.withinKm !== undefined && criteria.origin && distanceKm(criteria.origin, r) > criteria.withinKm) return false;
    // Rating floors use the best genuine rating we hold (community first,
    // Google as the ranking fallback) — never a fabricated 0.0.
    if (criteria.minRating !== undefined && effectiveRating(r) < criteria.minRating) return false;
    if (q) {
      const haystack = [
        r.name,
        r.tagline,
        r.location,
        r.address,
        ...r.cuisines,
        ...r.signatureDishes,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
