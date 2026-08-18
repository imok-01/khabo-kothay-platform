import type { Menu, MenuCategory, MenuItem, MenuSource, PriceSnapshot } from '../domain/menu';
import { estimateCostForTwo, type CostEstimate } from '../lib/costEstimate';
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
 *  - One `Menu` per restaurant is the current frontend model. If the import
 *    provides multiple menus, the ACTIVE one is used first; multi-menu venues
 *    are flagged, not silently merged.
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
    available: true, // no availability column in v1.1 — items are not marked unavailable
    source: sourceLabelFor(observations[observations.length - 1]?.source_id ?? null),
    lastUpdated: latest?.at ?? item.created_at ?? '',
    priceHistory: history,
  };
}

/** Map approved menu rows to the frontend Menu. Returns undefined when the
 *  restaurant has no menu rows at all. */
export function mapMenuRows(bundle: MenuDbBundle): Menu | undefined {
  if (bundle.menus.length === 0) return undefined;

  const menu =
    bundle.menus.find((m) => m.status === 'ACTIVE') ??
    bundle.menus[0];

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

/**
 * Menu-derived cost-for-two estimate for a restaurant, from the same raw
 * rows the Menu mapping uses. Reuses mapMenuRows + estimateCostForTwo — the
 * exact pipeline the detail page runs against its loaded menu — so cards,
 * map popups and the detail page all agree on the number.
 */
export function menuCostEstimate(bundle: MenuDbBundle): CostEstimate | undefined {
  return estimateCostForTwo(mapMenuRows(bundle)) ?? undefined;
}
