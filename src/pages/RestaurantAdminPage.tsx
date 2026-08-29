import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Store, Image as ImageIcon, ImageOff, UtensilsCrossed, BadgePercent, MessageSquareQuote,
  Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Send, Save, Check, Eye, EyeOff, Info, Sparkles,
  Pencil, Star, Award, LineChart, ExternalLink, Upload, ChefHat, Soup,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { getEffectiveMenu } from '../lib/menu';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import { saveMenuOverride, useMenusVersion } from '../hooks/useRestaurantData';
import { useOwnerRestaurants } from '../hooks/useOwnerRestaurant';
import { useOwnerMenu, type OwnerMenuState } from '../hooks/useOwnerMenu';
import { useUserReviews } from '../hooks/useReviews';
import { useRestaurantOffers } from '../hooks/useRestaurantOffers';
import { uploadRestaurantImage, fetchOwnerImages } from '../repositories/imageUploadRepository';
import { googlePhotoUrlAtWidth } from '../repositories/ImageProvider';
import {
  getRestaurantDraft, upsertRestaurantDraft, useRestaurantDrafts, useSuggestions, upsertSuggestion,
} from '../hooks/useDrafts';
import ConsoleShell, { type ConsoleNavGroup } from '../components/ConsoleShell';
import RestaurantImage from '../components/RestaurantImage';
import { Button, Field, IconButton } from '../components/ui';
import { selectRestaurantPhotos } from '../lib/photos';
import { uid } from '../lib/uid';
import { validateOfferDraft } from '../lib/offerValidation';
import { describeWriteFailure } from '../lib/writeFailure';
import { getEffectiveIntelligence } from '../lib/intelligence';
import { BEST_FOR, DINING_FEATURES, FOOD_CHARACTERISTICS, SPECIALTIES, type IntelligenceSuggestion } from '../domain/intelligence';
import type { Offer } from '../domain/offers';
import { formatCurrency } from '../lib/format';
import type { Menu, MenuItem } from '../domain/menu';
import type { Restaurant } from '../types';

/**
 * Restaurant owner console.
 *
 * Two things changed structurally in this pass and both are UX, not logic.
 *
 * 1. The seven sections were a horizontal tab strip inside the consumer page
 *    frame; they are now the rail of the shared ConsoleShell, in button mode,
 *    with the section written into `?tab=` so a deep link, the back button and
 *    the rail all agree. Previously `?tab=` was read once on mount and then
 *    diverged from the visible section.
 * 2. Every tab read the *bundled* catalogue snapshot (`restaurants.find(...)`)
 *    while the page itself already had the resolved record in scope from
 *    useOwnerRestaurants — which also resolves venues that exist only in the
 *    database (application → approval, not yet in the public catalogue). Those
 *    venues made `find()` return undefined behind a non-null assertion. The
 *    record is now passed down, so every tab reads the same restaurant the
 *    page resolved.
 *
 * No write path, permission, validation or approval rule is altered.
 */

type Tab = 'overview' | 'profile' | 'photos' | 'menu' | 'offers' | 'reviews' | 'attributes';

/**
 * How a console row action presses.
 *
 * A toggle in this page is reporting a *state*, not asking for emphasis: up to
 * seven marks stand 2px apart inside a 64px record, and the primitive's default
 * pressed fill — solid `--primary` — would put two blocks of maroon in the
 * middle of that row and make a menu look like a page of warnings. So the fill
 * is the palest primary we hold, and the edge is stated separately: a
 * `--primary-soft` ground on `--surface` without a line is a lighter patch of
 * paper rather than a button that is on.
 */
const CONSOLE_ON = {
  onColor: 'var(--primary-soft)',
  onInk: 'var(--primary-strong)',
  onLine: 'var(--primary-line)',
} as const;

const TAB_META: Record<Tab, { eyebrow: string; title: string; sub: string }> = {
  overview: {
    eyebrow: 'Restaurant',
    title: 'Overview',
    sub: 'Everything Khabo Kothay records about your restaurant, and anything waiting on you.',
  },
  profile: {
    eyebrow: 'Your listing',
    title: 'Profile',
    sub: 'The words diners read on your public page. Edits become a draft and go live once Khabo Kothay approves them.',
  },
  photos: {
    eyebrow: 'Your listing',
    title: 'Photos',
    sub: 'The imagery on your listing — what you have uploaded, and what is linked from your verified source.',
  },
  menu: {
    eyebrow: 'Menu',
    title: 'Menu',
    sub: 'Categories, dishes, prices and availability. Your live menu is replaced only after an approved submission.',
  },
  offers: {
    eyebrow: 'Menu',
    title: 'Offers',
    sub: 'Promotions on your public page. Drafts stay private until Khabo Kothay approves them.',
  },
  reviews: {
    eyebrow: 'Community',
    title: 'Reviews',
    sub: 'What diners have written about your restaurant.',
  },
  attributes: {
    eyebrow: 'Your listing',
    title: 'Discovery tags',
    sub: 'The structured metadata that decides which searches surface you. You suggest; Khabo Kothay approves.',
  },
};

const TAB_KEYS = Object.keys(TAB_META) as Tab[];

export default function RestaurantAdminPage() {
  usePageTitle('Restaurant admin');
  const { session } = useAuth();

  // The URL is the single source of truth for the visible section, so
  // /manage?tab=profile (the owner "Update information" entry point), the rail
  // and the browser back button can never disagree.
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TAB_KEYS.includes(requested as Tab) ? (requested as Tab) : 'overview';
  const setTab = (next: Tab) => {
    const p = new URLSearchParams(params);
    if (next === 'overview') p.delete('tab');
    else p.set('tab', next);
    setParams(p);
  };

  useMenusVersion();
  useRestaurantDrafts();
  const userReviews = useUserReviews();
  const suggestions = useSuggestions();

  const { restaurants: owned, loading: ownedLoading } = useOwnerRestaurants(session?.restaurantIds);

  const [selectedId, setSelectedId] = useState<string>(owned[0]?.id ?? '');

  const { offers: myOffers, createOffer: createDbOffer, submitOffer: submitDbOffer, removeOffer } =
    useRestaurantOffers(selectedId || session?.restaurantIds?.[0]);

  // Single source of truth for the restaurant's editable ("working") menu. Used
  // by both the Overview dish count and the Menu tab so the admin reflects the
  // real Supabase-backed menu, not the demo-store seed.
  const ownerMenu = useOwnerMenu(selectedId || session?.restaurantIds?.[0] || '', session?.id ?? '');

  useEffect(() => {
    if (!selectedId && owned[0]) setSelectedId(owned[0].id);
  }, [owned, selectedId]);

  if (ownedLoading) {
    return (
      <main className="page-loader" aria-busy="true" role="status">
        <span className="page-loader__spinner" aria-hidden="true" />
        <span className="sr-only">Loading your restaurant…</span>
      </main>
    );
  }

  if (!session || session.role !== 'restaurant_admin' || owned.length === 0) {
    return (
      <main className="section section--narrow">
        <div className="section__inner">
          <div className="access-denied">
            <Store size={40} aria-hidden="true" />
            <h1>No restaurant assigned</h1>
            <p>This account manages restaurants on Khabo Kothay, but no restaurants are assigned to it.</p>
            <Button variant="primary" to="/" icon={ArrowLeft}>Back to home</Button>
          </div>
        </div>
      </main>
    );
  }

  const restaurant = owned.find((r) => r.id === selectedId) ?? owned[0];
  const draft = getRestaurantDraft(restaurant.id);
  const myReviews = userReviews.filter((r) => r.restaurantId === restaurant.id);
  const publicOffers = myOffers.filter((o) => o.status === 'approved');
  const draftOffers = myOffers.filter((o) => o.status === 'draft').length;
  const pendingSuggestions = suggestions.filter((s) => s.restaurantId === restaurant.id && s.status === 'pending').length;
  // Dish count reflects the real, working menu (PUBLISHED/DRAFT/PENDING) loaded
  // from Supabase — not the demo-store seed, which is empty for most restaurants.
  const dishCount = ownerMenu.menu
    ? ownerMenu.menu.categories.reduce((n, c) => n + c.dishes.length, 0)
    : 0;

  const groups: ConsoleNavGroup[] = [
    // Overview leads the rail without a heading. "Restaurant" stood here over a
    // single item and named the whole console rather than that item's group.
    {
      key: 'lead',
      items: [
        { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} aria-hidden="true" />, onSelect: () => setTab('overview'), active: tab === 'overview' },
      ],
    },
    {
      label: 'Your listing',
      items: [
        { key: 'profile', label: 'Profile', icon: <Store size={16} aria-hidden="true" />, onSelect: () => setTab('profile'), active: tab === 'profile' },
        { key: 'photos', label: 'Photos', icon: <ImageIcon size={16} aria-hidden="true" />, onSelect: () => setTab('photos'), active: tab === 'photos' },
        { key: 'attributes', label: 'Discovery tags', icon: <Sparkles size={16} aria-hidden="true" />, onSelect: () => setTab('attributes'), active: tab === 'attributes', badge: pendingSuggestions, attention: true },
      ],
    },
    {
      label: 'Menu & offers',
      items: [
        { key: 'menu', label: 'Menu', icon: <UtensilsCrossed size={16} aria-hidden="true" />, onSelect: () => setTab('menu'), active: tab === 'menu' },
        { key: 'offers', label: 'Offers', icon: <BadgePercent size={16} aria-hidden="true" />, onSelect: () => setTab('offers'), active: tab === 'offers', badge: draftOffers, attention: true },
      ],
    },
    {
      // "Community" said nothing "Reviews" did not. This heading earns its line:
      // it tells an owner the section holds writing that arrived, not writing
      // they do.
      label: 'From diners',
      items: [
        { key: 'reviews', label: 'Reviews', icon: <MessageSquareQuote size={16} aria-hidden="true" />, onSelect: () => setTab('reviews'), active: tab === 'reviews' },
      ],
    },
  ];

  const meta = TAB_META[tab];

  return (
    <ConsoleShell
      brand={{ title: restaurant.name, subtitle: 'Restaurant console', icon: <Soup size={18} />, to: '/manage' }}
      groups={groups}
      currentLabel={meta.title}
      identity={{ name: session.name ?? 'Restaurant owner', role: 'Restaurant owner' }}
      backTo={{
        /* `/`, not the owner's own listing: the console head already carries a
           "View public page" link on every tab, and that one stays visible when
           the rail collapses into a drawer. Two controls for the same URL in the
           same persistent chrome is one too many, so the rail foot does the job
           only it can — leave the console and go back to Khabo Kothay. Both
           consoles now say the same thing here. */
        to: '/',
        label: 'Back to Khabo Kothay',
      }}
    >
      <main className="admin">
        <div className="admin__inner">
          <header className="console-head">
            <div className="console-head__text">
              <span className="console-head__eyebrow">{meta.eyebrow}</span>
              <h1 className="console-head__title">{meta.title}</h1>
              <p className="console-head__sub">{meta.sub}</p>
            </div>
            <div className="console-head__actions">
              {owned.length > 1 && (
                <Field label="Restaurant" style={{ minWidth: 200 }}>
                  <select value={restaurant.id} onChange={(e) => setSelectedId(e.target.value)}>
                    {owned.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
              )}
              <Button variant="ghost" size="sm" to={`/restaurant/${restaurant.id}`} icon={Eye}>
                View public page
              </Button>
            </div>
          </header>

          {tab === 'overview' && (
            <Overview
              restaurant={restaurant}
              ownerMenu={ownerMenu}
              dishCount={dishCount}
              myOffers={myOffers}
              publicOffers={publicOffers}
              reviewCount={restaurant.khabo.reviewCount + myReviews.length}
              appReviewCount={myReviews.length}
              draftStatus={draft?.status ?? null}
              pendingSuggestions={pendingSuggestions}
              onGo={setTab}
            />
          )}
          {tab === 'profile' && <ProfileTab restaurant={restaurant} />}
          {tab === 'photos' && <PhotosTab restaurant={restaurant} />}
          {tab === 'menu' && <MenuTab restaurant={restaurant} ownerMenu={ownerMenu} />}
          {tab === 'offers' && <OffersTab restaurantName={restaurant.name} myOffers={myOffers} publicOffers={publicOffers} createOffer={createDbOffer} submitOffer={submitDbOffer} removeOffer={removeOffer} />}
          {tab === 'reviews' && <ReviewsTab restaurant={restaurant} myReviews={myReviews} />}
          {tab === 'attributes' && <AttributesTab restaurantId={restaurant.id} restaurantName={restaurant.name} />}
        </div>
      </main>
    </ConsoleShell>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard home                                                      */
/* ------------------------------------------------------------------ */

/** A menu workflow state, in the words an owner would use. */
function menuStateLabel(status: OwnerMenuState['menuStatus']): { text: string; pill: string } {
  switch (status) {
    case 'PUBLISHED': return { text: 'Live menu', pill: 'status-pill status-pill--ok' };
    case 'PENDING_REVIEW': return { text: 'In review', pill: 'status-pill status-pill--pending' };
    case 'DRAFT': return { text: 'Private draft', pill: 'status-pill' };
    default: return { text: 'No menu yet', pill: 'status-pill' };
  }
}

interface ActionRow {
  key: string;
  title: string;
  detail: string;
  pill: string;
  pillClass: string;
  tab: Tab;
  cta: string;
}

function Overview({
  restaurant, ownerMenu, dishCount, myOffers, publicOffers, reviewCount, appReviewCount,
  draftStatus, pendingSuggestions, onGo,
}: {
  restaurant: Restaurant;
  ownerMenu: OwnerMenuState;
  dishCount: number;
  myOffers: Offer[];
  publicOffers: Offer[];
  reviewCount: number;
  appReviewCount: number;
  draftStatus: 'draft' | 'pending' | 'published' | 'rejected' | null;
  pendingSuggestions: number;
  onGo: (tab: Tab) => void;
}) {
  const configured = isSupabaseConfigured();
  const photo = selectRestaurantPhotos(restaurant, 'card').photos[0];
  const categoryCount = ownerMenu.menu?.categories.length ?? 0;
  const draftOffers = myOffers.filter((o) => o.status === 'draft').length;
  const pendingOffers = myOffers.filter((o) => o.status === 'pending').length;
  const menuState = menuStateLabel(ownerMenu.menuStatus);
  const menuLive = ownerMenu.menuStatus === 'PUBLISHED';
  const sourceRating = restaurant.google?.rating ?? 0;
  const sourceReviews = restaurant.google?.reviewCount ?? 0;

  // Listing fields a diner notices the absence of. Counted from the record the
  // page resolved — nothing here is inferred or estimated.
  const missing: string[] = [];
  if (restaurant.cuisines.length === 0) missing.push('cuisine');
  if (!restaurant.openingHours) missing.push('opening hours');
  if (!restaurant.address) missing.push('address');
  if (!restaurant.description) missing.push('description');

  /* The work waiting on a person, in the order it blocks a diner. Each row is
     derived from a real workflow state; there is no row for "you could try
     harder" and no invented urgency. */
  const actions: ActionRow[] = [];

  if (!ownerMenu.loading) {
    if (ownerMenu.menuStatus === null) {
      actions.push({
        key: 'menu-none', tab: 'menu', cta: 'Start a menu',
        title: 'No menu recorded yet',
        detail: 'Your listing shows no dishes or prices to a diner deciding where to eat.',
        pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
      });
    } else if (ownerMenu.menuStatus === 'PUBLISHED' && dishCount === 0) {
      /* The quietest failure in the product: a live menu record with nothing on
         it. Nothing is broken, and a diner still sees no menu. */
      actions.push({
        key: 'menu-empty', tab: 'menu', cta: 'Add your dishes',
        title: 'Your live menu has no dishes on it',
        detail: 'The record exists but is empty, so diners see no menu at all on your page.',
        pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
      });
    } else if (ownerMenu.menuStatus === 'DRAFT') {
      actions.push({
        key: 'menu-draft', tab: 'menu', cta: 'Review and submit',
        title: 'Your menu draft is private',
        detail: 'It replaces your live menu only after you submit it and Khabo Kothay approves it.',
        pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
      });
    } else if (ownerMenu.menuStatus === 'PENDING_REVIEW') {
      actions.push({
        key: 'menu-review', tab: 'menu', cta: 'See what you sent',
        title: 'Your menu is with Khabo Kothay',
        detail: 'Nothing to do — your live menu stays up until the submission is approved.',
        pill: 'In review', pillClass: 'status-pill status-pill--info',
      });
    }
  }

  if (draftStatus === 'draft') {
    actions.push({
      key: 'profile-draft', tab: 'profile', cta: 'Open the draft',
      title: 'Profile changes saved but not submitted',
      detail: 'Your edits are held privately. Submit them for review to change your public page.',
      pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
    });
  } else if (draftStatus === 'pending') {
    actions.push({
      key: 'profile-pending', tab: 'profile', cta: 'See what you sent',
      title: 'Profile changes are in review',
      detail: 'Your public page is unchanged until a reviewer decides.',
      pill: 'In review', pillClass: 'status-pill status-pill--info',
    });
  }

  if (missing.length > 0) {
    actions.push({
      key: 'profile-gaps', tab: 'profile', cta: 'Fill these in',
      title: `Your listing has no ${missing.join(', no ')}`,
      detail: 'These fields decide which searches you appear in and what a diner reads first.',
      pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
    });
  }

  if (!photo) {
    actions.push({
      key: 'photos', tab: 'photos', cta: 'Add photography',
      title: 'No photography on your listing',
      detail: 'A listing without a photograph is the one diners scroll past.',
      pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
    });
  }

  if (draftOffers > 0) {
    actions.push({
      key: 'offers-draft', tab: 'offers', cta: 'Open offers',
      title: `${draftOffers} offer draft${draftOffers === 1 ? '' : 's'} not submitted`,
      detail: 'A draft offer is invisible to diners until it is approved.',
      pill: 'Needs you', pillClass: 'status-pill status-pill--pending',
    });
  }

  if (pendingOffers > 0) {
    actions.push({
      key: 'offers-pending', tab: 'offers', cta: 'See offers',
      title: `${pendingOffers} offer${pendingOffers === 1 ? '' : 's'} awaiting approval`,
      detail: 'Nothing to do — a reviewer will publish or decline them.',
      pill: 'In review', pillClass: 'status-pill status-pill--info',
    });
  }

  if (pendingSuggestions > 0) {
    actions.push({
      key: 'tags', tab: 'attributes', cta: 'See suggestions',
      title: `${pendingSuggestions} discovery tag suggestion${pendingSuggestions === 1 ? '' : 's'} in review`,
      detail: 'Tags only affect recommendations once approved.',
      pill: 'In review', pillClass: 'status-pill status-pill--info',
    });
  }

  return (
    <>
      {/* Counts of your own records. Every figure is read at render time from
          the menu, offers and reviews this restaurant actually has. */}
      <div className="ledger">
        <div className="ledger__item">
          <span className="ledger__label">Menu dishes</span>
          <strong className="ledger__value">{dishCount}</strong>
          <p className="ledger__note">
            {categoryCount > 0 ? `Across ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}` : 'No categories yet'}
          </p>
        </div>
        <div className="ledger__item">
          <span className="ledger__label">Public offers</span>
          <strong className="ledger__value">{publicOffers.length}</strong>
          <p className="ledger__note">
            {draftOffers + pendingOffers > 0
              ? `${draftOffers + pendingOffers} not public yet`
              : 'Nothing waiting'}
          </p>
        </div>
        <div className="ledger__item">
          <span className="ledger__label">Community reviews</span>
          <strong className="ledger__value">{reviewCount.toLocaleString('en-IN')}</strong>
          <p className="ledger__note">
            {appReviewCount > 0 ? `${appReviewCount} written in the app` : 'None written on Khabo Kothay yet'}
          </p>
        </div>
        {/* The rating an owner cares about, with its source named. A Khabo
            Kothay community rating takes precedence because it is ours; when
            there isn't one we show the rating recorded from the linked source
            rather than withholding a real number. Only when neither exists does
            this become a blank — and a blank, not a 0.0, because a zero would
            read as a terrible score instead of an absent one. */}
        {restaurant.khabo.rating > 0 ? (
          <div className="ledger__item">
            <span className="ledger__label">Khabo rating</span>
            <strong className="ledger__value">{restaurant.khabo.rating.toFixed(1)}<small>/5</small></strong>
            <p className="ledger__note">From {restaurant.khabo.reviewCount.toLocaleString('en-IN')} Khabo Kothay reviews</p>
          </div>
        ) : sourceRating > 0 ? (
          <div className="ledger__item">
            <span className="ledger__label">Source rating</span>
            <strong className="ledger__value">{sourceRating.toFixed(1)}<small>/5</small></strong>
            <p className="ledger__note">
              {sourceReviews > 0
                ? `From ${sourceReviews.toLocaleString('en-IN')} reviews on your linked listing`
                : 'From your linked listing'}
            </p>
          </div>
        ) : (
          <div className="metric-pending">
            <span className="metric-pending__label">Rating</span>
            <span className="metric-pending__dash" aria-hidden="true">—</span>
            <span className="metric-pending__note">No rating on record yet</span>
          </div>
        )}
      </div>

      <div className="admin-columns">
        <div>
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Waiting on you</h2>
              {actions.length > 0 && <span className="panel__hint">{actions.length} item{actions.length === 1 ? '' : 's'}</span>}
            </div>
            {ownerMenu.loading ? (
              <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Checking your menu…</p>
            ) : actions.length === 0 ? (
              <div className="console-empty console-empty--inset">
                <span className="console-empty__icon"><Check size={20} aria-hidden="true" /></span>
                <h3 className="console-empty__title">Nothing is waiting on you</h3>
                <p className="console-empty__text">
                  Your menu, offers and listing details are all in the state you left them. Anything
                  submitted for review will appear here until it is decided.
                </p>
              </div>
            ) : (
              <ul className="records records--bare">
                {actions.map((a) => (
                  <li key={a.key} className="record">
                    <div className="record__main">
                      <p className="record__title">
                        {a.title}
                        <span className={a.pillClass}>{a.pill}</span>
                      </p>
                      <span className="record__meta"><span>{a.detail}</span></span>
                    </div>
                    <Button variant="ghost" size="sm" iconAfter={ArrowRight} onClick={() => onGo(a.tab)}>
                      {a.cta}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">What is public right now</h2>
            </div>
            <ul className="records records--bare">
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Public page</p>
                  <span className="record__meta"><span>Your listing on Khabo Kothay</span></span>
                </div>
                <Button variant="ghost" size="sm" to={`/restaurant/${restaurant.id}`} iconAfter={ExternalLink}>
                  Open
                </Button>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Menu</p>
                  <span className="record__meta"><span>{dishCount} dish{dishCount === 1 ? '' : 'es'} in your working menu</span></span>
                </div>
                <span className={menuLive && dishCount === 0 ? 'status-pill status-pill--pending' : menuState.pill}>
                  {menuLive && dishCount === 0 ? 'Live, but empty' : menuState.text}
                </span>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Offers</p>
                  <span className="record__meta"><span>{publicOffers.length === 0 ? 'None visible to diners' : `${publicOffers.length} visible to diners`}</span></span>
                </div>
                <span className={publicOffers.length > 0 ? 'status-pill status-pill--ok' : 'status-pill'}>
                  {publicOffers.length > 0 ? 'Live' : 'None'}
                </span>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Editorial placement</p>
                  <span className="record__meta"><span>Chosen by the Khabo Kothay team — not requestable here</span></span>
                </div>
                <span className={restaurant.khabo.featured ? 'status-pill status-pill--ok' : 'status-pill'}>
                  {restaurant.khabo.featured ? 'Featured' : 'Not featured'}
                </span>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Verified source link</p>
                  <span className="record__meta"><span>Where your rating, hours and photos are read from</span></span>
                </div>
                <span className={restaurant.google?.placeId ? 'status-pill status-pill--ok' : 'status-pill'}>
                  {restaurant.google?.placeId ? 'Linked' : 'Not linked'}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div>
          {/* The customer-facing preview: the same photograph, name and meta a
              diner sees on a discovery card, built from this restaurant's own
              record so it cannot drift from the public page. */}
          <section className="panel panel--flush">
            <div className="panel__head">
              <h2 className="panel__title">How diners see you</h2>
              <span className="panel__hint">Discovery card</span>
            </div>
            <div className="owner-preview">
              <div className="owner-preview__media">
                <RestaurantImage source={photo} name={restaurant.name} width={640} eager />
              </div>
              <div className="owner-preview__body">
                <strong className="owner-preview__name">{restaurant.name}</strong>
                {restaurant.tagline && <p className="owner-preview__tagline">{restaurant.tagline}</p>}
                <div className="record__meta">
                  {restaurant.cuisines.length > 0 && <span>{restaurant.cuisines.slice(0, 2).join(' · ')}</span>}
                  {restaurant.location && <span>{restaurant.location}</span>}
                  {restaurant.priceForTwo > 0 && <span>{formatCurrency(restaurant.priceForTwo)} for two</span>}
                  {restaurant.khabo.rating > 0
                    ? <span><strong>{restaurant.khabo.rating.toFixed(1)}</strong> Khabo</span>
                    : sourceRating > 0
                      ? <span><strong>{sourceRating.toFixed(1)}</strong> source rating</span>
                      : null}
                </div>
              </div>
            </div>
            <div className="panel__body">
              <p className="t-xs" style={{ color: 'var(--ink-faint)', margin: '0 0 var(--s3)' }}>
                Anything empty above is empty on your public page too.
              </p>
              <Button variant="ghost" size="sm" to={`/restaurant/${restaurant.id}`} iconAfter={ExternalLink}>
                Open the real page
              </Button>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Insights</h2>
              <span className="panel__hint">Not measured yet</span>
            </div>
            <div className="console-empty console-empty--inset">
              <span className="console-empty__icon"><LineChart size={20} aria-hidden="true" /></span>
              <h3 className="console-empty__title">No audience data is recorded</h3>
              <p className="console-empty__text">
                Khabo Kothay does not yet record how many people open your listing, read your menu or
                tap for directions. When that measurement exists it will appear here. Until then this
                space stays empty rather than showing an estimate.
              </p>
            </div>
          </section>
        </div>
      </div>

      <p className="console-footnote">
        <Info size={14} aria-hidden="true" />
        <span>
          The figures on this page are counts of your own records — dishes, offers and reviews — not
          audience measurement.{' '}
          {configured
            ? 'Menu and offer changes are saved to your restaurant’s record. Profile edits and discovery-tag suggestions are held as private drafts in this browser until a Khabo Kothay reviewer approves them.'
            : 'No backend is connected in this build, so everything you change here is stored in this browser only.'}
        </span>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ProfileTab({ restaurant }: { restaurant: Restaurant }) {
  const restaurantId = restaurant.id;
  const draft = getRestaurantDraft(restaurantId);
  // Every field is PRELOADED from the current public listing — a draft only
  // overrides what the owner actually changed; untouched fields stay populated.
  const [name, setName] = useState(draft?.name ?? restaurant.name);
  const [address, setAddress] = useState(draft?.address ?? restaurant.address);
  const [openingHours, setOpeningHours] = useState(draft?.openingHours ?? restaurant.openingHours);
  const [cuisines, setCuisines] = useState((draft?.cuisines ?? restaurant.cuisines).join(', '));
  const [tagline, setTagline] = useState(draft?.tagline ?? restaurant.tagline);
  const [description, setDescription] = useState(draft?.description ?? restaurant.description);
  const [highlights, setHighlights] = useState((draft?.highlights ?? restaurant.khabo.highlights).join('\n'));
  const [notice, setNotice] = useState<string | null>(null);

  const status = draft?.status ?? 'published';
  const locked = status === 'pending';

  const save = (submit: boolean) => {
    upsertRestaurantDraft({
      restaurantId,
      status: submit ? 'pending' : 'draft',
      name: name.trim(),
      address: address.trim(),
      openingHours: openingHours.trim(),
      cuisines: cuisines.split(',').map((c) => c.trim()).filter(Boolean),
      tagline: tagline.trim(),
      description: description.trim(),
      highlights: highlights.split('\n').map((h) => h.trim()).filter(Boolean),
      submittedAt: submit ? new Date().toISOString() : draft?.submittedAt,
      updatedAt: new Date().toISOString(),
    });
    setNotice(submit ? 'Submitted for executive review. Your changes go live after approval.' : 'Draft saved — nothing public changed yet.');
    window.setTimeout(() => setNotice(null), 4000);
  };

  return (
    <>
      {/* The draft state is a property of the whole submission, not of one
          field group, so it is stated once here rather than as a pill floating
          beside a panel title. Emerald is reserved for verification in this
          design system and "published" is not a verification act, so no state
          here borrows it. */}
      {locked ? (
        <div className="console-banner console-banner--pending" role="status">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>Your changes are in review</strong>
            <p>
              These fields are locked until Khabo Kothay approves or declines your submission. Your
              public page is unchanged in the meantime.
            </p>
          </div>
        </div>
      ) : status === 'draft' ? (
        <div className="console-banner console-banner--pending" role="status">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>You have unsubmitted changes</strong>
            <p>
              Your edits are saved privately and nothing public has changed. Submit them for review
              to update your listing.
            </p>
          </div>
        </div>
      ) : (
        <div className="console-banner" role="note">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>Nothing here is public until it is approved</strong>
            <p>
              These fields hold your current public listing. Saving keeps a private draft; submitting
              sends it for review. Your live page only changes after a reviewer approves it.
            </p>
          </div>
        </div>
      )}

      <form className="admin-form" onSubmit={(e) => { e.preventDefault(); save(true); }}>
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Identity</h2>
          </div>
          <div className="admin-form__row">
            <Field label="Restaurant name">
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={locked} />
            </Field>
            <Field label="Cuisines" hint="Comma separated. These decide which cuisine pages list you.">
              <input value={cuisines} onChange={(e) => setCuisines(e.target.value)} disabled={locked} placeholder="Bengali, Kebab, Continental" />
            </Field>
          </div>
          <Field label="Tagline">
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={locked} placeholder="One line a diner reads under your name" />
          </Field>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Where and when</h2>
          </div>
          <div className="admin-form__row">
            <Field label="Address">
              <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={locked} />
            </Field>
            <Field label="Opening hours">
              <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} disabled={locked} placeholder="12:00 PM – 11:00 PM" />
            </Field>
          </div>
        </section>

        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Your story</h2>
            <span className="panel__hint">Shown on your public page</span>
          </div>
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} disabled={locked} />
          </Field>
          <Field label="Highlights" hint="One per line — the short points listed beside your description.">
            <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} disabled={locked} />
          </Field>
        </section>

        <div className="admin-form__actions">
          {/* `unavailable`, not `disabled`. `locked` means a draft is already
              with the editors — a real, temporary, explicable state. As
              `disabled` it dropped both controls out of the tab order and
              said nothing, so an owner who had just submitted found two
              dead buttons and no reason for them. */}
          <Button
            variant="ghost"
            icon={Save}
            onClick={() => save(false)}
            unavailable={locked}
            unavailableReason="Your last submission is with our editors — you can edit again once it clears."
          >
            Save draft
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon={Send}
            unavailable={locked}
            unavailableReason="Already submitted — our editors are reading this draft now."
          >
            Submit for review
          </Button>
          <span className="field__hint">Photos are managed separately, under Photos.</span>
        </div>
        {notice && (
          <div className="console-banner console-banner--ok" role="status">
            <Check size={16} aria-hidden="true" />
            <div className="console-banner__body"><p>{notice}</p></div>
          </div>
        )}
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */

/**
 * One photograph in the console's grid.
 *
 * Two things went wrong here, and both showed up as the same thing on screen —
 * a line of grey text where a photograph should be.
 *
 * 1. A bare `<img>` with no failure handling renders its `alt` when the fetch
 *    fails, and these fetches do fail: Chrome answers a fraction of them with
 *    ERR_BLOCKED_BY_ORB, measured live against the linked Google URLs. It is
 *    intermittent, so one retry against a fresh URL recovers most of it; a tile
 *    that still cannot load says so as a tile rather than impersonating a
 *    caption.
 * 2. The stored links are 122×92 thumbnails. Even when they loaded, they were
 *    being blown up ~1.4× in a 162px tile, which is the softness that made the
 *    panel look unfinished.
 */
function ConsolePhoto({ url, alt }: { url: string; alt: string }) {
  const [attempt, setAttempt] = useState(0);

  if (attempt > 1) {
    return (
      <div className="photo-tile photo-tile--unavailable" role="img" aria-label={`${alt} — could not be loaded`}>
        <ImageOff size={18} aria-hidden="true" />
        <span>Couldn’t be loaded</span>
      </div>
    );
  }

  // 480 covers the 162px tile at 3× and keeps the file small. The retry adds a
  // cache-buster so the browser re-requests instead of replaying the failure.
  const sized = googlePhotoUrlAtWidth(url, 480);
  const src = attempt === 0 ? sized : `${sized}${sized.includes('?') ? '&' : '?'}retry=1`;

  return (
    <img
      className="photo-tile"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setAttempt((a) => a + 1)}
    />
  );
}

/* ------------------------------------------------------------------ */

function PhotosTab({ restaurant }: { restaurant: Restaurant }) {
  const restaurantId = restaurant.id;
  // Only photos the browser can actually resolve. A Places API photoRef with no
  // imageUrl can't be rendered here, so it is not counted as a photo either.
  const googlePhotos = (restaurant.google?.photos ?? []).filter((p) => Boolean(p.imageUrl));
  const configured = isSupabaseConfigured();
  const [ownerImages, setOwnerImages] = useState<{ id: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (configured) {
      fetchOwnerImages(restaurantId)
        .then((rows) => alive && setOwnerImages(rows.map((r) => ({ id: r.id, url: r.image_url }))))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [restaurantId, configured]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      await uploadRestaurantImage(restaurantId, file);
      const rows = await fetchOwnerImages(restaurantId);
      setOwnerImages(rows.map((r) => ({ id: r.id, url: r.image_url })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Your uploads</h2>
          <span className="panel__hint">{configured ? `${ownerImages.length} photo${ownerImages.length === 1 ? '' : 's'}` : 'Not available'}</span>
        </div>

        {configured ? (
          <>
            <p className="t-sm" style={{ color: 'var(--ink-soft)', margin: '0 0 var(--s4)' }}>
              Photographs you upload are stored against your restaurant and kept separate from the
              imagery read from your verified source.
            </p>

            {/* The documented exception. A file picker's trigger has to be
                the `<label>` wrapping its `<input type="file">`, so this one
                control borrows `.btn`'s paint rather than using `Button`. The
                state cursor moved to `.upload-trigger[data-busy]` in
                primitives.css — a cursor that depends on state is a
                stylesheet's job — and the wait now shows the same spinner
                every other busy control in the product shows, at the same
                16px as the icon it replaces. */}
            <label className="btn btn--primary btn--sm upload-trigger" data-busy={uploading || undefined}>
              {uploading
                ? <span className="kk-spinner" aria-hidden="true" />
                : <Upload size={16} aria-hidden="true" />}
              {uploading ? 'Uploading…' : 'Upload a photo'}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={onUpload}
                className="sr-only"
              />
            </label>

            {error && (
              <div className="console-banner console-banner--danger" role="alert" style={{ marginTop: 'var(--s4)' }}>
                <Info size={16} aria-hidden="true" />
                <div className="console-banner__body"><p>{error}</p></div>
              </div>
            )}

            {ownerImages.length > 0 ? (
              <div className="photo-grid">
                {ownerImages.map((img) => (
                  <ConsolePhoto key={img.id} url={img.url} alt={`${restaurant.name} owner photo`} />
                ))}
              </div>
            ) : (
              <div className="console-empty console-empty--inset">
                <span className="console-empty__icon"><ImageIcon size={20} aria-hidden="true" /></span>
                <h3 className="console-empty__title">You haven’t uploaded a photo yet</h3>
                <p className="console-empty__text">
                  Your listing currently shows whatever imagery is linked from your verified source.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><ImageIcon size={20} aria-hidden="true" /></span>
            <h3 className="console-empty__title">Uploads aren’t enabled in this build</h3>
            <p className="console-empty__text">
              There is no storage backend connected, so photographs can’t be added here. The imagery
              below is read from your linked source and is read-only.
            </p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Linked source photos</h2>
          <span className="panel__hint">{googlePhotos.length > 0 ? `${googlePhotos.length} photo${googlePhotos.length === 1 ? '' : 's'} · read-only` : 'None linked'}</span>
        </div>
        {googlePhotos.length > 0 ? (
          <div className="photo-grid">
            {googlePhotos.map((p, i) => (
              <ConsolePhoto
                key={p.imageUrl ?? i}
                url={p.imageUrl ?? ''}
                alt={p.alt ?? `${restaurant.name} photo`}
              />
            ))}
          </div>
        ) : (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><ImageIcon size={20} aria-hidden="true" /></span>
            <h3 className="console-empty__title">No photos are linked yet</h3>
            <p className="console-empty__text">
              Your listing has no imagery from a verified source. Khabo Kothay links these — you
              can’t add them here.
            </p>
          </div>
        )}
        <p className="panel__foot">
          Source metadata is preserved per image, so a diner can always see where a photograph came from.
        </p>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function MenuTab({ restaurant, ownerMenu }: { restaurant: Restaurant; ownerMenu: OwnerMenuState }) {
  if (isSupabaseConfigured()) return <OwnerMenuTab restaurant={restaurant} owner={ownerMenu} />;
  return <MenuEditorTab restaurant={restaurant} />;
}

function OwnerMenuTab({ restaurant, owner }: { restaurant: Restaurant; owner: OwnerMenuState }) {
  const [localMenu, setLocalMenu] = useState<Menu | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMenu(owner.menu);
  }, [owner.menu]);

  const runWrite = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(describeWriteFailure(err));
    }
  };

  const handlePersist = (next: Menu) => setLocalMenu(next);
  const onSave = () => runWrite(async () => {
    if (localMenu) await owner.saveDraft(localMenu);
  });
  const onSubmit = () => runWrite(async () => {
    if (!localMenu) return;
    await owner.saveDraft(localMenu);
    await owner.submitForReview();
  });
  const onCreate = () => runWrite(() => owner.createDraft());

  const state = menuStateLabel(owner.menuStatus);
  const dishTotal = localMenu ? localMenu.categories.reduce((n, c) => n + c.dishes.length, 0) : 0;

  /* A published menu record with no dishes on it is a real state in the data —
     the restaurant has a menu row, and diners see nothing. Saying "this is your
     live public menu" there would be technically true and practically a lie, so
     the empty case gets its own sentence.

     `owner.localDraft` is the demonstration venue's browser-only draft. Every
     sentence below promises something about what happens next — approval, review,
     notification — and none of it is true for a draft the backend never received.
     So it gets said plainly rather than dressed as the real workflow. */
  const banner =
    owner.localDraft
      ? owner.menuStatus === 'PENDING_REVIEW'
        ? 'Submitted — inside this demonstration only. Nothing reached Khabo Kothay’s reviewers, and reloading the page clears it.'
        : 'A demonstration draft, held in this browser only. Edit it freely to see how the menu workflow behaves; it is never sent to Khabo Kothay, and reloading the page clears it.'
      : owner.menuStatus === 'DRAFT'
        ? 'This is a private draft. Save it any time; it replaces your live menu only after Khabo Kothay approves a submission.'
        : owner.menuStatus === 'PENDING_REVIEW'
          ? "Submitted for review — you'll be notified when Khabo Kothay publishes it. It stays private until then."
          : owner.menuStatus === 'PUBLISHED'
            ? dishTotal === 0
              ? 'Your menu record is live but has no dishes on it, so diners see no menu at all. Create a draft to add them.'
              : 'This is your live public menu. Create a draft to propose changes (forked from this menu).'
            : 'No menu recorded yet. Create a draft to start building your menu.';

  const bannerTone =
    owner.localDraft ? 'console-banner console-banner--pending'
    : owner.menuStatus === 'PENDING_REVIEW' ? 'console-banner console-banner--pending'
    : owner.menuStatus === 'PUBLISHED' && dishTotal === 0 ? 'console-banner console-banner--pending'
    : owner.menuStatus === 'PUBLISHED' ? 'console-banner console-banner--ok'
    : 'console-banner';

  const stateText =
    owner.localDraft
      ? owner.menuStatus === 'PENDING_REVIEW' ? 'Submitted (demonstration)' : 'Draft (this browser only)'
      : owner.menuStatus === 'PUBLISHED' && dishTotal === 0 ? 'Live, but empty'
      : state.text;

  return (
    <>
      {owner.loading && (
        <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Loading your menu…</p>
      )}
      {owner.status === 'error' && (
        <div className="console-banner console-banner--danger" role="alert">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>Your menu couldn’t be loaded</strong>
            <p>Nothing has been changed. Try again in a moment.</p>
          </div>
        </div>
      )}

      {!owner.loading && (
        <div className={bannerTone} role="status">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>{stateText}</strong>
            <p>{banner}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="console-banner console-banner--danger" role="alert">
          <Info size={16} aria-hidden="true" />
          <div className="console-banner__body">
            <strong>This change wasn’t saved</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {localMenu && (
        <MenuEditorTab restaurant={restaurant} menu={localMenu} onPersist={handlePersist} readOnly={!owner.canEdit} />
      )}

      {!owner.loading && !localMenu && owner.menuStatus === null && (
        <div className="console-empty">
          <span className="console-empty__icon"><UtensilsCrossed size={20} aria-hidden="true" /></span>
          <h3 className="console-empty__title">No menu recorded yet</h3>
          <p className="console-empty__text">
            Create a draft to start building your menu. Nothing is public until you submit it and
            Khabo Kothay approves it.
          </p>
          <div className="console-empty__actions">
            <Button variant="primary" size="sm" icon={Plus} busy={owner.saving} onClick={onCreate}>
              Create draft
            </Button>
          </div>
        </div>
      )}

      {(owner.canEdit || (!owner.canEdit && owner.menuStatus !== 'PENDING_REVIEW' && owner.menuStatus !== null)) && (
        <div className="admin-form__actions">
          {owner.canEdit ? (
            <>
              {/* `busy`, not `disabled`: these two already changed their own
                  label mid-flight, which is the weakest signal a control can
                  give — invisible to anyone whose eyes are on the menu rows
                  above. The primitive keeps the words and adds the spinner
                  and `aria-busy`. */}
              <Button variant="ghost" icon={Save} busy={owner.saving} onClick={onSave}>
                {owner.saving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button variant="primary" icon={Send} busy={owner.submitting} onClick={onSubmit}>
                {owner.submitting ? 'Submitting…' : 'Submit for review'}
              </Button>
              <span className="field__hint">
                {owner.localDraft
                  ? 'Both buttons act on the demonstration draft in this browser. Nothing leaves your device.'
                  : 'Saving keeps it private. Submitting sends it for review.'}
              </span>
            </>
          ) : (
            <>
              <Button variant="primary" icon={Plus} busy={owner.saving} onClick={onCreate}>
                Create draft
              </Button>
              <span className="field__hint">A draft is forked from your live menu, so you start where you are.</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

function MenuEditorTab({ restaurant, menu: menuProp, onPersist, readOnly }: {
  restaurant: Restaurant;
  menu?: Menu;
  onPersist?: (next: Menu) => void;
  readOnly?: boolean;
}) {
  const demoMenu = getEffectiveMenu(restaurant);
  const menu = menuProp ?? demoMenu;
  const [newCat, setNewCat] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishDesc, setDishDesc] = useState('');
  const [editing, setEditing] = useState<{ categoryId: string; dishId: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const persist = (next: Menu) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    if (onPersist) onPersist(stamped);
    else saveMenuOverride(stamped);
  };

  const addCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    const next = { ...menu, categories: [...menu.categories, { id: uid('cat'), name: newCat.trim(), order: menu.categories.length + 1, dishes: [] }] };
    persist(next);
    setNewCat('');
  };

  const removeCategory = (id: string) => {
    persist({ ...menu, categories: menu.categories.filter((c) => c.id !== id) });
  };

  const addDish = (e: FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!dishName.trim()) return;
    const price = Number(dishPrice) || 0;
    const cat = menu.categories.find((c) => c.id === categoryId);
    if (!cat) return;
    const dish: MenuItem = {
      id: uid('dish'),
      name: dishName.trim(),
      description: dishDesc.trim() || undefined,
      price,
      available: true,
      source: 'restaurant',
      lastUpdated: new Date().toISOString().slice(0, 10),
      priceHistory: [{ id: uid('snap'), price, at: new Date().toISOString().slice(0, 10), source: 'restaurant', recordedBy: 'Restaurant admin', status: 'recorded' }],
    };
    persist({ ...menu, categories: menu.categories.map((c) => c.id === categoryId ? { ...c, dishes: [...c.dishes, dish] } : c) });
    setDishName(''); setDishPrice(''); setDishDesc(''); setAddingTo(null);
  };

  const removeDish = (categoryId: string, dishId: string) => {
    persist({ ...menu, categories: menu.categories.map((c) => c.id === categoryId ? { ...c, dishes: c.dishes.filter((d) => d.id !== dishId) } : c) });
  };

  const toggleDish = (categoryId: string, dishId: string) => {
    persist({ ...menu, categories: menu.categories.map((c) => c.id === categoryId ? { ...c, dishes: c.dishes.map((d) => d.id === dishId ? { ...d, available: !d.available } : d) } : c) });
  };

  const toggleFeatured = (categoryId: string, dishId: string) => {
    persist({ ...menu, categories: menu.categories.map((c) => c.id === categoryId ? { ...c, dishes: c.dishes.map((d) => d.id === dishId ? { ...d, featured: !d.featured } : d) } : c) });
  };

  const toggleSignature = (categoryId: string, dishId: string) => {
    persist({ ...menu, categories: menu.categories.map((c) => c.id === categoryId ? { ...c, dishes: c.dishes.map((d) => d.id === dishId ? { ...d, isSignature: !d.isSignature } : d) } : c) });
  };

  const startEdit = (categoryId: string, dish: MenuItem) => {
    setEditing({ categoryId, dishId: dish.id });
    setEditName(dish.name);
    setEditPrice(String(dish.price));
    setEditDesc(dish.description ?? '');
  };

  const saveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const price = Number(editPrice) || 0;
    const prev = menu.categories.find((c) => c.id === editing.categoryId)?.dishes.find((d) => d.id === editing.dishId);
    if (!prev) return;
    persist({
      ...menu,
      categories: menu.categories.map((c) =>
        c.id === editing.categoryId
          ? {
              ...c,
              dishes: c.dishes.map((d) => {
                if (d.id !== editing.dishId) return d;
                const history = price !== d.price
                  ? [...d.priceHistory, { id: uid('snap'), price, at: new Date().toISOString().slice(0, 10), source: 'restaurant' as const, recordedBy: 'Restaurant admin', status: 'recorded' as const }]
                  : d.priceHistory;
                return {
                  ...d,
                  name: editName.trim() || d.name,
                  price,
                  description: editDesc.trim() || undefined,
                  lastUpdated: new Date().toISOString().slice(0, 10),
                  priceHistory: history,
                };
              }),
            }
          : c,
      ),
    });
    setEditing(null);
  };

  const moveDish = (categoryId: string, dishId: string, dir: -1 | 1) => {
    persist({
      ...menu,
      categories: menu.categories.map((c) => {
        if (c.id !== categoryId) return c;
        const idx = c.dishes.findIndex((d) => d.id === dishId);
        const target = idx + dir;
        if (idx < 0 || target < 0 || target >= c.dishes.length) return c;
        const dishes = [...c.dishes];
        [dishes[idx], dishes[target]] = [dishes[target], dishes[idx]];
        return { ...c, dishes };
      }),
    });
  };

  const dishTotal = menu.categories.reduce((n, c) => n + c.dishes.length, 0);

  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Menu</h2>
        <span className="panel__hint">
          {menu.categories.length} categor{menu.categories.length === 1 ? 'y' : 'ies'} · {dishTotal} dish{dishTotal === 1 ? '' : 'es'}
        </span>
      </div>

      {!readOnly && (
        <form className="admin-inline-form" onSubmit={addCategory}>
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name, e.g. Starters" aria-label="New category name" />
          <Button type="submit" variant="ghost" size="sm" icon={Plus}>Add category</Button>
        </form>
      )}

      {menu.categories.length === 0 && (
        <div className="console-empty console-empty--inset">
          <span className="console-empty__icon"><ChefHat size={20} aria-hidden="true" /></span>
          <h3 className="console-empty__title">
            {readOnly ? 'No dishes are recorded on this menu' : 'No menu added yet'}
          </h3>
          <p className="console-empty__text">
            {readOnly
              ? 'The menu record exists, but nothing has been added to it — so a diner opening your page sees no menu.'
              : 'Add your first category to start building the menu. Dishes, prices and descriptions are added per category.'}
          </p>
        </div>
      )}

      {menu.categories.map((cat) => (
        <div key={cat.id} className="menu-cat">
          <div className="console-section__head menu-cat__head">
            <h3 className="console-section__title">{cat.name}</h3>
            <span className="console-section__hint">{cat.dishes.length} dish{cat.dishes.length === 1 ? '' : 'es'}</span>
            {!readOnly && (
              <div className="row-actions">
                <IconButton
                  icon={Trash2}
                  label={`Delete category ${cat.name}`}
                  tone="danger"
                  shape="square"
                  onClick={() => removeCategory(cat.id)}
                />
              </div>
            )}
          </div>

          <ul className="records">
            {cat.dishes.map((d) => (
              <li key={d.id} className={editing?.dishId === d.id ? 'record record--stack' : 'record'}>
                {editing?.dishId === d.id ? (
                  <form className="admin-inline-form admin-inline-form--edit" onSubmit={saveEdit}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Dish name" />
                    <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="numeric" aria-label="Price" className="admin-price-input" />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} aria-label="Description" placeholder="Short description (optional)" />
                    <Button type="submit" variant="primary" size="sm" icon={Save}>Save</Button>
                    {/* `subtle`, not `ghost`. Save and Cancel sat side by side
                        in the same weight; the one that discards work should
                        not read as loud as the one that keeps it. */}
                    <Button variant="subtle" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                  </form>
                ) : (
                  <>
                    <div className="record__main">
                      <p className="record__title">
                        {d.name}
                        {d.isSignature && <span className="status-pill">Signature</span>}
                        {d.featured && <span className="status-pill">Chef’s pick</span>}
                      </p>
                      <span className="record__meta">
                        {d.description && <span>{d.description}</span>}
                        {!d.available && <span className="status-text status-text--pending">Hidden from diners</span>}
                      </span>
                    </div>
                    <span className="record__figure">{formatCurrency(d.price)}</span>
                    {!readOnly && (
                      <div className="row-actions">
                        <div className="row-actions__group">
                          <IconButton icon={ArrowUp} label={`Move ${d.name} up`} shape="square" onClick={() => moveDish(cat.id, d.id, -1)} />
                          <IconButton icon={ArrowDown} label={`Move ${d.name} down`} shape="square" onClick={() => moveDish(cat.id, d.id, 1)} />
                        </div>
                        <div className="row-actions__group">
                          <IconButton
                            icon={Star}
                            shape="square"
                            {...CONSOLE_ON}
                            /* The star fills when it is on: a solid star is the
                               recognised "kept" shape, and at 16px an outline
                               against a pale ground is easy to miss. */
                            fillWhenPressed
                            pressed={Boolean(d.isSignature)}
                            label={d.isSignature ? `Remove signature mark from ${d.name}` : `Mark ${d.name} as signature`}
                            onClick={() => toggleSignature(cat.id, d.id)}
                          />
                          <IconButton
                            icon={Award}
                            shape="square"
                            {...CONSOLE_ON}
                            /* Not filled: a rosette with a ribbon becomes a blob
                               the moment its interior is painted. */
                            pressed={Boolean(d.featured)}
                            label={d.featured ? `Remove chef’s pick from ${d.name}` : `Make ${d.name} a chef’s pick`}
                            onClick={() => toggleFeatured(cat.id, d.id)}
                          />
                          <IconButton
                            icon={d.available ? Eye : EyeOff}
                            shape="square"
                            {...CONSOLE_ON}
                            /* This one already announced `aria-pressed` while
                               carrying no visual pressed state at all, so a
                               hidden dish looked exactly like a visible one to
                               anyone not reading the row's status text. The
                               primitive gives it the same soft ground as its two
                               neighbours, and the glyph itself changes. */
                            pressed={!d.available}
                            label={d.available ? `Hide ${d.name} from diners` : `Show ${d.name} to diners`}
                            onClick={() => toggleDish(cat.id, d.id)}
                          />
                        </div>
                        <div className="row-actions__group">
                          <IconButton icon={Pencil} label={`Edit ${d.name}`} shape="square" onClick={() => startEdit(cat.id, d)} />
                          <IconButton icon={Trash2} label={`Delete ${d.name}`} tone="danger" shape="square" onClick={() => removeDish(cat.id, d.id)} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>

          {!readOnly && (
            addingTo === cat.id ? (
              <form className="admin-inline-form" onSubmit={(e) => addDish(e, cat.id)}>
                <input value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Dish name" aria-label="Dish name" />
                <input value={dishPrice} onChange={(e) => setDishPrice(e.target.value)} inputMode="numeric" placeholder="Price" aria-label="Price" className="admin-price-input" />
                <input value={dishDesc} onChange={(e) => setDishDesc(e.target.value)} placeholder="Short description (optional)" aria-label="Description" />
                <Button type="submit" variant="primary" size="sm" icon={Plus}>Add</Button>
                <Button variant="subtle" size="sm" onClick={() => setAddingTo(null)}>Cancel</Button>
              </form>
            ) : (
              <Button variant="ghost" size="sm" className="menu-cat__add" icon={Plus} onClick={() => setAddingTo(cat.id)}>
                Add dish to {cat.name}
              </Button>
            )
          )}
        </div>
      ))}

      <p className="panel__foot">
        Changing a price appends a new recorded snapshot — diners see the change as price history,
        and Khabo Kothay can verify it.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

type OffersApi = ReturnType<typeof useRestaurantOffers>;

function OffersTab({ restaurantName, myOffers, publicOffers, createOffer, submitOffer, removeOffer }: {
  restaurantName: string; myOffers: Offer[]; publicOffers: Offer[];
  createOffer: OffersApi['createOffer'];
  submitOffer: OffersApi['submitOffer'];
  removeOffer: OffersApi['removeOffer'];
}) {
  const [form, setForm] = useState({ title: '', discountLabel: '', value: '', validity: '', terms: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [composing, setComposing] = useState(false);
  const { session } = useAuth();

  // Friendly labels for the offer lifecycle so owners can track status at a glance
  // (draft → pending approval → approved/public, plus scheduled/expired).
  const statusLabel = (s: Offer['status']): string =>
    ({ draft: 'Draft', pending: 'Pending approval', approved: 'Approved · public', scheduled: 'Scheduled', expired: 'Expired' } as Record<Offer['status'], string>)[s] ?? s;

  const statusPill = (s: Offer['status']): string =>
    s === 'approved' ? 'status-pill status-pill--ok'
    : s === 'pending' ? 'status-pill status-pill--pending'
    : s === 'expired' ? 'status-pill status-pill--danger'
    : 'status-pill';

  const setField = (key: keyof typeof form, value: string) => {
    setForm({ ...form, [key]: value });
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const handleCreateOffer = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateOfferDraft(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    createOffer({
      title: form.title.trim(),
      discountLabel: form.discountLabel.trim(),
      value: form.value.trim() || 'See restaurant',
      validity: form.validity.trim() || 'Limited time',
      terms: form.terms.trim() || 'Demo offer — not redeemable in real restaurants.',
    });
    setForm({ title: '', discountLabel: '', value: '', validity: '', terms: '' });
    setErrors({});
    setComposing(false);
  };

  return (
    <>
      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Your offers</h2>
          <span className="panel__hint">{myOffers.length === 0 ? 'None yet' : `${myOffers.length} total`}</span>
          {!composing && (
            <div className="panel__actions">
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setComposing(true)}>
                New offer
              </Button>
            </div>
          )}
        </div>

        {composing && (
          <form className="admin-form" onSubmit={handleCreateOffer} noValidate>
            <div className="admin-form__row">
              <Field label="Title" error={errors.title}>
                <input value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Weekend biryani combo" />
              </Field>
              <Field label="Discount label" error={errors.discountLabel}>
                <input value={form.discountLabel} onChange={(e) => setField('discountLabel', e.target.value)} placeholder="e.g. 20% off" />
              </Field>
            </div>
            <div className="admin-form__row">
              <Field label="Value" error={errors.value}>
                <input value={form.value} onChange={(e) => setField('value', e.target.value)} placeholder="e.g. Save up to ৳400" />
              </Field>
              <Field label="Validity" error={errors.validity}>
                <input value={form.validity} onChange={(e) => setField('validity', e.target.value)} placeholder="e.g. Weekdays, 12–4 PM" />
              </Field>
            </div>
            <Field label="Terms" error={errors.terms}>
              <input value={form.terms} onChange={(e) => setField('terms', e.target.value)} placeholder="Conditions of the offer" />
            </Field>
            <div className="admin-form__actions">
              {/* `Save`, not `Plus`: the press writes a draft, it does not add
                  another one. */}
              <Button type="submit" variant="primary" icon={Save}>Save as draft</Button>
              <Button variant="subtle" onClick={() => { setComposing(false); setErrors({}); }}>Cancel</Button>
              <span className="field__hint">A draft is private until you submit it for approval.</span>
            </div>
          </form>
        )}

        {myOffers.length === 0 ? (
          !composing && (
            <div className="console-empty console-empty--inset">
              <span className="console-empty__icon"><BadgePercent size={20} aria-hidden="true" /></span>
              <h3 className="console-empty__title">No offers yet</h3>
              <p className="console-empty__text">
                An offer appears on your public page and in Khabo Kothay’s offer listings once it is
                approved. Drafts stay private.
              </p>
            </div>
          )
        ) : (
          <ul className="records">
            {myOffers.map((o) => (
              <li key={o.id} className="record">
                <div className="record__main">
                  <p className="record__title">
                    {o.title}
                    <span className={statusPill(o.status)}>{statusLabel(o.status)}</span>
                  </p>
                  <span className="record__meta">
                    <span>{o.discountLabel}</span>
                    <span>{o.validity}</span>
                  </span>
                </div>
                <div className="row-actions">
                  {o.status === 'draft' && (
                    <Button variant="ghost" size="sm" icon={Send} onClick={() => submitOffer(o.id)}>
                      Submit
                    </Button>
                  )}
                  <IconButton
                    icon={Trash2}
                    label={`Delete ${o.title}`}
                    tone="danger"
                    shape="square"
                    onClick={() => removeOffer(o.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Visible to diners</h2>
          <span className="panel__hint">{publicOffers.length === 0 ? 'Nothing public' : `${publicOffers.length} live`}</span>
        </div>
        {publicOffers.length === 0 ? (
          <p className="t-sm" style={{ color: 'var(--ink-soft)', margin: 0 }}>
            Nothing of yours is showing on the public site right now.
          </p>
        ) : (
          <ul className="records">
            {publicOffers.map((o) => (
              <li key={o.id} className="record">
                <div className="record__main">
                  <p className="record__title">{o.title}</p>
                  <span className="record__meta">
                    <span>{o.discountLabel}</span>
                    <span>{o.validity}</span>
                  </span>
                </div>
                <span className="status-pill status-pill--ok">{o.source === 'seed' ? 'Platform' : 'Approved'}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="panel__foot">
          {session?.name ?? 'You'} can manage only {restaurantName}’s offers — never another restaurant’s.
        </p>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ReviewsTab({ restaurant, myReviews }: {
  restaurant: Restaurant; myReviews: ReturnType<typeof useUserReviews>;
}) {
  const all = [...myReviews, ...restaurant.khabo.reviews];
  return (
    <section className="panel">
      <div className="panel__head">
        <h2 className="panel__title">What diners wrote</h2>
        <span className="panel__hint">{all.length === 0 ? 'None yet' : `${all.length} review${all.length === 1 ? '' : 's'}`}</span>
      </div>
      {all.length === 0 ? (
        <div className="console-empty console-empty--inset">
          <span className="console-empty__icon"><MessageSquareQuote size={20} aria-hidden="true" /></span>
          <h3 className="console-empty__title">No reviews yet</h3>
          <p className="console-empty__text">
            Reviews written on Khabo Kothay appear here as soon as they are posted.
          </p>
        </div>
      ) : (
        <div className="reviews">
          {all.map((r, i) => (
            <blockquote key={`${r.id ?? i}`} className="review">
              <div className="review__head">
                <span className="review__avatar" aria-hidden="true">{r.author.charAt(0)}</span>
                <div>
                  <strong>{r.author}{'userId' in r ? ' · In the app' : ''}</strong>
                </div>
                <span className="review__date">{r.date}</span>
              </div>
              <p>“{r.comment}”</p>
            </blockquote>
          ))}
        </div>
      )}
      <p className="panel__foot">
        Replying to a review and reporting one arrive with moderation tooling — neither exists yet, so
        neither is offered here.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const FIELD_META: Array<{ key: IntelligenceSuggestion['field']; label: string; vocabulary: string[] }> = [
  { key: 'specialties', label: 'Specialties', vocabulary: [...SPECIALTIES] },
  { key: 'bestFor', label: 'Best for', vocabulary: [...BEST_FOR] },
  { key: 'foodCharacteristics', label: 'Food characteristics', vocabulary: [...FOOD_CHARACTERISTICS] },
  { key: 'diningFeatures', label: 'Dining features', vocabulary: [...DINING_FEATURES] },
];

function AttributesTab({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const suggestions = useSuggestions();
  const effective = getEffectiveIntelligence(restaurantId);
  const [form, setForm] = useState<{ field: IntelligenceSuggestion['field']; value: string; action: 'add' | 'remove'; note: string }>({
    field: 'specialties',
    value: '',
    action: 'add',
    note: '',
  });
  const [notice, setNotice] = useState<string | null>(null);

  const mine = suggestions.filter((s) => s.restaurantId === restaurantId);
  const openCount = mine.filter((s) => s.status === 'pending').length;
  const meta = FIELD_META.find((m) => m.key === form.field)!;
  const current = effective[form.field] as string[];
  const available = meta.vocabulary.filter((v) => !current.includes(v));

  const provenance =
    effective.provenance === 'seed' ? 'curated by Khabo Kothay'
    : effective.provenance === 'derived' ? 'derived from the venue’s own attributes (heuristic, not verified)'
    : effective.provenance === 'verified' ? 'independently verified by Khabo Kothay'
    : 'seed plus approved restaurant suggestions';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.value) return;
    upsertSuggestion({
      id: uid('attr'),
      restaurantId,
      field: form.field,
      add: form.action === 'add' ? [form.value] : [],
      remove: form.action === 'remove' ? [form.value] : [],
      note: form.note.trim() || undefined,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    setNotice(`“${form.value}” submitted for executive review — it only becomes live recommendation metadata after approval.`);
    setForm({ ...form, value: '', note: '' });
    window.setTimeout(() => setNotice(null), 5000);
  };

  return (
    <>
      <div className="console-banner" role="note">
        <Sparkles size={16} aria-hidden="true" />
        <div className="console-banner__body">
          <strong>You suggest, Khabo Kothay approves</strong>
          <p>
            These structured tags decide which searches surface {restaurantName}. A tag is never
            inferred from your menu or description, and a suggestion has no effect on recommendations
            until it is approved.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Live metadata</h2>
          <span className="panel__hint">{provenance}</span>
        </div>
        <dl className="console-defs">
          {FIELD_META.map((m) => {
            const values = effective[m.key] as string[];
            return (
              <div key={m.key}>
                <dt>{m.label}</dt>
                <dd data-empty={values.length === 0 ? 'true' : undefined}>
                  {values.length > 0 && (
                    <span className="chip-row">
                      {values.map((v) => <span key={v} className="chip">{v}</span>)}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Suggest a change</h2>
        </div>
        <form className="admin-form" onSubmit={submit}>
          <div className="admin-form__row admin-form__row--three">
            <Field label="Attribute">
              <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value as IntelligenceSuggestion['field'], value: '' })}>
                {FIELD_META.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Action">
              <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as 'add' | 'remove', value: '' })}>
                <option value="add">Add</option>
                <option value="remove">Remove</option>
              </select>
            </Field>
            <Field label="Value">
              <select value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}>
                <option value="">Choose…</option>
                {form.action === 'add'
                  ? available.map((v) => <option key={v} value={v}>{v}</option>)
                  : current.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Why?" optional hint="Helps the reviewer decide.">
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. We've been serving thalis for a decade" />
          </Field>
          <div className="admin-form__actions">
            {/* `unavailable` + a reason. An empty select is a step not taken
                yet, not a permanent no — and the old `disabled` skipped the
                only submit on the panel without saying what it wanted. */}
            <Button
              type="submit"
              variant="primary"
              icon={Send}
              unavailable={!form.value}
              unavailableReason="Pick what to add or remove first."
            >
              Submit for approval
            </Button>
          </div>
          {notice && (
            <div className="console-banner console-banner--ok" role="status">
              <Check size={16} aria-hidden="true" />
              <div className="console-banner__body"><p>{notice}</p></div>
            </div>
          )}
        </form>
      </section>

      <section className="panel">
        <div className="panel__head">
          <h2 className="panel__title">Your suggestions</h2>
          <span className="panel__hint">
            {mine.length === 0 ? 'None yet' : `${openCount} pending of ${mine.length}`}
          </span>
        </div>
        {mine.length === 0 ? (
          <p className="t-sm" style={{ color: 'var(--ink-soft)', margin: 0 }}>
            You haven’t suggested a tag yet.
          </p>
        ) : (
          <ul className="records">
            {mine.map((s) => (
              <li key={s.id} className="record">
                <div className="record__main">
                  <p className="record__title">{s.add[0] ?? s.remove[0]}</p>
                  <span className="record__meta">
                    <span>{s.add.length > 0 ? 'Add' : 'Remove'}</span>
                    <span>{FIELD_META.find((m) => m.key === s.field)?.label}</span>
                    {s.note && <span>“{s.note}”</span>}
                  </span>
                </div>
                <span className={
                  s.status === 'pending' ? 'status-pill status-pill--pending'
                  : s.status === 'approved' ? 'status-pill status-pill--ok'
                  : s.status === 'rejected' ? 'status-pill status-pill--danger'
                  : 'status-pill'
                }>
                  {s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
