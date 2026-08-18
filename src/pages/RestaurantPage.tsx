import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Heart,
  MapPin,
  Navigation,
  Globe,
  CalendarCheck,
  Check,
  ChefHat,
  BadgePercent,
  History,
  X,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ExternalLink,
  Languages,
} from 'lucide-react';
import { BUDGET_LABEL, type Restaurant } from '../types';
import { formatCurrency, pluralize } from '../lib/format';
import { MARKET } from '../lib/market';
import { recommendSimilar } from '../lib/recommendations';
import { openNowLabel } from '../lib/openHours';
import { usePageTitle } from '../lib/usePageTitle';
import { useFavorites } from '../context/FavoritesContext';
import { useRecentlyViewed } from '../context/RecentlyViewedContext';
import { useRestaurant } from '../hooks/useRestaurants';
import { useRestaurantMenu } from '../hooks/useRestaurantMenu';
import { useGeolocation } from '../hooks/useGeolocation';
import { selectRestaurantPhotos } from '../lib/photos';
import { getOffersForRestaurant } from '../hooks/useOffers';
import { distanceKm } from '../lib/geo';
import { googleMapsDirectionsUrl, googleMapsEmbedUrl, googleMapsPlaceUrl } from '../lib/maps';
import { effectiveRating, effectiveReviewCount } from '../lib/ratings';
import { imageProvider } from '../hooks/useImages';
import RatingStars from '../components/RatingStars';
import RatingSource from '../components/RatingSource';
import RestaurantSignals from '../components/RestaurantSignals';
import RestaurantCard from '../components/RestaurantCard';
import RestaurantImage from '../components/RestaurantImage';
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
import { useUserReviews } from '../hooks/useReviews';
import { applyApprovedDraft } from '../lib/restaurantDraft';
import { useLiveGoogle } from '../hooks/useLiveGoogle';
import { businessStatusLabel, liveOpenNowLabel, mergeLiveGoogle } from '../lib/liveGoogleView';

export default function RestaurantPage() {
  const { id } = useParams<{ id: string }>();
  const { status, data: restaurant, reload } = useRestaurant(id);
  const menuState = useRestaurantMenu(restaurant ?? undefined);
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addRecent } = useRecentlyViewed();
  const geo = useGeolocation();
  const navigate = useNavigate();
  const userReviews = useUserReviews();
  useRestaurantDrafts(); // re-render when an approved profile draft lands
  const [bookingRequested, setBookingRequested] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [priceDish, setPriceDish] = useState<MenuItem | null>(null);
  const [requestingOrigin, setRequestingOrigin] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  usePageTitle(restaurant ? restaurant.name : 'Restaurant not found');

  // Live Google data — on-demand refresh keyed by the stable Place ID. Runs
  // before any early return so the hook order stays stable.
  const liveGoogle = useLiveGoogle(restaurant?.google?.placeId);

  // Record the visit once the restaurant has loaded. The fetched object is
  // stable per id (API cache), so this fires once per restaurant.
  useEffect(() => {
    if (restaurant) addRecent(restaurant.id);
  }, [restaurant, addRecent]);

  // Gallery photos come from a source-aware selector: real Google photos →
  // Khabo Kothay community photos → clearly-labelled demo placeholders.
  const gallery = restaurant ? selectRestaurantPhotos(restaurant, 'gallery') : { photos: [], leadSource: 'demo' as const };
  const images = gallery.photos;
  const imageCount = images.length;
  const photoSourceLabel =
    gallery.leadSource === 'google-photos'
      ? 'Photos from Google Maps'
      : gallery.leadSource === 'khabo'
        ? 'Khabo Kothay photos'
        : 'Demo photos';

  // Keyboard + scroll-lock for the lightbox, and focus management on open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setActiveImage((i) => (i + 1) % imageCount);
      if (e.key === 'ArrowLeft') setActiveImage((i) => (i - 1 + imageCount) % imageCount);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxOpen, imageCount]);

  const stepLightbox = useCallback(
    (dir: 1 | -1) => setActiveImage((i) => (i + dir + imageCount) % imageCount),
    [imageCount],
  );

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
  const budgetSymbol = MARKET.currencySymbol.repeat(
    restaurant.budget === 'Budget' ? 1 : restaurant.budget === 'Mid-range' ? 2 : restaurant.budget === 'Premium' ? 3 : 4,
  );

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

        {/* Photo gallery */}
        {images.length > 0 && (
          <div className="detail__gallery">
            <div
              className="detail__gallery-main"
              onClick={() => setLightboxOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setLightboxOpen(true)}
              aria-label={`Open photo gallery for ${restaurant.name}`}
            >
              <RestaurantImage source={images[activeImage]} name={restaurant.name} width={1200} eager />
              <span className="detail__gallery-source">{photoSourceLabel}</span>
              {imageCount > 1 && (
                <span className="detail__gallery-count">{activeImage + 1} / {imageCount}</span>
              )}
            </div>
            {imageCount > 1 && (
              <div className="detail__gallery-thumbs" aria-label="Photo thumbnails">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-current={i === activeImage}
                    aria-label={`Photo ${i + 1}: ${img.alt}`}
                    onClick={() => setActiveImage(i)}
                  >
                    <RestaurantImage source={img} name={restaurant.name} width={300} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Identity */}
        <div className="detail__head">
          <div className="detail__title-row">
            <h1>{restaurant.name}</h1>
            <button
              type="button"
              className={`fav-btn fav-btn--lg ${fav ? 'fav-btn--active' : ''}`}
              onClick={() => toggleFavorite(restaurant.id)}
              aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
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
            {restaurant.cuisines.map((c) => (
              <Link key={c} to={`/explore?cuisine=${encodeURIComponent(c)}`} className="chip chip--link">
                {c}
              </Link>
            ))}
            {restaurant.mealTypes.map((m) => (
              <Link key={m} to={`/explore?mealType=${encodeURIComponent(m)}`} className="chip chip--meal chip--link">
                {m}
              </Link>
            ))}
            {restaurant.vibes.map((v) => (
              <Link key={v} to={`/explore?vibe=${encodeURIComponent(v)}`} className="chip chip--vibe chip--link">
                {v === 'Family' ? 'Family friendly' : v}
              </Link>
            ))}
          </div>

          {/* Primary actions */}
          <div className="detail__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => setBookingRequested(true)}
              disabled={bookingRequested}
            >
              <CalendarCheck size={15} aria-hidden="true" />
              {bookingRequested ? 'Requested' : 'Reserve a table'}
            </button>
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
              <Navigation size={15} aria-hidden="true" /> Directions
            </a>
            {websiteUrl && (
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="btn btn--ghost">
                <Globe size={15} aria-hidden="true" /> Website
              </a>
            )}
            <ShareButton url={`/restaurant/${restaurant.id}`} />
          </div>

          <div className="detail__stats">
            <div className="stat">
              <span className="stat__label">Budget</span>
              <span className="stat__value">{restaurant.priceForTwo > 0 ? `${budgetSymbol} ${restaurant.budget}` : 'Not listed'}</span>
              {restaurant.priceForTwo > 0 && <span className="stat__sub">{BUDGET_LABEL[restaurant.budget]}</span>}
              {restaurant.priceForTwo <= 0 && <span className="stat__sub">No verified price data yet</span>}
            </div>
            <div className="stat">
              <span className="stat__label">Cost for two</span>
              <span className="stat__value">{restaurant.priceForTwo > 0 ? formatCurrency(restaurant.priceForTwo) : 'Not listed'}</span>
              <span className="stat__sub">{restaurant.priceForTwo > 0 ? 'approx. without drinks' : 'no listed price range yet'}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Location</span>
              <span className="stat__value"><MapPin size={14} style={{ verticalAlign: '-2px' }} aria-hidden="true" /> {restaurant.location || 'Dhaka'}</span>
              <span className="stat__sub">{restaurant.address || 'Address to be verified'}</span>
            </div>
            <div className="stat">
              <span className="stat__label">Hours</span>
              <span className="stat__value">{googleView?.openingHours || restaurant.openingHours || 'Not recorded'}</span>
              <span className="stat__sub">
                {businessStatus && businessStatus !== 'Operational' ? `${businessStatus} · ` : ''}
                {openStatus ?? (restaurant.openingHours ? (restaurant.hasDelivery ? 'Delivery available' : 'Dine-in only') : 'Hours being verified')}
              </span>
            </div>
          </div>
        </div>

        <div className="detail__grid">
          <div className="detail__main">
            <section className="detail__section">
              <h2>Why people like it</h2>
              <RestaurantSignals restaurant={restaurant} />
              {restaurant.khabo.signals.length === 0 && restaurant.khabo.tags.length === 0 && (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  Community signal data will appear here once our readers start reviewing this venue.
                </p>
              )}
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

            <section className="detail__section">
              <h2>About this place</h2>
              {effective.description ? (
                <p className="detail__about">{effective.description}</p>
              ) : (
                <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  {restaurant.cuisines.length > 0
                    ? `A ${restaurant.cuisines.join(' · ')} venue in ${restaurant.location || 'Dhaka'} — details are being verified.`
                    : 'Restaurant details are being verified by our team.'}
                </p>
              )}
              <ul className="detail__highlights">
                {effective.khabo.highlights.map((h) => (
                  <li key={h}><Check size={14} style={{ color: 'var(--success)', verticalAlign: '-2px', marginRight: 6 }} aria-hidden="true" />{h}</li>
                ))}
              </ul>
            </section>

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

            <section className="detail__section">
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
                <h2>Khabo Kothay reviews</h2>
                {restaurant.khabo.reviewCount > 0 && (
                  <span className="detail__section-sub">
                    {restaurant.khabo.reviewCount.toLocaleString('en-IN')} community reviews · our readers, not Google
                  </span>
                )}
              </div>
              <WriteReview restaurant={restaurant} onChanged={() => undefined} />
              {restaurant.khabo.reviews.length === 0 && myReviewsHere.length === 0 && (
                <p className="t-sm" style={{ color: 'var(--ink-soft)', marginBottom: 'var(--s3)' }}>
                  Be the first to review this restaurant on Khabo Kothay.
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
                {restaurant.khabo.reviews.map((r) => (
                  <blockquote key={r.id} className="review">
                    <div className="review__head">
                      <span className="review__avatar" aria-hidden="true">{r.author.charAt(0)}</span>
                      <div>
                        <strong>{r.author}</strong>
                        <RatingStars rating={r.rating} />
                      </div>
                      {r.visitStatus && (
                        <span className={`visit-badge ${r.visitStatus === 'regular' ? 'visit-badge--regular' : ''}`}>
                          <Check size={11} aria-hidden="true" />
                          {r.visitStatus === 'regular' ? 'Regular' : 'Visited'}
                          {r.visitCount ? ` · ${r.visitCount}×` : ''}
                        </span>
                      )}
                      <span className="review__date">{r.date}</span>
                    </div>
                    {([['Food', r.foodRating], ['Service', r.serviceRating], ['Value', r.valueRating], ['Ambience', r.ambienceRating]] as const)
                      .filter(([, v]) => v !== undefined)
                      .length > 0 && (
                      <div className="review__subratings">
                        {([['Food', r.foodRating], ['Service', r.serviceRating], ['Value', r.valueRating], ['Ambience', r.ambienceRating]] as const)
                          .filter(([, v]) => v !== undefined)
                          .map(([label, v]) => (
                            <span key={label} className="chip chip--meal">{label} {v}</span>
                          ))}
                      </div>
                    )}
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
                      <span className="review__helpful">
                        <ThumbsUp size={11} aria-hidden="true" /> {r.helpfulCount} found this helpful
                      </span>
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
                {(liveGoogle.meta.status === 'refreshing' || liveGoogle.meta.status === 'failed' || liveGoogle.meta.status === 'unavailable') && (
                  <p className="t-xs" style={{ color: 'var(--ink-faint)', margin: '0 0 var(--s2)' }} role="status" aria-live="polite">
                    {liveGoogle.meta.status === 'refreshing' ? 'Refreshing Google data…' : 'Google data temporarily unavailable — showing the imported snapshot.'}
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
                    {liveGoogle.meta.status === 'refreshing' ? (
                      <>Refreshing Google reviews…</>
                    ) : liveGoogle.meta.status === 'failed' || liveGoogle.meta.status === 'unavailable' ? (
                      <>Google data temporarily unavailable.{' '}</>
                    ) : (
                      <>Only a limited set of Google reviews is returned by the Places API.{' '}</>
                    )}
                    <a href={googleMapsPlaceUrl(restaurant)} target="_blank" rel="noopener noreferrer" className="review__source">
                      View Google reviews <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </p>
                )}
              </section>
            )}
          </div>

          <aside className="detail__aside">
            <div className="info-card">
              <h3>Know before you go</h3>
              <ul className="info-card__list">
                <li><span><MapPin size={12} aria-hidden="true" /> Neighbourhood</span><strong>{restaurant.location || 'Dhaka'}</strong></li>
                <li><span>Address</span><strong>{googleView?.address || restaurant.address || 'To be verified'}</strong></li>
                <li><span>Hours</span><strong>{googleView?.openingHours || restaurant.openingHours || 'Not recorded'}</strong></li>
                {businessStatus && businessStatus !== 'Operational' && (
                  <li><span>Status</span><strong>{businessStatus}</strong></li>
                )}
                {googleView?.phone && (
                  <li><span>Phone</span><strong>{googleView.phone}</strong></li>
                )}
                <li><span>Price for two</span><strong>{restaurant.priceForTwo > 0 ? formatCurrency(restaurant.priceForTwo) : 'Not listed'}</strong></li>
                <li>
                  <span>Dining</span>
                  <strong>{[!restaurant.vegUnknown && restaurant.isVeg && 'Veg', restaurant.hasOutdoorSeating && 'Outdoor seating', restaurant.hasDelivery && 'Delivery', restaurant.isFamilyFriendly && 'Family friendly'].filter(Boolean).join(' · ') || (restaurant.hasDelivery ? 'Dine-in & delivery' : 'Dine-in')}</strong>
                </li>
              </ul>
              {bookingRequested ? (
                <div className="booking-confirm" role="status" aria-live="polite">
                  <Check size={16} style={{ display: 'block', margin: '0 auto 4px', color: 'var(--primary-strong)' }} aria-hidden="true" />
                  <strong>Booking requested!</strong>
                  <p>This is a demo — no table was actually booked.</p>
                </div>
              ) : (
                <button type="button" className="btn btn--primary btn--block" onClick={() => setBookingRequested(true)}>
                  <CalendarCheck size={15} aria-hidden="true" /> Reserve a table
                </button>
              )}
              <p className="info-card__note">
                {restaurant.khabo.reviewCount > 0 ? (
                  <>{restaurant.khabo.reviewCount.toLocaleString('en-IN')} {pluralize(restaurant.khabo.reviewCount, 'review')} · {restaurant.khabo.rating.toFixed(1)}★ Khabo Kothay average</>
                ) : (
                  <>{effectiveReviewCount(restaurant).toLocaleString('en-IN')} {pluralize(effectiveReviewCount(restaurant), 'review')} · {effectiveRating(restaurant).toFixed(1)}★ on Google</>
                )}
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
                  <MapPin size={13} aria-hidden="true" /> {restaurant.address || `${restaurant.name}, Dhaka`}
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

      {/* Lightbox */}
      {lightboxOpen && images.length > 0 && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`${restaurant.name} photo gallery`}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            ref={closeBtnRef}
            type="button"
            className="lightbox__btn lightbox__close"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            aria-label="Close gallery"
          >
            <X size={18} />
          </button>
          {imageCount > 1 && (
            <>
              <button
                type="button"
                className="lightbox__btn lightbox__prev"
                onClick={(e) => { e.stopPropagation(); stepLightbox(-1); }}
                aria-label="Previous photo"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="lightbox__btn lightbox__next"
                onClick={(e) => { e.stopPropagation(); stepLightbox(1); }}
                aria-label="Next photo"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          <img
            src={imageProvider.urlFor(images[activeImage], 1600)}
            alt={images[activeImage].alt}
            className="lightbox__img"
            onClick={(e) => e.stopPropagation()}
          />
          <p className="lightbox__caption">{images[activeImage].alt}</p>
        </div>
      )}
    </main>
  );
}
