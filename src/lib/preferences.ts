import type { Budget } from '../types';
import { restaurantService } from '../services/restaurantService';
import { parseNaturalLanguage } from './nlSearch';

const STORAGE_KEY = 'khabo-kothay:preferences';

export interface UserPreferences {
  recentSearches: string[];
  /** cuisines learned from favourites, recent views and searches */
  preferredCuisines: string[];
  preferredBudget?: Budget;
  vegPref: 'any' | 'veg' | 'nonveg';
}

const MAX_SEARCHES = 8;

export function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserPreferences>;
      return {
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches : [],
        preferredCuisines: Array.isArray(parsed.preferredCuisines) ? parsed.preferredCuisines : [],
        preferredBudget: parsed.preferredBudget,
        vegPref: parsed.vegPref ?? 'any',
      };
    }
  } catch {
    // ignore corrupt storage
  }
  return { recentSearches: [], preferredCuisines: [], vegPref: 'any' };
}

function persist(prefs: UserPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage unavailable — preferences just won't persist
  }
}

export function recordSearch(term: string): UserPreferences {
  const prefs = loadPreferences();
  const trimmed = term.trim();
  if (!trimmed) return prefs;
  const next: UserPreferences = {
    ...prefs,
    recentSearches: [trimmed, ...prefs.recentSearches.filter((s) => s !== trimmed)].slice(0, MAX_SEARCHES),
  };
  // Learn cuisine/budget signals from the search text itself.
  const parsed = parseNaturalLanguage(trimmed);
  if (parsed.cuisine && !next.preferredCuisines.includes(parsed.cuisine)) {
    next.preferredCuisines = [...next.preferredCuisines, parsed.cuisine].slice(0, 5);
  }
  if (parsed.budget) next.preferredBudget = parsed.budget;
  if (parsed.vegOnly) next.vegPref = 'veg';
  if (parsed.nonVegOnly) next.vegPref = 'nonveg';
  persist(next);
  return next;
}

/**
 * Recompute preference signals from concrete interactions (favourites and
 * recently viewed restaurants).
 */
export function derivePreferences(favoriteIds: string[], recentIds: string[]): UserPreferences {
  const prefs = loadPreferences();
  const all = restaurantService.getAllSync();
  const liked = [...new Set([...favoriteIds, ...recentIds])]
    .map((id) => all.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const cuisineCount = new Map<string, number>();
  for (const r of liked) {
    for (const c of r.cuisines) cuisineCount.set(c, (cuisineCount.get(c) ?? 0) + 1);
  }
  const preferredCuisines = [...cuisineCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  const budgetCount = new Map<Budget, number>();
  for (const r of liked) budgetCount.set(r.budget, (budgetCount.get(r.budget) ?? 0) + 1);
  const preferredBudget = [...budgetCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? prefs.preferredBudget;

  const vegCount = liked.reduce((acc, r) => (r.isVeg ? acc + 1 : acc - 1), 0);
  const vegPref: UserPreferences['vegPref'] =
    liked.length >= 2 ? (vegCount >= liked.length - 1 ? 'veg' : vegCount <= -1 * (liked.length - 1) ? 'nonveg' : 'any') : prefs.vegPref;

  const next: UserPreferences = { ...prefs, preferredCuisines, preferredBudget, vegPref };
  persist(next);
  return next;
}

export function clearPreferences() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}

/**
 * Merge a signed-in user's explicit profile with behaviour-derived
 * preferences. The profile is the stronger signal — it is the user telling
 * us what they like, rather than us inferring it from actions.
 */
export function mergeProfileIntoPreferences(
  prefs: UserPreferences,
  profile: { cuisines: string[]; budget?: string; diet: string; neighbourhoods: string[] } | null | undefined,
): UserPreferences {
  if (!profile) return prefs;
  const next: UserPreferences = { ...prefs };
  if (profile.cuisines.length > 0) {
    next.preferredCuisines = [...new Set([...profile.cuisines, ...prefs.preferredCuisines])].slice(0, 5);
  }
  if (profile.budget) next.preferredBudget = profile.budget as Budget;
  if (profile.diet === 'veg') next.vegPref = 'veg';
  else if (profile.diet === 'nonveg') next.vegPref = 'nonveg';
  return next;
}
