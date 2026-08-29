import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  X,
  MapPin,
  List,
  Map as MapIcon,
  Sparkles,
} from 'lucide-react';
import { BUDGET_LABEL, type Budget } from '../types';
import { filterRestaurants, uncoveredFilters, type FilterCriteria } from '../lib/filter';
import { isPointerMotion } from '../lib/pointerIntent';
import { sortRestaurants } from '../lib/recommendations';
import { parseNaturalLanguage } from '../lib/nlSearch';
import { distanceKm } from '../lib/geo';
import { formatCurrency, pluralize } from '../lib/format';
import { MARKET } from '../lib/market';
import { usePageTitle } from '../lib/usePageTitle';
import { useRestaurants } from '../hooks/useRestaurants';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { track } from '../lib/analytics';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { hasPersonalizationSignals, matchScore } from '../hooks/useRecommendations';
import type { DiningIntent, RecommendationContext } from '../domain/recommendation';
import { isWithinBounds, type MapBounds } from '../map/areas';
import RestaurantCard from '../components/RestaurantCard';
import MapView from '../components/MapView';
import EmptyState from '../components/EmptyState';
import FetchError from '../components/FetchError';
import { SkeletonCard } from '../components/Skeleton';
import MoodRail from '../components/explore/MoodRail';
import RefineDrawer from '../components/explore/RefineDrawer';
import { Select } from '../components/ui';

/**
 * EXPLORE — the dining map.
 *
 * The state contract is unchanged and deliberately so: every control on this
 * page writes a URL param, the URL is the only source of truth, and
 * `criteria` / `intent` / `recCtx` / `results` are the same derivations the
 * previous version ran. A shared link, a back button and a refresh all still
 * land on the same page.
 *
 * What changed is the shape. Before, the page was a permanent twelve-group
 * filter sidebar beside a grid, with the map as a third column you toggled into.
 * Now it is three layers:
 *
 *   1. a masthead that says where you are and what you are looking at;
 *   2. a console — one conversational field, a measured mood rail, and the trail
 *      of what you have asked for so far;
 *   3. a stage — results beside the atlas, the two of them synchronised by
 *      `activeId` in both directions.
 *
 * The filters did not go away; they moved into `RefineDrawer`, which is summoned
 * and carries a live count on every option. Nothing was removed: all twenty URL
 * params are still reachable, and `uncoveredFilters` still explains an empty
 * result rather than shrugging at it.
 *
 * Sorting note: `effectiveSort` and the match-ranked branch are untouched. The
 * "recommended" order only becomes a match ranking when something real backs it
 * — a personal signal or an explicit craving — which is also the condition for
 * showing a score on a card or a pin.
 */

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Best match' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'distance', label: 'Nearest first' },
  { value: 'price-low', label: 'Gentlest on the wallet' },
  { value: 'price-high', label: 'Most indulgent' },
  { value: 'popularity', label: 'Most talked about' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

/**
 * Cards past this index stop staggering — every one after it enters with the
 * ninth card. 8 steps of the 40ms the CSS uses is 320ms of spread, which is
 * the ceiling the motion spec puts on any stagger (§5 rule 4). It was 12 steps
 * of 42ms before, i.e. 504ms of spread on top of each card's own 420ms rise.
 */
const STAGGER_CAP = 8;

/**
 * A highlight, and where it came from.
 *
 * `activeId` used to be a bare string and that was the bug behind the scroll
 * jitter. The list and the map both write it, but the two want different things
 * from it: a pin click means "take me to that card", a hover means nothing more
 * than "this one, while I am pointing at it". With the provenance thrown away,
 * the effect that scrolls the chosen card into view could not tell the two
 * apart and so it ran for hovers too — and a hover that scrolls the page moves
 * other cards under the cursor, which is another hover, which scrolls again. It
 * fought the user's own scrolling for the same pixels.
 *
 * `from` is what closes that loop. It also decides whether the atlas opens its
 * preview card, which is a mount, an image request and a decode that has no
 * business happening because a cursor passed overhead.
 */
interface Highlight {
  id: string;
  from: 'map' | 'list';
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'list' | 'map'>('list');
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const activeId = highlight?.id ?? null;
  /**
   * Only a map-originated highlight opens the atlas preview and rings the card.
   * A hovered card needs neither: it is under the cursor, already answering with
   * its own hover, and its pin lights up on the map — which is the whole point
   * of the list-to-map direction. Restricting these two to pin clicks is what
   * keeps a pointer crossing the grid from re-rendering any card at all.
   */
  const previewId = highlight?.from === 'map' ? highlight.id : null;
  /** committed "search this area" viewport — filters the list and map together */
  const [mapArea, setMapArea] = useState<MapBounds | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const atlasRef = useRef<HTMLElement>(null);
  const { status, data, reload } = useRestaurants();
  const { favoriteIds } = useFavorites();
  const { user } = useAuth();
  const geo = useGeolocation();
  usePageTitle('Explore restaurants');

  // While the refine sheet is open, lock body scroll and allow Escape.
  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFiltersOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [filtersOpen]);

  const query = params.get('q') ?? '';
  const location = params.get('location') ?? '';
  const budget = params.get('budget') ?? '';
  const cuisine = params.get('cuisine') ?? '';
  const specialty = params.get('specialty') ?? '';
  const mealType = params.get('mealType') ?? '';
  const veg = params.get('veg') ?? '';
  const openNow = params.get('openNow') === '1';
  const maxPrice = params.get('maxPrice') ?? '';
  const outdoor = params.get('outdoor') === '1';
  const delivery = params.get('delivery') === '1';
  const vibe = params.get('vibe') ?? '';
  const ratingFloor = params.get('rating') ?? '';
  const partySize = params.get('partySize') ?? '';
  const dining = params.get('dining') ?? '';
  const distanceParam = params.get('distance') ?? '';
  const availability = (params.get('availability') as 'open' | 'soon' | 'later') ?? '';
  const family = params.get('family') === '1';
  const quiet = params.get('quiet') === '1';
  const sortBy = (params.get('sortBy') as SortKey) || 'recommended';

  /**
   * Applies a filter value to the URL. `closeDrawer` exists because the mobile
   * sheet used to close on every discrete selection; the refine sheet now shows
   * live counts and a live result tally, so it stays open while you work and
   * closes on its own button instead.
   */
  const setParam = (key: string, value: string, closeDrawer = false) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    if (closeDrawer) setFiltersOpen(false);
    // Pilot measurement — don't fire on free-text query keystrokes
    // (those are captured separately as search_submitted on Enter).
    if (key !== 'q') {
      if (key === 'sortBy') track('sort_changed', { value });
      else track('filter_applied', { key, value });
    }
  };

  const setQueryValue = (value: string) => setParam('q', value.trim(), false);

  // Natural-language interpretation of the raw search text.
  const parsed = useMemo(() => parseNaturalLanguage(query), [query]);

  // "near me" flips the default sort to distance.
  const effectiveSort: SortKey = sortBy === 'recommended' && parsed.nearMe ? 'distance' : sortBy;

  const criteria = useMemo<FilterCriteria>(() => {
    const c: FilterCriteria = {
      query: parsed.query || undefined,
      location,
      budget,
      cuisine,
      specialty,
      mealType,
      vegOnly: veg === '1',
      nonVegOnly: veg === '0',
      openNow,
      maxPriceForTwo: maxPrice ? Number(maxPrice) : undefined,
      outdoorSeating: outdoor,
      delivery,
      vibe,
      familyFriendly: family,
      quiet,
      availability: availability || undefined,
      minRating: ratingFloor ? Number(ratingFloor) : undefined,
      withinKm: distanceParam ? Number(distanceParam) : undefined,
      origin: distanceParam && geo.reference ? geo.reference : undefined,
    };
    // Explicit URL filters win; parsed terms fill the gaps.
    if (!c.location && parsed.location) c.location = parsed.location;
    if (!c.budget && parsed.budget) c.budget = parsed.budget;
    if (!c.cuisine && parsed.cuisine) c.cuisine = parsed.cuisine;
    if (!c.mealType && parsed.mealType) c.mealType = parsed.mealType;
    if (!veg && parsed.vegOnly) c.vegOnly = true;
    if (!veg && parsed.nonVegOnly) c.nonVegOnly = true;
    if (!openNow && parsed.openNow) c.openNow = true;
    if (!maxPrice && parsed.maxPriceForTwo !== undefined) c.maxPriceForTwo = parsed.maxPriceForTwo;
    if (!outdoor && parsed.outdoorSeating) c.outdoorSeating = true;
    if (!delivery && parsed.delivery) c.delivery = true;
    if (!vibe && parsed.vibe) c.vibe = parsed.vibe;
    return c;
  }, [parsed, location, budget, cuisine, specialty, mealType, veg, openNow, maxPrice, outdoor, delivery, vibe, ratingFloor, family, quiet, availability, distanceParam, geo.reference]);

  /** True once we have a usable origin — gates distance rings and "Near me". */
  const geoReady = Boolean(geo.reference);

  /**
   * Raw URL values keyed by param name.
   *
   * The mood rail and the refine sheet decide what is "on" from this rather
   * than from `criteria`, deliberately: `criteria` has already absorbed the
   * natural-language guesses, so a chip driven by it would light up for a word
   * the visitor typed rather than a choice they made — and clicking it to turn
   * it off would then appear to do nothing.
   */
  const values = useMemo(
    () => ({
      q: query,
      location,
      budget,
      cuisine,
      specialty,
      mealType,
      veg,
      openNow: openNow ? '1' : '',
      maxPrice,
      outdoor: outdoor ? '1' : '',
      delivery: delivery ? '1' : '',
      vibe,
      rating: ratingFloor,
      partySize,
      dining,
      distance: distanceParam,
      availability: availability || '',
      family: family ? '1' : '',
      quiet: quiet ? '1' : '',
      sortBy,
    }),
    [query, location, budget, cuisine, specialty, mealType, veg, openNow, maxPrice, outdoor, delivery, vibe, ratingFloor, partySize, dining, distanceParam, availability, family, quiet, sortBy],
  );

  // Personalisation: behaviour-derived signals merged with the signed-in
  // user's explicit profile. Drives both the "recommended" sort and the
  // per-card match reasons.
  const prefs = useMemo(
    () => mergeProfileIntoPreferences(derivePreferences(favoriteIds, []), user?.profile),
    [favoriteIds, user?.profile],
  );

  // Structured dining intent — built from the current search state so the
  // hero and filters feel like "what I want" rather than a raw query.
  const intent: DiningIntent = useMemo(
    () => ({
      cuisine: criteria.cuisine || undefined,
      specialty: (criteria.specialty as DiningIntent['specialty']) || undefined,
      location: criteria.location || undefined,
      budget: (criteria.budget as Budget | undefined) || undefined,
      mealType: criteria.mealType || undefined,
      vibe: (criteria.vibe as DiningIntent['vibe']) || undefined,
      diet: veg === '1' ? 'veg' : veg === '0' ? 'nonveg' : undefined,
      partySize: partySize || undefined,
      dining: (dining as DiningIntent['dining']) || undefined,
      availability: (availability as DiningIntent['availability']) || undefined,
      openNow: criteria.openNow || undefined,
      query: criteria.query,
    }),
    [criteria, veg, partySize, dining, availability],
  );

  const intentActive =
    Boolean(intent.cuisine || intent.specialty || intent.budget || intent.location || intent.mealType || intent.vibe || intent.diet || intent.partySize || intent.dining || intent.availability || intent.openNow || intent.query);

  const recCtx: RecommendationContext = useMemo(
    () => ({
      location: geo.reference,
      favorites: [],
      recentlyViewed: [],
      preferredCuisines: prefs.preferredCuisines,
      preferredBudget: prefs.preferredBudget,
      vegPref: prefs.vegPref,
      preferredNeighbourhoods: user?.profile.neighbourhoods,
      diningInterests: user?.profile.diningInterests,
      intent,
    }),
    [geo.reference, prefs, user?.profile, intent],
  );

  const personalized = hasPersonalizationSignals(recCtx);

  /**
   * Filtering, ranking and the cards' reasons used to be one memo, and it paid
   * for the same answer three times over.
   *
   * `matchScore` is the expensive call on this page — it runs `intelligence(r)`,
   * tokenises the query and lowercases seven fields per venue — and it was being
   * made from inside the sort comparator. A comparator runs O(n log n) times, so
   * ranking 206 venues asked for roughly 1,600 scores to order 206 of them, and
   * then `matches` below computed every one of those 206 a second time for the
   * cards. Split in three, each venue is scored exactly once and both the order
   * and the reasons read the same map.
   *
   * The numbers are untouched: `matchScore` is pure over `(restaurant, context)`,
   * so a cached score is the same score, and comparing cached values orders the
   * list identically.
   */
  const filtered = useMemo(() => {
    if (!data) return [];
    const base = filterRestaurants(data, criteria);
    return mapArea ? base.filter((r) => isWithinBounds(r, mapArea)) : base;
  }, [data, criteria, mapArea]);

  // Per-restaurant match reasons for the cards — and the ranking key below.
  // `null`, not an empty map, when we have neither a real user nor a real
  // craving: that is what tells the pins and the cards to claim nothing.
  const matches = useMemo(() => {
    if (!personalized && !intentActive) return null;
    const map = new Map<string, ReturnType<typeof matchScore>>();
    for (const r of filtered) map.set(r.id, matchScore(r, recCtx));
    return map;
  }, [filtered, personalized, intentActive, recCtx]);

  const results = useMemo(() => {
    // Rank by match when we have either a real user or a real craving.
    if (effectiveSort === 'recommended' && matches) {
      return [...filtered].sort(
        (a, b) => (matches.get(b.id)?.score ?? 0) - (matches.get(a.id)?.score ?? 0),
      );
    }
    return sortRestaurants(filtered, effectiveSort, geo.reference);
  }, [filtered, matches, effectiveSort, geo.reference]);

  /**
   * The same scores, flattened for the atlas.
   *
   * `undefined` rather than an empty map when a match is not meaningful: that
   * is what tells the pins to stay unlabelled. A pin that reads "0 match" when
   * we simply have nothing to go on would be a claim we cannot back — the same
   * rule the cards already follow.
   */
  const scores = useMemo(() => {
    if (!matches) return undefined;
    const map = new Map<string, number>();
    matches.forEach((m, id) => map.set(id, m.score));
    return map;
  }, [matches]);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const r of data) map.set(r.id, distanceKm(geo.reference, r));
    return map;
  }, [data, geo.reference]);

  // Scroll the selected card into view when the highlight comes from the map —
  // and ONLY then. `from` is the guard; without it this ran on hover, and a
  // hover that scrolls is a hover that hands the cursor a different card.
  useEffect(() => {
    if (!highlight || highlight.from !== 'map' || mapMode === 'map') return;
    cardRefs.current.get(highlight.id)?.scrollIntoView({ block: 'nearest' });
  }, [highlight, mapMode]);

  /**
   * The map writes highlights; so does the list. These are stable so that
   * `MapView` — and through it the Leaflet surface — is not handed new
   * callbacks on every render of this page.
   */
  const highlightFromMap = useCallback((id: string | null) => {
    setHighlight(id ? { id, from: 'map' } : null);
  }, []);

  /**
   * Entering is gated on the pointer having genuinely moved. Chrome re-hit-tests
   * while the page scrolls, so a cursor left resting over the grid is served a
   * stream of `pointerenter` events as cards slide beneath it — and each one of
   * those was a page state change and a repaint of every marker on the map,
   * charged to the scroll's frame budget. See lib/pointerIntent.
   */
  const highlightFromList = useCallback((id: string, e: ReactPointerEvent) => {
    if (e.pointerType === 'touch' || !isPointerMotion(e)) return;
    setHighlight({ id, from: 'list' });
  }, []);

  const clearFromList = useCallback((id: string) => {
    setHighlight((h) => (h && h.id === id && h.from === 'list' ? null : h));
  }, []);

  // Below 900 the stage shows one surface at a time, and the atlas is a normal
  // block that sits under the masthead and the console — so asking for the map
  // has to bring the map to the eye. Without this you tap Map and nothing
  // appears to happen: the frame is a screen further down, and the List and
  // Refine buttons that float at its foot are below the fold with it. Measured
  // at 768: the frame started at y=454 in a 1024-tall viewport.
  useEffect(() => {
    if (mapMode !== 'map') return;
    if (!window.matchMedia('(max-width: 899px)').matches) return;
    atlasRef.current?.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  }, [mapMode]);

  const activeFilters = [
    query && { key: 'q', label: `“${query}”` },
    location && { key: 'location', label: location },
    budget && { key: 'budget', label: BUDGET_LABEL[budget as Budget] ?? budget },
    cuisine && { key: 'cuisine', label: cuisine },
    specialty && { key: 'specialty', label: specialty },
    mealType && { key: 'mealType', label: mealType },
    veg === '1' && { key: 'veg', label: 'Pure veg' },
    veg === '0' && { key: 'veg', label: 'Non-veg' },
    openNow && { key: 'openNow', label: 'Open now' },
    maxPrice && { key: 'maxPrice', label: `Under ${formatCurrency(Number(maxPrice))} for two` },
    outdoor && { key: 'outdoor', label: 'Outdoor seating' },
    delivery && { key: 'delivery', label: 'Delivery' },
    vibe && { key: 'vibe', label: vibe },
    partySize && { key: 'partySize', label: partySize === '1' ? '1 person' : partySize === '2' ? '2 people' : `${partySize} people` },
    dining && { key: 'dining', label: dining === 'delivery' ? 'Delivery' : 'Dine-in' },
    distanceParam && { key: 'distance', label: `Within ${distanceParam} km` },
    availability && { key: 'availability', label: availability === 'open' ? 'Open now' : availability === 'soon' ? 'Opening soon' : 'Open later today' },
    family && { key: 'family', label: 'Family friendly' },
    quiet && { key: 'quiet', label: 'Quiet' },
    ratingFloor && { key: 'rating', label: `${ratingFloor}★ and up` },
    mapArea && { key: '__area', label: 'This area' },
    parsed.understood.length > 0 && { key: '__nl', label: 'Smart search' },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearAll = () => {
    setParams({}, { replace: true });
    setMapArea(null);
    setFiltersOpen(false);
  };

  const geoLabel =
    geo.status === 'ready'
      ? 'Using your location'
      : geo.status === 'locating'
        ? 'Locating…'
        : geo.status === 'denied'
          ? 'Location unavailable · Retry'
          : geo.status === 'unavailable'
            ? 'Location not supported'
            : 'Use my location';

  // Contextual alternatives when nothing matches — data-driven, not generic.
  const suggestions = useMemo(() => {
    if (!data) return [];
    const popular = [...data]
      .sort((a, b) => b.khabo.reviewCount - a.khabo.reviewCount)
      .flatMap((r) => r.cuisines)
      .reduce<{ cuisine: string; count: number }[]>((acc, c) => {
        const found = acc.find((x) => x.cuisine === c);
        if (found) found.count += 1;
        else acc.push({ cuisine: c, count: 1 });
        return acc;
      }, [])
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return [
      ...(query ? [{ label: 'Search all restaurants', to: '/explore' }] : []),
      ...popular.map((p) => ({ label: p.cuisine, to: `/explore?cuisine=${encodeURIComponent(p.cuisine)}` })),
      { label: 'Browse everything', to: '/explore' },
    ].slice(0, 4);
  }, [data, query]);

  // Structured filters that exclude everything on their own — surfaced so an
  // empty result explains WHY (e.g. a vibe no venue has yet) rather than a
  // vague "no matches".
  const uncovered = useMemo(() => (data ? uncoveredFilters(data, criteria) : []), [data, criteria]);

  const loading = status === 'loading' && !data;

  /** A settled empty result — not the blank moment before the data arrives. */
  const nothingFound = !loading && results.length === 0;

  /**
   * The dead end, written four ways.
   *
   * "No matches found" was one headline for four different situations, and it
   * was the wrong one in three of them — a filter we have no data for is not the
   * same failure as a map pane with nothing in it, and neither is a misspelt
   * name. On the page where a diner is actually deciding, the headline is the
   * part that tells them whose problem this is and whether it is worth another
   * try, so it branches with the message rather than staying generic above it.
   *
   * Title and message are derived together, in one place, because two parallel
   * ternary chains in the JSX would eventually disagree about which case they
   * are in.
   */
  const emptyCopy = (() => {
    /* `activeFilters` carries the text query as a chip of its own, so counting
       it here would tell someone who searched a name to "drop a filter" they
       never set. Only the structured narrowing counts as something to loosen. */
    const narrowed = activeFilters.filter((f) => f.key !== 'q');
    if (uncovered.length > 0) {
      /* `uncoveredFilters` returns prose fragments written to slot in here, so
         they are joined and not re-cased — lowercasing them would turn the
         neighbourhood the catalogue gave us into "mirpur". Plurality has to
         agree too: the old string said "Remove it" while naming two filters. */
      const many = uncovered.length > 1;
      const list = many
        ? `${uncovered.slice(0, -1).join(', ')} and ${uncovered[uncovered.length - 1]}`
        : uncovered[0];
      return {
        title: many ? 'Those filters are hiding everything' : 'A filter is hiding everything',
        message: `No place we list matches ${list} yet, so ${many ? 'those filters hid' : 'that filter hid'} everything else. Remove ${many ? 'them' : 'it'}${query ? ` or search “${query}” by name` : ''} to see places.`,
      };
    }
    if (mapArea) {
      return {
        title: 'Nothing on this stretch',
        message: 'No listed place sits inside the map you are looking at. Zoom out, or drop the area to search all of Dhaka.',
      };
    }
    if (narrowed.length > 0) {
      return query
        ? {
            title: 'Not with those filters',
            message: `Nothing named “${query}” survives the filters you have set. Clear them to search the whole city by name, or drop the one you care least about.`,
          }
        : {
            title: 'No place fits all of that',
            message: 'Each filter narrows the city a little further, and together these leave nothing standing. Drop the one you care least about.',
          };
    }
    if (query) {
      return {
        title: 'Nothing came back for that',
        message: `No name, dish or neighbourhood in our guide reads like “${query}”. Check the spelling, or start from a cuisine.`,
      };
    }
    /* No query, no filters, no map pane, and still nothing — the catalogue
       itself came back empty. Rare, and not the diner's doing, so it does not
       ask them to change anything. */
    return {
      title: 'Nothing to show yet',
      message: 'The catalogue came back empty for this view. Reload the page, or start from a cuisine.',
    };
  })();

  /** The map's own title block: the neighbourhood if one is chosen. */
  const areaLabel = location || (mapArea ? 'this area' : undefined);

  const toggleMapMode = () => {
    const next = mapMode === 'list' ? 'map' : 'list';
    track('map_toggled', { mode: next });
    setMapMode(next);
  };

  return (
    <main className={`disc${loading ? ' disc--loading' : ''}`}>
      {/* A drawn wash behind the whole scene, so the page opens on paper
          rather than on a white sheet with a grid on it. */}
      <span className="disc__wash" aria-hidden="true" />

      <header className="disc__masthead">
        <span className="disc__eyebrow">{MARKET.city} · curated dining map</span>
        {/* The masthead cannot promise what the page did not deliver. With zero
            results, "Your best matches" above "0 places … ordered by how well
            they fit" reads as a product that has not noticed its own failure —
            so an empty page drops back to the open question and the standfirst
            states the fact once. It stays short deliberately: the panel below
            carries the headline for *why*, and two competing headlines is how a
            dead end starts feeling like an error page. */}
        <h1 className="disc__title">
          {(intentActive || personalized) && !nothingFound ? (
            <>Your best <em>matches</em></>
          ) : (
            <>Where should we <em>eat tonight</em>?</>
          )}
        </h1>
        <p className="disc__standfirst">
          {loading
            ? 'Drawing the city…'
            : nothingFound
              ? `Nothing fits that yet${query ? ` — “${query}”` : ''}${location ? ` in ${location}` : ''}. Loosen one thing and the city opens back up.`
              : intentActive || personalized
                ? `${results.length} ${pluralize(results.length, 'place')} for your ${intentActive ? 'craving' : 'taste'}${query ? ` — “${query}”` : ''}${location ? ` in ${location}` : ''}, ordered by how well they fit.`
                : `${results.length} ${pluralize(results.length, 'place')} across ${MARKET.city}${query ? ` for “${query}”` : ''}${location ? ` in ${location}` : ''} — ask for what you feel like, or wander the map.`}
        </p>
      </header>

      {/* THE CONSOLE — one field, a measured mood rail, and the trail of what
          has been asked for. Deliberately not sticky: the atlas is what earns
          the sticky slot on wide screens, and two competing sticky layers is
          how a page starts feeling like a dashboard again. */}
      <div className="disc__console">
        <div className="disc__ask">
          <Search size={16} className="disc__ask-icon" aria-hidden="true" />
          <input
            id="disc-search"
            className="disc__ask-input"
            type="search"
            value={query}
            onChange={(e) => setQueryValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') track('search_submitted', { query: query.trim() });
            }}
            placeholder={`Try “romantic dinner near Gulshan under ${MARKET.currencySymbol}3000”`}
            aria-label="Describe what you feel like eating"
          />
          {query && (
            <button
              type="button"
              className="disc__ask-clear"
              onClick={() => setQueryValue('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="button"
            className="disc__ask-refine"
            onClick={() => setFiltersOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Refine</span>
            {activeFilters.length > 0 && <span className="disc__ask-badge">{activeFilters.length}</span>}
          </button>
        </div>

        <MoodRail
          restaurants={data ?? []}
          criteria={criteria}
          values={values}
          onSet={setParam}
          geoReference={geo.reference}
          geoReady={geoReady}
          onRequestGeo={geo.request}
        />

        {(activeFilters.length > 0 || parsed.understood.length > 0) && (
          <div className="disc__trail">
            {parsed.understood.length > 0 && (
              <span className="disc__read" role="note">
                <Sparkles size={14} aria-hidden="true" />
                <span className="disc__read-label">Read as</span>
                {parsed.understood.map((t) => (
                  <span key={t} className="disc__read-term">{t}</span>
                ))}
              </span>
            )}
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                className="disc__tag"
                onClick={() =>
                  f.key === '__nl'
                    ? setQueryValue('')
                    : f.key === '__area'
                      ? setMapArea(null)
                      : setParam(f.key, '')
                }
                aria-label={`Remove ${f.label}`}
              >
                {f.label} <X size={12} aria-hidden="true" />
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button type="button" className="disc__tag-clear" onClick={clearAll}>
                Start over
              </button>
            )}
          </div>
        )}
      </div>

      {/* THE STAGE — results and the atlas, synchronised by `activeId` in both
          directions. `--map` only changes anything below 900px, where the two
          cannot sit side by side; above that both are always visible and the
          segmented toggle is hidden by CSS rather than by a branch here. */}
      <div className={`disc__stage disc__stage--${mapMode}`}>
        <section className="disc__results" aria-label="Results">
          <div className="disc__bar">
            <p className="disc__tally">
              {loading ? (
                <span className="disc__tally-loading">Finding places…</span>
              ) : (
                <>
                  <strong>{results.length}</strong> {pluralize(results.length, 'place')}
                  {mapArea ? ' on this stretch' : location ? ` in ${location}` : ''}
                </>
              )}
            </p>

            <div className="disc__bar-tools">
              <button
                type="button"
                className={`disc__geo${geo.status === 'ready' ? ' disc__geo--on' : ''}`}
                onClick={geo.request}
                title="Find restaurants near you"
                aria-label={geoLabel}
              >
                <MapPin size={14} aria-hidden="true" />
                <span className="disc__geo-label">{geoLabel}</span>
              </button>

              <Select<SortKey>
                value={sortBy}
                onChange={(next) => setParam('sortBy', next)}
                options={SORT_OPTIONS}
                label="Order results by"
                prefix="Order"
                // The control sits at the end of the bar, so the panel hangs
                // from the right edge rather than reaching out past the column.
                align="end"
              />

              <div className="disc__seg" role="group" aria-label="List or map">
                <button
                  type="button"
                  className={`disc__seg-btn${mapMode === 'list' ? ' disc__seg-btn--on' : ''}`}
                  onClick={() => mapMode !== 'list' && toggleMapMode()}
                  aria-pressed={mapMode === 'list'}
                >
                  <List size={14} aria-hidden="true" /> List
                </button>
                <button
                  type="button"
                  className={`disc__seg-btn${mapMode === 'map' ? ' disc__seg-btn--on' : ''}`}
                  onClick={() => mapMode !== 'map' && toggleMapMode()}
                  aria-pressed={mapMode === 'map'}
                >
                  <MapIcon size={14} aria-hidden="true" /> Map
                </button>
              </div>
            </div>
          </div>

          {status === 'error' ? (
            <FetchError onRetry={reload} />
          ) : loading ? (
            // Skeletons live in the same grid as the cards, so nothing
            // re-columns at the moment the data lands.
            <div className="disc__cards" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="disc__cards">
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className="disc__card"
                  // The stagger is an entrance, not a loop: past a dozen cards
                  // the delay would be a wait, so it caps.
                  style={{ '--i': Math.min(i, STAGGER_CAP) } as CSSProperties}
                  ref={(el) => {
                    if (el) cardRefs.current.set(r.id, el);
                    else cardRefs.current.delete(r.id);
                  }}
                  onPointerEnter={(e) => highlightFromList(r.id, e)}
                  onPointerLeave={() => clearFromList(r.id)}
                  onPointerCancel={() => clearFromList(r.id)}
                  onFocus={() => setHighlight({ id: r.id, from: 'list' })}
                >
                  <RestaurantCard
                    restaurant={r}
                    distanceKm={distances.get(r.id)}
                    match={matches?.get(r.id)}
                    personalized={personalized}
                    intentActive={intentActive}
                    highlighted={previewId === r.id}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search size={34} />}
              title={emptyCopy.title}
              message={emptyCopy.message}
              actionLabel="Clear filters"
              actionTo="/explore"
              suggestions={suggestions}
            />
          )}
        </section>

        {/* THE ATLAS — a framed object on the page, not an embed. It is sticky
            on wide screens so the map stays with the list you are reading. */}
        <aside className="disc__atlas" aria-label="Map of results" ref={atlasRef}>
          <div className="disc__atlas-frame">
            {status === 'error' ? (
              <div className="disc__atlas-error">
                <FetchError onRetry={reload} />
              </div>
            ) : (
              <MapView
                restaurants={results}
                distances={distances}
                scores={scores}
                activeId={activeId}
                previewId={previewId}
                onActiveChange={highlightFromMap}
                focusArea={location || undefined}
                areaBounds={mapArea}
                onSearchArea={(b) => setMapArea(b)}
                areaLabel={areaLabel}
              />
            )}
          </div>

          {/* Map mode on small screens hides the results bar, so the atlas
              carries its own way back to the list and into refine. */}
          <div className="disc__map-actions">
            <button type="button" className="disc__map-action" onClick={toggleMapMode}>
              <List size={16} aria-hidden="true" /> List
            </button>
            <button
              type="button"
              className="disc__map-action"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Refine
              {activeFilters.length > 0 && <span className="disc__ask-badge">{activeFilters.length}</span>}
            </button>
          </div>
        </aside>
      </div>

      <RefineDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        restaurants={data ?? []}
        criteria={criteria}
        values={values}
        onSet={setParam}
        onClear={clearAll}
        resultCount={results.length}
        activeCount={activeFilters.length}
        geoReference={geo.reference}
        geoReady={geoReady}
        onRequestGeo={geo.request}
      />
    </main>
  );
}

