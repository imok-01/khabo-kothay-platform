/**
 * Menu system.
 *
 * A restaurant's menu is a list of categories, each holding dishes. Dishes
 * carry their own price-history (PriceSnapshot[]) so we can show "recorded
 * observations" rather than pretending we own complete historical truth.
 * The model is deliberately flat and unbounded — no hard-coded menu size.
 */

export type MenuSource =
  | 'restaurant'
  | 'website'
  | 'verified'
  | 'khabo-recorded'
  | 'other';

export type SnapshotStatus = 'recorded' | 'verified';

export interface PriceSnapshot {
  id: string;
  /** The recorded price at that time. */
  price: number;
  /** ISO date of the observation. */
  at: string;
  source: MenuSource;
  /** Who recorded it — a restaurant admin, an executive, a permitted source. */
  recordedBy: string;
  status: SnapshotStatus;
}

export interface MenuItem {
  id: string;
  name: string;
  /** Short dish description, optional. */
  description?: string;
  price: number;
  /** False = temporarily unavailable. */
  available: boolean;
  /** Marked as a featured/chef's pick dish. */
  featured?: boolean;
  /** A signature dish — the restaurant's strongest picks, shown first.
   *  Structured data, not inferred from names/descriptions. */
  isSignature?: boolean;
  source: MenuSource;
  lastUpdated: string;
  /** Recorded price observations, oldest first. The last one is the price. */
  priceHistory: PriceSnapshot[];
  imageUrl?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  /** Display order within the menu. */
  order: number;
  dishes: MenuItem[];
}

export interface Menu {
  restaurantId: string;
  categories: MenuCategory[];
  /** When this menu was last touched by anyone. */
  updatedAt: string;
}

/** Price change derived from recorded snapshots (oldest → current). */
export interface PriceChange {
  previousPrice?: number;
  currentPrice: number;
  /** Absolute change, positive = more expensive. */
  absoluteChange?: number;
  /** Percentage change, positive = more expensive. */
  percentChange?: number;
  /** Snapshot dates used. */
  previousAt?: string;
  currentAt: string;
}
