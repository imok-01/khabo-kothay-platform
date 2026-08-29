import { Fragment, useEffect, useState, useCallback, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  Store, MessageSquareQuote, ShieldCheck, Check, X, Flag, History, TrendingUp,
  TrendingDown, ExternalLink, RefreshCw, FileCheck, AlertTriangle, Inbox, Sparkles,
  Ticket, UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';
import { getAllUsers } from '../hooks/useUsers';
import { useAdminOffers, upsertAdminOffer } from '../hooks/useAdminOffers';
import { fetchOffers, setDbOfferStatus, deleteDbOffer } from '../repositories/offerRepository';
import { isSupabaseConfigured } from '../integrations/supabase/client';
import type { Offer } from '../domain/offers';
import { useUserReviews, useFlags, upsertFlag } from '../hooks/useReviews';
import {
  useRestaurantDrafts, upsertRestaurantDraft, useSuggestions, resolveSuggestion, type RestaurantDraft,
} from '../hooks/useDrafts';
import { getRewards, tokenBalance } from '../hooks/useRewards';
import { restaurants, useMenusVersion } from '../hooks/useRestaurantData';
import { useRestaurants } from '../hooks/useRestaurants';
import type { IntelligenceSuggestion } from '../domain/intelligence';
import { getEffectiveMenu } from '../lib/menu';
import { selectRestaurantPhotos } from '../lib/photos';
import { priceChange } from '../lib/menu';
import { getAllOffers } from '../hooks/useOffers';
import { formatCurrency } from '../lib/format';
import { menuService } from '../services/menuService';
import { diffMenus } from '../transformers/menu';
import { effectiveRating } from '../lib/ratings';
import { DEMO_ACCOUNT_CREDENTIALS } from '../hooks/useAccounts';
import type { Menu } from '../domain/menu';
import GoogleRefreshButton from '../components/GoogleRefreshButton';
import { isGooglePlacesConfigured, refreshGoogleBulk } from '../hooks/useGoogleRefresh';
import { selectAllRestaurantApplications, reviewRestaurantApplication } from '../integrations/supabase/queries';
import { applicationStatusLabel, applicationStatusClass } from '../domain/restaurantApplication';
import type { RestaurantApplicationsRow } from '../integrations/supabase/database.types';
import { statusPill, roleLabel } from '../lib/statusPill';
import { Badge, Button, Chip, Field } from '../components/ui';

/* ------------------------------------------------------------------ */
/* Executive offer queue — reads owner-submitted offers from Supabase   */
/* (the `offers` table) so pending submissions are actually visible, and */
/* approves/rejects them through the same lifecycle (no parallel store). */
/* ------------------------------------------------------------------ */

function useExecutiveOffers() {
  const configured = isSupabaseConfigured();
  const local = useAdminOffers();
  const [remote, setRemote] = useState<Offer[] | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!configured) {
      setRemote(null);
      return;
    }
    setLoading(true);
    try {
      setRemote(await fetchOffers());
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // When Supabase is configured the `offers` table is the source of truth;
  // otherwise fall back to the local demo store (mapped to the same shape).
  const offers: Offer[] = configured
    ? (remote ?? [])
    : local.map<Offer>((o) => ({
        id: o.id,
        restaurantId: o.restaurantId,
        title: o.title,
        discountLabel: o.discountLabel,
        value: o.value,
        validity: o.validity,
        terms: o.terms,
        applicableMealTypes: ['Lunch', 'Dinner'],
        isMock: true,
        source: 'admin',
        status: (o.status as Offer['status']) ?? 'approved',
      }));

  const decide = useCallback(
    async (id: string, approve: boolean) => {
      if (configured) {
        if (approve) await setDbOfferStatus(id, 'approved');
        else await deleteDbOffer(id);
        await reload();
      } else {
        const o = local.find((x) => x.id === id);
        if (o) upsertAdminOffer({ ...o, status: approve ? 'approved' : 'rejected' });
      }
    },
    [configured, local, reload],
  );

  return { offers, loading, decide };
}

/* A middot-separated meta line that drops what it does not have. Four rows in
   this console built theirs by interpolating `a · b · c · {lookup?.name}`, and
   the lookup misses for any offer or suggestion whose restaurant is not in the
   loaded catalogue — so the line ended on a dangling separator. Measured live on
   /admin/offers: all six pending rows read "69% · 1000 · 6-9-69 ·". */
function metaLine(...parts: Array<string | number | null | undefined>): string {
  return parts
    .map((p) => (typeof p === 'number' ? String(p) : p?.trim()))
    .filter((p): p is string => Boolean(p))
    .join(' · ');
}

/* ------------------------------------------------------------------ */
/* Route surface.                                                       */
/*                                                                      */
/* This page used to be the whole console: one route (`/admin`) with a   */
/* nine-button tab strip, while AdminLayout's sidebar offered seven      */
/* destinations of which six were prose placeholders. A KK reviewer      */
/* clicking "Restaurants" in the sidebar got a coming-soon page while    */
/* the real restaurant table sat behind a tab they had to know about.    */
/*                                                                      */
/* The tab bodies below are unchanged tools — they are now exported and  */
/* mounted one per route, so the sidebar is the only navigation and      */
/* every section is linkable, bookmarkable and back-button safe. No tool */
/* was rebuilt and no functionality was added.                          */
/* ------------------------------------------------------------------ */

function NotExecutive() {
  return (
    <main className="section section--narrow">
      <div className="section__inner">
        <div className="access-denied">
          <ShieldCheck size={40} aria-hidden="true" />
          <h1>Executive access only</h1>
          <p>Sign in with an executive account to manage the platform.</p>
          <Button variant="primary" to="/login">Sign in</Button>
        </div>
      </div>
    </main>
  );
}

export type AdminSectionKey =
  | 'restaurants' | 'applications' | 'menus' | 'intelligence'
  | 'offers' | 'reviews' | 'prices' | 'users';

/**
 * Head copy per section. Kept beside the tools rather than in AdminLayout so a
 * section and its description cannot drift apart.
 */
const SECTION_META: Record<AdminSectionKey, {
  eyebrow: string;
  title: string;
  sub: string;
  Body: ComponentType;
}> = {
  restaurants: {
    eyebrow: 'Catalogue',
    title: 'Restaurants',
    sub: 'Every venue in the catalogue, with its Google link, rating and profile-review state. Pending profile changes expand inline with a field-level diff.',
    Body: RestaurantsTab,
  },
  applications: {
    eyebrow: 'Review queue',
    title: 'Restaurant applications',
    sub: 'Businesses asking to join Khabo Kothay. Approving an application creates the owner’s access; nothing is published by approving alone.',
    Body: ApplicationsTab,
  },
  menus: {
    eyebrow: 'Review queue',
    title: 'Menu submissions',
    sub: 'Owner-submitted menus awaiting review. Each submission shows what changed against the published menu before you publish it.',
    Body: MenuReviewsTab,
  },
  intelligence: {
    eyebrow: 'Review queue',
    title: 'Enrichment queue',
    sub: 'Proposed discovery metadata — specialties, occasions, food characteristics and dining features. These drive matching, so each one is approved by hand.',
    Body: IntelligenceTab,
  },
  offers: {
    eyebrow: 'Review queue',
    title: 'Offers',
    sub: 'Owner-submitted offers awaiting a decision, and the recent decision history.',
    Body: OffersTab,
  },
  reviews: {
    eyebrow: 'Review queue',
    title: 'Reviews & flags',
    sub: 'Community reviews written in the app, and anything the community has flagged for a look.',
    Body: ReviewsTab,
  },
  prices: {
    eyebrow: 'Catalogue',
    title: 'Price history',
    sub: 'Dish price observations across the catalogue. Restaurant-recorded changes can be verified here; verified snapshots carry a badge on the public page.',
    Body: PricesTab,
  },
  users: {
    eyebrow: 'People',
    title: 'People',
    sub: 'Accounts on the platform, their role, reward balance and the restaurants they manage.',
    Body: UsersTab,
  },
};

/** One `/admin/<section>` route. */
export function ExecutiveAdminSection({ section }: { section: AdminSectionKey }) {
  const meta = SECTION_META[section];
  usePageTitle(`${meta.title} · KK admin`);
  const { session } = useAuth();
  if (!session || session.role !== 'executive') return <NotExecutive />;
  const { Body } = meta;
  return (
    <main className="admin">
      <div className="admin__inner">
        <header className="console-head">
          <div className="console-head__text">
            <span className="console-head__eyebrow">{meta.eyebrow}</span>
            <h1 className="console-head__title">{meta.title}</h1>
            <p className="console-head__sub">{meta.sub}</p>
          </div>
        </header>
        <Body />
      </div>
    </main>
  );
}

/** `/admin` — the operational overview. */
export default function ExecutiveAdminPage() {
  usePageTitle('Overview · KK admin');
  const { session } = useAuth();
  useMenusVersion();

  if (!session || session.role !== 'executive') return <NotExecutive />;

  return (
    <main className="admin">
      <div className="admin__inner">
        <header className="console-head">
          <div className="console-head__text">
            <span className="console-head__eyebrow">Khabo Kothay · Operations</span>
            <h1 className="console-head__title">Overview</h1>
            <p className="console-head__sub">
              Where the ecosystem stands today, and what is waiting on a person.
            </p>
          </div>
          <div className="console-head__actions">
            {/* 14px by hand at both call sites; §8 says 16 for an icon that
                labels a control, and the primitive is the only place that
                number now lives. */}
            <Button variant="ghost" size="sm" icon={FileCheck} to="/admin/applications">
              Applications
            </Button>
            <Button variant="primary" size="sm" icon={Store} to="/admin/restaurants">
              Restaurants
            </Button>
          </div>
        </header>
        <DashboardTab />
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function DashboardTab() {
  const users = getAllUsers();
  const { offers: adminOffers } = useExecutiveOffers();
  const userReviews = useUserReviews();
  const flags = useFlags();
  const drafts = useRestaurantDrafts();
  const suggestions = useSuggestions();

  // The live catalogue, through the same hook every public page uses.
  //
  // The admin tabs historically read the `restaurants` module export, which is
  // the bundled snapshot — restaurantService documents that its sync accessors
  // "ALWAYS serve the mock". A console reporting on a catalogue it isn't reading
  // is worse than no console, and the completeness figures below were the proof:
  // the snapshot carries no opening hours at all, so the dashboard read 100%
  // missing while the database holds hours for almost every venue.
  const { status: catalogueStatus, data: catalogueData } = useRestaurants();
  const catalogue = catalogueData ?? [];

  const pendingDrafts = drafts.filter((d) => d.status === 'pending').length;
  const pendingOffers = adminOffers.filter((o) => o.status === 'pending').length;
  const pendingFlags = flags.filter((f) => f.status === 'pending').length;
  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending').length;
  const totalUsers = users.length;
  const totalReviews = catalogue.reduce((n, r) => n + r.khabo.reviewCount, 0) + userReviews.length;
  const totalOffers = getAllOffers().length;
  const owners = users.filter((u) => u.role === 'restaurant_admin').length;
  const featured = catalogue.filter((r) => r.khabo.featured).length;

  // Catalogue completeness, measured — not asserted. Every field below is
  // carried on the restaurant record itself, so the count is true for whichever
  // source is live.
  //
  // Menu coverage is deliberately NOT counted here. getEffectiveMenu() is the
  // demo-store accessor (see menuService: the Supabase repository delegates it
  // straight to the mock store), so counting it against a live catalogue reports
  // 100% missing for every venue no matter what the database holds. That is a
  // fabricated number, so the ledger carries a pending metric instead.
  const missingPhoto = catalogue.filter((r) => selectRestaurantPhotos(r, 'card').photos.length === 0).length;
  const missingArea = catalogue.filter((r) => !r.location).length;
  const missingVibes = catalogue.filter((r) => r.vibes.length === 0).length;
  const missingHours = catalogue.filter((r) => !r.openingHours).length;
  const missingCuisine = catalogue.filter((r) => r.cuisines.length === 0).length;
  const withPlaceId = catalogue.filter((r) => Boolean(r.google?.placeId)).length;

  const stats = [
    { label: 'Restaurants', value: catalogue.length, sub: `${featured} featured · ${withPlaceId} linked to Google` },
    { label: 'Accounts', value: totalUsers, sub: `${owners} restaurant owner${owners === 1 ? '' : 's'}` },
    { label: 'Reviews', value: totalReviews.toLocaleString('en-IN'), sub: userReviews.length > 0 ? `${userReviews.length} written in the app` : 'None written in the app yet' },
    { label: 'Offers', value: totalOffers, sub: pendingOffers > 0 ? `${pendingOffers} awaiting approval` : 'None awaiting approval' },
  ];

  // Only queues that are actually non-empty become actions. An empty console
  // says so once, in one place, instead of listing four zeroes.
  const queue = [
    { label: 'Profile changes to review', count: pendingDrafts, to: '/admin/restaurants' },
    { label: 'Offers awaiting a decision', count: pendingOffers, to: '/admin/offers' },
    { label: 'Enrichment suggestions', count: pendingSuggestions, to: '/admin/data' },
    { label: 'Flags raised by the community', count: pendingFlags, to: '/admin/reviews' },
  ].filter((q) => q.count > 0);

  const gaps = [
    { label: 'No photography', count: missingPhoto },
    { label: 'No area recorded', count: missingArea },
    { label: 'No vibe tags', count: missingVibes },
    { label: 'No opening hours', count: missingHours },
    { label: 'No cuisine recorded', count: missingCuisine },
  ].filter((g) => g.count > 0);

  const latestReview = userReviews.length > 0 ? userReviews[userReviews.length - 1] : null;

  return (
    <div className="admin-overview">
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <strong className="stat-card__value">{s.value}</strong>
            <span className="stat-card__hint">{s.sub}</span>
          </div>
        ))}
      </div>

      <p className="console-footnote">
        <ShieldCheck aria-hidden="true" />
        Every figure on this page is counted from the live catalogue at render time. Nothing here is
        projected, sampled or estimated, and no metric is shown that the platform does not record.
      </p>

      <div className="admin-columns">
        <section className="panel">
          <div className="panel__head">
            <h2 className="panel__title">Waiting on a person</h2>
            {queue.length > 0 && (
              <span className="panel__hint">{queue.reduce((n, q) => n + q.count, 0)} in total</span>
            )}
          </div>
          {queue.length === 0 ? (
            <div className="console-empty console-empty--inset console-empty--tight">
              <span className="console-empty__icon"><Check aria-hidden="true" /></span>
              <p className="console-empty__title">Every queue is clear</p>
              <p className="console-empty__text">
                No profile changes, offers, enrichment suggestions or flags are waiting for review.
              </p>
            </div>
          ) : (
            <ul className="records records--bare">
              {queue.map((q) => (
                <li key={q.label} className="record">
                  <div className="record__main">
                    <p className="record__title"><Link to={q.to}>{q.label}</Link></p>
                  </div>
                  <span className="record__figure">{q.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div>
          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Catalogue gaps</h2>
              <span className="panel__hint">of {catalogue.length} venues</span>
            </div>
            {catalogueStatus === 'loading' && catalogue.length === 0 ? (
              <div className="console-empty console-empty--inset console-empty--tight">
                <p className="console-empty__title">Counting the catalogue…</p>
              </div>
            ) : catalogueStatus === 'error' && catalogue.length === 0 ? (
              <div className="console-empty console-empty--inset console-empty--tight">
                <p className="console-empty__title">The catalogue could not be read</p>
                <p className="console-empty__text">
                  Completeness is counted from the live catalogue, so no figure is shown rather than a
                  stale one.
                </p>
              </div>
            ) : gaps.length === 0 ? (
              <div className="console-empty console-empty--inset console-empty--tight">
                <span className="console-empty__icon"><Check aria-hidden="true" /></span>
                <p className="console-empty__title">No gaps in the fields we check</p>
                <p className="console-empty__text">
                  Every venue has photography, an area, opening hours and a cuisine.
                </p>
              </div>
            ) : (
              <ul className="records records--bare">
                {gaps.map((g) => (
                  <li key={g.label} className="record">
                    <div className="record__main">
                      <p className="record__title">{g.label}</p>
                      <span className="record__meta">
                        <span>{Math.round((g.count / catalogue.length) * 100)}% of the catalogue</span>
                      </span>
                    </div>
                    <span className="record__figure">{g.count}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* The one field a reviewer will look for and not find. Menus are
                read one restaurant at a time, so there is no catalogue-wide
                figure to put here — saying so beats leaving a silent hole. */}
            <div className="panel__foot">
              <p className="console-footnote">
                Menu coverage is not counted — menus are read one restaurant at a time, so no
                catalogue-wide figure exists to show.
              </p>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">System status</h2>
            </div>
            <ul className="records records--bare">
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Supabase</p>
                  <span className="record__meta">
                    <span>{isSupabaseConfigured() ? 'Live catalogue and menus' : 'Local demo dataset'}</span>
                  </span>
                </div>
                <span className={statusPill(isSupabaseConfigured() ? 'connected' : 'not configured', { dot: true })}>
                  {isSupabaseConfigured() ? 'Connected' : 'Not configured'}
                </span>
              </li>
              <li className="record">
                <div className="record__main">
                  <p className="record__title">Google Places</p>
                  <span className="record__meta">
                    <span>Rating, hours and contact refresh</span>
                  </span>
                </div>
                <span className={statusPill(isGooglePlacesConfigured() ? 'connected' : 'not configured', { dot: true })}>
                  {isGooglePlacesConfigured() ? 'Connected' : 'Not configured'}
                </span>
              </li>
            </ul>
          </section>

          <section className="panel">
            <div className="panel__head">
              <h2 className="panel__title">Latest community review</h2>
            </div>
            {latestReview ? (
              <>
                <p className="panel__quote">
                  “{latestReview.comment.slice(0, 140)}{latestReview.comment.length > 140 ? '…' : ''}”
                </p>
                <p className="panel__foot">
                  {latestReview.author} · {restaurants.find((x) => x.id === latestReview.restaurantId)?.name ?? 'Unknown venue'} · {latestReview.date}
                </p>
              </>
            ) : (
              <div className="console-empty console-empty--inset console-empty--tight">
                <span className="console-empty__icon"><MessageSquareQuote aria-hidden="true" /></span>
                <p className="console-empty__title">No in-app reviews yet</p>
                <p className="console-empty__text">
                  Reviews written inside Khabo Kothay appear here as soon as the first one is posted.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Field-level diff between a restaurant's base record and its draft. */
function draftChangeList(restaurant: Restaurant, draft: RestaurantDraft) {
  const changes: Array<{ label: string; from: string; to: string }> = [];
  const push = (label: string, from: string | undefined, to: string | undefined) => {
    if (to !== undefined && to !== from) changes.push({ label, from: from || '—', to });
  };
  push('Name', restaurant.name, draft.name);
  push('Address', restaurant.address, draft.address);
  push('Opening hours', restaurant.openingHours, draft.openingHours);
  push('Cuisines', restaurant.cuisines.join(', '), draft.cuisines?.join(', '));
  push('Tagline', restaurant.tagline, draft.tagline);
  push('Description', restaurant.description, draft.description);
  push('Highlights', restaurant.khabo.highlights.join('\n'), draft.highlights?.join('\n'));
  return changes;
}

function RestaurantsTab() {
  const drafts = useRestaurantDrafts();
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [onlyGaps, setOnlyGaps] = useState(false);

  // Live catalogue, not the bundled snapshot — same reason as the dashboard.
  const { status: catalogueStatus, data: catalogueData } = useRestaurants();
  const catalogue = catalogueData ?? [];

  const approveDraft = (id: string) => {
    const d = drafts.find((x) => x.restaurantId === id);
    if (!d) return;
    upsertRestaurantDraft({ ...d, status: 'published' });
  };

  const rejectDraft = (id: string) => {
    const d = drafts.find((x) => x.restaurantId === id);
    if (!d) return;
    upsertRestaurantDraft({ ...d, status: 'rejected' });
  };

  const configured = isGooglePlacesConfigured();
  const placeIds = catalogue.map((r) => r.google?.placeId).filter((p): p is string => Boolean(p));

  const runBulk = async () => {
    if (bulkRefreshing || !configured) return;
    setBulkRefreshing(true);
    setBulkResult(null);
    const done = await refreshGoogleBulk(placeIds);
    setBulkRefreshing(false);
    setBulkResult(`Refreshed ${done} of ${placeIds.length} places.`);
  };

  // The fields a reviewer is looking for when they open this screen. Named so
  // the row says what is missing instead of leaving the reviewer to spot em-dashes.
  //
  // Vibe tags are deliberately excluded. They are empty for every venue in the
  // catalogue, so listing them per row marks all 207 rows incomplete and buries
  // the gaps a reviewer can actually close. A field missing everywhere is a
  // platform gap, and the overview reports it there, once.
  const gapsFor = (r: Restaurant) => {
    const g: string[] = [];
    if (!r.location) g.push('area');
    if (r.cuisines.length === 0) g.push('cuisine');
    if (!r.openingHours) g.push('hours');
    if (selectRestaurantPhotos(r, 'card').photos.length === 0) g.push('photos');
    return g;
  };

  const needle = query.trim().toLowerCase();
  const rows = catalogue
    .map((r) => ({ r, gaps: gapsFor(r) }))
    .filter(({ r, gaps }) => {
      if (onlyGaps && gaps.length === 0) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.location?.toLowerCase().includes(needle) ||
        r.cuisines.some((c) => c.toLowerCase().includes(needle))
      );
    });

  const withGaps = catalogue.filter((r) => gapsFor(r).length > 0).length;

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">The catalogue</h2>
        <span className="panel__hint">
          {catalogueStatus === 'loading' && catalogue.length === 0
            ? 'Loading the catalogue…'
            : `${catalogue.length} venues · ${withGaps} with an incomplete field`}
        </span>
      </div>

      {/* Reviewing 200+ venues by scrolling is not reviewing. Both controls are
          client-side over the rows already loaded — no new query, no new API. */}
      <div className="console-toolbar">
        <Field label="Search restaurants" labelHidden className="console-toolbar__grow">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, area or cuisine"
          />
        </Field>
        <Chip
          selected={onlyGaps}
          onClick={() => setOnlyGaps((v) => !v)}
        >
          Incomplete data only
        </Chip>
        <span className="console-toolbar__count">
          {rows.length} shown
        </span>
      </div>

      <p className="console-footnote">
        <ShieldCheck aria-hidden="true" />
        Missing counts area, cuisine, opening hours and photography — the fields a reviewer can close.
        Google live data refreshes rating, review count, reviews, hours, business status, price level
        and contact details for a restaurant's Place ID. Photos, menus, price history and Khabo Kothay
        fields are never touched.
      </p>

      <div className="console-toolbar">
        {configured ? (
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            busy={bulkRefreshing}
            disabled={placeIds.length === 0}
            onClick={runBulk}
          >
            {bulkRefreshing ? 'Refreshing…' : `Refresh Google data (${placeIds.length})`}
          </Button>
        ) : (
          /* Was a bare `.status-pill` reading "Places API key not configured" —
             an uppercase state mark applied to a sentence, so a note about the
             deployment looked like the status of something on screen. It is a
             note, so it is set as one. */
          <span className="status-text">Google Places is not configured — live refresh is unavailable.</span>
        )}
        {bulkResult && (
          <span className="status-text status-text--ok" role="status">
            <Check size={12} aria-hidden="true" /> {bulkResult}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="console-empty console-empty--inset">
          <span className="console-empty__icon"><Store aria-hidden="true" /></span>
          <p className="console-empty__title">
            {catalogueStatus === 'error' ? 'The catalogue could not be read' : 'No venue matches'}
          </p>
          <p className="console-empty__text">
            {catalogueStatus === 'error'
              ? 'Nothing is shown rather than a stale copy of the catalogue. Reload to try again.'
              : 'Clear the search or the incomplete-data filter to see the full catalogue.'}
          </p>
        </div>
      ) : (
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Restaurant</th><th>Area</th><th>Khabo rating</th><th>Missing</th><th>Google</th><th>Profile status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.map(({ r, gaps }) => {
              const draft = drafts.find((d) => d.restaurantId === r.id);
              const status = draft?.status ?? 'published';
              const changes = draft ? draftChangeList(r, draft) : [];
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <Link to={`/restaurant/${r.id}`} className="admin-table__link">{r.name} <ExternalLink size={12} aria-hidden="true" /></Link>
                      <span className="console-sub">{r.cuisines.join(', ') || 'No cuisine recorded'}</span>
                    </td>
                    <td>{r.location || '—'}</td>
                    <td>{effectiveRating(r) > 0 ? `${effectiveRating(r).toFixed(1)}★` : '—'}</td>
                    <td>
                      {gaps.length === 0
                        ? <span className="status-text status-text--ok">Complete</span>
                        : <span className="status-text status-text--pending">{gaps.join(', ')}</span>}
                    </td>
                    <td>
                      {/* The bulk control above already hides itself when the
                          Places key is absent. The per-row one used to stay
                          live, so 206 rows offered an action that could only
                          fail, each with an "Idle" chip carrying no news. */}
                      {configured ? (
                        <GoogleRefreshButton placeId={r.google?.placeId} />
                      ) : (
                        <span className="status-text">{r.google?.placeId ? 'Linked' : 'Not linked'}</span>
                      )}
                    </td>
                    <td><span className={statusPill(status)}>{status}</span></td>
                    <td>
                      {status === 'pending' && (
                        <span className="admin-table__actions">
                          <Button variant="primary" size="sm" icon={Check} onClick={() => approveDraft(r.id)}>Approve</Button>
                          {/* Was `subtle`, the same paint as a benign text
                              action, sitting beside a filled Approve. The
                              irreversible half of a decision pair now carries
                              the destructive tone. */}
                          <Button variant="danger" size="sm" icon={X} onClick={() => rejectDraft(r.id)}>Reject</Button>
                        </span>
                      )}
                    </td>
                  </tr>
                  {status === 'pending' && draft && (
                    <tr className="admin-draft-row">
                      <td colSpan={7}>
                        <div className="admin-draft-detail">
                          <strong>Awaiting review — proposed changes</strong>
                          {changes.length === 0 ? (
                            <p className="console-note">
                              No field-level changes detected in this draft.
                            </p>
                          ) : (
                            <ul className="admin-draft-list">
                              {changes.map((c) => (
                                <li key={c.label}>
                                  <span className="admin-draft-field">{c.label}</span>
                                  <span className="admin-draft-diff"><span className="admin-draft-old">{c.from}</span> → <span className="admin-draft-new">{c.to}</span></span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function UsersTab() {
  const users = getAllUsers();
  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">All accounts</h2>
        <span className="panel__hint">{users.length} on the platform</span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Contact</th><th>Role</th><th>Tokens</th><th>Referrals</th><th>Restaurants managed</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td>{u.contact}</td>
                {/* A role is a fact about a person, so it is a Badge and not a
                    state pill. It used to be a state pill, and the mapping
                    contradicted the row it sat on: an owner was painted
                    "pending" and a diner "published", so this table announced
                    that every restaurant owner's account was awaiting approval.
                    The raw enum went with it — `restaurant_admin`, underscore
                    and all, was a database identifier shown to a person. */}
                <td>
                  <Badge tone={u.role === 'executive' ? 'accent' : 'neutral'}>{roleLabel(u.role)}</Badge>
                </td>
                <td>{tokenBalance(u.id)}</td>
                <td>{getRewards(u.id).referrals.length}</td>
                <td>{u.restaurantIds.map((id) => restaurants.find((r) => r.id === id)?.name).filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="console-note">
        {/* This used to read "(password demo123)". Khabo Kothay has no passwords —
            sign-in is phone + one-time code — so the line described a
            credential that does not exist. */}
        Demo accounts: {DEMO_ACCOUNT_CREDENTIALS.map((c) => c.contact).join(', ')}. Sign-in is by
        one-time code sent to the number; there are no passwords on the platform.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReviewsTab() {
  const userReviews = useUserReviews();
  const flags = useFlags();

  const flagReview = (id: string) => {
    upsertFlag({ id: `flag-${id}`, targetType: 'review', targetId: id, reason: 'Reported by a user', status: 'pending', at: new Date().toISOString() });
  };
  const resolveFlag = (id: string) => {
    const f = flags.find((x) => x.id === id);
    if (!f) return;
    upsertFlag({ ...f, status: 'resolved' });
  };

  const openFlags = flags.filter((f) => f.status === 'pending');

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Written in the app</h2>
        <span className="panel__hint">
          {userReviews.length} review{userReviews.length === 1 ? '' : 's'} · {openFlags.length} open flag{openFlags.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="reviews">
        {[...userReviews].reverse().map((r) => (
          <blockquote key={r.id} className="review">
            <div className="review__head">
              <span className="review__avatar" aria-hidden="true">{r.author.charAt(0)}</span>
              <div>
                <strong>{r.author} <span className="visit-badge">User</span></strong>
              </div>
              <span className="review__date">{r.date}</span>
            </div>
            <p>“{r.comment}”</p>
            <div className="review__foot">
              <span className="review__helpful">For {restaurants.find((x) => x.id === r.restaurantId)?.name}</span>
              <Button variant="danger" size="sm" icon={Flag} onClick={() => flagReview(r.id)}>Flag</Button>
            </div>
          </blockquote>
        ))}
        {userReviews.length === 0 && (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><MessageSquareQuote aria-hidden="true" /></span>
            <p className="console-empty__title">No one has written a review yet</p>
            <p className="console-empty__text">
              Reviews left inside Khabo Kothay land here the moment they are posted, ahead of anything
              carried in from Google.
            </p>
          </div>
        )}
      </div>

      <h3 className="panel__subhead">Open flags</h3>
      {/* Was a `<div>` holding `<li>` children with no list in between —
          invalid DOM, and `.attention-list`'s own rules never applied to the
          rows because the empty-state paragraph was inside the list too. */}
      {openFlags.length === 0 ? (
        <div className="console-empty console-empty--inset console-empty--tight">
          <span className="console-empty__icon"><ShieldCheck aria-hidden="true" /></span>
          <p className="console-empty__title">Nothing has been flagged</p>
          <p className="console-empty__text">
            Anything the community reports for a second look appears here.
          </p>
        </div>
      ) : (
        <ul className="attention-list">
          {openFlags.map((f) => (
            <li key={f.id}>
              <span>{f.reason} · {f.targetType}: {f.targetId}</span>
              <Button variant="ghost" size="sm" icon={Check} onClick={() => resolveFlag(f.id)}>Resolve</Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OffersTab() {
  const { offers: adminOffers, decide, loading } = useExecutiveOffers();
  const pending = adminOffers.filter((o) => o.status === 'pending');
  const decided = adminOffers
    .filter((o) => o.status === 'approved' || String(o.status) === 'rejected')
    .slice(0, 8);

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Inbound offers</h2>
        <span className="panel__hint">{pending.length} awaiting a decision</span>
      </div>
      {loading && <p className="console-lede">Reading the offer table…</p>}
      <div className="offer-admin-list">
        {pending.map((o) => (
          <div key={o.id} className="offer-admin-row offer-admin-row--detail">
            <div>
              <strong>{o.title}</strong>
              <span className="console-sub">
                {metaLine(o.discountLabel, o.value, o.validity, restaurants.find((r) => r.id === o.restaurantId)?.name)}
              </span>
              <p className="console-note">Terms: {o.terms}</p>
            </div>
            <Button variant="primary" size="sm" icon={Check} onClick={() => decide(o.id, true)}>Approve</Button>
            <Button variant="danger" size="sm" icon={X} onClick={() => decide(o.id, false)}>Reject</Button>
          </div>
        ))}
        {pending.length === 0 && !loading && (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><Ticket aria-hidden="true" /></span>
            <p className="console-empty__title">No offer is waiting on you</p>
            <p className="console-empty__text">
              Owners submit offers from their own console. Each one arrives here before a diner can
              ever see it.
            </p>
          </div>
        )}
      </div>

      <h3 className="panel__subhead">Recent decisions</h3>
      <div className="offer-admin-list">
        {decided.map((o) => (
          <div key={o.id} className="offer-admin-row">
            <div>
              <strong>{o.title}</strong>
              {/* Rendered only when the venue is in the loaded catalogue — an
                  empty `.console-sub` is a block, so it left a blank line. */}
              {(() => {
                const name = restaurants.find((r) => r.id === o.restaurantId)?.name;
                return name ? <span className="console-sub">{name}</span> : null;
              })()}
            </div>
            <span className={statusPill(String(o.status))}>{o.status}</span>
          </div>
        ))}
        {decided.length === 0 && <p className="console-note">Nothing has been decided yet.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PricesTab() {
  const menus: Array<{ restaurantId: string; menu: Menu }> = restaurants.map((r) => ({ restaurantId: r.id, menu: getEffectiveMenu(r) }));

  const rows = menus.flatMap(({ restaurantId, menu }) =>
    menu.categories.flatMap((cat) =>
      cat.dishes.map((dish) => {
        const change = priceChange(dish);
        return { restaurantId, cat: cat.name, dish, change };
      }),
    ),
  );

  const unverified = rows.filter((r) => r.dish.priceHistory.some((s) => s.status === 'recorded' && s.source === 'restaurant'));

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Dish observations</h2>
        <span className="panel__hint">
          {rows.length} dishes · {unverified.length} with a restaurant-recorded change
        </span>
      </div>
      <p className="console-lede">
        Snapshot-based observations. The executive can verify restaurant-recorded price changes; verified snapshots carry a badge on the public page.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Dish</th><th>Restaurant</th><th>Category</th><th>Previous</th><th>Current</th><th>Change</th><th>Snapshot status</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 60).map(({ restaurantId, cat, dish, change }) => (
              <tr key={dish.id}>
                <td><strong>{dish.name}</strong></td>
                <td>{restaurants.find((r) => r.id === restaurantId)?.name}</td>
                <td>{cat}</td>
                <td>{change?.previousPrice !== undefined ? formatCurrency(change.previousPrice) : '—'}</td>
                <td>{formatCurrency(dish.price)}</td>
                <td>
                  {change?.absoluteChange ? (
                    <span className={`price-change ${change.absoluteChange > 0 ? 'price-change--up' : 'price-change--down'}`}>
                      {change.absoluteChange > 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
                      {change.absoluteChange > 0 ? '+' : ''}{formatCurrency(change.absoluteChange)} ({change.percentChange}%)
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {dish.priceHistory.some((s) => s.status === 'verified') ? (
                    <span className={statusPill('verified')}>verified</span>
                  ) : dish.priceHistory.length > 1 ? (
                    <span className={statusPill('recorded · unverified')}>recorded · unverified</span>
                  ) : (
                    /* Was `--published`, i.e. the green of a favourable
                       settlement, on the weakest evidence in the product: one
                       observation, unconfirmed by anything. It is neutral. */
                    <span className={statusPill('single observation')}>single observation</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="console-note">
        <History size={12} aria-hidden="true" /> All history is demo/seed data — it never claims to be a complete or verified record.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const INTELLIGENCE_FIELD_LABEL: Record<IntelligenceSuggestion['field'], string> = {
  specialties: 'Specialty',
  bestFor: 'Best for',
  foodCharacteristics: 'Food characteristic',
  diningFeatures: 'Dining feature',
};

function IntelligenceTab() {
  const suggestions = useSuggestions();
  const pending = suggestions.filter((s) => s.status === 'pending');
  const decided = suggestions.filter((s) => s.status !== 'pending').slice(0, 10);

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Proposed metadata</h2>
        <span className="panel__hint">{pending.length} awaiting a decision</span>
      </div>
      {/* The masthead above already says what this queue is. The lede says the
          one thing the masthead does not: why a person reads every tag. */}
      <p className="console-lede">
        Owners describe their own venue here — “quiet”, “romantic”, “best biryani in Dhaka”. Nothing
        reaches the recommendation engine until you agree with it, which is what keeps the catalogue
        a curated list rather than a wall of self-claimed superlatives.
      </p>

      <h3 className="panel__subhead">Pending suggestions</h3>
      <div className="offer-admin-list">
        {pending.map((s) => {
          const r = restaurants.find((x) => x.id === s.restaurantId);
          return (
            <div key={s.id} className="offer-admin-row">
              <div>
                <strong>{s.add[0] ?? s.remove[0]}</strong>
                <span className="console-sub">
                  {metaLine(s.add.length > 0 ? 'Add' : 'Remove', INTELLIGENCE_FIELD_LABEL[s.field], r?.name)}
                  {s.note ? ` — “${s.note}”` : ''}
                </span>
              </div>
              <Button variant="primary" size="sm" icon={Check} onClick={() => resolveSuggestion(s.id, 'approved')}>
                Approve
              </Button>
              <Button variant="danger" size="sm" icon={X} onClick={() => resolveSuggestion(s.id, 'rejected')}>
                Reject
              </Button>
            </div>
          );
        })}
        {pending.length === 0 && (
          <div className="console-empty console-empty--inset">
            <span className="console-empty__icon"><Sparkles aria-hidden="true" /></span>
            <p className="console-empty__title">Nothing proposed right now</p>
            <p className="console-empty__text">
              These tags decide what Khabo Kothay recommends, so each one is read by a person before it
              counts. When an owner suggests one, it waits here.
            </p>
          </div>
        )}
      </div>

      <h3 className="panel__subhead">Recently decided</h3>
      <div className="offer-admin-list">
        {decided.map((s) => {
          const r = restaurants.find((x) => x.id === s.restaurantId);
          return (
            <div key={s.id} className="offer-admin-row">
              <div>
                <strong>{s.add[0] ?? s.remove[0]}</strong>
                <span className="console-sub">{metaLine(INTELLIGENCE_FIELD_LABEL[s.field], r?.name)}</span>
              </div>
              <span className={statusPill(s.status)}>{s.status}</span>
            </div>
          );
        })}
        {decided.length === 0 && <p className="console-note">No decisions recorded yet.</p>}
      </div>

      <p className="console-note">
        <TrendingUp size={12} aria-hidden="true" /> An approved tag changes match scores across the app immediately. What is live for any venue is visible in its restaurant admin → Discovery tags.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Menu review queue — executive approves/rejects owner submissions   */
/* ------------------------------------------------------------------ */

type ReviewRow = {
  menuId: string;
  restaurantId: string;
  restaurantName: string;
  title: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
};

function MenuReviewsTab() {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pair, setPair] = useState<{ submitted: import('../domain/menu').Menu | null; published: import('../domain/menu').Menu | null } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await menuService.fetchPendingMenuReviews();
      setReviews(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = async (menuId: string) => {
    if (selectedId === menuId) {
      setSelectedId(null);
      setPair(null);
      return;
    }
    setSelectedId(menuId);
    setDetailLoading(true);
    setPair(null);
    try {
      const p = await menuService.fetchMenuReviewPair(menuId);
      setPair(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load submission.');
    } finally {
      setDetailLoading(false);
    }
  };

  const decide = async (approve: boolean) => {
    if (!selectedId || !session) return;
    setActing(true);
    setError(null);
    try {
      if (approve) await menuService.approveMenu(selectedId, session.id);
      else await menuService.rejectMenu(selectedId, session.id);
      setSelectedId(null);
      setPair(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActing(false);
    }
  };

  /* Loading no longer returns a bare sentence in place of the whole panel: the
     heading vanished while the fetch was in flight, so the section briefly had
     no title at all. The panel is always drawn; only its contents wait. */
  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Submitted menus</h2>
        <span className="panel__hint">
          {loading ? 'Reading submissions…' : `${reviews.length} awaiting a decision`}
        </span>
      </div>

      {error && (
        <div className="console-banner console-banner--danger" role="alert">
          <AlertTriangle aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {loading ? null : reviews.length === 0 ? (
        <div className="console-empty console-empty--inset">
          <span className="console-empty__icon"><UtensilsCrossed aria-hidden="true" /></span>
          <p className="console-empty__title">Every menu is up to date</p>
          <p className="console-empty__text">
            When an owner edits their menu, the change waits here before it reaches diners — so a
            price or a dish never appears in the app without being read first.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Restaurant</th><th>Submitted</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {reviews.map((r) => {
                const open = selectedId === r.menuId;
                const diff = pair && open && pair.submitted
                  ? diffMenus(pair.submitted, pair.published)
                  : null;
                return (
                  <Fragment key={r.menuId}>
                    <tr>
                      <td>
                        <strong>{r.restaurantName}</strong>
                        {r.title && <span className="console-sub">{r.title}</span>}
                      </td>
                      <td className="admin-table__quiet">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td><span className={statusPill('pending review')}>pending review</span></td>
                      <td>
                        <span className="admin-table__actions">
                          <Button variant="ghost" size="sm" onClick={() => select(r.menuId)} disabled={acting}>
                            {open ? 'Hide' : 'Review'}
                          </Button>
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr className="admin-draft-row">
                        <td colSpan={4}>
                          {detailLoading ? (
                            <p className="console-note">Loading submission…</p>
                          ) : pair?.submitted ? (
                            <MenuReviewDetail
                              submittedTitle={r.title}
                              publishedTitle={pair.published ? 'Current published menu' : 'No published menu yet'}
                              diff={diff}
                              onApprove={() => decide(true)}
                              onReject={() => decide(false)}
                              acting={acting}
                            />
                          ) : (
                            <p className="console-note">Could not load this submission.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MenuReviewDetail({
  submittedTitle,
  publishedTitle,
  diff,
  onApprove,
  onReject,
  acting,
}: {
  submittedTitle: string | null;
  publishedTitle: string;
  diff: ReturnType<typeof diffMenus> | null;
  onApprove: () => void;
  onReject: () => void;
  acting: boolean;
}) {
  return (
    <div className="admin-draft-detail">
      <div className="admin-review-summary">
        <strong>Awaiting review — submitted menu vs published</strong>
        {diff && (
          <span className="panel__hint">
            {diff.addedCount} added · {diff.removedCount} removed · {diff.changedCount} changed
          </span>
        )}
      </div>
      <p className="console-note">
        Submitted: <strong>{submittedTitle ?? 'Untitled'}</strong> &nbsp;↔&nbsp; Published: <strong>{publishedTitle}</strong>
      </p>

      {diff && diff.categories.length > 0 ? (
        <div className="menu-review-diff">
          {diff.categories.map((cat) => (
            <div key={cat.name} className="menu-review-cat">
              <h4 className="menu-review-cat__name">{cat.name}</h4>
              <ul className="menu-review-dishes">
                {cat.dishes.map((d) => (
                  <li
                    key={`${cat.name}-${d.name}`}
                    className={`menu-review-dish menu-review-dish--${d.status}`}
                  >
                    <span className="menu-review-dish__name">{d.name}</span>
                    {d.status === 'added' && <span className={statusPill('added')}>added</span>}
                    {d.status === 'removed' && <span className={statusPill('removed')}>removed</span>}
                    {d.status === 'changed' && <span className={statusPill('changed')}>changed</span>}
                    {/* `unchanged` is not a decision, so it does not get a state
                        mark — a row that reads the same on both sides should be
                        the quietest thing in the diff, not a fourth pill. */}
                    {d.status === 'unchanged' && <span className="status-text">unchanged</span>}
                    {d.changes.length > 0 && (
                      <span className="admin-draft-diff">
                        {d.changes.map((c) => (
                          <span key={c.field} className="menu-review-change">
                            <span className="admin-draft-field">{c.field}</span>{' '}
                            <span className="admin-draft-old">{c.from}</span> →{' '}
                            <span className="admin-draft-new">{c.to}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="console-note">
          No field-level differences detected (submitted menu matches the published one).
        </p>
      )}

      {/* The margin used to be inline here and nowhere else; console.css §15 now
          owns it for both review queues, so the two screens agree. */}
      <div className="admin-table__actions">
        {/* `disabled`, not `busy`: `acting` does not record which of the two
            actions is in flight, so two spinners would claim both are. */}
        <Button variant="primary" size="sm" icon={Check} onClick={onApprove} disabled={acting}>
          Approve &amp; publish
        </Button>
        <Button variant="danger" size="sm" icon={X} onClick={onReject} disabled={acting}>
          Reject
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Restaurant applications — executive reviews inbound partner requests */
/* Approval is delegated to the SECURITY DEFINER RPC, so the owner role */
/* and restaurant row are created server-side only after KK approval.   */
/* ------------------------------------------------------------------ */

function ApplicationsTab() {
  const [apps, setApps] = useState<RestaurantApplicationsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApps(await selectAllRestaurantApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, status: 'APPROVED' | 'REJECTED' | 'CONTACTED') => {
    setActingId(id);
    setError(null);
    try {
      await reviewRestaurantApplication(id, status);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setActingId(null);
    }
  };

  const pending = apps.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="panel">
      <div className="panel__head">
        <h2 className="panel__title">Owner submissions</h2>
        <span className="panel__hint">
          {loading ? 'Reading applications…' : `${pending} awaiting a decision`}
        </span>
      </div>

      {error && (
        <div className="console-banner console-banner--danger" role="alert">
          <AlertTriangle aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {loading ? null : apps.length === 0 ? (
        <div className="console-empty console-empty--inset">
          <span className="console-empty__icon"><Inbox aria-hidden="true" /></span>
          <p className="console-empty__title">No restaurant has applied yet</p>
          <p className="console-empty__text">
            Owners who want to join Khabo Kothay land here first. Approving one creates their account
            and their venue in the catalogue, so nothing is added to Dhaka's list without you.
          </p>
        </div>
      ) : (
        <div className="application-list">
          {apps.map((a) => (
            <article key={a.id} className="application-card">
              <div className="application-card__head">
                <div>
                  <strong>{a.restaurant_name}</strong>
                  {/* No em dash here: an unlabelled "—" under a restaurant name
                      reads as a missing name, not a missing area. The area is
                      also spelled out in the Address row below. */}
                  {a.area && <span className="console-sub">{a.area}</span>}
                </div>
                {/* `applicationStatusClass` returns the whole class string now.
                    The old `admin-status ` prefix here outlived its stylesheet
                    rule, so it had become a class name with nothing behind it. */}
                <span className={applicationStatusClass(a.status)}>
                  {applicationStatusLabel(a.status)}
                </span>
              </div>

              {/* `.console-defs` is the console's existing label/value grid —
                  the same one the restaurant admin uses — rather than a private
                  `application-card__meta` that had no CSS at all. */}
              <dl className="console-defs">
                <div><dt>Applicant</dt><dd>{a.applicant_name} · <span className="t-xs">{a.applicant_role}</span></dd></div>
                <div><dt>Contact</dt><dd>{a.applicant_phone || a.contact_details || '—'}</dd></div>
                <div><dt>Address</dt><dd>{a.address || '—'}</dd></div>
                <div><dt>Cuisine</dt><dd>{a.cuisine || '—'}</dd></div>
                <div><dt>Website</dt><dd>{a.website || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—'}</dd></div>
              </dl>

              {a.notes && <p className="application-card__notes">“{a.notes}”</p>}

              {a.status === 'PENDING' ? (
                <div className="admin-table__actions">
                  <Button variant="primary" size="sm" icon={Check} disabled={actingId === a.id} onClick={() => act(a.id, 'APPROVED')}>
                    Approve &amp; activate owner
                  </Button>
                  <Button variant="ghost" size="sm" disabled={actingId === a.id} onClick={() => act(a.id, 'CONTACTED')}>
                    Mark contacted
                  </Button>
                  <Button variant="danger" size="sm" icon={X} disabled={actingId === a.id} onClick={() => act(a.id, 'REJECTED')}>
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="console-note">
                  {a.reviewed_at ? `Reviewed ${new Date(a.reviewed_at).toLocaleString('en-IN')}` : 'No review timestamp recorded.'}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
