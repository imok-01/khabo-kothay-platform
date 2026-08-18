import { useEffect, useMemo, useRef, useState } from 'react';
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
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import { BUDGET_LABEL, VIBES, type Budget, type MealType } from '../types';
import { filterRestaurants, uncoveredFilters, type FilterCriteria } from '../lib/filter';
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
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { hasPersonalizationSignals, matchScore } from '../hooks/useRecommendations';
import type { DiningIntent, RecommendationContext } from '../domain/recommendation';
import { SPECIALTIES } from '../domain/intelligence';
import { isWithinBounds, type MapBounds } from '../map/areas';
import RestaurantCard from '../components/RestaurantCard';
import MapView from '../components/MapView';
import EmptyState from '../components/EmptyState';
import FetchError from '../components/FetchError';
import { SkeletonGrid } from '../components/Skeleton';

const BUDGETS: Budget[] = ['Budget', 'Mid-range', 'Premium', 'Luxury'];
const MEAL_TYPES: MealType[] = ['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner', 'Dessert'];
const PRICE_CAPS = [500, 1000, 1500, 2500, 5000];
const RATING_FLOORS = [
  { value: '', label: 'Any rating' },
  { value: '4', label: '4.0 and up' },
  { value: '4.3', label: '4.3 and up' },
  { value: '4.5', label: '4.5 and up' },
];

const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'distance', label: 'Distance: near → far' },
  { value: 'price-low', label: 'Price: low → high' },
  { value: 'price-high', label: 'Price: high → low' },
  { value: 'popularity', label: 'Most reviewed' },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]['value'];

const VIBE_LABELS: Record<string, string> = { Family: 'Family friendly' };

export default function ExplorePage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'list' | 'map'>('list');
  const [activeId, setActiveId] = useState<string | null>(null);
  /** committed "search this area" viewport — filters the list and map together */
  const [mapArea, setMapArea] = useState<MapBounds | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const { status, data, reload } = useRestaurants();
  const { favoriteIds } = useFavorites();
  const { user } = useAuth();
  const geo = useGeolocation();
  usePageTitle('Explore restaurants');

  // While the mobile filter drawer is open, lock body scroll and allow Escape.
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
   * Applies a filter value to the URL. On mobile, discrete selections close
   * the filter drawer so the user immediately sees the updated results;
   * typing in the search box keeps it open (closeDrawer: false).
   */
  const setParam = (key: string, value: string, closeDrawer = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    if (closeDrawer) setFiltersOpen(false);
  };

  const setQueryValue = (value: string) => setParam('q', value.trim(), false);
  const toggleParam = (key: string, value: string) => {
    const current = params.get(key) ?? '';
    setParam(key, current === value ? '' : value);
  };

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
    }),
    [criteria, veg, partySize, dining, availability],
  );

  const intentActive =
    Boolean(intent.cuisine || intent.specialty || intent.budget || intent.location || intent.mealType || intent.vibe || intent.diet || intent.partySize || intent.dining || intent.availability || intent.openNow);

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

  const results = useMemo(() => {
    if (!data) return [];
    const filtered = filterRestaurants(data, criteria);
    const areaFiltered = mapArea ? filtered.filter((r) => isWithinBounds(r, mapArea)) : filtered;
    if (effectiveSort === 'recommended' && (personalized || intentActive)) {
      // Rank by match when we have either a real user or a real craving.
      return [...areaFiltered].sort((a, b) => matchScore(b, recCtx).score - matchScore(a, recCtx).score);
    }
    return sortRestaurants(areaFiltered, effectiveSort, geo.reference);
  }, [data, criteria, effectiveSort, geo.reference, mapArea, personalized, intentActive, recCtx]);

  // Per-restaurant match reasons for the cards.
  const matches = useMemo(() => {
    if (!personalized && !intentActive) return null;
    const map = new Map<string, ReturnType<typeof matchScore>>();
    for (const r of results) map.set(r.id, matchScore(r, recCtx));
    return map;
  }, [results, personalized, intentActive, recCtx]);

  const distances = useMemo(() => {
    const map = new Map<string, number>();
    if (!data) return map;
    for (const r of data) map.set(r.id, distanceKm(geo.reference, r));
    return map;
  }, [data, geo.reference]);

  // Scroll the selected card into view when the highlight comes from the map.
  useEffect(() => {
    if (!activeId || mapMode === 'map') return;
    cardRefs.current.get(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [activeId, mapMode]);

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

  return (
    <main className="explore">
      <div className="explore__header">
        <h1>{intentActive || personalized ? 'Your best matches' : 'Explore restaurants'}</h1>
        <p>
          {status === 'loading' && !data
            ? 'Loading places…'
            : intentActive || personalized
              ? `We found ${results.length} ${pluralize(results.length, 'place')} for your ${intentActive ? 'craving' : 'taste'}${query ? ` — “${query}”` : ''}${location ? ` in ${location}` : ''}. Ranked by how well they fit.`
              : `${results.length} ${pluralize(results.length, 'place')} across ${MARKET.city}${query ? ` for “${query}”` : ''}${location ? ` in ${location}` : ''}`}
        </p>
      </div>

      <div className="explore__layout">
        {/* Filter panel */}
        <aside className={`filters ${filtersOpen ? 'filters--open' : ''}`}>
          <div className="filters__head">
            <h2>Filters</h2>
            <div className="filters__head-actions">
              {activeFilters.length > 0 && (
                <button type="button" className="filters__clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
              <button type="button" className="filters__close" onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-search">Search</label>
            <div className="input-wrap">
              <Search size={15} aria-hidden="true" />
              <input
                id="filter-search"
                type="search"
                value={query}
                onChange={(e) => setQueryValue(e.target.value)}
                placeholder={`Try “biryani under ${MARKET.currencySymbol}500 near me”…`}
              />
            </div>
            <p className="filter-group__hint">
              Natural language works — “veg lunch with delivery”, “date night near Gulshan”.
            </p>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-location">Location</label>
            <select
              id="filter-location"
              value={location}
              onChange={(e) => setParam('location', e.target.value)}
            >
              <option value="">All neighbourhoods</option>
              {NEIGHBORHOODS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Budget (per person)</span>
            <div className="chip-row">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`chip chip--select ${budget === b ? 'chip--active' : ''}`}
                  onClick={() => toggleParam('budget', b)}
                  title={BUDGET_LABEL[b]}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-price">Max cost for two</label>
            <select
              id="filter-price"
              value={maxPrice}
              onChange={(e) => setParam('maxPrice', e.target.value)}
            >
              <option value="">No limit</option>
              {PRICE_CAPS.map((p) => (
                <option key={p} value={p}>Under {formatCurrency(p)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-rating">Rating</label>
            <select
              id="filter-rating"
              value={ratingFloor}
              onChange={(e) => setParam('rating', e.target.value)}
            >
              {RATING_FLOORS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-cuisine">Cuisine</label>
            <select
              id="filter-cuisine"
              value={cuisine}
              onChange={(e) => setParam('cuisine', e.target.value)}
            >
              <option value="">Any cuisine</option>
              {CUISINES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-specialty">Specialty</label>
            <select
              id="filter-specialty"
              value={specialty}
              onChange={(e) => setParam('specialty', e.target.value)}
            >
              <option value="">Any specialty</option>
              {SPECIALTIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="filter-group__hint">Curated "what the kitchen is known for" — verified by Khabo Kothay.</p>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Meal type</span>
            <div className="chip-row">
              {MEAL_TYPES.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip chip--select ${mealType === m ? 'chip--active' : ''}`}
                  onClick={() => toggleParam('mealType', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Diet</span>
            <div className="chip-row">
              {[
                { value: '', label: 'Any' },
                { value: '1', label: 'Pure veg' },
                { value: '0', label: 'Non-veg' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`chip chip--select ${veg === opt.value ? 'chip--active' : ''}`}
                  onClick={() => setParam('veg', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Amenities</span>
            <div className="chip-row">
              {[
                { key: 'outdoor', label: 'Outdoor seating', active: outdoor },
                { key: 'delivery', label: 'Delivery', active: delivery },
                { key: 'openNow', label: 'Open now', active: openNow },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={`chip chip--select ${opt.active ? 'chip--active' : ''}`}
                  onClick={() => toggleParam(opt.key, '1')}
                  aria-pressed={opt.active}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-group__label">Vibe</span>
            <div className="chip-row">
              {VIBES.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`chip chip--select ${vibe === v ? 'chip--active' : ''}`}
                  onClick={() => toggleParam('vibe', v)}
                >
                  {VIBE_LABELS[v] ?? v}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-group__label" htmlFor="filter-sort">Sort by</label>
            <select id="filter-sort" value={sortBy} onChange={(e) => setParam('sortBy', e.target.value)}>
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {activeFilters.length > 0 && (
            <button type="button" className="btn btn--ghost btn--block" onClick={clearAll}>
              Clear all filters
            </button>
          )}
        </aside>

        {filtersOpen && <div className="filters__scrim" onClick={() => setFiltersOpen(false)} />}

        {/* Results + map */}
        <div className="map-split">
          <div className={`explore__list-view ${mapMode === 'map' ? 'explore__list-view--hidden' : ''}`}>
            <div className="explore__toolbar">
              <div className="explore__active-filters">
                {activeFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className="chip chip--active chip--dismiss"
                    onClick={() =>
                      f.key === '__nl'
                        ? setQueryValue('')
                        : f.key === '__area'
                          ? setMapArea(null)
                          : setParam(f.key, '')
                    }
                  >
                    {f.label} <X size={11} aria-hidden="true" />
                  </button>
                ))}
                {activeFilters.length === 0 && <span className="explore__hint">Showing all restaurants</span>}
              </div>
              <div className="explore__toolbar-right">
                <button
                  type="button"
                  className={`geo-chip ${geo.status === 'ready' ? 'geo-chip--on' : ''}`}
                  onClick={geo.request}
                  title="Find restaurants near you"
                >
                  <MapPin size={13} aria-hidden="true" /> {geoLabel}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost explore__map-toggle"
                  onClick={() => {
                    const next = mapMode === 'list' ? 'map' : 'list';
                    setMapMode(next);
                    // The map panel replaces the list in the layout, so bring
                    // it into view when toggling from a scrolled position.
                    if (next === 'map') {
                      requestAnimationFrame(() => {
                        document.querySelector('.explore__map-view')?.scrollIntoView({ block: 'start' });
                      });
                    }
                  }}
                  aria-pressed={mapMode === 'map'}
                >
                  {mapMode === 'list' ? <MapIcon size={15} aria-hidden="true" /> : <List size={15} aria-hidden="true" />}
                  {mapMode === 'list' ? 'Map' : 'List'}
                </button>
                <button type="button" className="btn btn--ghost explore__filters-btn" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal size={15} aria-hidden="true" /> Filters
                </button>
              </div>
            </div>

            {parsed.understood.length > 0 && (
              <div className="nl-interpreted" role="note">
                <Sparkles size={14} className="nl-interpreted__icon" aria-hidden="true" />
                <span className="nl-interpreted__label">Understood:</span>
                {parsed.understood.map((t) => (
                  <span key={t} className="chip">{t}</span>
                ))}
                <button
                  type="button"
                  className="nl-interpreted__clear"
                  onClick={() => setQueryValue('')}
                  aria-label="Clear interpreted search"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {status === 'error' ? (
              <FetchError onRetry={reload} />
            ) : status === 'loading' && !data ? (
              <SkeletonGrid count={6} />
            ) : results.length > 0 ? (
              <div className="grid">
                {results.map((r) => (
                  <div
                    key={r.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(r.id, el);
                      else cardRefs.current.delete(r.id);
                    }}
                    onMouseEnter={() => setActiveId(r.id)}
                    onMouseLeave={() => setActiveId((id) => (id === r.id ? null : id))}
                    onFocus={() => setActiveId(r.id)}
                  >
                    <RestaurantCard
                      restaurant={r}
                      distanceKm={distances.get(r.id)}
                      match={matches?.get(r.id)}
                      personalized={personalized}
                      intentActive={intentActive}
                      highlighted={activeId === r.id}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Search size={34} />}
                title="No matches found"
                message={
                  uncovered.length > 0
                    ? `These filters aren't covered by the catalogue yet: ${uncovered.join(', ')}. Remove them to see results.`
                    : activeFilters.length > 0
                      ? 'Nothing fits that combination right now. Try loosening a filter or two.'
                      : 'Try a different search or neighbourhood.'
                }
                actionLabel="Clear filters"
                actionTo="/explore"
                suggestions={suggestions}
              />
            )}
          </div>

          <div className={`explore__map-view ${mapMode === 'map' ? 'explore__map-view--active' : ''}`}>
            {/* Mobile: the toolbar lives inside the list view, which is
                hidden in map mode — so the map view carries its own
                floating actions to return to the list / open filters. */}
            <div className="explore__map-actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setMapMode('list')}
                aria-pressed={mapMode === 'list'}
              >
                <List size={15} aria-hidden="true" />
                List
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal size={15} aria-hidden="true" />
                Filters
              </button>
            </div>
            <div className="map-panel">
              {status === 'error' ? (
                <div className="map-unavailable">
                  <FetchError onRetry={reload} />
                </div>
              ) : (
                <MapView
                  restaurants={results}
                  distances={distances}
                  activeId={activeId}
                  onActiveChange={setActiveId}
                  focusArea={location || undefined}
                  areaBounds={mapArea}
                  onSearchArea={(b) => setMapArea(b)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
