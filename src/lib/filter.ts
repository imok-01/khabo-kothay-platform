import type { MealType, Restaurant, Vibe } from '../types';
import type { GeoPoint } from './geo';
import { isOpenNow, minutesUntilOpen } from './openHours';
import { getEffectiveIntelligence } from './intelligence';
import { matchesCuisine } from './cuisineAliases';
import { distanceKm } from './geo';
import { effectiveRating } from './ratings';
import { budgetTier, costForTwoValue } from './priceDisplay';

/**
 * Words that carry no search intent on their own (quality fluff, articles,
 * verbs). When the NL parser leaves them behind as a leftover query, they must
 * not force a text match that would kill an otherwise-valid structured result
 * (e.g. "best biryani" → cuisine+location match, leftover "best" ignored).
 */
export const SEARCH_STOPWORDS = new Set([
  'best', 'better', 'good', 'great', 'top', 'nice', 'awesome', 'tasty',
  'delicious', 'fine', 'real', 'really', 'very', 'the', 'a', 'an', 'of',
  'and', 'or', 'to', 'for', 'with', 'near', 'me', 'my', 'some', 'any',
  'restaurant', 'restaurants', 'place', 'places', 'food', 'eat', 'eating',
  'find', 'show', 'want', 'craving', 'crave', 'spot', 'joint',
]);

/** Strip a free-text query down to meaningful search tokens. */
export function tokenizeQuery(q: string): string[] {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter((t) => t.length >= 2 && !SEARCH_STOPWORDS.has(t));
}

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
  // When the catalogue records no cuisines at all (e.g. a thin Google import),
  // a structured cuisine filter would silently exclude everything. Degrade
  // gracefully to a real-text match on name/address so "biryani"/"Chinese"
  // still surface relevant places by name instead of returning nothing.
  const cuisineDataMissing = list.every((r) => r.cuisines.length === 0);
  return list.filter((r) => {
    if (criteria.location && r.location !== criteria.location) return false;
    // Budget filters match the tier a venue qualifies for — verified when a
    // curated price exists, menu-estimated otherwise. A venue with no price
    // signal at all (no curated price, no menu) never claims a tier.
    if (criteria.budget && budgetTier(r) !== criteria.budget) return false;
    if (criteria.cuisine) {
      if (cuisineDataMissing) {
        const term = criteria.cuisine.toLowerCase();
        if (
          !r.name.toLowerCase().includes(term) &&
          !r.address.toLowerCase().includes(term) &&
          !r.tagline.toLowerCase().includes(term) &&
          !r.location.toLowerCase().includes(term)
        ) {
          return false;
        }
      } else if (!matchesCuisine(r, criteria.cuisine)) {
        return false;
      }
    }
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
    // Cost caps compare against the representative cost-for-two (curated price,
    // or the menu estimate's base when there is no curated price). A venue with
    // no price signal never matches a cap.
    if (criteria.maxPriceForTwo !== undefined) {
      const cap = costForTwoValue(r);
      if (cap === undefined || cap > criteria.maxPriceForTwo) return false;
    }
    if (criteria.outdoorSeating && !r.hasOutdoorSeating) return false;
    if (criteria.delivery && !r.hasDelivery) return false;
    if (criteria.familyFriendly && !r.isFamilyFriendly) return false;
    if (criteria.quiet && !r.vibes.includes('Quiet' as Vibe)) return false;
    // Vibe alignment: map recognised intents onto real, populated attributes
    // where the catalogue supports them, and only fall back to the curated
    // vibe labels otherwise. We never invent a vibe — if the data has neither
    // the label nor a real attribute, the filter honestly excludes.
    if (criteria.vibe) {
      const v = criteria.vibe;
      const vibeOk =
        r.vibes.includes(v as Vibe) ||
        (v === 'Family' && r.isFamilyFriendly) ||
        (v === 'Rooftop' && r.hasOutdoorSeating);
      if (!vibeOk) return false;
    }
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
      // OR semantics over meaningful tokens: a result matches if ANY token is
      // present. Quality fluff / stopwords are dropped so they can't force a
      // false negative (e.g. leftover "best" from "best biryani").
      const tokens = tokenizeQuery(q);
      if (tokens.length > 0 && !tokens.some((t) => haystack.includes(t))) return false;
    }
    return true;
  });
}

/**
 * Structured filters that match NOTHING in the catalogue on their own.
 *
 * Used to explain an empty result honestly: when the user combined filters
 * and got zero matches, this tells us which individual filter is unsupported
 * by the data (e.g. a vibe or a price cap with no venues behind it) so the UI
 * can say "X isn't recorded for the current catalogue yet" instead of a vague
 * "no results". Each filter is evaluated in isolation — the query text is
 * intentionally excluded.
 */
export function uncoveredFilters(
  list: Restaurant[],
  criteria: FilterCriteria,
  now: Date = new Date(),
): string[] {
  const labels: string[] = [];
  const single = (partial: FilterCriteria) => filterRestaurants(list, partial, now).length;

  if (criteria.delivery && single({ delivery: true }) === 0) labels.push('Delivery');
  if (criteria.outdoorSeating && single({ outdoorSeating: true }) === 0) labels.push('Outdoor seating');
  if (criteria.openNow && single({ openNow: true }) === 0) labels.push('Open now');
  if (criteria.budget && single({ budget: criteria.budget }) === 0) labels.push(`Budget: ${criteria.budget}`);
  if (criteria.maxPriceForTwo !== undefined && single({ maxPriceForTwo: criteria.maxPriceForTwo }) === 0) labels.push('Max cost for two');
  if (criteria.vibe && single({ vibe: criteria.vibe }) === 0) labels.push(`Vibe: ${criteria.vibe}`);
  if (criteria.vegOnly && single({ vegOnly: true }) === 0) labels.push('Pure veg');
  if (criteria.nonVegOnly && single({ nonVegOnly: true }) === 0) labels.push('Non-veg');
  if (criteria.familyFriendly && single({ familyFriendly: true }) === 0) labels.push('Family friendly');
  if (criteria.quiet && single({ quiet: true }) === 0) labels.push('Quiet');
  if (criteria.location && single({ location: criteria.location }) === 0) labels.push(`Location: ${criteria.location}`);
  if (criteria.mealType && single({ mealType: criteria.mealType }) === 0) labels.push(`Meal: ${criteria.mealType}`);
  if (criteria.specialty && single({ specialty: criteria.specialty }) === 0) labels.push(`Craving: ${criteria.specialty}`);
  if (criteria.cuisine && single({ cuisine: criteria.cuisine }) === 0) labels.push(`Cuisine: ${criteria.cuisine}`);

  return labels;
}
