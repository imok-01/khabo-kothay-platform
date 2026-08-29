import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dices,
  MapPin,
  ArrowRight,
  Star,
  Wand2,
  Clock,
  Banknote,
  RefreshCw,
} from 'lucide-react';
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
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useReveal } from '../hooks/useReveal';
import { useWheelPan } from '../hooks/useWheelPan';
import { derivePreferences, mergeProfileIntoPreferences } from '../lib/preferences';
import { useAuth } from '../context/AuthContext';
import { distanceKm } from '../lib/geo';
import { isOpenNow } from '../lib/openHours';
import { getAllOffers, OFFERS_ENABLED } from '../hooks/useOffers';
import { collections } from '../hooks/useCollections';
import { effectiveRating, effectiveReviewCount, formatCount } from '../lib/ratings';
import { selectRestaurantPhotos } from '../lib/photos';
import { priceForTwoDisplay } from '../lib/priceDisplay';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantImage from '../components/RestaurantImage';
import BandHead from '../components/BandHead';
import DiscoveryBuilder from '../components/DiscoveryBuilder';
import QuickShortcuts from '../components/QuickShortcuts';
import FetchError from '../components/FetchError';
import { SkeletonSpread } from '../components/Skeleton';
import { Button, Disclosure } from '../components/ui';

/**
 * The homepage — Dhaka's front door.
 *
 * Phase C rebuilt the page's *rhythm*, not just its styling. The old page was
 * twelve interchangeable sections on one cream ground, each a heading over a
 * four-card grid; whatever the headings said, the eye read one long scroll.
 *
 * Now the page alternates ink and paper, and every band is a different *kind*
 * of layout, so the journey has shape:
 *
 *   ink     hero — a Dhaka street at night, the question, the builder
 *   ink     plinth — the shortcuts and the catalogue's four numbers
 *   paper   decide — the "can't decide" console, with the reason for the pick
 *   ink     manifesto — the six commitments, as the promise
 *   paper   rail — recently viewed
 *   paper   spread — recommendations, one lead plus a ranked column
 *   paper   rail — open right now
 *   ink     deals — offers, where a discount can read like a headline
 *   paper   ranked — hidden gems as a numbered editorial list
 *   paper   duo — worth the trip, two full-bleed cards
 *   paper   mosaic — collections, magazine-style
 *   paper   craving — cuisines as circular photo portholes
 *   paper   areas — neighbourhoods as wide landscape cards, the close
 *
 * The manifesto moved. It used to close the page, which put a wall of ink
 * immediately above an ink footer and, worse, made the product's promise the
 * *last* thing a visitor read — long after they had decided whether to trust
 * the recommendations. At position three it answers the question the "decide"
 * console has just raised ("why should I believe that pick?"), and the page now
 * ends on somewhere to actually go.
 *
 * Every hook, recommendation call, conditional gate and honesty helper is the
 * same as before. The only data change is that sections now show *more* real
 * data (cuisine counts, review counts, area cuisine mixes), never less.
 *
 * Home is the emotional front door. `/discover` is the deliberate exploration
 * console and `/explore` is the filter surface — the three no longer overlap.
 */

/** The trust commitments. Product mechanisms, stated plainly, never features. */
const PRINCIPLES: Array<{ title: string; body: string }> = [
  {
    title: 'Personal matches, with reasons',
    body: "Your taste, budget, location and preferences shape your recommendations — and every match tells you why it scored, so you can disagree with it.",
  },
  {
    title: 'Budget-honest pricing',
    body: "Find places by what you'll actually spend. An estimate is labelled an estimate; a recorded price is labelled as recorded.",
  },
  {
    title: 'Price history you can check',
    body: 'See recorded dish prices before trusting a discount — based on real observations, never invented data.',
  },
  {
    title: 'Offers with their terms attached',
    body: 'Understand what an offer actually includes, with clear validity and pricing context instead of a vague banner.',
  },
  {
    title: 'Matched to the occasion',
    body: 'Date night, family dinner, quick lunch or a late craving — discovery understands the reason you are eating out.',
  },
  {
    title: 'A food profile that sharpens',
    body: 'The more you save and revisit, the better your matches get. Your profile is yours, and you can see what it changed.',
  },
];

export default function HomePage() {
  const { status, data, reload } = useRestaurants();
  const { favoriteIds } = useFavorites();
  const { recentIds, clearRecent } = useRecentlyViewed();
  const { user } = useAuth();
  const geo = useGeolocation();
  usePageTitle();

  /* Scroll reveal, wired once for the whole page. `.band__inner` and not the
     `<section>` on purpose: a `band--ink` section owns a full-bleed ground, and
     lifting that ground by 18px opens a cream sliver above it. Lifting only the
     content leaves the ink and the `band--ruled` hairline where they are.
     Everything already on screen at mount — the hero scene, the plinth, the
     first band — is skipped by the hook itself. */
  const revealRef = useReveal<HTMLElement>({ targets: '.band__inner' });

  /* One non-passive wheel listener on the craving strip, attached by the ref
     it returns. Declared here rather than inside the section because a hook
     cannot be called inside JSX. */
  const panCraving = useWheelPan();

  const [surpriseMode, setSurpriseMode] = useState<SurpriseMode>('any');
  const [surprise, setSurprise] = useState<{ restaurant: Restaurant; match: MatchResult; label: string } | null>(null);

  /* The six commitments are a two-column editorial spread on a desktop, where
     there is room to read them all at once. On a phone that same spread is a
     wall of text between two much livelier sections, so there they collapse to
     expandable rows — same six commitments, same copy, one open at a time. */
  const compactPrinciples = useMediaQuery('(max-width: 760px)');
  const [openPrinciple, setOpenPrinciple] = useState(0);

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
      <main className="band">
        <div className="band__inner"><FetchError onRetry={reload} /></div>
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

  /* The hero used to carry three real venues as its art — a mosaic of the best
     matches. The scene replaced them: the hero is now one illustrated Dhaka
     street at night, lit by a single lamp, and the only interactive thing in it
     is the search. Nothing was lost from the page — recommendations, gems and
     the rest still render below, where a card can be read properly. */

  /** Cuisines that actually have venues, biggest first. */
  const cuisineCounts = CUISINES.map((c) => ({
    c,
    count: restaurants.filter((r) => r.cuisines.includes(c)).length,
  }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const surpriseModes: Array<{ mode: SurpriseMode; label: string; icon: typeof Dices }> = [
    { mode: 'any', label: 'Anything good', icon: Dices },
    { mode: 'nearby', label: 'Near me', icon: MapPin },
    { mode: 'under500', label: `Under ${formatCurrency(500)}`, icon: Banknote },
    { mode: 'tonight', label: 'Open tonight', icon: Clock },
  ];

  return (
    <main ref={revealRef}>
      {/* ---------- INK: the scene ---------- */}
      {/*
        The hero is a place, not a banner. Five decorative layers build it, in
        paint order, and every one of them is `aria-hidden` — a screen reader
        gets the headline, the sentence and the search, which is the whole hero.

          __sky    the room: warm-black ground, haze, a high vignette
          __art    the restaurant, bottom-right, masked into the dark
          __lamp   the wall lantern, bracketed in from off-frame at the left
          __glow   everything the lantern does to the air, the street and the wall
          __grain  film grain, so the gradients never band

        The two photographs are the reason this reads as one image rather than
        two pasted rectangles, and each is dissolved by a different mechanism.
        The restaurant carries a real alpha channel, so its silhouette is
        already cut; what betrays a cut-out is the hard outline, and that is
        dissolved by a mask fading its top and left back into the ground. The
        lantern also carries real alpha — feathered, so no edge is a stair —
        and is composited normally rather than screened: its ironwork is meant
        to read as a dark silhouette against the night, which is what a lamp
        actually looks like from below. Only the light it throws is additive,
        and that lives entirely in __glow.
      */}
      <section className="hero-scene">
        <div className="hero-scene__sky" aria-hidden="true" />

        <div className="hero-scene__art" aria-hidden="true">
          <picture>
            <source media="(max-width: 760px)" srcSet="/images/hero/scene-900.webp" />
            <img
              src="/images/hero/scene.webp"
              alt=""
              width={1500}
              height={1520}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>

        <div className="hero-scene__lamp" aria-hidden="true">
          {/*
            One file at every width. The lantern is 26KB and is never rendered
            taller than its own 837px, so a second smaller source would save
            almost nothing and cost a request. `width`/`height` are the asset's
            true pixels, which is what reserves its box before it decodes.
          */}
          <img
            src="/images/hero/lamp-bracket.webp"
            alt=""
            width={681}
            height={837}
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="hero-scene__glow" aria-hidden="true" />
        <div className="hero-scene__grain" aria-hidden="true" />

        <div className="hero-scene__inner">
          <div className="hero-scene__copy">
            <span className="hero-scene__eyebrow">
              <span className="hero-scene__pulse" aria-hidden="true" />
              Khabo Kothay · Dhaka
            </span>
            <h1 className="hero-scene__title">
              Find where <em>your evening belongs.</em>
            </h1>
            <p className="hero-scene__lede">
              Tell us your cravings, mood, occasion &amp; budget. We&rsquo;ll help you discover
              restaurants that are just perfect for you.
            </p>

            <div className="hero-scene__console">
              <span className="hero-scene__console-label">
                <Wand2 size={14} aria-hidden="true" /> Build your search
              </span>
              <DiscoveryBuilder
                restaurants={restaurants}
                geo={{ status: geo.status, reference: geo.reference, request: geo.request }}
              />
            </div>
          </div>
        </div>
      </section>

      {/*
        The hero's ground floor. The shortcuts and the four catalogue numbers
        used to live inside the hero; the scene wants only the headline, the
        sentence and the search, so they moved one step down onto the same night
        ground. Same links, same numbers, same real data — a strip that carries
        the dark out of the scene and hands the page over to paper.
      */}
      <section className="hero-plinth">
        <div className="hero-plinth__inner">
          <QuickShortcuts />
          <dl className="hero-plinth__ledger">
            <div className="hero-plinth__stat">
              <dt>{restaurants.length > 0 ? `${restaurants.length}+` : '–'}</dt>
              <dd>restaurants</dd>
            </div>
            <div className="hero-plinth__stat">
              <dt>{NEIGHBORHOODS.length}</dt>
              <dd>neighbourhoods</dd>
            </div>
            <div className="hero-plinth__stat">
              <dt>{CUISINES.length}</dt>
              <dd>cuisines</dd>
            </div>
            <div className="hero-plinth__stat">
              <dt>{avgRating}★</dt>
              <dd>avg. rating</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* ---------- PAPER: the decision engine ---------- */}
      <section className="band band--panel">
        <div className="band__inner">
          <div className="decide">
            <div className="decide__copy">
              <span className="band-head__eyebrow">One question, answered</span>
              <h2 className="decide__title">
                Can't decide <em>where to eat?</em>
              </h2>
              <p className="decide__lede">
                Pick the constraint that matters tonight. We'll return a strong match — never a
                random one — and tell you what made it win.
              </p>
              <div className="decide__modes" role="group" aria-label="Surprise me mode">
                {surpriseModes.map(({ mode, label, icon: Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    className={`decide__mode${surprise && surpriseMode === mode ? ' decide__mode--on' : ''}`}
                    onClick={() => rollSurprise(mode)}
                  >
                    <Icon size={14} aria-hidden="true" /> {label}
                  </button>
                ))}
              </div>
            </div>

            {surprise ? (
              <div className="decide__result">
                <div className="decide__result-media">
                  <RestaurantImage source={leadPhoto(surprise.restaurant)} name={surprise.restaurant.name} width={480} />
                </div>
                <div className="decide__result-body">
                  <span className="decide__label">
                    <Dices size={14} aria-hidden="true" /> {surprise.label}
                  </span>
                  <h3 className="decide__name">{surprise.restaurant.name}</h3>
                  <div className="decide__facts">
                    <span>{surprise.restaurant.cuisines.slice(0, 2).join(' · ')}</span>
                    <span>
                      <MapPin size={14} aria-hidden="true" /> {surprise.restaurant.location || 'Dhaka'}
                    </span>
                    <span>
                      <Star size={14} aria-hidden="true" /> {effectiveRating(surprise.restaurant).toFixed(1)}
                    </span>
                    <span>
                      <Banknote size={14} aria-hidden="true" /> {priceForTwoDisplay(surprise.restaurant).label}
                    </span>
                  </div>
                  {surprise.match.reasons[0] && (
                    <p className="decide__reason">
                      <strong>Why this one:</strong> {surprise.match.reasons[0].label}
                      {surprise.match.reasons[1] ? ` · ${surprise.match.reasons[1].label}` : ''}
                    </p>
                  )}
                  <div className="decide__actions">
                    {/* `iconAfter`, because this is the one press the whole
                        roll was for — the arrow leans towards the place. */}
                    <Button variant="primary" to={`/restaurant/${surprise.restaurant.id}`} iconAfter={ArrowRight}>
                      See this place
                    </Button>
                    <Button variant="ghost" icon={RefreshCw} onClick={() => rollSurprise(surpriseMode)}>
                      Roll again
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="decide__await">
                <div className="decide__await-inner">
                  <Dices size={30} aria-hidden="true" />
                  <p>
                    Choose a constraint and we'll pick one place from the whole city — with the
                    reasoning attached.
                  </p>
                  <Button variant="primary" size="lg" icon={Dices} onClick={() => rollSurprise('any')}>
                    Surprise me
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- INK: the promise, stated early ---------- */}
      <section className="band band--ink band--manifesto">
        <div className="band__inner">
          <div className="manifesto__statement">
            <BandHead
              eyebrow="How discovery works here"
              title={<>Not a listing. A <em>reason</em> to go.</>}
              lede="Six commitments that decide what this product will and will not show you."
            />
            {/*
              The statement column runs out of copy 366px before the ledger runs
              out of commitments, and on a page about craving that hole was the
              loudest thing in the band. It holds the still life instead: a karahi
              of biryani under a plume of smoke that has taken the shape of a
              heart — the heading's claim, said once, without a caption.

              Two rasters, four layers. Only the dish and the smoke are files;
              the light behind them and the shadow under them are drawn in CSS,
              which is both smaller and better than the two rasters that came
              with them (see refine.css §7a for why). The smoke file is a
              GREYSCALE mask, not a cutout — its source was pure white at every
              pixel, so its whole image lived in the alpha channel. Carried as
              luminance on a black ground and screened onto the band, black adds
              nothing and white adds everything, which is what smoke does to
              light, and the layer can then be tinted by a gradient the file
              knows nothing about.

              Registration is not eyeballed. All four supplied assets were drawn
              on one 1620x2025 canvas, so the percentages in §7a are the measured
              alpha bounding boxes of the dish and the smoke inside their shared
              union box — the plume descends into the bowl at exactly the offset
              the art was composed with, at any width.
            */}
            <div className="manifesto-art" aria-hidden="true">
              <div className="manifesto-art__stage">
                <span className="manifesto-art__glow" />
                <span className="manifesto-art__smoke" />
                <span className="manifesto-art__cast" />
                <img
                  className="manifesto-art__dish"
                  src="/images/manifesto/dish.webp"
                  alt=""
                  width={812}
                  height={551}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
          <div className={`principles ${compactPrinciples ? 'principles--compact' : ''}`}>
            {PRINCIPLES.map((p, i) => {
              const num = String(i + 1).padStart(2, '0');
              const isOpen = openPrinciple === i;
              if (!compactPrinciples) {
                return (
                  <div key={p.title} className="principle">
                    <span className="principle__num">{num}</span>
                    <h3 className="principle__title">{p.title}</h3>
                    <p className="principle__body">{p.body}</p>
                  </div>
                );
              }
              return (
                <Disclosure
                  key={p.title}
                  className="principle"
                  variant="row"
                  ground="ink"
                  marker="plus"
                  headingLevel={3}
                  open={isOpen}
                  onToggle={() => setOpenPrinciple((current) => (current === i ? -1 : i))}
                  panelClassName="principle__panel"
                  summary={
                    <>
                      <span className="principle__num">{num}</span>
                      <span className="principle__title">{p.title}</span>
                    </>
                  }
                >
                  <p className="principle__body">{p.body}</p>
                </Disclosure>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- PAPER: pick up where you left off ---------- */}
      {recents.length > 0 && (
        <section className="band band--tight band--ruled">
          <div className="band__inner">
            <BandHead
              eyebrow="Pick up where you left off"
              title="Recently viewed"
              action={{ label: 'Clear history', onClick: clearRecent }}
            />
            <div className="rail">
              {recents.slice(0, 6).map((r) => (
                <RestaurantCard key={r.id} restaurant={r} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAPER: the recommendation spread ---------- */}
      <section className="band">
        <div className="band__inner">
          <BandHead
            eyebrow={preferences.preferredCuisines.length > 0 ? 'Personalised for you' : 'The city agrees'}
            title={personalizedTitle}
            lede={
              preferences.preferredCuisines.length > 0
                ? 'Ranked for your taste, budget and usual haunts — with honest reasons for every match.'
                : 'The most-loved tables across Dhaka right now.'
            }
            action={{ label: 'See all matches', to: '/for-you' }}
          />
          {status === 'loading' && restaurants.length === 0 ? (
            <SkeletonSpread personalized={personalized} />
          ) : (
            <div className="spread">
              {recommended[0] && (
                <RestaurantCard
                  restaurant={recommended[0].restaurant}
                  match={recommended[0].match}
                  personalized={personalized}
                  distanceKm={distanceKm(geo.reference, recommended[0].restaurant)}
                  variant="editorial"
                />
              )}
              <div className="spread__rest">
                {recommended.slice(1).map(({ restaurant, match }) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    match={match}
                    personalized={personalized}
                    distanceKm={distanceKm(geo.reference, restaurant)}
                    variant="compact"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ---------- PAPER: live, right now ---------- */}
      {status === 'ready' && openNearby.length > 0 && (
        <section className="band band--tight band--ruled">
          <div className="band__inner">
            <BandHead
              eyebrow="Happening right now"
              title={geo.status === 'ready' ? 'Open near you' : 'Open now across Dhaka'}
              lede="Live status from recorded opening hours — the tables you can sit at this minute."
              action={{ label: 'Explore open places', to: '/explore?openNow=1&sortBy=distance' }}
            />
            <div className="rail">
              {openNearby.map((r) => (
                <RestaurantCard key={r.id} restaurant={r} distanceKm={distanceKm(geo.reference, r)} variant="compact" />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- INK: today's offers ---------- */}
      {OFFERS_ENABLED && offers.length > 0 && (
        <section className="band band--ink">
          <div className="band__inner">
            <BandHead
              eyebrow="Limited-time demo deals"
              title={<>Tonight's <em>offers</em></>}
              lede="Clear terms, real validity and demo-only labelling — never a vague 'special offer'."
              action={{ label: 'Browse everything', to: '/explore' }}
            />
            <div className="deals">
              {offers.map((o) => {
                const r = restaurants.find((x) => x.id === o.restaurantId);
                if (!r) return null;
                return (
                  <Link key={o.id} to={`/restaurant/${r.id}#offers`} className="deal">
                    <div className="deal__media">
                      <RestaurantImage source={leadPhoto(r)} name={r.name} width={320} />
                      <span className="deal__tag">{o.discountLabel}</span>
                    </div>
                    <div className="deal__body">
                      <h3 className="deal__title">{o.title}</h3>
                      <span className="deal__where">
                        {r.name} · {r.location}
                      </span>
                      <p className="deal__terms">{o.validity} · Demo offer</p>
                      <span className="deal__go">
                        View offer <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAPER: hidden gems as a ranked editorial list ---------- */}
      {gems.length > 0 && (
        <section className="band">
          <div className="band__inner">
            <BandHead
              eyebrow="Off the beaten path"
              title={<>Quietly <em>brilliant</em></>}
              lede="Rated as highly as the famous names, with a fraction of the crowd. Ranked by the strongest genuine rating we hold."
              action={{ label: 'Explore all gems', to: '/explore?q=hidden%20gems' }}
            />
            <div className="ranked">
              {gems.slice(0, 5).map((r, i) => (
                <Link key={r.id} to={`/restaurant/${r.id}`} className="ranked__item">
                  <span className="ranked__num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="ranked__media">
                    <RestaurantImage source={leadPhoto(r)} name={r.name} width={240} />
                  </div>
                  <span className="ranked__body">
                    <strong className="ranked__name">{r.name}</strong>
                    <span className="ranked__meta">
                      <span>
                        <Star size={12} aria-hidden="true" /> {effectiveRating(r).toFixed(1)}
                      </span>
                      <span>{formatCount(effectiveReviewCount(r))} reviews</span>
                      <span>
                        <MapPin size={12} aria-hidden="true" /> {r.location || 'Dhaka'}
                      </span>
                      <span>{r.cuisines.slice(0, 2).join(' · ')}</span>
                    </span>
                    <span className="ranked__why">
                      {r.tagline ||
                        `${effectiveRating(r).toFixed(1)} stars across ${formatCount(effectiveReviewCount(r))} reviews — high marks, still under the radar.`}
                    </span>
                  </span>
                  <span className="ranked__go">
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAPER: worth the trip ---------- */}
      {trip.length > 0 && (
        <section className="band band--ruled">
          <div className="band__inner">
            <BandHead
              eyebrow="Farther, but worth it"
              title="Worth the trip"
              lede="A little out of the way, unusually strong — worth crossing the city for."
              action={{ label: 'All highly rated', to: '/explore?sortBy=rating' }}
            />
            <div className="duo">
              {trip.slice(0, 2).map((r) => (
                <RestaurantCard
                  key={r.id}
                  restaurant={r}
                  distanceKm={distanceKm(geo.reference, r)}
                  variant="editorial"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAPER: collections as a magazine mosaic ---------- */}
      <section className="band">
        <div className="band__inner">
          <BandHead
            eyebrow="Curated for Dhaka"
            title={<>Editorial <em>collections</em></>}
            lede="Lists built from real data — first dates, late nights, comfort food and the classics."
            action={{ label: 'Browse all guides', to: '/guides' }}
          />
          <div className="mosaic">
            {collections.map((c, i) => {
              const cover = restaurants.find((r) => r.id === c.coverRestaurantId);
              const count = restaurants.filter(c.match).length;
              return (
                <Link
                  key={c.slug}
                  to={`/guides/${c.slug}`}
                  className={`mosaic__card${i === 0 ? ' mosaic__card--lead' : i === 1 ? ' mosaic__card--wide' : ''}`}
                >
                  <div className="mosaic__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={c.title} width={i === 0 ? 800 : 480} />}
                  </div>
                  <span className="mosaic__index">{String(i + 1).padStart(2, '0')}</span>
                  <div className="mosaic__body">
                    <strong className="mosaic__title">{c.title}</strong>
                    <span className="mosaic__desc">{c.description}</span>
                    <span className="mosaic__count">
                      {count} {count === 1 ? 'place' : 'places'} <ArrowRight size={12} aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- PAPER: cuisines as a craving strip ---------- */}
      {cuisineCounts.length > 0 && (
        <section className="band band--tight band--ruled">
          <div className="band__inner">
            <BandHead
              eyebrow="What are you craving?"
              title="Start with a craving"
              lede="Every kitchen in the city, one appetite at a time."
              action={{ label: 'All cuisines', to: '/discover#cuisines' }}
            />
            {/* The row scrolls sideways and the page scrolls down, and a
                cursor over the row cannot mean both. `useWheelPan` reads a
                wheel notch as horizontal travel while the row has room and
                hands the event straight back to the page the moment it does
                not, so the end of the cuisines is not a dead zone. Touch is
                untouched: a swipe emits no wheel event, and the native
                `overflow-x` scroll it already had is better than anything
                this could imitate. */}
            <div className="craving" ref={panCraving}>
              {cuisineCounts.slice(0, 10).map(({ c, count }) => (
                <Link key={c} to={`/cuisine/${encodeURIComponent(c)}`} className="craving__item">
                  <div className="craving__media">
                    <RestaurantImage source={cuisineImage(c)} name={c} width={240} fallback="monogram" />
                  </div>
                  <span className="craving__label">{c}</span>
                  <span className="craving__count">
                    {count} place{count === 1 ? '' : 's'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- PAPER: neighbourhoods — the close ---------- */}
      <section className="band">
        <div className="band__inner">
          <BandHead
            eyebrow="Pick a neighbourhood"
            title={<>Where in <em>the city?</em></>}
            lede="Dhaka's food identity is neighbourhood-shaped — from Gulshan's fine dining to Banani's late-night bites."
            action={{ label: 'All locations', to: '/discover#areas' }}
          />
          <div className="areas">
            {NEIGHBORHOODS.map((n) => {
              const inArea = restaurants.filter((r) => r.location === n);
              const cover = inArea[0];
              // The cuisine mix is the single most useful thing an area card can
              // say, and it is real: counted from the venues we hold there.
              const mix = Array.from(new Set(inArea.flatMap((r) => r.cuisines))).slice(0, 4);
              return (
                <Link key={n} to={`/area/${encodeURIComponent(n)}`} className="area-card">
                  <div className="area-card__media">
                    {cover && <RestaurantImage source={leadPhoto(cover)} name={n} width={560} />}
                  </div>
                  <div className="area-card__body">
                    <span className="area-card__count">
                      {inArea.length} place{inArea.length === 1 ? '' : 's'} to eat
                    </span>
                    <strong className="area-card__name">{n}</strong>
                    {mix.length > 0 && <span className="area-card__cuisines">{mix.join(' · ')}</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
