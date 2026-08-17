import { CUISINES, NEIGHBORHOODS } from '../services/taxonomyService';
import type { Budget, MealType } from '../types';
import { MARKET } from './market';

export interface ParsedSearch {
  cuisine?: string;
  location?: string;
  budget?: Budget;
  /** cost-for-two cap in BDT */
  maxPriceForTwo?: number;
  mealType?: MealType;
  vegOnly?: boolean;
  nonVegOnly?: boolean;
  openNow?: boolean;
  delivery?: boolean;
  outdoorSeating?: boolean;
  vibe?: string;
  /** hint to sort by distance from the user */
  nearMe?: boolean;
  /** leftover free text that isn't a structured term */
  query: string;
  /** human-readable terms that were understood, for the UI */
  understood: string[];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MEAL_TERMS: Array<[RegExp, MealType]> = [
  [/\bbreakfast\b/, 'Breakfast'],
  [/\bbrunch\b/, 'Brunch'],
  [/\blunch\b/, 'Lunch'],
  [/\bsnacks?\b/, 'Snacks'],
  [/\bdinner\b/, 'Dinner'],
  [/\bdesserts?\b/, 'Dessert'],
];

const VIBE_TERMS: Array<[RegExp, string]> = [
  [/\bdate\s*night\b|\bdate\b/, 'Date night'],
  [/\bnightlife\b|\bparty\b|\bclubbing\b/, 'Nightlife'],
  [/\bquiet\b|\bpeaceful\b|\bcalm\b/, 'Quiet'],
  [/\bwork[- ]?friendly\b|\blaptop\b|\bstudy\b|\bremote[- ]?work\b|\bco[- ]?working\b/, 'Work-friendly'],
  [/\bfamily\b|\bkids\b|\bchildren\b/, 'Family'],
  [/\binstagram\b|\binsta\b|\bphotogenic\b|\baesthetic\b|\bpicturesque\b/, 'Instagram-worthy'],
  [/\blate[- ]?night\b|\bafter\s+(10|11)\b/, 'Late-night'],
  [/\bheritage\b|\bvintage\b|\bclassic\b|\bhistoric\b|\bold[- ]?world\b/, 'Heritage'],
  [/\blive\s*music\b|\bjazz\b|\bmusic\b|\bband\b/, 'Live music'],
];

/**
 * Turns a free-text query like "biryani under ৳500 near Park Street tonight"
 * into structured filters plus the leftover free text. Consumed terms are
 * removed from the query so text search never double-applies them.
 */
export function parseNaturalLanguage(input: string): ParsedSearch {
  const result: ParsedSearch = { query: '', understood: [] };
  let work = ` ${input.trim().toLowerCase()} `;

  const consume = (re: RegExp, label?: string): string | undefined => {
    const m = re.exec(work);
    if (!m) return undefined;
    work = work.replace(m[0], ' ');
    if (label) result.understood.push(label);
    return m[0].trim();
  };

  // 1. Price cap: "under ৳500", "below 500", "max ৳2000", "budget of 300"
  const price = consume(
    /(?:under|below|less than|max(?:imum)?|budget of)\s*(?:৳|₹|taka|tk\.?\s*)?(\d{2,6})\b/,
  );
  if (price) {
    result.maxPriceForTwo = Number(price.match(/\d+/)?.[0]);
    result.understood.push(`under ${MARKET.currencySymbol}${result.maxPriceForTwo}`);
  }

  // 2. Neighbourhood: "near Park Street", "in Salt Lake", or bare "park street"
  const neighbourhoods = [...NEIGHBORHOODS].sort((a, b) => b.length - a.length);
  for (const n of neighbourhoods) {
    const nLow = escapeRegExp(n.toLowerCase());
    const withPrep = consume(new RegExp(`(?:near|in|at|around)\\s+${nLow}`), n);
    if (withPrep) {
      result.location = n;
      break;
    }
    const bare = consume(new RegExp(`\\b${nLow}\\b`), n);
    if (bare) {
      result.location = n;
      break;
    }
  }

  // 3. Budget tier words
  const budgetMap: Array<[RegExp, Budget]> = [
    [/\bcheap\b|\bbudget\b/, 'Budget'],
    [/\bmid[- ]?range\b|\bmoderate\b/, 'Mid-range'],
    [/\bpremium\b/, 'Premium'],
    [/\bluxury\b|\bfine[- ]?dining\b/, 'Luxury'],
  ];
  for (const [re, tier] of budgetMap) {
    if (consume(re, tier)) {
      result.budget = tier;
      break;
    }
  }

  // 4. Cuisines — longest first so "North Indian" beats "North"
  const cuisines = [...CUISINES].sort((a, b) => b.length - a.length);
  for (const c of cuisines) {
    const cLow = c.toLowerCase().replace('café', 'cafe');
    if (consume(new RegExp(`\\b${escapeRegExp(cLow)}\\b`), c)) {
      result.cuisine = c;
      break;
    }
  }

  // 5. Diet — non-veg first so "non veg" isn't split by the "veg" rule
  if (consume(/\bnon[- ]?veg(?:etarian)?\b/, 'Non-veg')) {
    result.nonVegOnly = true;
  } else if (consume(/\bpure\s*veg(?:etarian)?\b|\bvegetarian\b|\bveg\b/, 'Pure veg')) {
    result.vegOnly = true;
  }

  // 6. Meal / time
  for (const [re, meal] of MEAL_TERMS) {
    if (consume(re, meal)) {
      result.mealType = meal;
      break;
    }
  }
  if (consume(/\btonight\b/, 'Dinner')) {
    result.mealType = 'Dinner';
  }

  // 7. Open now
  if (consume(/\bopen\s*now\b|\bcurrently\s*open\b/, 'Open now')) {
    result.openNow = true;
  } else if (consume(/\bnow\b/, 'Open now')) {
    result.openNow = true;
  }

  // 8. Delivery / outdoor
  if (consume(/\bhome\s*delivery\b|\bdelivery\b|\bdelivers?\b/, 'Delivery')) {
    result.delivery = true;
  }
  if (consume(/\boutdoor\b|\bal\s*fresco\b|\bterrace\b|\bgarden\b/, 'Outdoor seating')) {
    result.outdoorSeating = true;
  }

  // 9. Vibes
  for (const [re, vibe] of VIBE_TERMS) {
    if (consume(re, vibe)) {
      result.vibe = vibe;
      break;
    }
  }
  if (consume(/\brooftop\b|\bskyline\b|\bview\b/, 'Rooftop')) {
    result.vibe = 'Rooftop';
    result.outdoorSeating = true;
  }

  // 10. Near me → distance sort
  if (consume(/\bnear\s*me\b/, 'Near you')) {
    result.nearMe = true;
  }

  result.query = work.replace(/\s+/g, ' ').trim();
  return result;
}
