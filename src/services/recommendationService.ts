import type { Restaurant } from '../types';
import type { DiningIntent, MatchDimension, MatchReason, MatchResult, RecommendationContext, SurpriseMode } from '../domain/recommendation';
import type { Specialty } from '../domain/intelligence';
import { distanceKm } from '../lib/geo';
import { isOpenNow, minutesUntilOpen } from '../lib/openHours';
import { getOffersForRestaurant } from '../repositories/OfferProvider';
import { getEffectiveIntelligence } from '../lib/intelligence';
import { formatCurrency } from '../lib/format';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';
import { tokenizeQuery } from '../lib/filter';

/**
 * Deterministic, explainable match scoring.
 *
 * The score is the share of the active signals a restaurant satisfies:
 *
 *     score = earned / achievable × 100
 *
 * "Earned" is a weighted sum over scoring dimensions (cuisine, specialty,
 * budget, location, meal, vibe, diet, open, quality, popularity, preference,
 * offer, distance, party, dining). "Achievable" is the same weighted sum as if every
 * constraint were perfectly satisfied. Every positive dimension becomes a
 * MatchReason carrying its contribution share, so the "why" on the card is
 * generated from exactly the signals that produced the number.
 *
 * Two hard rules:
 * 1. Structured data only — specialties/occasions come from the approved
 *    intelligence layer, never from descriptions or keyword matches.
 * 2. No invented personalisation — the score is only ever marked `personal`
 *    when genuine user signals (profile, favourites) exist.
 */

const W = {
  cuisine: 15,
  specialty: 13,
  budgetIntent: 10,
  budgetPref: 8,
  locationIntent: 7,
  prefNeigh: 7,
  meal: 7,
  vibe: 7,
  diet: 7,
  open: 4,
  quality: 12,
  popularity: 7,
  preference: 12,
  interest: 6,
  offer: 3,
  distance: 4,
  party: 8,
  dining: 5,
  // Query relevance — a single explainable signal derived only from lightweight,
  // in-memory fields. `search` is the max achievable; the earned credit scales
  // with how directly the query hits the most specific field.
  search: 12,
};

/**
 * Food interests → structured occasion tags. Only interests with a clear
 * structured equivalent are mapped — everything else simply contributes
 * nothing, rather than pretending a keyword match is a preference.
 */
const INTEREST_SIGNALS: Record<string, string[]> = {
  'Family dinners': ['Family dinner'],
  'Date nights': ['Date night'],
  'Late-night bites': ['Late night'],
  'Street food': ['Quick bite'],
  'Fine dining': ['Celebration'],
  'Café hopping': ['Work/study'],
};

function intelligence(r: Restaurant) {
  return r.intelligence ?? getEffectiveIntelligence(r);
}

/**
 * The two vocabularies below are constants, and they are declared here rather
 * than inside the functions that read them because both functions are called
 * once per venue inside `matchScore` — i.e. a few hundred times per keystroke on
 * Explore. Built inline, each call allocated a fresh ten-key object and its ten
 * arrays to read one entry out of it and throw the rest away.
 */

/** Structured occasion/time signals a vibe maps onto (bestFor vocabulary). */
const VIBE_SIGNALS: Record<string, string[]> = {
  'Date night': ['Date night'],
  Family: ['Family dinner'],
  'Late-night': ['Late night'],
  Nightlife: ['Late night', 'Friends'],
  Quiet: [],
  'Work-friendly': ['Work/study'],
  Heritage: [],
  'Live music': [],
  Rooftop: [],
  'Instagram-worthy': [],
};

function vibeSignals(vibe: string | undefined): string[] {
  if (!vibe) return [];
  return [vibe, ...(VIBE_SIGNALS[vibe] ?? [])];
}

type MealSignals = { bestFor: string[]; specialties: Specialty[]; chars: string[] };

/** Structured signals a meal type maps onto (bestFor + specialty + food chars). */
const MEAL_SIGNALS: Record<string, MealSignals> = {
  Breakfast: { bestFor: ['Breakfast'], specialties: ['Breakfast'], chars: [] },
  Brunch: { bestFor: ['Breakfast', 'Lunch'], specialties: ['Breakfast'], chars: [] },
  Lunch: { bestFor: ['Lunch'], specialties: [], chars: [] },
  Snacks: { bestFor: ['Quick bite'], specialties: [], chars: ['Quick bites'] },
  Dinner: { bestFor: ['Dinner', 'Late night'], specialties: [], chars: [] },
  Dessert: { bestFor: [], specialties: ['Desserts'], chars: ['Dessert-focused'] },
};

const NO_MEAL_SIGNALS: MealSignals = { bestFor: [], specialties: [], chars: [] };

function mealSignals(mealType: string | undefined): MealSignals {
  if (!mealType) return NO_MEAL_SIGNALS;
  return MEAL_SIGNALS[mealType] ?? NO_MEAL_SIGNALS;
}

export function matchScore(r: Restaurant, ctx: RecommendationContext): MatchResult {
  const int = ctx.intent;
  const eff = intelligence(r);
  const dims: Array<{ dimension: MatchDimension; earned: number; label: string }> = [];
  let achievable = 0;

  const add = (dimension: MatchDimension, earned: number, label: string | null, weight: number) => {
    achievable += weight;
    if (earned > 0 && label) dims.push({ dimension, earned, label });
  };

  // Cuisine intent.
  if (int?.cuisine) {
    const hit = r.cuisines.includes(int.cuisine);
    add('cuisine', hit ? W.cuisine : 0, `Authentic ${int.cuisine}`, W.cuisine);
  }
  // Specialty intent — structured metadata only, never text matching.
  if (int?.specialty) {
    const hit = eff.specialties.includes(int.specialty);
    add('specialty', hit ? W.specialty : 0, hit ? `Known for ${int.specialty}` : null, W.specialty);
  }
  // Free-text query relevance — matches ONLY lightweight in-memory fields
  // (name, tagline, location, address, cuisines, specialties, signature
  // dishes). Never touches menu items, price observations or verification
  // records. Tokens are matched with OR semantics (consistent with
  // filterRestaurants) so "best biryani" still finds biryani places, and the
  // reason names the real matched signal — answering "why?" honestly.
  const queryTokens = int?.query ? tokenizeQuery(int.query) : [];
  if (queryTokens.length > 0) {
    const name = r.name.toLowerCase();
    const tagline = (r.tagline ?? '').toLowerCase();
    const location = r.location.toLowerCase();
    const address = (r.address ?? '').toLowerCase();
    const cuisines = r.cuisines.join(' ').toLowerCase();
    const specialties = eff.specialties.join(' ').toLowerCase();
    const signatures = r.signatureDishes.join(' ').toLowerCase();
    // Most-specific field first; the first field any token hits wins.
    const ranked: Array<{ test: (t: string) => boolean; label: string; earned: number }> = [
      { test: (t) => name.includes(t), label: 'Name match', earned: W.search },
      { test: (t) => cuisines.includes(t), label: 'Cuisine match', earned: W.search },
      { test: (t) => specialties.includes(t), label: 'Specialty match', earned: Math.round(W.search * 0.85) },
      { test: (t) => signatures.includes(t), label: 'Dish match', earned: Math.round(W.search * 0.85) },
      { test: (t) => location.includes(t), label: 'Location match', earned: Math.round(W.search * 0.65) },
      { test: (t) => address.includes(t), label: 'Address match', earned: Math.round(W.search * 0.5) },
      { test: (t) => tagline.includes(t), label: 'Description match', earned: Math.round(W.search * 0.4) },
    ];
    let bestLabel: string | null = null;
    let bestEarned = 0;
    for (const field of ranked) {
      if (queryTokens.some((t) => field.test(t))) {
        bestLabel = field.label;
        bestEarned = field.earned;
        break;
      }
    }
    if (!bestLabel) {
      // Tokens present but none landed in a single field — still a genuine
      // result via the combined haystack, so credit it modestly.
      bestLabel = 'Matches your search';
      bestEarned = Math.round(W.search * 0.35);
    }
    add('search', bestEarned, bestLabel, W.search);
  }
  // Budget — explicit intent first, then the user's preferred tier. Venues
  // with unknown pricing (priceForTwo <= 0) are never credited a budget match.
  if (int?.budget && r.priceForTwo > 0) {
    const exact = r.budget === int.budget;
    add('budget', exact ? W.budgetIntent : Math.abs(budgetRank(r.budget) - budgetRank(int.budget)) === 1 ? Math.round(W.budgetIntent / 2) : 0, exact ? `Fits your ${int.budget} budget` : null, W.budgetIntent);
  }
  if (ctx.preferredBudget && r.priceForTwo > 0) {
    const exact = r.budget === ctx.preferredBudget;
    add('budget', exact ? W.budgetPref : Math.abs(budgetRank(r.budget) - budgetRank(ctx.preferredBudget)) === 1 ? Math.round(W.budgetPref / 2) : 0, exact ? 'Fits your usual budget' : null, W.budgetPref);
  }
  // Location — explicit area, then preferred neighbourhoods from the profile.
  if (int?.location) {
    const hit = r.location === int.location;
    add('location', hit ? W.locationIntent : 0, hit ? `In ${r.location}` : null, W.locationIntent);
  }
  if ((ctx.preferredNeighbourhoods?.length ?? 0) > 0 && ctx.preferredNeighbourhoods!.includes(r.location)) {
    add('location', W.prefNeigh, `Near your preferred area — ${r.location}`, W.prefNeigh);
  }
  // Meal type — matches the restaurant's structured occasion/specialty signals.
  if (int?.mealType) {
    const sig = mealSignals(int.mealType);
    const hit =
      sig.bestFor.some((b) => eff.bestFor.includes(b as never)) ||
      sig.specialties.some((s) => eff.specialties.includes(s)) ||
      sig.chars.some((c) => eff.foodCharacteristics.includes(c as never)) ||
      r.mealTypes.includes(int.mealType as Restaurant['mealTypes'][number]);
    add('meal', hit ? W.meal : 0, hit ? `Great for ${int.mealType}` : null, W.meal);
  }
  // Vibe — matches vibes or structured occasion metadata.
  if (int?.vibe) {
    const sig = vibeSignals(int.vibe);
    const hit = r.vibes.includes(int.vibe) || sig.some((b) => eff.bestFor.includes(b as never));
    add('vibe', hit ? W.vibe : 0, hit ? vibeReason(int.vibe) : null, W.vibe);
  }
  // Diet — venues with unknown veg status never match either way.
  if (int?.diet && int.diet !== 'any' && !r.vegUnknown) {
    const hit = int.diet === 'veg' ? r.isVeg : !r.isVeg;
    add('diet', hit ? W.diet : 0, hit ? (int.diet === 'veg' ? 'Pure veg' : 'Non-vegetarian') : null, W.diet);
  }
  // Open now.
  if (int?.openNow) {
    const hit = isOpenNow(r.openingHours);
    add('open', hit ? W.open : 0, hit ? 'Open now' : null, W.open);
  }
  // Availability — derived from recorded hours, never claimed as live data.
  if (!int?.openNow && int?.availability) {
    if (int.availability === 'open') {
      const hit = isOpenNow(r.openingHours);
      add('open', hit ? W.open : 0, hit ? 'Open now' : null, W.open);
    } else if (int.availability === 'soon') {
      const until = minutesUntilOpen(r.openingHours);
      const hit = until !== null && until > 0 && until <= 60;
      add('open', hit ? W.open : 0, hit ? 'Opens soon' : null, W.open);
    } else if (int.availability === 'later') {
      const until = minutesUntilOpen(r.openingHours);
      const hit = until !== null && until > 60;
      add('open', hit ? W.open : 0, hit ? 'Opens later today' : null, W.open);
    }
  }
  // Party size — soft occasion signal from structured bestFor metadata.
  if (int?.partySize) {
    const needs =
      int.partySize === '1'
        ? ['Solo dining', 'Quick bite']
        : int.partySize === '2'
          ? ['Date night', 'Friends', 'Celebration']
          : int.partySize === '3-4'
            ? ['Family dinner', 'Friends', 'Celebration']
            : ['Family dinner', 'Celebration'];
    const hit = eff.bestFor.some((b) => needs.includes(b as never));
    const label =
      int.partySize === '1'
        ? 'Good for solo dining'
        : int.partySize === '2'
          ? 'Works well for two'
          : 'Handles a group well';
    add('party', hit ? W.party : 0, hit ? label : null, W.party);
  }
  // Dining mode — structured feature only; dine-in is the baseline.
  if (int?.dining === 'delivery') {
    const hit = r.hasDelivery;
    add('dining', hit ? W.dining : 0, hit ? 'Delivers' : null, W.dining);
  }
  // Distance — a soft bonus when the user shared a location.
  if (ctx.location) {
    const km = distanceKm(ctx.location, r);
    const earned = Math.max(0, Math.round(W.distance - km * 0.4));
    add('distance', earned, km <= 1.5 ? 'Close to you' : null, W.distance);
  }
  // Quality — the best genuine rating we hold (community first, Google fallback).
  const rating = effectiveRating(r);
  if (rating >= 4.5) {
    add('quality', W.quality, 'Top rated', W.quality);
  } else if (rating >= 4.2) {
    add('quality', Math.round(W.quality * 0.7), null, W.quality);
  } else {
    add('quality', Math.round(W.quality * 0.35), null, W.quality);
  }
  // Popularity.
  const reviewCount = effectiveReviewCount(r);
  const popularity = Math.min(W.popularity, Math.round(Math.log2(reviewCount + 1) * 0.7));
  add('popularity', popularity, reviewCount >= 3000 ? 'Popular with locals' : null, W.popularity);
  // Offers — bonus, not part of the achievable denominator.
  if (getOffersForRestaurant(r.id).length > 0) {
    dims.push({ dimension: 'offer', earned: W.offer, label: 'Has an active offer' });
  }
  // Personal preference — explicit profile cuisines.
  if (ctx.preferredCuisines.length > 0) {
    achievable += W.preference;
    const shared = ctx.preferredCuisines.filter((c) => r.cuisines.includes(c));
    const earned = Math.min(W.preference, shared.length * 6);
    if (earned > 0) {
      dims.push({ dimension: 'preference', earned, label: `You like ${shared[0]} food` });
    }
  }
  // Food interests — structured occasions only (never description matching).
  if ((ctx.diningInterests?.length ?? 0) > 0) {
    achievable += W.interest;
    const mapped = ctx.diningInterests!
      .map((i) => INTEREST_SIGNALS[i] ?? [])
      .flat();
    const hit = mapped.some((tag) => eff.bestFor.includes(tag as never));
    if (hit) {
      const matched = ctx.diningInterests!.find((i) => (INTEREST_SIGNALS[i] ?? []).some((t) => eff.bestFor.includes(t as never)));
      dims.push({ dimension: 'preference', earned: W.interest, label: `Matches your ${matched} preference` });
    }
  }

  // Recently viewed — don't resurface what they just saw.
  const seenRecently = ctx.recentlyViewed.some((x) => x.id === r.id);

  const raw = dims.reduce((sum, d) => sum + d.earned, 0);
  const denom = Math.max(1, achievable);
  const score = clamp(Math.round((raw / denom) * 100) - (seenRecently ? 8 : 0), 0, 100);

  const reasons = dims
    .filter((d) => d.earned > 0)
    .sort((a, b) => b.earned - a.earned)
    .map((d) => ({ dimension: d.dimension, label: d.label, strength: Math.round((d.earned / Math.max(1, raw)) * 100) }));

  return {
    score,
    personal: hasPersonalizationSignals(ctx),
    reasons,
  };
}

/** True when Khabo Kothay genuinely has personal signals to work with. */
export function hasPersonalizationSignals(ctx: RecommendationContext): boolean {
  return (
    ctx.preferredCuisines.length > 0 ||
    Boolean(ctx.preferredBudget) ||
    (ctx.preferredNeighbourhoods?.length ?? 0) > 0 ||
    (ctx.diningInterests?.length ?? 0) > 0 ||
    ctx.favorites.length > 0 ||
    ctx.vegPref !== 'any'
  );
}

function budgetRank(b: Restaurant['budget']): number {
  return b === 'Budget' ? 1 : b === 'Mid-range' ? 2 : b === 'Premium' ? 3 : 4;
}

function vibeReason(vibe: string): string {
  const map: Record<string, string> = {
    'Date night': 'Perfect for a date',
    Family: 'Good with kids',
    Quiet: 'Quiet and calm',
    'Work-friendly': 'Great to work from',
    Nightlife: 'Lively after dark',
    'Late-night': 'Open late',
    Heritage: 'Established classic',
    'Live music': 'Live music nights',
    Rooftop: 'Rooftop views',
    'Instagram-worthy': 'Picture-worthy',
  };
  return map[vibe] ?? `${vibe} spot`;
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Rank a list by match score, highest first. */
export function rankByMatch(list: Restaurant[], ctx: RecommendationContext): Restaurant[] {
  return [...list]
    .map((r) => ({ r, match: matchScore(r, ctx) }))
    .sort((a, b) => b.match.score - a.match.score)
    .map(({ r }) => r);
}

export function topMatches(
  list: Restaurant[],
  ctx: RecommendationContext,
  count: number,
): Array<{ restaurant: Restaurant; match: MatchResult }> {
  return [...list]
    .map((r) => ({ restaurant: r, match: matchScore(r, ctx) }))
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, count);
}

/** Distinctive discovery lists derived from the data (best genuine rating). */
export function hiddenGems(list: Restaurant[]): Restaurant[] {
  return [...list]
    .filter((r) => effectiveRating(r) >= 4.5 && effectiveReviewCount(r) < 800)
    .sort((a, b) => effectiveRating(b) - effectiveRating(a));
}

export function worthTheTrip(list: Restaurant[]): Restaurant[] {
  return [...list]
    .filter((r) => effectiveRating(r) >= 4.4 && effectiveReviewCount(r) >= 800)
    .sort((a, b) => effectiveRating(b) - effectiveRating(a));
}

export function kolkataClassics(list: Restaurant[]): Restaurant[] {
  return list.filter((r) => r.vibes.includes('Heritage')).sort((a, b) => b.khabo.rating - a.khabo.rating);
}

/**
 * Smart "Surprise me": filters the pool by the chosen mode, then picks the
 * highest-scoring option with a little controlled variety.
 */
export function surprisePick(
  pool: Restaurant[],
  ctx: RecommendationContext,
  mode: SurpriseMode,
): { restaurant: Restaurant; match: MatchResult; label: string } {
  let candidates = pool;
  let label = 'A lucky pick for you';

  if (mode === 'nearby') {
    if (ctx.location) {
      candidates = [...pool].sort(
        (a, b) => distanceKm(ctx.location!, a) - distanceKm(ctx.location!, b),
      );
      label = 'Close to you';
    }
  } else if (mode === 'under500') {
    candidates = pool.filter((r) => r.priceForTwo > 0 && r.priceForTwo <= 500);
    label = `Under ${formatCurrency(500)} for two`;
  } else if (mode === 'tonight') {
    candidates = pool.filter((r) => r.mealTypes.includes('Dinner') && isOpenNow(r.openingHours));
    label = 'Open for dinner tonight';
  }

  if (candidates.length === 0) candidates = pool;

  const ranked = topMatches(candidates, ctx, Math.min(8, candidates.length));
  const pick = ranked[Math.floor(Math.random() * Math.min(3, ranked.length))];
  return { ...pick, label };
}

/** Convenience: build a context whose intent comes from a DiningIntent. */
export function contextFromIntent(
  intent: DiningIntent,
  extra?: Partial<RecommendationContext>,
): RecommendationContext {
  return {
    favorites: [],
    recentlyViewed: [],
    preferredCuisines: [],
    vegPref: 'any',
    intent,
    ...extra,
  };
}

export type { DiningIntent, MatchReason };
