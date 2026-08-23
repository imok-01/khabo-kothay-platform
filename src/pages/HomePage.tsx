import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Dices, MapPin, ArrowRight, Star, Utensils, HeartHandshake, Wallet, History, BadgePercent, Sparkles, UserRound } from 'lucide-react';
import { CUISINES, NEIGHBORHOODS } from '../hooks/useTaxonomy';
import type { Restaurant } from '../types';
import type { MatchResult, RecommendationContext, SurpriseMode } from '../domain/recommendation';
import { topMatches, surprisePick, hiddenGems, worthTheTrip, hasPersonalizationSignals } from '../hooks/useRecommendations';
import { usePageTitle } from '../lib/usePageTitle';
import { formatCurrency } from '../lib/format';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useRestaurants } from '../hooks/useRestaurants';
import { useGeolocation } from '../hooks/useGeolocation';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { useAuth } from '../context/AuthContext';
import { distanceKm } from '../lib/geo';
import { isOpenNow } from '../lib/openHours';
import { getAllOffers, OFFERS_ENABLED } from '../hooks/useOffers';
import { collections } from '../hooks/useCollections';
import { effectiveRating } from '../lib/ratings';
import { selectRestaurantPhotos } from '../lib/photos';
import RestaurantCard from '../components/RestaurantCard';
import SearchBar from '../components/SearchBar';
import RestaurantImage from '../components/RestaurantImage';
import SectionHeading from '../components/SectionHeading';
import DiscoveryBuilder from '../components/DiscoveryBuilder';
import QuickShortcuts from '../components/QuickShortcuts';
import FetchError from '../components/FetchError';
import { SkeletonGrid } from '../components/Skeleton';

export default function HomePage() {
  const { status, data, reload } = useRestaurants();
  const { favoriteIds } = useFavorites();
  const { recentIds, clearRecent } = useRecentlyViewed();
  const { user } = useAuth();
  const geo = useGeolocation();
  usePageTitle();

  const [surpriseMode, setSurpriseMode] = useState<SurpriseMode>('any');
  const [surprise, setSurprise] = useState<{ restaurant: Restaurant; match: MatchResult; label: string } | null>(null);

  // Direct search entry (with autocomplete) is provided by <SearchBar/> below.
  // It reuses the existing /search system — no new search logic. Pre-fills from
  // the URL so a user returning with ?q= sees their term.
  const [searchParams] = useSearchParams();

  const preferences = useMemo(() => {
    const derived = derivePreferences(favoriteIds, recentIds);
    return mergeProfileIntoPreferences(derived, user?.profile);
  }, [favoriteIds, recentIds, user?.profile]);

  const restaurants = useMemo(() => data ?? [], [data]);

  // All hooks must run before any early return.
  const offers = useMemo(() => {
    const seen = new Set<string>();
    return getAllOffers()
      .filter((o) => {
        if (seen.has(o.restaurantId)) return false;
        seen.add(o.restaurantId);
        return true;
      })
      .slice(0, 4);
  }, []);

  const openNearby = useMemo(() => {
    if (restaurants.length === 0) return [];
    return [...restaurants]
      .filter((r) => isOpenNow(r.openingHours))
      .sort((a, b) => distanceKm(geo.reference, a) - distanceKm(geo.reference, b))
      .slice(0, 4);
  }, [restaurants, geo.reference]);

  /** Lead photo for any restaurant — real Google photos with graceful fallback. */
  const leadPhoto = (r: Restaurant | undefined) => (r ? selectRestaurantPhotos(r, 'card').photos[0] : undefined);

  if (status === 'error') {
    return (
      <main className="section">
        <div className="section__inner"><FetchError onRetry={reload} /></div>
      </main>
    );
  }

  const favs = restaurants.filter((r) => favoriteIds.includes(r.id));
  const recents = recentIds.map((id) => restaurants.find((r) => r.id === id)).filter((r): r is Restaurant => Boolean(r));

  const ctx: RecommendationContext = {
    location: geo.reference,
    favorites: favs,
    recentlyViewed: recents,
    preferredCuisines: preferences.preferredCuisines,
    preferredBudget: preferences.preferredBudget,
    vegPref: preferences.vegPref,
    preferredNeighbourhoods: user?.profile.neighbourhoods,
    diningInterests: user?.profile.diningInterests,
  };

  const personalized = hasPersonalizationSignals(ctx);

  const recommended = topMatches(restaurants, ctx, 4);

  const gems = hiddenGems(restaurants);
  const trip = worthTheTrip(restaurants).slice(0, 4);

  // Average of the best genuine rating we hold (community first, Google fallback).
  const avgRating =
    restaurants.length > 0
      ? (restaurants.reduce((sum, r) => sum + effectiveRating(r), 0) / restaurants.length).toFixed(1)
      : '–';

  const rollSurprise = (mode: SurpriseMode) => {
    if (restaurants.length === 0) return;
    setSurpriseMode(mode);
    setSurprise(surprisePick(restaurants, ctx, mode));
  };

  const personalizedTitle =
    preferences.preferredCuisines.length > 0
      ? `Because you like ${preferences.preferredCuisines[0]}`
      : favoriteIds.length > 0
        ? 'Recommended for you'
        : 'Popular right now';

  const cuisineImage = (c: string) => {
    const r = restaurants.find((x) => x.cuisines.includes(c));
    return leadPhoto(r);
  };

  return (
    <main>
      {/* Hero */}
      <section className="hero">
        <div className="hero__inner">
          <span className="hero__eyebrow"><Utensils size={14} aria-hidden="true" /> Dhaka's food finder</span>
          <h1 className="hero__title">
            Khabo <em>Kothay?</em>
          </h1>
          <p className="hero__subtitle">
            Search by dish, restaurant or area — or tell us what you're craving and we'll guide you.
          </p>
            <SearchBar variant="hero" restaurants={restaurants} initialQuery={searchParams.get('q') ?? ''} />
          <p className="hero__guided">…or refine your discovery:</p>
          <DiscoveryBuilder restaurants={restaurants} geo={{ status: geo.status, reference: geo.reference, request: geo.request }} />
          <QuickShortcuts />
          <dl className="hero__stats">
            <div><dt>{restaurants.length > 0 ? `${restaurants.length}+` : '–'}</dt><dd>restaurants</dd></div>
            <div><dt>{NEIGHBORHOODS.length}</dt><dd>neighbourhoods</dd></div>
            <div><dt>{CUISINES.length}</dt><dd>cuisines</dd></div>
            <div><dt>{avgRating}★</dt><dd>avg. rating</dd></div>
          </dl>
        </div>
      </section>

      {/* Surprise me — smart modes */}
      <section className="section">
        <div className="section__inner">
          {surprise ? (
            <div className="surprise">
              <div className="surprise__art">
                <RestaurantImage source={leadPhoto(surprise.restaurant)} name={surprise.restaurant.name} width={420} />
              </div>
              <div className="surprise__body">
                <span className="surprise__label"><Dices size={13} aria-hidden="true" /> {surprise.label}</span>
                <h2>How about <em>{surprise.restaurant.name}</em>?</h2>
                <p>
                  {[surprise.restaurant.cuisines.join(' · '), surprise.restaurant.location || 'Dhaka'].filter(Boolean).join(' · ')} · <Star size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {effectiveRating(surprise.restaurant).toFixed(1)}
                  {surprise.match.reasons[0] ? ` · ${surprise.match.reasons[0].label}` : ''}
                </p>
                <div className="surprise__actions">
                  <Link to={`/restaurant/${surprise.restaurant.id}`} className="btn btn--primary">See this place</Link>
                  <button type="button" className="btn btn--ghost" onClick={() => rollSurprise(surpriseMode)}>Roll again</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="cta">
              <h2>Can't decide where to eat?</h2>
              <p>Pick a mood — we'll find a strong match, not a random one.</p>
              <div className="surprise__actions" style={{ justifyContent: 'center' }}>
                <button type="button" className="btn btn--primary btn--lg" onClick={() => rollSurprise('any')}>
                  <Dices size={16} aria-hidden="true" /> Surprise me
                </button>
                <button type="button" className="btn btn--ghost btn--lg" onClick={() => rollSurprise('nearby')}>Nearby</button>
                <button type="button" className="btn btn--ghost btn--lg" onClick={() => rollSurprise('under500')}>Under {formatCurrency(500)}</button>
                <button type="button" className="btn btn--ghost btn--lg" onClick={() => rollSurprise('tonight')}>Tonight</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recently viewed — a light horizontal strip, not a full result grid */}
      {recents.length > 0 && (
        <section className="section">
          <div className="section__inner">
            <SectionHeading eyebrow="Pick up where you left off" title="Recently viewed" action={{ label: 'Clear', to: '/explore', onClick: clearRecent }} />
            <div className="scroller">
              {recents.slice(0, 6).map((r) => (
                <RestaurantCard key={r.id} restaurant={r} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recommended */}
      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading
            eyebrow={preferences.preferredCuisines.length > 0 ? 'Personalised for you' : 'The city agrees'}
            title={personalizedTitle}
            lede={preferences.preferredCuisines.length > 0 ? 'Ranked for your taste, budget and usual haunts — with honest reasons for every match.' : 'The most-loved tables across Dhaka right now.'}
            action={{ label: 'See all', to: '/discover' }}
          />
          {status === 'loading' && restaurants.length === 0 ? (
            <SkeletonGrid count={4} />
          ) : (
            <div className="grid">
              {recommended.map(({ restaurant, match }, i) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} match={match} personalized={personalized} distanceKm={distanceKm(geo.reference, restaurant)} variant={i === 0 ? 'featured' : 'standard'} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Open near you — only when recorded hours actually give us an open venue */}
      {status === 'ready' && openNearby.length > 0 && (
        <section className="section">
          <div className="section__inner">
            <SectionHeading
              eyebrow="Happening right now"
              title={geo.status === 'ready' ? 'Open near you' : 'Open now across Dhaka'}
              lede="Live opening status from recorded hours — swipe to browse the tables you can sit at this minute."
              action={{ label: 'Explore open places', to: '/explore?openNow=1&sortBy=distance' }}
            />
            <div className="scroller">
              {openNearby.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} distanceKm={distanceKm(geo.reference, r)} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Today's offers — hidden unless real, verified offers are enabled */}
      {OFFERS_ENABLED && offers.length > 0 && (
        <section className="section section--tint">
          <div className="section__inner">
            <SectionHeading eyebrow="Limited-time demo deals" title="Today's offers" lede="Clear terms, validity and demo-only labelling — never a vague 'special offer'." action={{ label: 'Browse offers', to: '/explore' }} />
            <div className="offers-strip">
              {offers.map((o) => {
                const r = restaurants.find((x) => x.id === o.restaurantId);
                if (!r) return null;
                return (
                  <Link key={o.id} to={`/restaurant/${r.id}#offers`} className="offer-card">
                    <div className="offer-card__media">
                      <RestaurantImage source={leadPhoto(r)} name={r.name} width={220} />
                    </div>
                    <div>
                      <span className="offer-card__tag">{o.discountLabel}</span>
                      <h3 className="offer-card__title">{o.title}</h3>
                      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>{r.name} · {r.location}</p>
                      <p className="offer-card__terms">{o.validity} · Demo offer</p>
                      <span className="offer-card__link">View offer →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Hidden gems */}
      {gems.length > 0 && (
        <section className="section">
          <div className="section__inner">
            <SectionHeading
              eyebrow="Off the beaten path"
              title="Hidden gems"
              lede="Highly rated, quietly loved — the tables the algorithms usually miss."
              action={{ label: 'Explore all', to: '/explore?sortBy=rating' }}
            />
            <div className="grid">
              {gems.slice(0, 4).map((r) => (
                <RestaurantCard key={r.id} restaurant={r} distanceKm={distanceKm(geo.reference, r)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Worth the trip */}
      {trip.length > 0 && (
        <section className="section section--tint">
          <div className="section__inner">
            <SectionHeading
              eyebrow="Farther, but worth it"
              title="Worth the trip"
              lede="A little out of the way, unusually strong — worth crossing the city for."
              action={{ label: 'All highly rated', to: '/guides' }}
            />
            <div className="grid">
              {trip.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} distanceKm={distanceKm(geo.reference, r)} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Collections */}
      <section className="section">
        <div className="section__inner">
          <SectionHeading eyebrow="Curated for Dhaka" title="Collections" lede="Editorial lists built from real data — first dates, late nights, comfort food and the classics." action={{ label: 'Browse guides', to: '/guides' }} />
          <div className="collection-grid">
            {collections.map((c) => {
              const cover = restaurants.find((r) => r.id === c.coverRestaurantId);
              const count = restaurants.filter(c.match).length;
              return (
                  <Link key={c.slug} to={`/guides/${c.slug}`} className="collection-card">
                  <div className="collection-card__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={c.title} width={560} />}
                  </div>
                  <div className="collection-card__body">
                    <h3>{c.title}</h3>
                    <p>{c.description}</p>
                    <span className="collection-card__count">{count} {count === 1 ? 'place' : 'places'} <ArrowRight size={13} aria-hidden="true" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cuisines */}
      <section className="section section--tint">
        <div className="section__inner">
          <SectionHeading eyebrow="What are you craving?" title="Browse by cuisine" lede="Every kitchen in the city, one craving at a time." action={{ label: 'All cuisines', to: '/explore' }} />
          <div className="tile-grid tile-grid--cuisines">
            {CUISINES.filter((c) => restaurants.some((r) => r.cuisines.includes(c)))
              .map((c) => ({ c, count: restaurants.filter((r) => r.cuisines.includes(c)).length }))
              .sort((a, b) => b.count - a.count)
              .map(({ c, count }, i) => (
                <Link
                  key={c}
                  to={`/cuisine/${encodeURIComponent(c)}`}
                  className={`tile ${i === 0 ? 'tile--featured' : ''}`}
                >
                  <div className="tile__media">
                    <RestaurantImage source={cuisineImage(c)} name={c} width={i === 0 ? 320 : 160} fallback="monogram" />
                  </div>
                  <div className="tile__body">
                    <strong>{c}</strong>
                    <span>{count} place{count === 1 ? '' : 's'}</span>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* Neighbourhoods */}
      <section className="section">
        <div className="section__inner">
          <SectionHeading eyebrow="Pick a neighbourhood" title="Where in the city?" lede="From Gulshan's fine dining to Banani's late-night bites." action={{ label: 'All locations', to: '/explore' }} />
          <div className="tile-grid tile-grid--neighbourhoods">
            {NEIGHBORHOODS.map((n) => {
              const inArea = restaurants.filter((r) => r.location === n);
              const cover = inArea[0];
              return (
                <Link key={n}                   to={`/area/${encodeURIComponent(n)}`} className="tile tile--location">
                  <div className="tile__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={n} width={160} fallback="monogram" />}
                  </div>
                  <div className="tile__body">
                    <strong><MapPin size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {n}</strong>
                    <span>{inArea.length} place{inArea.length === 1 ? '' : 's'} to eat</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Khabo Kothay? — the actual product mechanisms, not marketing fluff */}
      <section className="section why-khabo">
        <div className="section__inner">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">How discovery works here</span>
              <h2>Why Khabo Kothay?</h2>
            </div>
            <p className="section-heading__lede">Not another restaurant listing. A smarter way to decide where to eat.</p>
          </div>
          <div className="why-khabo__grid">
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><HeartHandshake size={18} aria-hidden="true" /></span>
              <h3>Personal matches</h3>
              <p>Your taste, budget, location and preferences shape your recommendations — with honest reasons for every match.</p>
            </div>
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><Wallet size={18} aria-hidden="true" /></span>
              <h3>Budget-honest</h3>
              <p>Find places based on what you'll actually spend, not vague price labels.</p>
            </div>
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><History size={18} aria-hidden="true" /></span>
              <h3>Price history</h3>
              <p>See recorded dish prices before trusting a discount — based on real observations, never invented data.</p>
            </div>
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><BadgePercent size={18} aria-hidden="true" /></span>
              <h3>Offer context</h3>
              <p>Understand what an offer actually includes, with clear terms and useful pricing context.</p>
            </div>
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><Sparkles size={18} aria-hidden="true" /></span>
              <h3>Vibe-matched</h3>
              <p>Date night, family dinner, quick lunch or late-night craving — discover places suited to the occasion.</p>
            </div>
            <div className="why-khabo__block">
              <span className="why-khabo__icon"><UserRound size={18} aria-hidden="true" /></span>
              <h3>Personal food profile</h3>
              <p>Your preferences help Khabo Kothay make better recommendations — and your matches get sharper as you use it.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
