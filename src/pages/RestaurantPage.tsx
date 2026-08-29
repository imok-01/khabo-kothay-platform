import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Heart,
  MapPin,
  Navigation,
  Globe,
  Check,
  BadgePercent,
  History,
  ChevronLeft,
  ThumbsUp,
  ExternalLink,
  Languages,
  Phone,
  CalendarClock,
  Flag,
  Send,
} from 'lucide-react';
import type { Restaurant } from '../types';
import { cleanAddressSegment, formatAddress, formatCurrency, isPoorAddress, pluralize } from '../lib/format';
import { recommendSimilar } from '../lib/recommendations';
import {
  formatOpeningHours,
  formatScrapedHours,
  minutesUntilOpen,
  openStateNow,
  recordedHoursHeadline,
} from '../lib/openHours';
import { priceSummary } from '../lib/priceDisplay';
import { usePageMeta } from '../lib/usePageMeta';
import { buildRestaurantMeta } from '../lib/restaurantMeta';
import { MARKET } from '../lib/market';
import { track } from '../lib/analytics';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useRestaurant } from '../hooks/useRestaurants';
import { useRestaurantMenu } from '../hooks/useRestaurantMenu';
import { useDiscoveryFacts } from '../hooks/useDiscoveryFacts';
import { useReviewSamples } from '../hooks/useReviewSamples';
import { useGeolocation } from '../hooks/useGeolocation';
import { useReveal } from '../hooks/useReveal';
import { selectRestaurantPhotos } from '../lib/photos';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { fetchOwnerImages } from '../repositories/imageUploadRepository';
import type { RestaurantImageSource } from '../domain/images';
import { dedupePhotos } from '../domain/images';
import { getOffersForRestaurant, OFFERS_ENABLED } from '../hooks/useOffers';
import { distanceKm, formatDistance } from '../lib/geo';
import { googleMapsDirectionsUrl, googleMapsReviewsUrl } from '../lib/maps';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';

import RatingStars from '../components/RatingStars';
import RatingSource from '../components/RatingSource';
import RestaurantSignals from '../components/RestaurantSignals';
import RestaurantCard from '../components/RestaurantCard';
import CustomerHighlights from '../components/CustomerHighlights';
import DiscoveryFacts from '../components/DiscoveryFacts';
import RestaurantLocationMap from '../components/RestaurantLocationMap';

import ImageGallery from '../components/ImageGallery';
import ShareButton from '../components/ShareButton';
import Provenance, { type ProvenanceLevel } from '../components/Provenance';
import EmptyState from '../components/EmptyState';
import FetchError from '../components/FetchError';
import { SkeletonDetail } from '../components/Skeleton';
import MenuSection from '../components/MenuSection';
import DishPriceHistory from '../components/DishPriceHistory';
import { priceChange } from '../lib/menu';
import type { MenuItem } from '../domain/menu';
import WriteReview from '../components/WriteReview';
import { useRestaurantDrafts } from '../hooks/useDrafts';
import { useUserReviews, upsertFlag } from '../hooks/useReviews';
import { applyApprovedDraft } from '../lib/restaurantDraft';
import { useLiveGoogle } from '../hooks/useLiveGoogle';
import { businessStatusLabel, liveOpenNowLabel, mergeLiveGoogle } from '../lib/liveGoogleView';
import { Button } from '../components/ui';

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const { status, data: restaurant, reload } = useRestaurant(id);
  const menuState = useRestaurantMenu(restaurant ?? undefined);
  const discoveryFacts = useDiscoveryFacts(restaurant?.id);
  const reviewHighlights = useReviewSamples(restaurant?.id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentlyViewed();
  const geo = useGeolocation();
  const navigate = useNavigate();
  const userReviews = useUserReviews();
  useRestaurantDrafts(); // re-render when an approved profile draft lands
  /* This page has no `__inner` wrapper, so the section itself is the target —
     safe here because `.detail__section` carries no full-bleed ground of its
     own. The aside is left out on purpose: it holds the sticky action card, and
     a card that arrives while it is also being stuck reads as a glitch. */
  const revealRef = useReveal<HTMLElement>({
    targets: '.detail__main > .detail__section, .detail__inner > .detail__section',
  });
  const [priceDish, setPriceDish] = useState<MenuItem | null>(null);
  const [requestingOrigin, setRequestingOrigin] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportDone, setReportDone] = useState(false);
  // Per-page SEO/social metadata is wired below, once gallery photos resolve.

  // Live Google data — on-demand refresh keyed by the stable Place ID. Runs
  // before any early return so the hook order stays stable.
  const liveGoogle = useLiveGoogle(restaurant?.google?.placeId);

  // Record the visit once the restaurant has loaded. The fetched object is
  // stable per id (API cache), so this fires once per restaurant.
  useEffect(() => {
    if (restaurant) addRecent(restaurant.id);
  }, [restaurant, addRecent]);

  // Pilot measurement: record a restaurant view (coarse id only, no PII).
  useEffect(() => {
    if (restaurant) track('restaurant_viewed', { id: restaurant.id });
  }, [restaurant]);

  // Gallery photos come from a source-aware selector: real Google photos →
  // Khabo Kothay community photos → clearly-labelled demo placeholders.
  const gallery = restaurant ? selectRestaurantPhotos(restaurant, 'gallery') : { photos: [], leadSource: 'demo' as const };

  // Owner-managed uploads (image_references) are appended to the public gallery
  // when a backend is configured. RLS already restricts them to the owner.
  const configured = isSupabaseConfigured();
  const [ownerPhotos, setOwnerPhotos] = useState<RestaurantImageSource[]>([]);
  useEffect(() => {
    if (!restaurant || !configured) {
      setOwnerPhotos([]);
      return;
    }
    let alive = true;
    fetchOwnerImages(restaurant.id)
      .then((rows) =>
        alive &&
        setOwnerPhotos(
          rows.map((r) => ({
            provider: 'khabo' as const,
            imageUrl: r.image_url,
            alt: `${restaurant.name} — owner photo`,
            attribution: 'Owner upload',
            license: '',
          })),
        ),
      )
      .catch(() => setOwnerPhotos([]));
    return () => {
      alive = false;
    };
  }, [restaurant, configured]);

  // `fetchOwnerImages` reads `image_references`, which is the same table the
  // transformer built `google.photos` from — so every Google photo arrives here
  // twice, once labelled "photo from Google Maps" and once "owner photo". That
  // is what made a three-photo restaurant count six and repeat each picture.
  // Deduped on the photo itself, so a genuine owner upload still appends.
  const images = dedupePhotos([...gallery.photos, ...ownerPhotos]);
  const photoSourceLabel =
    gallery.leadSource === 'google-photos'
      ? 'Photos from Google Maps'
      : gallery.leadSource === 'khabo'
        ? 'Khabo Kothay photos'
        : 'Demo photos';

  // Per-restaurant SEO + social metadata, built by the shared builder that the
  // prerender pipeline also uses (single source of truth — no drift between the
  // crawler-facing HTML and the runtime <head>). Derived only from real fields;
  // ratings are emitted only when a genuine Google review count exists.
  const pageMeta = useMemo(() => {
    if (!restaurant) return {};
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const lead = images[0]?.imageUrl;
    const image = lead && origin ? new URL(lead, origin).href : lead;
    return buildRestaurantMeta(restaurant, { origin, image });
  }, [restaurant, images]);

  usePageMeta(pageMeta);



  // Menu dishes used to connect offers to dish price context. Loaded through
  // the same async menu path as MenuSection (Supabase when configured).
  const menuDishes = useMemo(() => {
    const byName = new Map<string, MenuItem>();
    if (menuState.menu) {
      for (const c of menuState.menu.categories) for (const d of c.dishes) byName.set(d.name.toLowerCase(), d);
    }
    return byName;
  }, [menuState.menu]);

  // "Directions with my location": request the location explicitly, then open
  // navigation with it as the origin once the browser answers. If location is
  // refused, fall back to a directions link without an origin.
  useEffect(() => {
    if (!requestingOrigin) return;
    if (geo.status === 'ready') {
      setRequestingOrigin(false);
      if (restaurant) window.open(googleMapsDirectionsUrl(restaurant, geo.reference), '_blank', 'noopener');
    } else if (geo.status === 'denied' || geo.status === 'unavailable') {
      setRequestingOrigin(false);
      if (restaurant) window.open(googleMapsDirectionsUrl(restaurant), '_blank', 'noopener');
    }
  }, [requestingOrigin, geo.status, geo.reference, restaurant]);

  // Return the user to where they came from (keeping their filters) when
  // possible; fall back to the explore page for deep links / direct loads.
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/explore');
  };

  if (status === 'loading' && !restaurant) {
    return <SkeletonDetail />;
  }

  if (status === 'error' && !restaurant) {
    return (
      <main className="section">
        <div className="section__inner">
          <FetchError onRetry={reload} />
        </div>
      </main>
    );
  }

  if (!restaurant) {
    return (
      <main className="section">
        <div className="section__inner">
          <EmptyState
            icon={<MapPin size={34} />}
            title="This place isn't in our guide"
            message="It may have closed, changed its name, or simply not be listed yet. Dhaka has more worth your evening either way."
            actionLabel="Browse all restaurants"
            actionTo="/explore"
          />
        </div>
      </main>
    );
  }

  const effective = applyApprovedDraft(restaurant);
  // Display-layer merge: live Google values (rating, count, reviews, hours,
  // price level, website, phone) win over the seed; photos stay untouched.
  const googleView = mergeLiveGoogle(effective, liveGoogle.snapshot);
  const displayRestaurant: Restaurant = googleView ? { ...effective, google: googleView } : effective;
  const similar = recommendSimilar(effective, 4);
  const fav = isFavorite(effective.id);
  const businessStatus = businessStatusLabel(liveGoogle.snapshot?.businessStatus);
  const offers = getOffersForRestaurant(effective.id);
  const myReviewsHere = userReviews.filter((r) => r.restaurantId === effective.id);

  // Clean, source-verified address lines (street → area → city).
  // Priority: verified address (verification_records) > curated display
  // address (address_display ?? address) > live Google address as a last
  // resort only. The raw Google-scraped address must never override the
  // curated/verified address on the page.
  const verifiedAddress = displayRestaurant.address_verified;
  const addressLines = formatAddress({
    address: verifiedAddress || displayRestaurant.address || googleView?.address,
    location: displayRestaurant.location,
    city: displayRestaurant.city,
    isVerified: !!verifiedAddress,
  });
  // Whether the recorded address is actually usable, or a fragment / plus
  // code. This drives the address confidence level in the aside — the old
  // free-text `addressNote` is gone, because the full address lines are now
  // rendered in one place and the source is stated by a provenance badge
  // rather than by a second sentence repeating part of the address.
  const hasUsableAddress = Boolean(
    (verifiedAddress || displayRestaurant.address) &&
      !isPoorAddress(cleanAddressSegment(verifiedAddress || displayRestaurant.address || '')),
  );

  // Graceful hours display: weekly maps render per-day, single ranges render
  // one neutral row, and unparseable strings say "Hours being verified".
  // Recorded Google-scrape fragments ("Open Closes 1 am", "Closed Opens
  // 12 pm Sat") render as one honest summary row rather than being hidden.
  // The rows are rendered once, in the aside — the decision bar shows only
  // the live open/closed state, never a second copy of the schedule.
  const rawHours = googleView?.openingHours || displayRestaurant.openingHours;
  const structuredHours = formatOpeningHours(rawHours);
  const scrapedRow = formatScrapedHours(rawHours);
  const hoursRows = structuredHours ?? (scrapedRow ? [scrapedRow] : null);
  const hoursFromScrape = !structuredHours && Boolean(scrapedRow);

  // ---- Open state -------------------------------------------------------
  // The decision bar and the aside used to read DIFFERENT sources: the stat
  // took `openNowLabel(effective.openingHours)` while the aside took
  // `rawHours`. Worse, `openNowLabel` cannot parse a Google scrape fragment,
  // so on 202 of the 207 catalogue venues the bar said "Hours being verified"
  // directly above an aside printing the very hours it claimed not to have.
  //
  // Both surfaces now read `rawHours`. `openStateNow` returns a state only
  // when the string genuinely supports one (a schedule, day-aware), and
  // returns null for every scrape fragment — a fragment's "Closed" was true at
  // scrape time and says nothing about now. When there is no state to claim,
  // the stat stops posing as a live indicator and states the recorded schedule
  // instead, which is the fact the aside is showing anyway.
  const openStatus = liveOpenNowLabel(liveGoogle.snapshot, openStateNow(rawHours) ?? undefined);
  const recordedHeadline = recordedHoursHeadline(scrapedRow);
  const hoursStatLabel = openStatus ? 'Open right now' : 'Opening hours';
  const hoursStatValue =
    openStatus ??
    recordedHeadline ??
    (structuredHours ? 'Not recorded for today' : rawHours ? 'Hours being verified' : 'Hours not recorded');

  // Honest "how expensive?" summary — composes the budget tier, the verified
  // price-for-two, and the menu-derived estimate with no invented ranges.
  const priceSummaryData = priceSummary(restaurant, menuState.menu);

  const hasCommunityContent = effective.khabo.signals.length > 0 || effective.khabo.tags.length > 0;
  // Approved discovery facts render in their own section only when present;
  // the generic "Good to know" derivation has been replaced by this layer.
  const hasDiscoveryFacts = discoveryFacts.status === 'ready' && discoveryFacts.facts.length > 0;

  // Directions start from the user's location only when they've shared it;
  // otherwise Google Maps prompts for a starting point — never fake an origin.
  const directionsUrl = googleMapsDirectionsUrl(restaurant, geo.status === 'ready' ? geo.reference : undefined);
  // Website CTA only when a verified website exists (live Google data or a
  // platform-verified source). Without one we deliberately show no Website
  // button — a Google search/Maps link must never be labelled "Website".
  const websiteUrl = googleView?.website;

  const askDirections = () => {
    if (geo.status === 'ready') {
      window.open(googleMapsDirectionsUrl(restaurant, geo.reference), '_blank', 'noopener');
    } else {
      setRequestingOrigin(true);
      geo.request();
    }
  };

  // ---- Confidence levels ------------------------------------------------
  // Each level is derived strictly from how the value was obtained. Nothing
  // is upgraded for presentation: an estimate is never shown as verified,
  // and a value we merely recorded is never shown as confirmed.
  const priceProv: ProvenanceLevel | null =
    priceSummaryData.kind === 'verified' ? 'verified' : priceSummaryData.kind === 'estimated' ? 'derived' : null;
  const priceProvLabel = priceSummaryData.kind === 'verified' ? 'Verified price' : 'Estimated from menu';

  const addressProv: ProvenanceLevel = verifiedAddress ? 'verified' : hasUsableAddress ? 'recorded' : 'derived';

  // Open-now is only "live" when Google returned a current-hours payload for
  // this refresh; otherwise the status is computed from recorded hours.
  const openIsLive = Boolean(
    liveGoogle.snapshot?.currentHours && liveGoogle.snapshot.currentHours.openNow !== undefined,
  );
  const hoursProv: ProvenanceLevel = openIsLive ? 'verified' : hoursRows ? 'recorded' : 'derived';

  // Distance is shown only when the user has actually shared their location —
  // the city-centre fallback must never be presented as "from you".
  const userDistanceKm = geo.status === 'ready' ? distanceKm(geo.reference, restaurant) : null;

  // "Where" shows the neighbourhood when we have one, otherwise the city. The
  // supporting line must never restate the value above it: without a recorded
  // neighbourhood there is nothing more specific to add, so it is omitted.
  const neighbourhood = displayRestaurant.location?.trim();
  const whereValue = neighbourhood || displayRestaurant.city || MARKET.city;
  const whereSub =
    userDistanceKm !== null
      ? `${formatDistance(userDistanceKm)} from you`
      : neighbourhood
        ? displayRestaurant.city || MARKET.city
        : null;

  // "Opens in 2h 15m" for a closed venue with parseable hours. Derived, so it
  // carries the same confidence level as the hours it came from.
  //
  // Restricted to a single unambiguous window on purpose. `minutesUntilOpen`
  // leans on the unanchored `HOURS_RE`, so on a weekly map it would count down
  // to the FIRST day's opening whatever day it is — a wrong number stated with
  // confidence. `openStateNow` is day-aware and can now report "Closed now"
  // for a weekly schedule, which is exactly the case that would have exposed
  // it, so the countdown is gated to the one shape it can answer.
  const hoursAreSingleRange = structuredHours?.length === 1 && structuredHours[0].day === 'Hours';
  const untilOpenMins =
    openStatus === 'Closed now' && hoursAreSingleRange ? minutesUntilOpen(rawHours) : null;
  const opensInLabel =
    untilOpenMins && untilOpenMins > 0
      ? untilOpenMins < 60
        ? `Opens in ${untilOpenMins} min`
        : `Opens in ${Math.floor(untilOpenMins / 60)}h ${untilOpenMins % 60 > 0 ? `${untilOpenMins % 60}m` : ''}`.trim()
      : null;

  return (
    <main className="detail" ref={revealRef}>
      <div className="detail__inner">
        <button type="button" className="detail__back" onClick={goBack}>
          <ChevronLeft size={16} aria-hidden="true" /> Back
        </button>

        {/* Photo gallery — single source of truth via ImageGallery */}
        {images.length > 0 && (
          <ImageGallery
            images={images}
            restaurantName={restaurant.name}
            photoSourceLabel={photoSourceLabel}
          />
        )}

        {/* Identity */}
        <div className="detail__head">
          <div className="detail__title-row">
            <h1>{restaurant.name}</h1>
            <button
              type="button"
              className={`fav-btn fav-btn--lg ${fav ? 'fav-btn--active' : ''}`}
              onClick={() => toggleFavorite(restaurant.id)}
              aria-label={fav ? 'Remove from saved places' : 'Add to saved places'}
              aria-pressed={fav}
            >
              <Heart size={18} fill={fav ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
          {effective.tagline && <p className="detail__tagline">{effective.tagline}</p>}

          <div className="detail__rating-row">
            <RatingSource restaurant={displayRestaurant} size="md" />
            {!restaurant.vegUnknown && (
              <span className={`veg-badge ${restaurant.isVeg ? 'veg-badge--veg' : 'veg-badge--nonveg'}`}>
                {restaurant.isVeg ? 'PURE VEG' : 'NON-VEG'}
              </span>
            )}
          </div>
          {googleView && (
            <p className="detail__rating-note">
              Google ratings and Khabo Kothay ratings are independent — we never mix the two sources.
            </p>
          )}

          <div className="detail__chips">
            {restaurant.location && (
              <Link to={`/area/${encodeURIComponent(restaurant.location)}`} className="chip chip--link">
                <MapPin size={14} aria-hidden="true" /> {restaurant.location}
              </Link>
            )}
            {restaurant.cuisines.map((c) => (
              <Link key={c} to={`/cuisine/${encodeURIComponent(c)}`} className="chip chip--link">
                {c}
              </Link>
            ))}
            {restaurant.mealTypes.map((m) => (
              <Link key={m} to={`/explore?mealType=${encodeURIComponent(m)}`} className="chip chip--meal chip--link">
                {m}
              </Link>
            ))}
            {restaurant.vibes.map((v) => (
              <Link key={v} to={`/explore?vibe=${encodeURIComponent(v)}`} className="chip chip--link">
                {v === 'Family' ? 'Family friendly' : v}
              </Link>
            ))}
          </div>

          {/*
            Action hierarchy: exactly one primary. Directions is the real
            high-intent action on a discovery page, so it takes the primary
            slot and uses the geolocation-aware handler (routing from where
            the user actually is) rather than a bare link. Everything else is
            a genuine but secondary action.
          */}
          <div className="detail__actions">
            {/* `busy`, not `disabled`. Asking the browser for your location can
                take a couple of seconds, and the old control's only sign of
                life was its own label changing — invisible if you were already
                looking at the map. The primitive puts the spinner in and keeps
                the specific words, because "Getting your location…" says more
                than a spinner does. */}
            <Button
              variant="primary"
              icon={Navigation}
              busy={requestingOrigin && geo.status === 'locating'}
              onClick={askDirections}
            >
              {requestingOrigin && geo.status === 'locating' ? 'Getting your location…' : 'Get directions'}
            </Button>
            {googleView?.phone && (
              <Button variant="ghost" href={`tel:${googleView.phone}`} icon={Phone}>
                Call
              </Button>
            )}
            {websiteUrl && (
              /* Globe names the destination, `ExternalLink` names the fact that
                 pressing it leaves Khabo Kothay for a site we do not control. */
              <Button
                variant="ghost"
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                icon={Globe}
                iconAfter={ExternalLink}
              >
                Website
              </Button>
            )}
            <ShareButton
              url={`/restaurant/${restaurant.id}`}
              title={restaurant.name}
              text={restaurant.tagline || `${restaurant.cuisines.slice(0, 2).join(', ')} restaurant in ${restaurant.location || MARKET.city}`}
            />
            {/* Fallback for users who prefer a plain map link (and for
                right-click / open-in-new-tab), kept deliberately quiet. */}
            <Button
              variant="subtle"
              size="sm"
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              iconAfter={ExternalLink}
            >
              Open in Maps
            </Button>
          </div>

          {/*
            Reservations stays visible as an intentional forthcoming feature.
            It is presented as a roadmap promise rather than a disabled
            primary button: a dead CTA reads as broken and outranks the
            actions that work, which is the opposite of what this feature
            should do for trust.
          */}
          <p className="soon-strip">
            <span className="soon-strip__icon" aria-hidden="true">
              <CalendarClock size={16} />
            </span>
            <span className="soon-strip__body">
              <strong>Table reservations are coming to Khabo Kothay.</strong>{' '}
              Book a table at {restaurant.name} without leaving the app.
            </span>
            <span className="soon-strip__tag">In development</span>
          </p>

          {/*
            Decision bar — the three facts that decide whether someone goes.
            Reference detail (the full address, the weekly schedule, phone)
            lives only in the "Know before you go" aside, so each fact on
            this page has exactly one home.
          */}
          <div className="detail__stats">
            <div className="stat stat--price">
              {/*
                The figure is the money. This cell used to lead with the tier
                ("৳৳ Mid-range") and bury "About ৳1,800 for two (approx., no
                drinks)" in 13px grey underneath it, followed by a per-person
                line and a provenance badge — four stacked lines of text in a
                cell whose entire job is to answer "how much?". The number
                leads now and the tier rides beside the label as the
                qualifier it always was.
              */}
              <span className="stat__label">
                What you'll spend
                {priceSummaryData.amount && (
                  <span className="stat__tier">{priceSummaryData.tierLabel}</span>
                )}
              </span>
              <span className={`stat__value${priceSummaryData.amount ? ' stat__figure' : ''}`}>
                {priceSummaryData.amount ?? priceSummaryData.tierLabel}
              </span>
              <span className="stat__sub">
                {[
                  priceSummaryData.amountNote ?? priceSummaryData.spendLabel,
                  priceSummaryData.perPersonLabel,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
              {priceProv ? (
                <span className="stat__prov">
                  <Provenance level={priceProv} size="sm" title={priceSummaryData.evidence}>
                    {priceProvLabel}
                  </Provenance>
                </span>
              ) : (
                <span className="stat__sub">{priceSummaryData.evidence}</span>
              )}
            </div>

            <div className="stat">
              <span className="stat__label">Where</span>
              <span className="stat__value">
                <MapPin size={16} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {whereValue}
              </span>
              {whereSub && <span className="stat__sub">{whereSub}</span>}
            </div>

            <div className="stat">
              <span className="stat__label">{hoursStatLabel}</span>
              <span
                className={`stat__value${openStatus === 'Open now' ? ' stat__value--open' : openStatus === 'Closed now' ? ' stat__value--shut' : ''}`}
              >
                {openStatus && <span className="stat__pip" aria-hidden="true" />}
                {hoursStatValue}
              </span>
              {(opensInLabel || (businessStatus && businessStatus !== 'Operational')) && (
                <span className="stat__sub">
                  {[businessStatus && businessStatus !== 'Operational' ? businessStatus : null, opensInLabel]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              )}
              <span className="stat__prov">
                <Provenance
                  level={hoursProv}
                  size="sm"
                  title={
                    openIsLive
                      ? 'Live opening status from Google for this venue.'
                      : hoursRows
                        ? 'Calculated from the opening hours we have on record — confirm with the restaurant.'
                        : 'We do not have usable opening hours for this venue yet.'
                  }
                >
                  {openIsLive ? 'Live from Google' : hoursRows ? 'From recorded hours' : 'Not yet recorded'}
                </Provenance>
              </span>
            </div>
          </div>
        </div>

        <div className="detail__grid">
          <div className="detail__main">
            {/*
              "Did you know?" leads the body, ahead of the menu.

              It used to sit third. That order was right when the section was a
              grid of tick-marked bullets — an often-empty block of trivia has no
              business above the menu — but it was ranking the section by how it
              looked rather than by what it is. These are the only sentences on
              the page that were researched, sourced and approved one at a time,
              and they are the whole answer to "why this place and not the one
              next door", which is the question a reader arrives with and the
              menu cannot answer. It is also self-limiting in a way a menu is
              not: it renders nothing at all when there are no approved facts, so
              on the venues where the menu should lead, it still does.
            */}
            {hasDiscoveryFacts && (
              <section className="detail__section detail__section--dyk">
                <div className="detail__section-head">
                  <span className="detail__section-eyebrow">Beyond the listing</span>
                  <h2>Did you <em>know</em>?</h2>
                  {/* Under 56 characters on purpose — `.detail__section-sub` is
                      capped at 56ch, and the sentence this replaced wrapped to
                      leave one word alone on the second line. */}
                  <span className="detail__section-sub">
                    Approved one at a time, each from a named source.
                  </span>
                </div>
                <DiscoveryFacts facts={discoveryFacts.facts} />
              </section>
            )}

            {/*
              The menu is the single most-wanted thing on this page and used
              to sit fifth, below an often-empty "Signature dishes" block.
              It leads the body wherever there are no discovery facts to
              introduce the venue first, and the curated signature dishes are
              merged into its own Signature pane rather than pre-empting it
              with a separate section that usually had nothing to show.
            */}
            <MenuSection
              restaurant={restaurant}
              menu={menuState.menu}
              menuStatus={menuState.status}
              onRetryMenu={menuState.reload}
              priceDish={priceDish}
              onPriceDish={setPriceDish}
              website={websiteUrl}
              curatedSignatures={restaurant.signatureDishes}
            />

            {hasCommunityContent && (
              <section className="detail__section">
                <h2>Why people like it</h2>
                <RestaurantSignals restaurant={restaurant} />
                {restaurant.khabo.tags.length > 0 && (
                  <p className="detail__tags">
                    <span className="detail__tags-label">Community tags:</span>
                    {restaurant.khabo.tags.map((t) => (
                      <span key={t} className="chip">
                        {t.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    ))}
                  </p>
                )}
              </section>
            )}

            {OFFERS_ENABLED && (
            <section id="offers" className="detail__section">
              <h2>Offers</h2>
              {offers.length > 0 ? (
                <div className="offers-strip offers-strip--stack">
                  {offers.map((o) => (
                    <article key={o.id} className="offer-card offer-card--flat">
                      <div className="offer-card__tag-row">
                        <BadgePercent size={14} aria-hidden="true" />
                        <span className="offer-card__tag">{o.discountLabel}</span>
                        <span className="offer-card__demo">{o.source === 'admin' ? (o.status === 'approved' ? 'Approved offer' : 'Pending review') : 'Demo offer'}</span>
                      </div>
                      <h3 className="offer-card__title">{o.title}</h3>
                      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>{o.value}</p>
                      <p className="offer-card__terms">{o.validity} · {o.terms}</p>
                      {o.dishNames && o.dishNames.length > 0 && (
                        <div className="offer-card__price">
                          <span className="offer-card__price-note">Price context — see what these dishes have actually cost:</span>
                          <div className="offer-card__price-links">
                            {o.dishNames.map((name) => {
                              const dish = menuDishes.get(name.toLowerCase());
                              return dish ? (
                                <button
                                  key={name}
                                  type="button"
                                  className="price-history-link"
                                  onClick={() => setPriceDish(dish)}
                                  aria-label={`Price history for ${dish.name}`}
                                >
                                  <History size={12} aria-hidden="true" /> {dish.name} · {formatCurrency(dish.price)}
                                </button>
                              ) : null;
                            })}
                          </div>
                          <span className="offer-card__price-note offer-card__price-note--muted">
                            Price history gives context — it doesn't authenticate the offer.
                          </span>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  No verified offers currently listed.
                </p>
              )}
              </section>
            )}

            {/*
              This section was headed "Your notes" and every line in it said
              note. Nothing underneath ever did: the entity is `UserReview`,
              the service is documented "KK community reviews only", the form
              collects a 1–5 rating with word labels, a favourite dish and a
              visit status, and saving grants the first-review reward. It is a
              review section that had been relabelled, so the label went back.

              The device-only caveat is real — every sync path still writes to
              the local store — and is stated here, once. It used to appear six
              times between this heading and the bottom of the form.
            */}
            <section className="detail__section">
              <div className="detail__section-head">
                <span className="detail__section-eyebrow">In your words</span>
                <h2>Your review</h2>
                <span className="detail__section-sub">
                  Stays on this device for now — not published, and never sent to Google.
                </span>
              </div>
              <WriteReview restaurant={restaurant} onChanged={() => undefined} />
              <div className="reviews">
                {myReviewsHere.map((r) => (
                  <blockquote key={r.id} className="review review--mine">
                    <div className="review__head">
                      <span className="review__avatar" aria-hidden="true">{r.author.charAt(0)}</span>
                      <div>
                        <strong>{r.author} <span className="visit-badge">You</span></strong>
                        <RatingStars rating={r.rating} />
                      </div>
                      {r.visitStatus && (
                        <span className="visit-badge">
                          <Check size={12} aria-hidden="true" /> {r.visitStatus === 'regular' ? 'Regular' : 'Visited'}{r.visitCount ? ` · ${r.visitCount}×` : ''}
                        </span>
                      )}
                      <span className="review__date">{r.date}{r.edited ? ' · edited' : ''}</span>
                    </div>
                    <p>“{r.comment}”</p>
                    {r.favoriteDishes && r.favoriteDishes.length > 0 && (
                      <p className="review__dishes">
                        <span className="review__dishes-label">Ordered:</span>
                        {r.favoriteDishes.map((d) => (
                          <span key={d} className="chip">{d}</span>
                        ))}
                      </p>
                    )}
                    <div className="review__foot">
                      <span className="review__helpful"><ThumbsUp size={12} aria-hidden="true" /> {r.helpfulCount} found this helpful</span>
                    </div>
                  </blockquote>
                ))}
              </div>
            </section>

            {googleView && (
              <section className="detail__section">
                <div className="detail__section-head">
                  <span className="detail__section-eyebrow">Verified elsewhere</span>
                  <h2>Google reviews</h2>
                  <span className="detail__section-sub">
                    {googleView.rating.toFixed(1)}★ average from {googleView.reviewCount.toLocaleString('en-IN')} reviews
                  </span>
                  {/* The only route to the full set used to be a bare inline
                      link at the very bottom, and only when we had no reviews
                      to show. In the head it is an affordance; down there it
                      was a loose end. */}
                  <a
                    className="detail__section-action"
                    href={googleMapsReviewsUrl(restaurant)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    All on Google Maps
                  </a>
                </div>
                <CustomerHighlights samples={reviewHighlights.samples} status={reviewHighlights.status} />
                {liveGoogle.meta.status === 'refreshing' && (
                  <p className="t-xs" style={{ color: 'var(--ink-faint)', margin: '0 0 var(--s2)' }} role="status" aria-live="polite">
                    Refreshing Google data…
                  </p>
                )}
                {googleView.reviews.length > 0 ? (
                  <div className="reviews">
                    {googleView.reviews.map((g) => (
                      <blockquote key={g.id} className="review review--external">
                        <div className="review__head">
                          <span className="review__avatar" aria-hidden="true">{g.author.charAt(0)}</span>
                          <div>
                            <strong>{g.author}</strong>
                            <RatingStars rating={g.rating} />
                          </div>
                          <span className="review__date">{(g.relativeTime ?? '').trim() ? `${g.relativeTime} · Google` : 'Google'}</span>
                        </div>
                        {g.text && <p>“{g.text}”</p>}
                        {g.translated && (
                          <p className="review__translated">
                            <Languages size={12} aria-hidden="true" /> Translated from {g.language ?? 'the original language'} by Google
                          </p>
                        )}
                        <div className="review__foot">
                          <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="review__source">
                            See review on Google <ExternalLink size={12} aria-hidden="true" />
                          </a>
                        </div>
                      </blockquote>
                    ))}
                  </div>
                ) : reviewHighlights.samples.length === 0 ? (
                  /*
                    This slot used to hold a second copy of the head's
                    "All on Google Maps" link — the same destination twice,
                    rendered as a bare underlined link with no styling of its
                    own, which is what a loose end looks like. What belongs
                    here is the reason the slot is empty, said once and
                    quietly. When the highlight deck above has quotes to show,
                    the slot says nothing at all.
                  */
                  <p className="detail__section-note" role={liveGoogle.meta.status === 'refreshing' ? 'status' : undefined}>
                    {liveGoogle.meta.status === 'refreshing'
                      ? 'Fetching the latest Google reviews…'
                      : `No individual Google reviews have come through for this place yet — the ${googleView.rating.toFixed(1)}★ average above is Google’s own.`}
                  </p>
                ) : null}
              </section>
            )}

            {/*
              No heading. This section carried an `<h2>Report incorrect
              information</h2>` directly above a button labelled "Report
              incorrect information" — the same six words at 40px and at 13px,
              one of them doing nothing. At rest this is a housekeeping row and
              is sized like one; the `aria-label` keeps the landmark named for
              anyone navigating by region.
            */}
            <section className="detail__section detail__section--quiet" aria-label="Report incorrect information">
              {reportDone ? (
                <p className="t-sm" style={{ color: 'var(--success)' }}>
                  Thanks — we've logged this and an editor will review it.
                </p>
              ) : reportOpen ? (
                <div className="report-form">
                  <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>What's wrong with this listing?</p>
                  <div className="chip-row">
                    {['Wrong address', 'Wrong hours', 'Wrong menu', 'Closed restaurant', 'Other'].map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        className={`chip chip--select ${reportReason === reason ? 'chip--active' : ''}`}
                        onClick={() => setReportReason(reason)}
                        aria-pressed={reportReason === reason}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <div className="write-review__actions">
                    {/* `unavailable`, not `disabled`: a keyboard user who tabs
                        here before picking a reason should reach the control
                        and be told what it wants, not find a hole in the tab
                        order. */}
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Send}
                      unavailable={!reportReason}
                      unavailableReason="Choose what's wrong first."
                      onClick={() => {
                        if (!reportReason) return;
                        upsertFlag({
                          id: `flag-${restaurant.id}-${reportReason.toLowerCase().replace(/\s+/g, '-')}`,
                          targetType: 'restaurant',
                          targetId: restaurant.id,
                          reason: reportReason,
                          status: 'pending',
                          at: new Date().toISOString(),
                        });
                        track('report_submitted', { id: restaurant.id, reason: reportReason });
                        setReportOpen(false);
                        setReportDone(true);
                      }}
                    >
                      Submit report
                    </Button>
                    <Button variant="subtle" size="sm" onClick={() => setReportOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" icon={Flag} onClick={() => setReportOpen(true)}>
                  Report incorrect information
                </Button>
              )}
            </section>

          </div>

          <aside className="detail__aside">
            {/*
              Reference detail. This card is the single home for the full
              address, the full weekly schedule, phone and dining options.
              Neighbourhood and price-for-two were removed: both are already
              stated in the decision bar above, and repeating them within one
              viewport made the page feel padded rather than thorough.
            */}
            <div className="info-card">
              <h3>Know before you go</h3>
              <ul className="info-card__list">
                <li>
                  <span><MapPin size={12} aria-hidden="true" /> Address</span>
                  <strong>{addressLines.join(', ') || 'To be verified'}</strong>
                  <span className="info-card__prov">
                    <Provenance
                      level={addressProv}
                      size="sm"
                      title={
                        verifiedAddress
                          ? 'Confirmed against our verification records.'
                          : hasUsableAddress
                            ? 'Recorded from a permitted source but not independently confirmed.'
                            : 'We do not have a usable street address for this venue yet.'
                      }
                    >
                      {verifiedAddress ? 'Address verified' : hasUsableAddress ? 'Recorded address' : 'To be verified'}
                    </Provenance>
                  </span>
                </li>
                {/*
                  Only rendered when there is an actual schedule to show. With
                  no recorded hours the decision bar above already says so, and
                  a second "Not recorded" row is noise, not transparency.
                */}
                {hoursRows && (
                  <li><span>Hours</span><strong>
                    {hoursRows.length > 1 ? (
                      <span className="hours-week">
                        {hoursRows.map((row) => (
                          <span key={row.day} className="hours-week__row">
                            <span className="hours-week__day">{row.day}</span>
                            <span className={`hours-week__value${row.closed ? ' hours-week__value--closed' : ''}`}>{row.label}</span>
                          </span>
                        ))}
                      </span>
                    ) : hoursRows[0].label}
                  </strong>
                    {hoursFromScrape && (
                      <span className="info-card__prov">
                        <Provenance level="recorded" size="sm" title="Captured from Google's listing — confirm with the restaurant.">
                          As recorded
                        </Provenance>
                      </span>
                    )}
                  </li>
                )}
                {businessStatus && businessStatus !== 'Operational' && (
                  <li><span>Status</span><strong>{businessStatus}</strong></li>
                )}
                {googleView?.phone && (
                  <li><span>Phone</span><strong>{googleView.phone}</strong></li>
                )}
                <li>
                  <span>Dining</span>
                  <strong>{[!restaurant.vegUnknown && restaurant.isVeg && 'Veg', restaurant.hasOutdoorSeating && 'Outdoor seating', restaurant.hasDelivery && 'Delivery', restaurant.isFamilyFriendly && 'Family friendly'].filter(Boolean).join(' · ') || (restaurant.hasDelivery ? 'Dine-in & delivery' : 'Dine-in')}</strong>
                </li>
              </ul>
              <p className="info-card__note">
                {effectiveReviewCount(restaurant).toLocaleString('en-IN')} {pluralize(effectiveReviewCount(restaurant), 'review')} · {effectiveRating(restaurant).toFixed(1)}★ on Google
              </p>
            </div>

            {/*
              The venue map. This was a Google Maps `?output=embed` iframe and
              it rendered a blank box: that URL now 301s to `/maps/embed?…&pb=…`
              and the redirect carries `X-Frame-Options: SAMEORIGIN`, which
              Chrome enforces on every hop of a frame's navigation chain. It is
              now the app's own map surface — the same one `/explore` draws —
              so there is one map implementation in the product. Measurement in
              `lib/maps.ts`.
            */}
            <RestaurantLocationMap
              restaurant={restaurant}
              addressLine={addressLines[0] || `${displayRestaurant.name}, Dhaka`}
              onDirections={askDirections}
              locating={requestingOrigin && geo.status === 'locating'}
            />
          </aside>
        </div>

        <section className="detail__section detail__similar">
          {/* One heading pattern for the whole page. This was the only body
              section using `.section-heading` — a second vocabulary for the
              same job, with its own eyebrow class and its own type sizes, which
              is why the page read as four sections designed by four people. */}
          <div className="detail__section-head">
            <span className="detail__section-eyebrow">You might also like</span>
            <h2>Similar to {restaurant.name}</h2>
            <span className="detail__section-sub">
              Matched on shared cuisine first, then budget, neighbourhood and meal times.
            </span>
          </div>
          <div className="grid">
            {similar.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} distanceKm={distanceKm(restaurant, r)} />
            ))}
          </div>
        </section>
      </div>

      {/* Price intelligence modal — shared by the menu and offers */}
      {priceDish && <DishPriceHistory dish={priceDish} change={priceChange(priceDish)} onClose={() => setPriceDish(null)} />}
    </main>
  );
}
