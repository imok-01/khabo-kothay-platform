import { Fragment, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Store, Users, MessageSquareQuote, BadgePercent, LineChart, ShieldCheck,
  Check, X, Flag, History, TrendingUp, TrendingDown, ExternalLink, Sparkles, RefreshCw,
  ClipboardCheck, FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import type { Restaurant } from '../types';
import { useUsers, getAllUsers } from '../hooks/useUsers';
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
import type { IntelligenceSuggestion } from '../domain/intelligence';
import { getEffectiveMenu } from '../lib/menu';
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

type Tab = 'dashboard' | 'restaurants' | 'users' | 'reviews' | 'offers' | 'prices' | 'intelligence' | 'menus' | 'applications';

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

export default function ExecutiveAdminPage() {
  usePageTitle('Khabo Kothay executive');
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  useMenusVersion();
  useRestaurantDrafts();
  useUserReviews();
  useAdminOffers();
  useFlags();
  useUsers();
  useSuggestions();

  if (!session || session.role !== 'executive') {
    return (
      <main className="section section--narrow">
        <div className="section__inner">
          <div className="access-denied">
            <ShieldCheck size={40} aria-hidden="true" />
            <h1>Executive access only</h1>
            <p>Sign in with the executive demo account to manage the platform.</p>
            <Link to="/login" className="btn btn--primary">Sign in</Link>
          </div>
        </div>
      </main>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { key: 'restaurants', label: 'Restaurants', icon: <Store size={15} /> },
    { key: 'users', label: 'Users', icon: <Users size={15} /> },
    { key: 'reviews', label: 'Reviews', icon: <MessageSquareQuote size={15} /> },
    { key: 'offers', label: 'Offers', icon: <BadgePercent size={15} /> },
     { key: 'prices', label: 'Price history', icon: <LineChart size={15} /> },
    { key: 'intelligence', label: 'Recommendations', icon: <Sparkles size={15} /> },
    { key: 'menus', label: 'Menu reviews', icon: <ClipboardCheck size={15} /> },
    { key: 'applications', label: 'Applications', icon: <FileCheck size={15} /> },
  ];

  return (
    <main className="admin">
      <div className="admin__inner">
        <div className="admin__head">
          <div>
            <span className="section-heading__eyebrow">Khabo Kothay BD · Executive</span>
            <h1>Platform admin</h1>
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Manage restaurants, users, moderation and pricing across the ecosystem.</p>
          </div>
        </div>

        <div className="admin__tabs" role="tablist" aria-label="Executive admin sections">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`admin__tab ${tab === t.key ? 'admin__tab--active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="admin__content">
          {tab === 'dashboard' && <DashboardTab />}
          {tab === 'restaurants' && <RestaurantsTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'offers' && <OffersTab />}
          {tab === 'prices' && <PricesTab />}
          {tab === 'intelligence' && <IntelligenceTab />}
          {tab === 'menus' && <MenuReviewsTab />}
          {tab === 'applications' && <ApplicationsTab />}
        </div>
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

  const pendingDrafts = drafts.filter((d) => d.status === 'pending').length;
  const pendingOffers = adminOffers.filter((o) => o.status === 'pending').length;
  const pendingFlags = flags.filter((f) => f.status === 'pending').length;
  const totalUsers = users.length;
  const totalReviews = restaurants.reduce((n, r) => n + r.khabo.reviewCount, 0) + userReviews.length;
  const totalOffers = getAllOffers().length;

  const stats = [
    { label: 'Restaurants', value: restaurants.length, sub: `${restaurants.filter((r) => r.khabo.featured).length} featured` },
    { label: 'Users', value: totalUsers, sub: `${users.filter((u) => u.role === 'restaurant_admin').length} restaurant admins` },
    { label: 'Reviews', value: totalReviews.toLocaleString('en-IN'), sub: `${userReviews.length} written in-app` },
    { label: 'Offers', value: totalOffers, sub: `${pendingOffers} awaiting approval` },
  ];

  return (
    <div className="admin-overview">
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <strong className="stat-card__value">{s.value}</strong>
            <span className="stat-card__sub">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="admin-columns">
        <section className="panel">
          <div className="panel__head"><h2>Needs attention</h2></div>
          <ul className="attention-list">
            <li><span>Profile change requests</span><strong>{pendingDrafts}</strong></li>
            <li><span>Offer approvals</span><strong>{pendingOffers}</strong></li>
            <li><span>Moderation flags</span><strong>{pendingFlags}</strong></li>
          </ul>
        </section>
        <section className="panel">
          <div className="panel__head"><h2>Recently added</h2></div>
          <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
            {userReviews.length > 0
              ? <>Latest community review: “{userReviews[userReviews.length - 1].comment.slice(0, 60)}…”</>
              : 'No user-written reviews yet — sign in as a user and write one.'}
          </p>
          {pendingDrafts > 0 && (
            <p className="t-sm" style={{ color: 'var(--ink-soft)', marginTop: 'var(--s2)' }}>
              <Flag size={12} aria-hidden="true" /> {pendingDrafts} restaurant(s) waiting for profile approval.
            </p>
          )}
        </section>
      </div>

      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        All figures are computed from the live demo dataset — no invented analytics.
      </p>
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
  const placeIds = restaurants.map((r) => r.google?.placeId).filter((p): p is string => Boolean(p));

  const runBulk = async () => {
    if (bulkRefreshing || !configured) return;
    setBulkRefreshing(true);
    setBulkResult(null);
    const done = await refreshGoogleBulk(placeIds);
    setBulkRefreshing(false);
    setBulkResult(`Refreshed ${done} of ${placeIds.length} places.`);
  };

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Restaurants</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{restaurants.length} venues</span>
      </div>
      <div className="panel__toolbar" style={{ display: 'flex', gap: 'var(--s3)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--s3)' }}>
        <p className="t-sm" style={{ color: 'var(--ink-soft)', margin: 0, maxWidth: 520 }}>
          <ShieldCheck size={13} style={{ verticalAlign: '-2px' }} aria-hidden="true" />
          Google live data refreshes the rating, review count, reviews, hours, business status, price level and contact details for a restaurant's Place ID. Photos, menus, price history and Khabo Kothay fields are never touched.
        </p>
        {configured ? (
          <button type="button" className="btn btn--ghost btn--sm" onClick={runBulk} disabled={bulkRefreshing || placeIds.length === 0}>
            <RefreshCw size={12} aria-hidden="true" className={bulkRefreshing ? 'spin' : ''} />
            {bulkRefreshing ? 'Refreshing…' : `Refresh Google data (${placeIds.length})`}
          </button>
        ) : (
          <span className="admin-status admin-status--draft">Places API key not configured</span>
        )}
        {bulkResult && <span className="admin-status admin-status--approved">{bulkResult}</span>}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Restaurant</th><th>Area</th><th>Khabo rating</th><th>Google</th><th>Profile status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {restaurants.map((r) => {
              const draft = drafts.find((d) => d.restaurantId === r.id);
              const status = draft?.status ?? 'published';
              const changes = draft ? draftChangeList(r, draft) : [];
              return (
                <Fragment key={r.id}>
                  <tr>
                    <td>
                      <Link to={`/restaurant/${r.id}`} className="admin-table__link">{r.name} <ExternalLink size={11} aria-hidden="true" /></Link>
                      <span className="t-xs" style={{ color: 'var(--ink-faint)' }}>{r.cuisines.join(', ')}</span>
                    </td>
                    <td>{r.location || '—'}</td>
                    <td>{effectiveRating(r) > 0 ? `${effectiveRating(r).toFixed(1)}★` : '—'}</td>
                    <td>
                      <GoogleRefreshButton placeId={r.google?.placeId} />
                    </td>
                    <td><span className={`admin-status admin-status--${status}`}>{status}</span></td>
                    <td>
                      {status === 'pending' && (
                        <span className="admin-table__actions">
                          <button type="button" className="btn btn--primary btn--sm" onClick={() => approveDraft(r.id)}><Check size={12} aria-hidden="true" /> Approve</button>
                          <button type="button" className="btn btn--subtle btn--sm" onClick={() => rejectDraft(r.id)}><X size={12} aria-hidden="true" /> Reject</button>
                        </span>
                      )}
                    </td>
                  </tr>
                  {status === 'pending' && draft && (
                    <tr className="admin-draft-row">
                      <td colSpan={6}>
                        <div className="admin-draft-detail">
                          <strong>Awaiting review — proposed changes</strong>
                          {changes.length === 0 ? (
                            <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s2)' }}>
                              No field-level changes detected in this draft.
                            </p>
                          ) : (
                            <ul>
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
    </div>
  );
}

/* ------------------------------------------------------------------ */

function UsersTab() {
  const users = getAllUsers();
  return (
    <div className="panel">
      <div className="panel__head"><h2>Users</h2><span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{users.length} demo accounts</span></div>
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
                <td><span className={`admin-status admin-status--${u.role === 'executive' ? 'approved' : u.role === 'restaurant_admin' ? 'pending' : 'published'}`}>{u.role}</span></td>
                <td>{tokenBalance(u.id)}</td>
                <td>{getRewards(u.id).referrals.length}</td>
                <td>{u.restaurantIds.map((id) => restaurants.find((r) => r.id === id)?.name).filter(Boolean).join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        Demo accounts: {DEMO_ACCOUNT_CREDENTIALS.map((c) => c.contact).join(', ')} (password demo123).
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

  return (
    <div className="panel">
      <div className="panel__head"><h2>Review moderation</h2><span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{userReviews.length} user-written · {flags.filter((f) => f.status === 'pending').length} open flags</span></div>
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
              <button type="button" className="btn btn--subtle btn--sm" onClick={() => flagReview(r.id)}><Flag size={11} aria-hidden="true" /> Flag</button>
            </div>
          </blockquote>
        ))}
        {userReviews.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No user-written reviews yet.</p>}
      </div>

      <h3 style={{ marginTop: 'var(--s5)' }}>Open flags</h3>
      <div className="attention-list">
        {flags.filter((f) => f.status === 'pending').map((f) => (
          <li key={f.id}>
            <span>{f.reason} · {f.targetType}: {f.targetId}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => resolveFlag(f.id)}><Check size={11} aria-hidden="true" /> Resolve</button>
          </li>
        ))}
        {flags.filter((f) => f.status === 'pending').length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Nothing flagged.</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OffersTab() {
  const { offers: adminOffers, decide, loading } = useExecutiveOffers();
  const pending = adminOffers.filter((o) => o.status === 'pending');

  return (
    <div className="panel">
      <div className="panel__head"><h2>Offer approvals</h2><span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{pending.length} awaiting decision</span></div>
      {loading && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Loading offers…</p>}
      <div className="offer-admin-list">
        {pending.map((o) => (
          <div key={o.id} className="offer-admin-row offer-admin-row--detail">
            <div>
              <strong>{o.title}</strong>
              <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                {o.discountLabel} · {o.value} · {o.validity} · {restaurants.find((r) => r.id === o.restaurantId)?.name}
              </span>
              <p className="t-sm" style={{ color: 'var(--ink-soft)', marginTop: 'var(--s1)' }}>
                Terms: {o.terms}
              </p>
            </div>
            <button type="button" className="btn btn--primary btn--sm" onClick={() => decide(o.id, true)}><Check size={12} aria-hidden="true" /> Approve</button>
            <button type="button" className="btn btn--subtle btn--sm" onClick={() => decide(o.id, false)}><X size={12} aria-hidden="true" /> Reject</button>
          </div>
        ))}
        {pending.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No offers awaiting approval.</p>}
      </div>

      <h3 style={{ marginTop: 'var(--s5)' }}>Recent decisions</h3>
      <div className="offer-admin-list">
        {adminOffers.filter((o) => o.status === 'approved' || String(o.status) === 'rejected').slice(0, 8).map((o) => (
          <div key={o.id} className="offer-admin-row">
            <div>
              <strong>{o.title}</strong>
              <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{restaurants.find((r) => r.id === o.restaurantId)?.name}</span>
            </div>
            <span className={`admin-status admin-status--${o.status}`}>{o.status}</span>
          </div>
        ))}
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
      <div className="panel__head"><h2>Price history</h2><span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{rows.length} dishes · {unverified.length} with restaurant-recorded changes</span></div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
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
                      {change.absoluteChange > 0 ? <TrendingUp size={11} aria-hidden="true" /> : <TrendingDown size={11} aria-hidden="true" />}
                      {change.absoluteChange > 0 ? '+' : ''}{formatCurrency(change.absoluteChange)} ({change.percentChange}%)
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {dish.priceHistory.some((s) => s.status === 'verified') ? (
                    <span className="admin-status admin-status--approved">verified</span>
                  ) : dish.priceHistory.length > 1 ? (
                    <span className="admin-status admin-status--pending">recorded · unverified</span>
                  ) : (
                    <span className="admin-status admin-status--published">single observation</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        <History size={11} aria-hidden="true" /> All history is demo/seed data — it never claims to be a complete or verified record.
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
        <h2>Recommendation metadata</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{pending.length} awaiting decision</span>
      </div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
        Restaurants suggest discovery tags — specialties, occasions, food characteristics. Only what you approve here feeds the recommendation engine. This keeps the catalogue honest: no self-claimed "quiet + romantic + best biryani" hype.
      </p>

      <h3 style={{ marginTop: 'var(--s5)' }}>Pending suggestions</h3>
      <div className="offer-admin-list">
        {pending.map((s) => {
          const r = restaurants.find((x) => x.id === s.restaurantId);
          return (
            <div key={s.id} className="offer-admin-row">
              <div>
                <strong>{s.add[0] ?? s.remove[0]}</strong>
                <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                  {s.add.length > 0 ? 'Add' : 'Remove'} · {INTELLIGENCE_FIELD_LABEL[s.field]} · {r?.name}
                  {s.note ? ` — “${s.note}”` : ''}
                </span>
              </div>
              <button type="button" className="btn btn--primary btn--sm" onClick={() => resolveSuggestion(s.id, 'approved')}>
                <Check size={12} aria-hidden="true" /> Approve
              </button>
              <button type="button" className="btn btn--subtle btn--sm" onClick={() => resolveSuggestion(s.id, 'rejected')}>
                <X size={12} aria-hidden="true" /> Reject
              </button>
            </div>
          );
        })}
        {pending.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Nothing awaiting approval.</p>}
      </div>

      <h3 style={{ marginTop: 'var(--s5)' }}>Recently decided</h3>
      <div className="offer-admin-list">
        {decided.map((s) => {
          const r = restaurants.find((x) => x.id === s.restaurantId);
          return (
            <div key={s.id} className="offer-admin-row">
              <div>
                <strong>{s.add[0] ?? s.remove[0]}</strong>
                <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{INTELLIGENCE_FIELD_LABEL[s.field]} · {r?.name}</span>
              </div>
              <span className={`admin-status admin-status--${s.status}`}>{s.status}</span>
            </div>
          );
        })}
        {decided.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No decisions yet.</p>}
      </div>

      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        Approved changes apply immediately to match scores across the app. Current live metadata for any venue is visible in its restaurant admin → Discovery tags.
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

  if (loading) {
    return <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Loading submissions…</p>;
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Menu reviews</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{reviews.length} awaiting decision</span>
      </div>

      {error && <p className="admin-banner admin-banner--error" role="alert">{error}</p>}

      {reviews.length === 0 ? (
        <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
          No menu submissions awaiting review. Owner-edited menus appear here once submitted.
        </p>
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
                        {r.title && <span className="t-xs" style={{ color: 'var(--ink-faint)', display: 'block' }}>{r.title}</span>}
                      </td>
                      <td className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN') : '—'}
                      </td>
                      <td><span className="admin-status admin-status--pending">pending review</span></td>
                      <td>
                        <span className="admin-table__actions">
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => select(r.menuId)} disabled={acting}>
                            {open ? 'Hide' : 'Review'}
                          </button>
                        </span>
                      </td>
                    </tr>
                    {open && (
                      <tr className="admin-draft-row">
                        <td colSpan={4}>
                          {detailLoading ? (
                            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Loading submission…</p>
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
                            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Could not load this submission.</p>
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
          <span className="t-xs" style={{ color: 'var(--ink-faint)', marginLeft: 'var(--s3)' }}>
            {diff.addedCount} added · {diff.removedCount} removed · {diff.changedCount} changed
          </span>
        )}
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s2)' }}>
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
                    {d.status === 'added' && <span className="admin-status admin-status--approved">added</span>}
                    {d.status === 'removed' && <span className="admin-status admin-status--rejected">removed</span>}
                    {d.status === 'changed' && <span className="admin-status admin-status--pending">changed</span>}
                    {d.status === 'unchanged' && <span className="t-xs" style={{ color: 'var(--ink-faint)' }}>unchanged</span>}
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
        <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s2)' }}>
          No field-level differences detected (submitted menu matches the published one).
        </p>
      )}

      <div className="admin-table__actions" style={{ marginTop: 'var(--s3)' }}>
        <button type="button" className="btn btn--primary btn--sm" onClick={onApprove} disabled={acting}>
          <Check size={12} aria-hidden="true" /> Approve &amp; publish
        </button>
        <button type="button" className="btn btn--subtle btn--sm" onClick={onReject} disabled={acting}>
          <X size={12} aria-hidden="true" /> Reject
        </button>
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

  if (loading) {
    return <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>Loading applications…</p>;
  }

  const pending = apps.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Restaurant applications</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{pending} awaiting decision</span>
      </div>

      {error && <p className="admin-banner admin-banner--error" role="alert">{error}</p>}

      {apps.length === 0 ? (
        <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No applications submitted yet.</p>
      ) : (
        <div className="application-list">
          {apps.map((a) => (
            <article key={a.id} className="application-card">
              <div className="application-card__head">
                <div>
                  <strong>{a.restaurant_name}</strong>
                  <span className="t-xs" style={{ color: 'var(--ink-faint)', display: 'block' }}>{a.area || '—'}</span>
                </div>
                <span className={`admin-status ${applicationStatusClass(a.status)}`}>
                  {applicationStatusLabel(a.status)}
                </span>
              </div>

              <dl className="application-card__meta">
                <div><dt>Applicant</dt><dd>{a.applicant_name} · <span className="t-xs">{a.applicant_role}</span></dd></div>
                <div><dt>Contact</dt><dd>{a.applicant_phone || a.contact_details || '—'}</dd></div>
                <div><dt>Address</dt><dd>{a.address || '—'}</dd></div>
                <div><dt>Cuisine</dt><dd>{a.cuisine || '—'}</dd></div>
                <div><dt>Website</dt><dd>{a.website || '—'}</dd></div>
                <div><dt>Submitted</dt><dd>{a.created_at ? new Date(a.created_at).toLocaleString('en-IN') : '—'}</dd></div>
              </dl>

              {a.notes && <p className="application-card__notes">“{a.notes}”</p>}

              {a.status === 'PENDING' ? (
                <div className="admin-table__actions" style={{ marginTop: 'var(--s3)' }}>
                  <button type="button" className="btn btn--primary btn--sm" disabled={actingId === a.id} onClick={() => act(a.id, 'APPROVED')}>
                    <Check size={12} aria-hidden="true" /> Approve &amp; activate owner
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" disabled={actingId === a.id} onClick={() => act(a.id, 'CONTACTED')}>
                    Mark contacted
                  </button>
                  <button type="button" className="btn btn--subtle btn--sm" disabled={actingId === a.id} onClick={() => act(a.id, 'REJECTED')}>
                    <X size={12} aria-hidden="true" /> Reject
                  </button>
                </div>
              ) : (
                <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
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
