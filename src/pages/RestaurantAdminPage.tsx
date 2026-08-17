import { useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Store, Image, UtensilsCrossed, BadgePercent, MessageSquareQuote, Settings,
  Plus, Trash2, ArrowUp, ArrowDown, Send, Save, Check, Eye, UploadCloud, Info, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../lib/usePageTitle';
import { restaurants } from '../data/restaurants';
import { getEffectiveMenu } from '../lib/menu';
import {
  saveMenuOverride, useMenusVersion, useUserReviews, useAdminOffers, upsertAdminOffer, deleteAdminOffer,
  getRestaurantDraft, upsertRestaurantDraft, useRestaurantDrafts, uid, type AdminOfferDraft,
  useSuggestions, upsertSuggestion,
} from '../store/demoDb';
import { getEffectiveIntelligence } from '../lib/intelligence';
import { BEST_FOR, DINING_FEATURES, FOOD_CHARACTERISTICS, SPECIALTIES, type IntelligenceSuggestion } from '../domain/intelligence';
import { getAllOffers } from '../repositories/OfferProvider';
import { formatCurrency } from '../lib/format';
import type { Menu, MenuItem } from '../domain/menu';

type Tab = 'overview' | 'profile' | 'photos' | 'menu' | 'offers' | 'reviews' | 'attributes' | 'settings';

export default function RestaurantAdminPage() {
  usePageTitle('Restaurant admin');
  const { session } = useAuth();
  // Deep-link support: /manage?tab=profile opens the edit tab directly so the
  // owner "Update information" flows land on the management edit system.
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (params.get('tab') as Tab) || 'overview');
  useMenusVersion();
  useRestaurantDrafts();
  const userReviews = useUserReviews();
  const adminOffers = useAdminOffers();

  const owned = useMemo(
    () => restaurants.filter((r) => session?.restaurantIds.includes(r.id)),
    [session],
  );

  const [selectedId, setSelectedId] = useState<string>(owned[0]?.id ?? '');

  if (!session || session.role !== 'restaurant_admin' || owned.length === 0) {
    return (
      <main className="section section--narrow">
        <div className="section__inner">
          <div className="access-denied">
            <Store size={40} aria-hidden="true" />
            <h1>No restaurant assigned</h1>
            <p>This account manages restaurants on Khabo Kothay, but no restaurants are assigned to it.</p>
            <Link to="/" className="btn btn--primary">Back to home</Link>
          </div>
        </div>
      </main>
    );
  }

  const restaurant = owned.find((r) => r.id === selectedId) ?? owned[0];
  const draft = getRestaurantDraft(restaurant.id);
  const menu = getEffectiveMenu(restaurant);
  const myOffers = adminOffers.filter((o) => o.restaurantId === restaurant.id);
  const myReviews = userReviews.filter((r) => r.restaurantId === restaurant.id);
  const publicOffers = getAllOffers().filter((o) => o.restaurantId === restaurant.id);
  const dishCount = menu.categories.reduce((n, c) => n + c.dishes.length, 0);

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard size={15} /> },
    { key: 'profile', label: 'Profile', icon: <Store size={15} /> },
    { key: 'photos', label: 'Photos', icon: <Image size={15} /> },
    { key: 'menu', label: 'Menu', icon: <UtensilsCrossed size={15} /> },
    { key: 'offers', label: 'Offers', icon: <BadgePercent size={15} /> },
    { key: 'reviews', label: 'Reviews', icon: <MessageSquareQuote size={15} /> },
    { key: 'attributes', label: 'Discovery tags', icon: <Sparkles size={15} /> },
    { key: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  return (
    <main className="admin">
      <div className="admin__inner">
        <div className="admin__head">
          <div>
            <span className="section-heading__eyebrow">Restaurant admin</span>
            <h1>Manage your restaurant</h1>
            <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
              You can only manage restaurants assigned to this account.
            </p>
          </div>
          {owned.length > 1 && (
            <label className="field" style={{ maxWidth: 260 }}>
              <span className="field__label">Restaurant</span>
              <select value={restaurant.id} onChange={(e) => setSelectedId(e.target.value)}>
                {owned.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="admin__tabs" role="tablist" aria-label="Restaurant admin sections">
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
          <Link to={`/restaurant/${restaurant.id}`} className="btn btn--ghost btn--sm" style={{ marginBottom: 'var(--s4)' }}>
            <Eye size={13} aria-hidden="true" /> View public page
          </Link>

          {tab === 'overview' && (
            <Overview restaurantId={restaurant.id} restaurantName={restaurant.name} dishCount={dishCount} offerCount={publicOffers.length} reviewCount={restaurant.khabo.reviewCount + myReviews.length} draftStatus={draft?.status ?? 'published'} />
          )}
          {tab === 'profile' && <ProfileTab restaurantId={restaurant.id} />}
          {tab === 'photos' && <PhotosTab restaurantId={restaurant.id} />}
          {tab === 'menu' && <MenuTab restaurant={restaurant.id} />}
          {tab === 'offers' && <OffersTab restaurantId={restaurant.id} restaurantName={restaurant.name} myOffers={myOffers} publicOffers={publicOffers} />}
          {tab === 'reviews' && <ReviewsTab restaurantId={restaurant.id} restaurantName={restaurant.name} myReviews={myReviews} />}
          {tab === 'attributes' && <AttributesTab restaurantId={restaurant.id} restaurantName={restaurant.name} />}
          {tab === 'settings' && <SettingsTab restaurantId={restaurant.id} restaurantName={restaurant.name} />}
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */

function Overview({ restaurantId, restaurantName, dishCount, offerCount, reviewCount, draftStatus }: {
  restaurantId: string; restaurantName: string; dishCount: number; offerCount: number; reviewCount: number; draftStatus: string;
}) {
  const stats = [
    { label: 'Menu dishes', value: dishCount },
    { label: 'Public offers', value: offerCount },
    { label: 'Community reviews', value: reviewCount },
    { label: 'Profile status', value: draftStatus },
  ];
  return (
    <div className="admin-overview">
      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span className="stat-card__label">{s.label}</span>
            <strong className="stat-card__value">{s.value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Quick actions</h2>
        <div className="quick-actions">
          <Link to={`/restaurant/${restaurantId}`} className="btn btn--ghost">View public page</Link>
          <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>Menu, offers, profile and reviews are managed from the tabs above.</span>
        </div>
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        Demo panel — changes are stored in this browser. {restaurantName} cannot be renamed or deleted here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProfileTab({ restaurantId }: { restaurantId: string }) {
  const restaurant = restaurants.find((r) => r.id === restaurantId)!;
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
    <div className="panel">
      <div className="panel__head">
        <h2>Restaurant profile</h2>
        <span className={`admin-status admin-status--${status}`}>{status}</span>
      </div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
        This is the current public listing. Edits become a draft — only an executive-approved draft is
        published to your public page, so nothing changes without review.
      </p>

      {status === 'pending' && (
        <p className="admin-banner" role="status"><Info size={13} aria-hidden="true" /> Changes are pending executive review and cannot be edited until a decision is made.</p>
      )}

      <form
        className="admin-form"
        onSubmit={(e) => { e.preventDefault(); save(true); }}
      >
        <div className="admin-form__row">
          <label className="field">
            <span className="field__label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} disabled={status === 'pending'} />
          </label>
          <label className="field">
            <span className="field__label">Cuisines (comma separated)</span>
            <input value={cuisines} onChange={(e) => setCuisines(e.target.value)} disabled={status === 'pending'} />
          </label>
        </div>
        <div className="admin-form__row">
          <label className="field">
            <span className="field__label">Address</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={status === 'pending'} />
          </label>
          <label className="field">
            <span className="field__label">Opening hours</span>
            <input value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} disabled={status === 'pending'} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">Tagline</span>
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={status === 'pending'} />
        </label>
        <label className="field">
          <span className="field__label">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} disabled={status === 'pending'} />
        </label>
        <label className="field">
          <span className="field__label">Highlights (one per line)</span>
          <textarea value={highlights} onChange={(e) => setHighlights(e.target.value)} rows={4} disabled={status === 'pending'} />
        </label>
        <div className="admin-form__actions">
          <button type="button" className="btn btn--ghost" onClick={() => save(false)} disabled={status === 'pending'}>
            <Save size={14} aria-hidden="true" /> Save draft
          </button>
          <button type="submit" className="btn btn--primary" disabled={status === 'pending'}>
            <Send size={14} aria-hidden="true" /> Submit for review
          </button>
        </div>
        {notice && <p className="t-sm" style={{ color: 'var(--success)' }}><Check size={12} aria-hidden="true" /> {notice}</p>}
      </form>

      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        Photos can't be edited here yet (no storage backend) — current imagery comes from Google Maps links on this listing.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function PhotosTab({ restaurantId }: { restaurantId: string }) {
  const restaurant = restaurants.find((r) => r.id === restaurantId)!;
  return (
    <div className="panel">
      <div className="panel__head"><h2>Restaurant photos</h2></div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
        Photo upload isn't wired up yet (no storage backend). Current imagery comes from the Google Maps photo links on this restaurant's record.
      </p>
      <div className="upload-placeholder">
        <UploadCloud size={28} aria-hidden="true" />
        <p>Uploads arrive in a future phase with real storage.</p>
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        {restaurant.name} currently shows {restaurant.signatureDishes.length} signature dishes and Google Maps photography. Source metadata is preserved per image.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MenuTab({ restaurant }: { restaurant: string }) {
  const menu = getEffectiveMenu(restaurants.find((r) => r.id === restaurant)!);
  const [newCat, setNewCat] = useState('');
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [dishPrice, setDishPrice] = useState('');
  const [dishDesc, setDishDesc] = useState('');
  const [editing, setEditing] = useState<{ categoryId: string; dishId: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const persist = (next: Menu) => saveMenuOverride({ ...next, updatedAt: new Date().toISOString() });

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

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Menu manager</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{menu.categories.length} categories · changes go live immediately (demo)</span>
      </div>

      <form className="admin-inline-form" onSubmit={addCategory}>
        <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name, e.g. Starters" aria-label="New category name" />
        <button type="submit" className="btn btn--primary btn--sm"><Plus size={13} aria-hidden="true" /> Add category</button>
      </form>

      {menu.categories.length === 0 && (
        <div className="menu-empty">
          <UtensilsCrossed size={24} aria-hidden="true" />
          <div>
            <h3>No menu added yet</h3>
            <p>
              Add your first category to start building the menu. Dishes, prices and descriptions are
              added per category and appear on your public page immediately (demo).
            </p>
          </div>
        </div>
      )}

      {menu.categories.map((cat) => (
        <div key={cat.id} className="menu-cat-admin">
          <div className="menu-cat-admin__head">
            <h3>{cat.name}</h3>
            <button type="button" className="btn btn--subtle btn--sm" onClick={() => removeCategory(cat.id)} aria-label={`Delete category ${cat.name}`}>
              <Trash2 size={12} aria-hidden="true" />
            </button>
          </div>
          <ul className="menu-cat-admin__list">
            {cat.dishes.map((d) => (
              <li key={d.id} className={editing?.dishId === d.id ? 'menu-dish-admin menu-dish-admin--editing' : 'menu-dish-admin'}>
                {editing?.dishId === d.id ? (
                  <form className="admin-inline-form admin-inline-form--edit" onSubmit={saveEdit}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Dish name" />
                    <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} inputMode="numeric" aria-label="Price" className="admin-price-input" />
                    <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} aria-label="Description" placeholder="Short description (optional)" />
                    <button type="submit" className="btn btn--primary btn--sm"><Save size={12} aria-hidden="true" /> Save</button>
                    <button type="button" className="btn btn--subtle btn--sm" onClick={() => setEditing(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <div className="menu-dish-admin__main">
                      <strong>{d.name}</strong>
                      <span className={`t-sm ${d.available ? '' : 'menu-dish--unavailable'}`}>{formatCurrency(d.price)}{!d.available && ' · unavailable'}</span>
                      {d.featured && <span className="dish__tag">Chef's pick</span>}
                      {d.isSignature && <span className="dish__tag dish__tag--signature">Signature</span>}
                    </div>
                    <div className="menu-dish-admin__actions">
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveDish(cat.id, d.id, -1)} aria-label={`Move ${d.name} up`}><ArrowUp size={12} /></button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => moveDish(cat.id, d.id, 1)} aria-label={`Move ${d.name} down`}><ArrowDown size={12} /></button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(cat.id, d)} aria-label={`Edit ${d.name}`}>Edit</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleSignature(cat.id, d.id)} aria-label={d.isSignature ? 'Remove signature mark' : 'Mark as signature'}>{d.isSignature ? 'Unsign' : 'Sign'}</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleFeatured(cat.id, d.id)} aria-label={d.featured ? 'Unfeature' : 'Feature'}>{d.featured ? 'Unfeature' : 'Feature'}</button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleDish(cat.id, d.id)} aria-label={d.available ? 'Mark unavailable' : 'Mark available'}>{d.available ? 'Hide' : 'Show'}</button>
                      <button type="button" className="btn btn--subtle btn--sm" onClick={() => removeDish(cat.id, d.id)} aria-label={`Delete ${d.name}`}><Trash2 size={12} /></button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          {addingTo === cat.id ? (
            <form className="admin-inline-form" onSubmit={(e) => addDish(e, cat.id)}>
              <input value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Dish name" aria-label="Dish name" />
              <input value={dishPrice} onChange={(e) => setDishPrice(e.target.value)} inputMode="numeric" placeholder="Price" aria-label="Price" className="admin-price-input" />
              <input value={dishDesc} onChange={(e) => setDishDesc(e.target.value)} placeholder="Short description (optional)" aria-label="Description" />
              <button type="submit" className="btn btn--primary btn--sm"><Plus size={12} aria-hidden="true" /> Add</button>
              <button type="button" className="btn btn--subtle btn--sm" onClick={() => setAddingTo(null)}>Cancel</button>
            </form>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAddingTo(cat.id)}><Plus size={12} aria-hidden="true" /> Add dish to {cat.name}</button>
          )}
        </div>
      ))}

      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        Price edits append a new recorded snapshot — users see the change as price history, and the executive can verify it.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OffersTab({ restaurantId, restaurantName, myOffers, publicOffers }: {
  restaurantId: string; restaurantName: string; myOffers: AdminOfferDraft[]; publicOffers: ReturnType<typeof getAllOffers>;
}) {
  const [form, setForm] = useState({ title: '', discountLabel: '', value: '', validity: '', terms: '' });
  const { session } = useAuth();

  const createOffer = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.discountLabel.trim()) return;
    upsertAdminOffer({
      id: uid('off'),
      restaurantId,
      title: form.title.trim(),
      discountLabel: form.discountLabel.trim(),
      value: form.value.trim() || 'See restaurant',
      validity: form.validity.trim() || 'Limited time',
      terms: form.terms.trim() || 'Demo offer — not redeemable in real restaurants.',
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
    setForm({ title: '', discountLabel: '', value: '', validity: '', terms: '' });
  };

  const submitOffer = (id: string) => {
    const offer = myOffers.find((o) => o.id === id);
    if (!offer) return;
    upsertAdminOffer({ ...offer, status: 'pending' });
  };

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Offers for {restaurantName}</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>Offers only appear publicly after executive approval</span>
      </div>

      <form className="admin-form" onSubmit={createOffer}>
        <div className="admin-form__row">
          <label className="field"><span className="field__label">Title</span><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Weekend biryani combo" /></label>
          <label className="field"><span className="field__label">Discount label</span><input value={form.discountLabel} onChange={(e) => setForm({ ...form, discountLabel: e.target.value })} placeholder="e.g. 20% off" /></label>
        </div>
        <div className="admin-form__row">
          <label className="field"><span className="field__label">Value</span><input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="e.g. Save up to ৳400" /></label>
          <label className="field"><span className="field__label">Validity</span><input value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="e.g. Weekdays, 12–4 PM" /></label>
        </div>
        <label className="field"><span className="field__label">Terms</span><input value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder="Conditions of the offer" /></label>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary"><Plus size={14} aria-hidden="true" /> Create offer (draft)</button>
        </div>
      </form>

      <h3 style={{ marginTop: 'var(--s5)' }}>Your offers</h3>
      <div className="offer-admin-list">
        {myOffers.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No offers created yet.</p>}
        {myOffers.map((o) => (
          <div key={o.id} className={`offer-admin-row offer-admin-row--${o.status}`}>
            <div>
              <strong>{o.title}</strong>
              <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{o.discountLabel} · {o.validity}</span>
            </div>
            <span className={`admin-status admin-status--${o.status}`}>{o.status}</span>
            {o.status === 'draft' && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => submitOffer(o.id)}><Send size={12} aria-hidden="true" /> Submit for approval</button>
            )}
            <button type="button" className="btn btn--subtle btn--sm" onClick={() => deleteAdminOffer(o.id)} aria-label={`Delete ${o.title}`}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop: 'var(--s5)' }}>Currently public</h3>
      <div className="offer-admin-list">
        {publicOffers.map((o) => (
          <div key={o.id} className="offer-admin-row">
            <div>
              <strong>{o.title}</strong>
              <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{o.discountLabel} · {o.validity}</span>
            </div>
            <span className="admin-status admin-status--approved">{o.source === 'seed' ? 'platform' : 'approved'}</span>
          </div>
        ))}
      </div>

      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        {session?.name ?? 'You'} can manage only {restaurantName}'s offers — never another restaurant's.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ReviewsTab({ restaurantId, restaurantName, myReviews }: {
  restaurantId: string; restaurantName: string; myReviews: ReturnType<typeof useUserReviews>;
}) {
  const restaurant = restaurants.find((r) => r.id === restaurantId)!;
  const all = [...myReviews, ...restaurant.khabo.reviews];
  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Reviews for {restaurantName}</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{all.length} community reviews</span>
      </div>
      <div className="reviews">
        {all.map((r, i) => (
          <blockquote key={`${r.id ?? i}`} className="review">
            <div className="review__head">
              <span className="review__avatar" aria-hidden="true">{r.author.charAt(0)}</span>
              <div>
                <strong>{r.author}{'userId' in r ? ' · You' : ''}</strong>
              </div>
              <span className="review__date">{r.date}</span>
            </div>
            <p>“{r.comment}”</p>
          </blockquote>
        ))}
        {all.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No reviews yet.</p>}
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        Reporting and reply-to-review arrive with moderation tooling in a future phase.
      </p>
    </div>
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
    <div className="panel">
      <div className="panel__head">
        <h2>Discovery tags</h2>
        <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>{openCount} pending suggestion{openCount === 1 ? '' : 's'}</span>
      </div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
        These structured tags power Khabo Kothay's recommendations — what {restaurantName} is known for, who it's best for, and how it feels. You can <strong>suggest</strong> changes, but only an executive-approved tag is ever used by the recommendation engine. You can't claim attributes directly.
      </p>

      <h3 style={{ marginTop: 'var(--s5)' }}>Currently live (approved metadata)</h3>
      <div className="admin-form__row" style={{ marginTop: 'var(--s3)' }}>
        {FIELD_META.map((m) => (
          <div key={m.key}>
            <span className="field__label">{m.label}</span>
            <div className="chip-row">
              {(effective[m.key] as string[]).map((v) => (
                <span key={v} className="chip">{v}</span>
              ))}
              {(effective[m.key] as string[]).length === 0 && <span className="t-sm" style={{ color: 'var(--ink-faint)' }}>None</span>}
            </div>
          </div>
        ))}
      </div>
      <p className="t-xs" style={{ color: 'var(--ink-faint)' }}>
        Provenance: {effective.provenance === 'seed' ? 'curated by Khabo Kothay' : 'seed + approved restaurant suggestions'}.
      </p>

      <h3 style={{ marginTop: 'var(--s5)' }}>Suggest a change</h3>
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form__row">
          <label className="field">
            <span className="field__label">Attribute</span>
            <select value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value as IntelligenceSuggestion['field'], value: '' })}>
              {FIELD_META.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field__label">Action</span>
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as 'add' | 'remove' })}>
              <option value="add">Add</option>
              <option value="remove">Remove</option>
            </select>
          </label>
          <label className="field">
            <span className="field__label">Value</span>
            <select
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            >
              <option value="">Choose…</option>
              {form.action === 'add'
                ? available.map((v) => <option key={v} value={v}>{v}</option>)
                : current.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        </div>
        <label className="field">
          <span className="field__label">Why? (optional, helps the executive decide)</span>
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. We've been serving thalis for a decade" />
        </label>
        <div className="admin-form__actions">
          <button type="submit" className="btn btn--primary" disabled={!form.value}>
            <Send size={14} aria-hidden="true" /> Submit for approval
          </button>
        </div>
        {notice && <p className="t-sm" style={{ color: 'var(--success)' }}><Check size={12} aria-hidden="true" /> {notice}</p>}
      </form>

      <h3 style={{ marginTop: 'var(--s5)' }}>Your suggestions</h3>
      <div className="offer-admin-list">
        {mine.length === 0 && <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>No suggestions yet.</p>}
        {mine.map((s) => (
          <div key={s.id} className={`offer-admin-row offer-admin-row--${s.status}`}>
            <div>
              <strong>{s.add[0] ?? s.remove[0]}</strong>
              <span className="t-sm" style={{ color: 'var(--ink-soft)' }}>
                {s.add.length > 0 ? 'Add' : 'Remove'} · {FIELD_META.find((m) => m.key === s.field)?.label}
                {s.note ? ` · “${s.note}”` : ''}
              </span>
            </div>
            <span className={`admin-status admin-status--${s.status}`}>{s.status}</span>
          </div>
        ))}
      </div>

      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        A tag is never inferred from your menu or description — it only counts once approved and visible here as live metadata.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SettingsTab({ restaurantId, restaurantName }: { restaurantId: string; restaurantName: string }) {
  const restaurant = restaurants.find((r) => r.id === restaurantId)!;
  const rows = [
    ['Name', restaurant.name],
    ['Address', restaurant.address],
    ['Hours', restaurant.openingHours],
    ['Cuisines', restaurant.cuisines.join(', ')],
    ['Budget', restaurant.budget],
    ['Phone / website', 'Not published yet'],
  ];
  return (
    <div className="panel">
      <div className="panel__head"><h2>Settings</h2></div>
      <p className="t-sm" style={{ color: 'var(--ink-soft)' }}>
        Core identity information is managed through the review workflow (future phase). These are the values users currently see.
      </p>
      <dl className="settings-list">
        {rows.map(([k, v]) => (
          <div key={k} className="settings-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="t-xs" style={{ color: 'var(--ink-faint)', marginTop: 'var(--s3)' }}>
        {restaurantName} · ownership boundary enforced: this account can only manage this restaurant.
      </p>
    </div>
  );
}
