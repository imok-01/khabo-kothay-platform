import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Heart,
  MapPin,
  Navigation,
  Globe,
  Check,
  ChefHat,
  BadgePercent,
  History,
  ChevronLeft,
  ThumbsUp,
  ExternalLink,
  Languages,
  Phone,
} from 'lucide-react';
import type { Restaurant } from '../types';
import { cleanAddressSegment, formatAddress, formatCurrency, isPoorAddress, pluralize } from '../lib/format';
import { recommendSimilar } from '../lib/recommendations';
import { formatOpeningHours, formatScrapedHours, openNowLabel } from '../lib/openHours';
import { priceForTwoDisplay, priceSummary } from '../lib/priceDisplay';
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
import { selectRestaurantPhotos } from '../lib/photos';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { fetchOwnerImages } from '../repositories/imageUploadRepository';
import type { RestaurantImageSource } from '../domain/images';
import { getOffersForRestaurant, OFFERS_ENABLED } from '../hooks/useOffers';
import { distanceKm } from '../lib/geo';
import { googleMapsDirectionsUrl, googleMapsEmbedUrl, googleMapsPlaceUrl, googleMapsReviewsUrl } from '../lib/maps';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';

import RatingStars from '../components/RatingStars';
import RatingSource from '../components/RatingSource';
import RestaurantSignals from '../components/RestaurantSignals';
import RestaurantCard from '../components/RestaurantCard';
import CustomerHighlights from '../components/CustomerHighlights';

import ImageGallery from '../components/ImageGallery';
import ShareButton from '../components/ShareButton';
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

  const images = [...gallery.photos, ...ownerPhotos];
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
            title="Restaurant not found"
            message="This place might have moved — or the address is wrong. Let's find you another spot."
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
  const openStatus = liveOpenNowLabel(liveGoogle.snapshot, openNowLabel(effective.openingHours));
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
  // Honest sub-note: "Verified address" when a verified value is shown;
  // otherwise the remaining address lines; nothing when a complete recorded
  // address is displayed; "Address to be verified" only when there is no
  // usable address at all (the raw value is a fragment/plus code).
  const hasUsableAddress = Boolean(
    (verifiedAddress || displayRestaurant.address) &&
      !isPoorAddress(cleanAddressSegment(verifiedAddress || displayRestaurant.address || '')),
  );
  const addressNote = verifiedAddress
    ? 'Address verified'
    : addressLines.slice(1).join(', ') || (hasUsableAddress ? '' : 'Address to be verified');

  // Graceful hours display: weekly maps render per-day, single ranges render
  // one neutral row, and unparseable strings say "Hours being verified".
  // Recorded Google-scrape fragments ("Open Closes 1 am", "Closed Opens
  // 12 pm Sat") render as one honest summary row rather than being hidden.
  const rawHours = googleView?.openingHours || displayRestaurant.openingHours;
  const structuredHours = formatOpeningHours(rawHours);
  const scrapedRow = formatScrapedHours(rawHours);
  const hoursRows = structuredHours ?? (scrapedRow ? [scrapedRow] : null);
  const hoursFromScrape = !structuredHours && Boolean(scrapedRow);
  const hoursValue = hoursRows
    ? hoursRows.length > 1
      ? `${hoursRows[0].day} ${hoursRows[0].label} · ${hoursRows.length} days`
      : `${hoursRows[0].day}: ${hoursRows[0].label}`
    : rawHours
      ? 'Hours being verified'
      : 'Not recorded';

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

  return (
    <main className="detail">
      <div className="detail__inner">
        <button type="button" className="detail__back" onClick={goBack}>
          <ChevronLeft size={15} aria-hidden="true" /> Back
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
                <MapPin size={13} aria-hidden="true" /> {restaurant.location}
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

          {/* Primary actions */}
          <div className="detail__actions">
            <span
              className="btn btn--primary"
              aria-disabled="true"
              style={{ cursor: 'not-allowed', opacity: 0.65 }}
              title="Reservations are not available in this preview"
            >
              Reservations coming soon
            </span>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              <Navigation size={15} aria-hidden="true" /> Directions
            </a>
            {googleView?.phone && (
              <a href={`tel:${googleView.phone}`} className="btn btn--ghost">
                <Phone size={15} aria-hidden="true" /> Call
              </a>
            )}
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                <Globe size={15} aria-hidden="true" /> Website
              </a>
            )}
            <ShareButton
              url={`/restaurant/${restaurant.id}`}
              title={restaurant.name}
              text={restaurant.tagline || `${restaurant.cuisines.slice(0, 2).join(', ')} restaurant in ${restaurant.location || MARKET.city}`}
            />
          </div>

          <div className="detail__stats">
            <div className="stat">
              <span className="stat__label">How expensive?</span>
              <span className="stat__value">{priceSummaryData.tierLabel}</span>
              <span className="stat__sub">{priceSummaryData.spendLabel}</span>
              {priceSummaryData.perPersonLabel && (
                <span className="stat__sub">{priceSummaryData.perPersonLabel}</span>
              )}
              <span className="stat__sub stat__sub--note">{priceSummaryData.evidence}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Location</span>
              <span className="stat__value"><MapPin size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {addressLines[0] ?? (displayRestaurant.location || 'Dhaka')}</span>
              <span className="stat__sub">{addressNote}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Hours</span>
              <span className="stat__value">{hoursValue}</span>
              <span className="stat__sub">
                {hoursFromScrape
                  ? 'Recorded hours — confirm with restaurant'
                  : `${businessStatus && businessStatus !== 'Operational' ? `${businessStatus} · ` : ''}${openStatus ?? (rawHours ? (displayRestaurant.hasDelivery ? 'Delivery available' : 'Dine-in only') : 'Hours being verified')}`}
              </span>
            </div>
          </div>
        </div>

        <div className="detail__grid">
          <div className="detail__main">
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

            {hasDiscoveryFacts && (
              <section className="detail__section">
                <h2>Did you know?</h2>
                <ul className="detail__highlights">
                  {discoveryFacts.facts.map((f) => (
                    <li key={f.id}>
                      <Check size={14} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true" />
                      {f.factText}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="detail__section">
              <h2>Signature dishes</h2>
              {restaurant.signatureDishes.length > 0 ? (
                <div className="dishes">
                  {restaurant.signatureDishes.map((d) => (
                    <div key={d} className="dish">
                      <span className="dish__icon"><ChefHat size={18} aria-hidden="true" /></span>
                      <strong>{d}</strong>
                      <span className="dish__tag">Chef's pick</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  Signature picks will appear here once our team verifies what this kitchen is known for.
                </p>
              )}
            </section>

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
                                  <History size={11} aria-hidden="true" /> {dish.name} · {formatCurrency(dish.price)}
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

            <MenuSection
              restaurant={restaurant}
              menu={menuState.menu}
              menuStatus={menuState.status}
              onRetryMenu={menuState.reload}
              priceDish={priceDish}
              onPriceDish={setPriceDish}
              website={websiteUrl}
            />

            <section className="detail__section">
              <div className="detail__section-head">
                <h2>Your notes</h2>
                <span className="detail__section-sub">
                  Notes you save stay on this device only — not shared publicly yet.
                </span>
              </div>
              <WriteReview restaurant={restaurant} onChanged={() => undefined} />
              {myReviewsHere.length === 0 && (
                <p className="t-sm" style={{ color: 'var(--ink-soft)', marginBottom: 'var(--s3)' }}>
                  Save a private note about this place. It's stored on this device only and isn't shared publicly yet.
                </p>
              )}
              {myReviewsHere.length > 0 && (
                <p className="t-sm" style={{ color: 'var(--ink-soft)', marginBottom: 'var(--s2)' }}>
                  Your private notes (saved on this device only):
                </p>
              )}
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
                          <Check size={11} aria-hidden="true" /> {r.visitStatus === 'regular' ? 'Regular' : 'Visited'}{r.visitCount ? ` · ${r.visitCount}×` : ''}
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
                      <span className="review__helpful"><ThumbsUp size={11} aria-hidden="true" /> {r.helpfulCount} found this helpful</span>
                    </div>
                  </blockquote>
                ))}
              </div>
            </section>

            {googleView && (
              <section className="detail__section">
                <div className="detail__section-head">
                  <h2>Google reviews</h2>
                  <span className="detail__section-sub">
                    {googleView.rating.toFixed(1)}★ · {googleView.reviewCount.toLocaleString('en-IN')} reviews on Google Maps
                  </span>
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
                            <Languages size={11} aria-hidden="true" /> Translated from {g.language ?? 'the original language'} by Google
                          </p>
                        )}
                        <div className="review__foot">
                          <a href={g.sourceUrl} target="_blank" rel="noopener noreferrer" className="review__source">
                            See review on Google <ExternalLink size={11} aria-hidden="true" />
                          </a>
                        </div>
                      </blockquote>
                    ))}
                  </div>
                ) : (
                  <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                    {liveGoogle.meta.status === 'refreshing' && <>Refreshing Google reviews… </>}
                    <a href={googleMapsReviewsUrl(restaurant)} target="_blank" rel="noopener noreferrer" className="review__source">
                      View all Google reviews <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </p>
                )}
              </section>
            )}

            <section className="detail__section">
              <h2>Report incorrect information</h2>
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
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={!reportReason}
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
                    </button>
                    <button type="button" className="btn btn--subtle btn--sm" onClick={() => setReportOpen(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setReportOpen(true)}>
                  Report incorrect information
                </button>
              )}
            </section>

          </div>

          <aside className="detail__aside">
            <div className="info-card">
              <h3>Know before you go</h3>
              <ul className="info-card__list">
                <li><span><MapPin size={12} aria-hidden="true" /> Neighbourhood</span><strong>{displayRestaurant.location || 'Dhaka'}</strong></li>
                <li>
                  <span>Address</span>
                  <strong>{addressLines.join(', ') || 'To be verified'}</strong>
                  {verifiedAddress && (
                    <span
                      className="verify-note"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      <Check size={12} aria-hidden="true" /> Address verified
                    </span>
                  )}
                </li>
                <li><span>Hours</span><strong>
                  {hoursRows ? (
                    hoursRows.length > 1 ? (
                      <span className="hours-week">
                        {hoursRows.map((row) => (
                          <span key={row.day} className="hours-week__row">
                            <span className="hours-week__day">{row.day}</span>
                            <span className={`hours-week__value${row.closed ? ' hours-week__value--closed' : ''}`}>{row.label}</span>
                          </span>
                        ))}
                      </span>
                    ) : hoursRows[0].label
                  ) : rawHours ? 'Hours being verified' : 'Not recorded'}
                </strong></li>
                {businessStatus && businessStatus !== 'Operational' && (
                  <li><span>Status</span><strong>{businessStatus}</strong></li>
                )}
                {googleView?.phone && (
                  <li><span>Phone</span><strong>{googleView.phone}</strong></li>
                )}
                <li><span>Price for two</span><strong>{priceForTwoDisplay(restaurant).label}</strong></li>
                <li>
                  <span>Dining</span>
                  <strong>{[!restaurant.vegUnknown && restaurant.isVeg && 'Veg', restaurant.hasOutdoorSeating && 'Outdoor seating', restaurant.hasDelivery && 'Delivery', restaurant.isFamilyFriendly && 'Family friendly'].filter(Boolean).join(' · ') || (restaurant.hasDelivery ? 'Dine-in & delivery' : 'Dine-in')}</strong>
                </li>
              </ul>
              <p className="info-card__note">
                {effectiveReviewCount(restaurant).toLocaleString('en-IN')} {pluralize(effectiveReviewCount(restaurant), 'review')} · {effectiveRating(restaurant).toFixed(1)}★ on Google
              </p>
            </div>

            <div className="detail-map" aria-label={`Map showing the location of ${restaurant.name}`}>
              <iframe
                src={googleMapsEmbedUrl(restaurant)}
                title={`Map showing the location of ${restaurant.name}`}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="detail-map__bar">
                <span className="detail-map__address">
                  <MapPin size={13} aria-hidden="true" /> {addressLines[0] || `${displayRestaurant.name}, Dhaka`}
                </span>
                <div className="detail-map__actions">
                  <a
                    href={googleMapsPlaceUrl(restaurant)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--ghost btn--sm"
                  >
                    Open in Google Maps
                  </a>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={askDirections}
                    disabled={requestingOrigin && geo.status === 'locating'}
                  >
                    <Navigation size={13} aria-hidden="true" />
                    {requestingOrigin && geo.status === 'locating' ? 'Getting your location…' : 'Directions'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section className="detail__section detail__similar">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">You might also like</span>
              <h2>Similar to {restaurant.name}</h2>
            </div>
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
