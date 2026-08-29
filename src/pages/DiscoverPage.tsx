import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  ArrowRight,
  Search,
  Sparkles,
  Dices,
  Heart,
  Users,
  Clock,
  Moon,
  Banknote,
  PartyPopper,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRestaurants } from '../hooks/useRestaurants';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { useReveal } from '../hooks/useReveal';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { surprisePick } from '../hooks/useRecommendations';
import type { RecommendationContext } from '../domain/recommendation';
import { collections } from '../hooks/useCollections';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantImage from '../components/RestaurantImage';
import BandHead from '../components/BandHead';
import SearchBar from '../components/SearchBar';
import { SkeletonGrid } from '../components/Skeleton';
import { usePageTitle } from '../lib/usePageTitle';
import { Button } from '../components/ui';
import type { Restaurant } from '../types';

/**
 * `/discover` — the exploration console.
 *
 * Before Phase C this page was a second homepage: the same hero shape, the same
 * heading-over-tiles rhythm, and a "Surprise me" button that was a plain link
 * to `/explore` and picked nothing at all.
 *
 * The three discovery routes now have distinct jobs:
 *   `/`         emotional front door — inspiration, curation, one great pick
 *   `/discover` deliberate exploration — the full taxonomy, measured, browsable
 *   `/explore`  the filter surface — facets, sorting, map, results
 *
 * So this page opens with a working header rather than a hero: search, a real
 * surprise pick, live counts of what the catalogue actually holds, and a jump
 * index. Everything below is denser and more index-like than the homepage —
 * moods over real photography, every cuisine with its share of the catalogue,
 * areas with their genuine cuisine mix — and it ends by handing off to
 * `/explore` explicitly instead of leaving the boundary to be guessed.
 */

function leadPhoto(restaurant: Restaurant | undefined) {
  return restaurant ? selectRestaurantPhotos(restaurant, 'card').photos[0] : undefined;
}

/**
 * Moods. The `to` targets are unchanged — those query shapes already work on
 * `/explore`.
 *
 * `pick` exists only to choose representative cover photography: a venue that
 * genuinely fits the mood, from recorded fields. It deliberately does *not*
 * drive a count on the card. Most of these targets are free-text searches, so
 * a predicate count would not equal what the link actually returns, and
 * `vibes`/`mealTypes` are sparsely recorded across the catalogue — "1 place"
 * next to Date night would describe our field coverage, not the city.
 */
const MOODS: Array<{
  label: string;
  sub: string;
  to: string;
  icon: LucideIcon;
  pick: (r: Restaurant) => boolean;
}> = [
  {
    label: 'Date night',
    sub: 'Quieter rooms, better lighting',
    to: '/explore?q=date%20night',
    icon: Heart,
    pick: (r) => r.vibes.includes('Date night') || r.vibes.includes('Rooftop'),
  },
  {
    label: 'Family dinner',
    sub: 'Room for everyone',
    to: '/explore?family=1',
    icon: Users,
    pick: (r) => r.isFamilyFriendly || r.vibes.includes('Family'),
  },
  {
    label: 'Quick lunch',
    sub: 'In and out on a work day',
    to: '/explore?mealType=Lunch',
    icon: Clock,
    pick: (r) => r.mealTypes.includes('Lunch'),
  },
  {
    label: 'Late night',
    sub: 'Still serving when you finish',
    to: '/explore?q=late%20night',
    icon: Moon,
    pick: (r) => r.vibes.includes('Late-night') || r.vibes.includes('Nightlife'),
  },
  {
    label: 'Budget friendly',
    sub: 'Good food, gentle bill',
    to: '/explore?budget=Budget',
    icon: Banknote,
    pick: (r) => r.budget === 'Budget',
  },
  {
    label: 'Celebration',
    sub: 'When the evening matters',
    to: '/explore?q=celebration',
    icon: PartyPopper,
    pick: (r) => r.vibes.includes('Live music') || r.budget === 'Premium' || r.budget === 'Luxury',
  },
];

const QUICK_ACTIONS: { label: string; to: string; icon: LucideIcon }[] = [
  { label: 'Top rated', to: '/explore?sortBy=rating', icon: Sparkles },
  { label: 'Open now', to: '/explore?openNow=1&sortBy=distance', icon: Search },
  { label: 'Hidden gems', to: '/explore?q=hidden%20gems', icon: Compass },
];

/** The facets `/explore` actually offers — named so the handoff is concrete. */
const EXPLORE_FACETS = [
  'Cuisine',
  'Neighbourhood',
  'Budget',
  'Rating',
  'Open now',
  'Distance',
  'Veg / non-veg',
  'Delivery',
  'Outdoor seating',
  'Family friendly',
  'Vibe',
  'Meal time',
];

export default function DiscoverPage() {
  const { status, data } = useRestaurants();
  const { favoriteIds } = useFavorites();
  const { recentIds } = useRecentlyViewed();
  const { user } = useAuth();
  const geo = useGeolocation();
  const navigate = useNavigate();
  usePageTitle('Discover');

  /* Scroll reveal for the whole page. The console header's `.dsc-head__inner`
     is deliberately not matched — it is the first thing on screen. */
  const revealRef = useReveal<HTMLElement>({ targets: '.band__inner' });

  // Mobile-only visibility cap for the cuisine index; see the button
  // below. Desktop ignores this entirely — the list stays complete there,
  // which is what the note on `cuisineRows` intends.
  const [cuisinesOpen, setCuisinesOpen] = useState(false);

  const restaurants = useMemo(() => data ?? [], [data]);

  // Every cuisine we hold, biggest first. The old page cut this to twelve;
  // exploration is exactly where the full list belongs.
  const cuisineRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) for (const c of r.cuisines) counts.set(c, (counts.get(c) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [restaurants]);

  const maxCuisineCount = cuisineRows[0]?.[1] ?? 1;

  const areaRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of restaurants) if (r.location) counts.set(r.location, (counts.get(r.location) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [restaurants]);

  const byId = useMemo(() => new Map(restaurants.map((r) => [r.id, r])), [restaurants]);

  const preferences = useMemo(() => {
    const derived = derivePreferences(favoriteIds, recentIds);
    return mergeProfileIntoPreferences(derived, user?.profile);
  }, [favoriteIds, recentIds, user?.profile]);

  const previewGuides = collections.slice(0, 4);

  /**
   * A real surprise pick, using the same recommendation engine the homepage
   * uses. It was previously a link to `/explore`, which surprised nobody.
   */
  const roll = () => {
    if (restaurants.length === 0) return;
    const ctx: RecommendationContext = {
      location: geo.reference,
      favorites: restaurants.filter((r) => favoriteIds.includes(r.id)),
      recentlyViewed: recentIds
        .map((id) => byId.get(id))
        .filter((r): r is Restaurant => Boolean(r)),
      preferredCuisines: preferences.preferredCuisines,
      preferredBudget: preferences.preferredBudget,
      vegPref: preferences.vegPref,
      preferredNeighbourhoods: user?.profile.neighbourhoods,
      diningInterests: user?.profile.diningInterests,
    };
    const pick = surprisePick(restaurants, ctx, 'any');
    navigate(`/restaurant/${pick.restaurant.id}`);
  };

  return (
    <main ref={revealRef}>
      {/* ---------- The console header ---------- */}
      <section className="dsc-head">
        <div className="dsc-head__inner">
          <span className="hero-c__eyebrow">
            <Compass size={14} aria-hidden="true" /> Explore Dhaka
          </span>
          <h1 className="dsc-head__title">
            Browse the <em>whole city</em>
          </h1>
          <p className="dsc-head__lede">
            The catalogue, laid out. Start from a mood, a cuisine or a neighbourhood — or search
            directly when you already know the name.
          </p>

          <div className="dsc-head__tools">
            <div className="dsc-head__search">
              <SearchBar variant="hero" restaurants={restaurants} />
            </div>
            {/* `unavailable`, not `disabled`. A roll with no catalogue behind
                it cannot succeed, but `disabled` would drop the page's loudest
                control out of the tab order entirely while it loads, so a
                keyboard user would find nothing there and be told nothing.
                This stays reachable and says why. */}
            <Button
              variant="primary"
              size="lg"
              icon={Dices}
              onClick={roll}
              unavailable={restaurants.length === 0}
              unavailableReason="Still loading the city's restaurants — one moment."
            >
              Surprise me
            </Button>
          </div>

          <div className="dsc-index">
            <a href="#moods" className="dsc-index__item">
              <Sparkles size={14} aria-hidden="true" /> Moods
            </a>
            <a href="#cuisines" className="dsc-index__item">
              <Compass size={14} aria-hidden="true" /> Cuisines
            </a>
            <a href="#areas" className="dsc-index__item">
              <MapPin size={14} aria-hidden="true" /> Areas
            </a>
            <a href="#guides" className="dsc-index__item">
              <ArrowRight size={14} aria-hidden="true" /> Guides
            </a>
          </div>

          {/* Live counts — the taxonomy, measured, not claimed. */}
          <div className="dsc-counts">
            <span>
              <strong>{restaurants.length}</strong> restaurants
            </span>
            <span>
              <strong>{cuisineRows.length}</strong> cuisines
            </span>
            <span>
              <strong>{areaRows.length}</strong> areas
            </span>
            <span>
              <strong>{collections.length}</strong> guides
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Moods, over real photography ---------- */}
      <section className="band band--tight" id="moods">
        <div className="band__inner">
          <BandHead
            eyebrow="Not sure yet?"
            title="Start from a mood"
            lede="Choose how you want to eat and we'll take it from there."
          />
          <div className="dsc-moods">
            {MOODS.map(({ label, sub, to, icon: Icon, pick }, i) => {
              // A fitting venue for the cover where one is recorded; otherwise
              // any venue, spread across the catalogue so the six cards differ.
              // The card names no restaurant, so the photo makes no claim.
              const cover = restaurants.find(pick) ?? restaurants[i * 7];
              return (
                <Link key={label} to={to} className="mood-card">
                  <div className="mood-card__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={label} width={480} />}
                  </div>
                  <span className="mood-card__icon">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <div className="mood-card__body">
                    <strong className="mood-card__label">{label}</strong>
                    <span className="mood-card__sub">{sub}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- The cuisine index ---------- */}
      {cuisineRows.length > 0 && (
        <section className="band band--ruled" id="cuisines">
          <div className="band__inner">
            <BandHead
              eyebrow="What are you craving?"
              title="Every cuisine we hold"
              lede="The full index, ranked by how much depth the city actually has in each kitchen."
              action={{ label: 'Filter on Explore', to: '/explore' }}
            />
            <div
              id="dsc-cuisine-index"
              className="dsc-cuisines"
              data-collapsed={cuisinesOpen ? 'false' : 'true'}
            >
              {cuisineRows.map(([c, count]) => {
                const cover = restaurants.find((r) => r.cuisines.includes(c));
                return (
                  <Link key={c} to={`/cuisine/${encodeURIComponent(c)}`} className="cuisine-row">
                    <div className="cuisine-row__thumb">
                      <RestaurantImage source={leadPhoto(cover)} name={c} width={120} fallback="monogram" />
                    </div>
                    <div className="cuisine-row__main">
                      <span className="cuisine-row__name">{c}</span>
                      <span className="cuisine-row__bar" aria-hidden="true">
                        <i style={{ '--pct': Math.round((count / maxCuisineCount) * 100) } as CSSProperties} />
                      </span>
                    </div>
                    <span className="cuisine-row__count">
                      {count} place{count === 1 ? '' : 's'}
                    </span>
                  </Link>
                );
              })}
            </div>
            {/* Every row above is always in the DOM; only its visibility is
                capped, and only by CSS at ≤820px. This button is likewise
                hidden on desktop by CSS rather than by a viewport check,
                because the app prerenders its routes — a `window.innerWidth`
                branch here would bake one device's answer into the HTML for
                every device.

                Which is also why this is the one disclosure Phase 2d did not
                move onto the `Disclosure` primitive: the rows it reveals are
                its *siblings*, uncapped by a `nth-child` rule rather than
                shown by a panel, so there is no panel to own. What it was
                missing is the wiring, and that it can have: `aria-controls`
                names the list, so "expanded" now says what expanded. */}
            {cuisineRows.length > 8 && (
              <button
                type="button"
                className="dsc-cuisines__more"
                onClick={() => setCuisinesOpen((v) => !v)}
                aria-expanded={cuisinesOpen}
                aria-controls="dsc-cuisine-index"
              >
                {cuisinesOpen ? 'Show fewer cuisines' : `Show all ${cuisineRows.length} cuisines`}
                <ChevronDown size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* ---------- Areas ---------- */}
      {areaRows.length > 0 && (
        <section className="band band--ruled" id="areas">
          <div className="band__inner">
            <BandHead
              eyebrow="Where in the city?"
              title="Browse by area"
              lede="Dhaka eats by neighbourhood — each card shows the cuisine mix actually recorded there."
            />
            <div className="areas">
              {areaRows.map(([n, count]) => {
                const inArea = restaurants.filter((r) => r.location === n);
                const cover = inArea[0];
                const mix = Array.from(new Set(inArea.flatMap((r) => r.cuisines))).slice(0, 4);
                return (
                  <Link key={n} to={`/area/${encodeURIComponent(n)}`} className="area-card">
                    <div className="area-card__media">
                      {cover && <RestaurantImage source={leadPhoto(cover)} name={n} width={560} />}
                    </div>
                    <div className="area-card__body">
                      <span className="area-card__count">
                        {count} place{count === 1 ? '' : 's'}
                      </span>
                      <strong className="area-card__name">
                        <MapPin size={16} aria-hidden="true" /> {n}
                      </strong>
                      {mix.length > 0 && <span className="area-card__cuisines">{mix.join(' · ')}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Guides ---------- */}
      <section className="band band--ruled" id="guides">
        <div className="band__inner">
          <BandHead
            eyebrow="Curated shortlists"
            title="Guides"
            lede="Editorially curated lists for a mood, a moment or a craving — every guide is built from real data."
            action={{ label: 'View all guides', to: '/guides' }}
          />
          {status === 'loading' && !data ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="mosaic">
              {previewGuides.map((c, i) => {
                const cover = byId.get(c.coverRestaurantId);
                return (
                  <Link key={c.slug} to={`/guides/${c.slug}`} className="mosaic__card">
                    <div className="mosaic__media">
                      {cover && <RestaurantImage source={leadPhoto(cover)} name={c.title} width={480} />}
                    </div>
                    <span className="mosaic__index">{String(i + 1).padStart(2, '0')}</span>
                    <div className="mosaic__body">
                      <strong className="mosaic__title">{c.title}</strong>
                      <span className="mosaic__count">
                        View guide <ArrowRight size={12} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- The explicit handoff to the filter surface ---------- */}
      <section className="band band--tight">
        <div className="band__inner">
          <div className="dsc-handoff">
            <div>
              <h2>
                Know exactly what you want? <br />
                Filter it on Explore.
              </h2>
              <p>
                Discover is for browsing. Explore is the filter surface — facets, sorting, the map
                and every result in one place.
              </p>
              <div className="dsc-handoff__facets">
                {EXPLORE_FACETS.map((f) => (
                  <span key={f} className="dsc-handoff__facet">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="dsc-handoff__actions">
              <Button variant="primary" size="lg" to="/explore" icon={SlidersHorizontal}>
                Open Explore
              </Button>
              {QUICK_ACTIONS.map(({ label, to, icon }) => (
                <Button key={label} variant="ghost" to={to} icon={icon}>
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
