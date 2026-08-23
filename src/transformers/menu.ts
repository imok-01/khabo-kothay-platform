import type { Menu, MenuCategory, MenuItem, MenuSource, PriceSnapshot } from '../domain/menu';
import { estimateCostForTwo, type CostEstimate } from '../lib/costEstimate';
import { formatCurrency } from '../lib/format';
import type {
  MenuItemsRow,
  MenusRow,
  PriceObservationsRow,
  RestaurantSourcesRow,
} from '../integrations/supabase/database.types';

/**
 * Transformation layer: approved menu rows → frontend `Menu` domain object.
 *
 * The database models menus → menu_items → price_observations. A dish's
 * "price" is the LATEST price observation — never a stored permanent price,
 * matching the spec's "Menu Item → Price Observation History" rule.
 *
 * HONESTY RULES:
 *  - A NULL price observation stays unknown → domain `price: 0`, which the UI
 *    renders as "Price not listed". No fake price is ever derived.
 *  - Every snapshot is marked `status: 'recorded'` (never 'verified') until
 *    an approved verification layer says otherwise.
 *  - One `Menu` per restaurant is the current frontend model. When several
 *    menus exist, the PUBLISHED one is used first; ACTIVE is the fallback for
 *    pre-version data; multi-menu venues are flagged, not silently merged.
 */

export interface MenuDbBundle {
  menus: MenusRow[];
  itemsByMenu: Record<string, MenuItemsRow[]>;
  observationsByItem: Record<string, PriceObservationsRow[]>;
  sources: RestaurantSourcesRow[];
}

function sourceLabel(sourceId: string | null, sources: RestaurantSourcesRow[]): MenuSource {
  if (!sourceId) return 'other';
  const type = sources.find((s) => s.id === sourceId)?.source_type.toLowerCase();
  if (type === 'website') return 'website';
  if (type === 'restaurant') return 'restaurant';
  return 'other';
}

/**
 * Price observations that may be shown as a price. UNVERIFIED is the honest
 * machine-extraction default; the verified grades are displayable too.
 * NEEDS_REVIEW / CONFLICTING / STALE / UNKNOWN observations are NEVER shown
 * as a price — an ambiguous extract must not look like a fact.
 */
const DISPLAYABLE_STATUSES = new Set([
  'UNVERIFIED',
  'SOURCE_VERIFIED',
  'RESTAURANT_CONFIRMED',
  'KK_VERIFIED',
]);

function mapPriceSnapshots(
  observations: PriceObservationsRow[],
  sourceLabelFor: (sourceId: string | null) => MenuSource,
): PriceSnapshot[] {
  const sorted = observations
    .filter((o) => DISPLAYABLE_STATUSES.has(o.verification_status))
    .sort((a, b) => (a.observed_at ?? '').localeCompare(b.observed_at ?? ''));
  return sorted.map((o) => ({
    id: o.id,
    price: o.price ?? 0,
    at: o.observed_at ?? '',
    source: sourceLabelFor(o.source_id),
    recordedBy: 'import',
    status: 'recorded' as const,
  }));
}

function mapItem(
  item: MenuItemsRow,
  observations: PriceObservationsRow[],
  sourceLabelFor: (sourceId: string | null) => MenuSource,
): MenuItem {
  const history = mapPriceSnapshots(observations, sourceLabelFor);
  const latest = history[history.length - 1];
  return {
    id: item.id,
    name: item.item_name,
    description: item.description ?? undefined,
    price: latest?.price ?? 0,
    // Availability / merchandising flags come from the row when present
    // (4.3B.1); fall back to sane defaults for pre-version data.
    available: item.available ?? true,
    featured: item.featured ?? false,
    isSignature: item.is_signature ?? false,
    imageUrl: item.image_url ?? undefined,
    source: sourceLabelFor(observations[observations.length - 1]?.source_id ?? null),
    lastUpdated: latest?.at ?? item.created_at ?? '',
    priceHistory: history,
  };
}

/** Map approved menu rows to the frontend Menu. Returns undefined when the
 *  restaurant has no menu rows at all. */
export function mapMenuRows(bundle: MenuDbBundle): Menu | undefined {
  if (bundle.menus.length === 0) return undefined;

  // Public read: only PUBLISHED (preferred) or legacy ACTIVE rows are ever
  // shown. DRAFT / PENDING_REVIEW / ARCHIVED are NEVER exposed publicly — the
  // previous `?? bundle.menus[0]` fallback could surface a lone draft, so it is
  // removed. ACTIVE stays only as a backward-compat escape for pre-version
  // imported rows (4.3B.1).
  const menu =
    bundle.menus.find((m) => m.status === 'PUBLISHED') ??
    bundle.menus.find((m) => m.status === 'ACTIVE');

  if (!menu) return undefined;

  const sourceLabelFor = (sourceId: string | null) => sourceLabel(sourceId, bundle.sources);
  const items = bundle.itemsByMenu[menu.id] ?? [];

  // Categories in first-appearance order (menu_items.category is free TEXT in
  // the approved schema — the import must keep category names consistent).
  const categoryOrder: string[] = [];
  const byCategory = new Map<string, MenuItemsRow[]>();
  for (const item of items) {
    const key = item.category?.trim() || 'Other';
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
      categoryOrder.push(key);
    }
    byCategory.get(key)!.push(item);
  }

  const categories: MenuCategory[] = categoryOrder.map((name, i) => ({
    id: `cat-${menu.id}-${i}`,
    name,
    order: i,
    dishes: (byCategory.get(name) ?? []).map((item) =>
      mapItem(item, bundle.observationsByItem[item.id] ?? [], sourceLabelFor),
    ),
  }));

  const latestAt = bundle.menus
    .map((m) => m.created_at ?? '')
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    restaurantId: bundle.menus[0].restaurant_id,
    categories,
    updatedAt: latestAt ?? '',
  };
}

/* ------------------------------------------------------------------ */
/* Owner (lifecycle-aware) menu mapping — used by the owner edit flow   */
/* ------------------------------------------------------------------ */

export interface OwnerMenuItemJson {
  id: string;
  item_name: string;
  description: string | null;
  category: string;
  available: boolean;
  featured: boolean;
  is_signature: boolean;
  image_url: string | null;
  created_at: string;
}

export interface OwnerObservationJson {
  id: string;
  menu_item_id: string;
  price: number | null;
  currency: string;
  source_id: string | null;
  observed_at: string;
  raw_price: string | null;
  verification_status: string;
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

/**
 * Pick the menu the owner should edit: DRAFT first (in-progress work),
 * then PENDING_REVIEW (submitted, awaiting decision), then PUBLISHED
 * (live reference). Falls back to any other status last.
 */
export function pickWorkingMenu(menus: MenusRow[]): MenusRow | undefined {
  if (menus.length === 0) return undefined;
  const priority = (s: MenusRow['status']): number =>
    s === 'DRAFT' ? 0 : s === 'PENDING_REVIEW' ? 1 : s === 'PUBLISHED' ? 2 : 3;
  return [...menus].sort((a, b) => {
    const pa = priority(a.status);
    const pb = priority(b.status);
    if (pa !== pb) return pa - pb;
    return (b.created_at ?? '').localeCompare(a.created_at ?? '');
  })[0];
}

/**
 * Map a single (any-status) menu row + its items + observations to the
 * frontend `Menu` domain. Unlike `mapMenuRows`, this does NOT filter by
 * lifecycle status — an owner must be able to load their DRAFT/PENDING_REVIEW
 * menu, not just the PUBLISHED one.
 */
export function mapOwnerMenu(
  menu: MenusRow,
  items: MenuItemsRow[],
  observations: PriceObservationsRow[],
  sources: RestaurantSourcesRow[],
): Menu {
  const sourceLabelFor = (sourceId: string | null) => sourceLabel(sourceId, sources);
  const obsByItem: Record<string, PriceObservationsRow[]> = {};
  for (const o of observations) (obsByItem[o.menu_item_id] ??= []).push(o);

  const categoryOrder: string[] = [];
  const byCategory = new Map<string, MenuItemsRow[]>();
  for (const item of items) {
    const key = item.category?.trim() || 'Other';
    if (!byCategory.has(key)) {
      byCategory.set(key, []);
      categoryOrder.push(key);
    }
    byCategory.get(key)!.push(item);
  }

  const categories: MenuCategory[] = categoryOrder.map((name, i) => ({
    id: `cat-${menu.id}-${i}`,
    name,
    order: i,
    dishes: (byCategory.get(name) ?? []).map((item) =>
      mapItem(item, obsByItem[item.id] ?? [], sourceLabelFor),
    ),
  }));

  return {
    restaurantId: menu.restaurant_id,
    categories,
    updatedAt: menu.created_at ?? '',
  };
}

/**
 * Convert a frontend `Menu` domain object into the JSON arrays the
 * `upsert_menu_content` RPC consumes (one menu_item per dish, one
 * price_observation per dish carrying the current price, recorded by the
 * restaurant). Ids are generated client-side so the observation can reference
 * its item deterministically within the same call.
 */
export function ownerMenuToContent(menu: Menu): {
  items: OwnerMenuItemJson[];
  observations: OwnerObservationJson[];
} {
  const items: OwnerMenuItemJson[] = [];
  const observations: OwnerObservationJson[] = [];
  const now = new Date().toISOString();
  for (const cat of menu.categories) {
    for (const d of cat.dishes) {
      const itemId = newId();
      items.push({
        id: itemId,
        item_name: d.name,
        description: d.description ?? null,
        category: cat.name,
        available: d.available,
        featured: Boolean(d.featured),
        is_signature: Boolean(d.isSignature),
        image_url: d.imageUrl ?? null,
        created_at: now,
      });
      observations.push({
        id: newId(),
        menu_item_id: itemId,
        price: d.price > 0 ? d.price : null,
        currency: 'BDT',
        source_id: null,
        observed_at: now,
        raw_price: null,
        verification_status: 'RESTAURANT_CONFIRMED',
      });
    }
  }
  return { items, observations };
}

/**
 * Menu-derived cost-for-two estimate for a restaurant, from the same raw
 * rows the Menu mapping uses. Reuses mapMenuRows + estimateCostForTwo — the
 * exact pipeline the detail page runs against its loaded menu — so cards,
 * map popups and the detail page all agree on the number.
 */
export function menuCostEstimate(bundle: MenuDbBundle): CostEstimate | undefined {
  return estimateCostForTwo(mapMenuRows(bundle)) ?? undefined;
}

/* ------------------------------------------------------------------ */
/* Menu diff — submitted vs current published (executive review queue) */
/* ------------------------------------------------------------------ */

export type DishDiffStatus = 'added' | 'removed' | 'changed' | 'unchanged';

export interface DishFieldChange {
  field: 'price' | 'available' | 'category' | 'description';
  from: string;
  to: string;
}

export interface DishDiff {
  name: string;
  category: string;
  status: DishDiffStatus;
  changes: DishFieldChange[];
}

export interface MenuDiffCategory {
  name: string;
  dishes: DishDiff[];
}

export interface MenuDiff {
  categories: MenuDiffCategory[];
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

const priceLabel = (p: number): string => (p > 0 ? formatCurrency(p) : '—');
const availabilityLabel = (a: boolean): string => (a ? 'Available' : 'Unavailable');
const dishKey = (category: string, name: string): string =>
  `${category.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
const nameKey = (name: string): string => name.trim().toLowerCase();

/**
 * Compare a submitted menu against the currently published one. Matching is
 * intentionally simple: primarily by category + dish name (per spec); a dish
 * whose name appears under a different category in the published menu is
 * reported as a category change rather than add+remove. No complex version
 * graph — just field-level differences an executive can eyeball.
 */
export function diffMenus(submitted: Menu, published: Menu | null): MenuDiff {
  const publishedByName = new Map<string, { category: string; dish: MenuItem }>();
  const publishedExact = new Map<string, MenuItem>();
  for (const cat of published?.categories ?? []) {
    for (const d of cat.dishes) {
      publishedByName.set(nameKey(d.name), { category: cat.name, dish: d });
      publishedExact.set(dishKey(cat.name, d.name), d);
    }
  }

  const matchedPublishedNames = new Set<string>();
  const sections = new Map<string, DishDiff[]>();
  const ensure = (cat: string): DishDiff[] => {
    if (!sections.has(cat)) sections.set(cat, []);
    return sections.get(cat)!;
  };

  let addedCount = 0;
  let changedCount = 0;

  for (const cat of submitted.categories) {
    for (const d of cat.dishes) {
      const exact = publishedExact.get(dishKey(cat.name, d.name));
      const byName = publishedByName.get(nameKey(d.name));
      const changes: DishFieldChange[] = [];

      const pushChange = (field: DishFieldChange['field'], from: string, to: string) => {
        if (from !== to) changes.push({ field, from, to });
      };

      if (exact) {
        matchedPublishedNames.add(nameKey(d.name));
        pushChange('price', priceLabel(exact.price), priceLabel(d.price));
        pushChange('available', availabilityLabel(exact.available), availabilityLabel(d.available));
        pushChange('description', exact.description ?? '', d.description ?? '');
        ensure(cat.name).push({
          name: d.name,
          category: cat.name,
          status: changes.length > 0 ? 'changed' : 'unchanged',
          changes,
        });
        if (changes.length > 0) changedCount++;
      } else if (byName) {
        // Same dish name, different category → treat as a category move + diff.
        matchedPublishedNames.add(nameKey(d.name));
        pushChange('category', byName.category, cat.name);
        pushChange('price', priceLabel(byName.dish.price), priceLabel(d.price));
        pushChange('available', availabilityLabel(byName.dish.available), availabilityLabel(d.available));
        pushChange('description', byName.dish.description ?? '', d.description ?? '');
        ensure(cat.name).push({
          name: d.name,
          category: cat.name,
          status: 'changed',
          changes,
        });
        changedCount++;
      } else {
        ensure(cat.name).push({ name: d.name, category: cat.name, status: 'added', changes: [] });
        addedCount++;
      }
    }
  }

  // Published dishes never matched → removed.
  let removedCount = 0;
  for (const cat of published?.categories ?? []) {
    for (const d of cat.dishes) {
      if (matchedPublishedNames.has(nameKey(d.name))) continue;
      ensure(cat.name).push({
        name: d.name,
        category: cat.name,
        status: 'removed',
        changes: [{ field: 'price', from: priceLabel(d.price), to: '—' }],
      });
      removedCount++;
    }
  }

  return {
    categories: [...sections.entries()].map(([name, dishes]) => ({ name, dishes })),
    addedCount,
    removedCount,
    changedCount,
  };
}
