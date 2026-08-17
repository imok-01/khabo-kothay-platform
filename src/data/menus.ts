import type { Menu, MenuCategory, MenuItem, PriceSnapshot } from '../domain/menu';
import type { Restaurant } from '../types';

/**
 * Seed menu data. Price history here is clearly *demo/seed* data — it is not
 * claimed to be a verified historical record. The structure (snapshots with
 * source, recordedBy, status) is exactly what a future recording system
 * would produce.
 */

let seq = 0;
const nid = (prefix: string) => `${prefix}-${(seq += 1)}`;

function snap(price: number, at: string, source: PriceSnapshot['source'], recordedBy: string, status: PriceSnapshot['status'] = 'recorded'): PriceSnapshot {
  return { id: nid('snap'), price, at, source, recordedBy, status };
}

interface DishSeed {
  name: string;
  price: number;
  description?: string;
  featured?: boolean;
  /** Explicitly mark a dish as signature. Defaults to the featured flag —
   *  curated by Khabo Kothay, never inferred from the dish's name/text. */
  signature?: boolean;
  available?: boolean;
  history: Array<[number, string, PriceSnapshot['source'], string]>;
}

function dish(d: DishSeed): MenuItem {
  const last = d.history[d.history.length - 1];
  return {
    id: nid('dish'),
    name: d.name,
    description: d.description,
    price: d.price,
    available: d.available ?? true,
    featured: d.featured,
    isSignature: d.signature ?? d.featured,
    source: last[2],
    lastUpdated: last[1],
    priceHistory: d.history.map(([price, at, source, by]) => snap(price, at, source, by)),
  };
}

function category(name: string, dishes: DishSeed[]): MenuCategory {
  return { id: nid('cat'), name, order: seq, dishes: dishes.map(dish) };
}

export const SEED_MENUS: Record<string, Menu> = {
  arsalan: {
    restaurantId: 'arsalan',
    updatedAt: '2026-08-01',
    categories: [
      category('Biryani', [
        { name: 'Chicken Biryani', price: 320, description: 'Fragrant basmati with tender chicken, potato and saffron', featured: true, history: [[280, '2025-06-10', 'restaurant', 'Restaurant admin'], [320, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Mutton Biryani', price: 390, description: 'Slow-cooked mutton, light on spice, generous on flavour', featured: true, history: [[340, '2025-06-10', 'restaurant', 'Restaurant admin'], [390, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Special Chicken Biryani', price: 380, history: [[340, '2025-09-01', 'khabo-recorded', 'Khabo Kothay'], [380, '2026-03-20', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Kebabs', [
        { name: 'Chicken Reshmi Kebab', price: 340, featured: true, history: [[300, '2025-06-10', 'restaurant', 'Restaurant admin'], [340, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Mutton Chaap', price: 370, history: [[350, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Paneer Tikka', price: 280, available: false, history: [[260, '2025-06-10', 'restaurant', 'Restaurant admin'], [280, '2026-01-15', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Mains', [
        { name: 'Baked Malai Paneer', price: 310, history: [[290, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Chicken Rezala', price: 350, history: [[330, '2025-09-01', 'khabo-recorded', 'Khabo Kothay']] },
      ]),
      category('Desserts', [
        { name: 'Kolkata Firni', price: 120, history: [[110, '2025-06-10', 'restaurant', 'Restaurant admin'], [120, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Phirni', price: 110, history: [[110, '2026-01-15', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  'bhojohori-manna': {
    restaurantId: 'bhojohori-manna',
    updatedAt: '2026-07-20',
    categories: [
      category('Starters', [
        { name: 'Kochuri & Cholar Dal', price: 140, history: [[120, '2025-08-15', 'restaurant', 'Restaurant admin'], [140, '2026-02-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Fish Fry (Bhetki)', price: 260, featured: true, history: [[230, '2025-08-15', 'restaurant', 'Restaurant admin'], [260, '2026-02-10', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Bengali Classics', [
        { name: 'Shorshe Ilish', price: 480, description: 'Seasonal hilsa in mustard — when in season', featured: true, history: [[420, '2025-08-15', 'restaurant', 'Restaurant admin'], [480, '2026-02-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Kosha Mangsho', price: 390, featured: true, history: [[340, '2025-08-15', 'restaurant', 'Restaurant admin'], [390, '2026-02-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Bhetki Paturi', price: 360, history: [[320, '2025-08-15', 'restaurant', 'Restaurant admin'], [360, '2026-02-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Daab Chingri', price: 420, featured: true, history: [[380, '2026-02-10', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Rice & Breads', [
        { name: 'Steamed Rice', price: 90, history: [[80, '2025-08-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Luchi (2 pc)', price: 80, history: [[70, '2025-08-15', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Sweets', [
        { name: 'Mishti Doi', price: 120, history: [[100, '2025-08-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Nolen Gur Ice Cream', price: 150, description: 'Seasonal — winter only', available: false, history: [[140, '2025-11-01', 'khabo-recorded', 'Khabo Kothay']] },
      ]),
    ],
  },
  'shiraz-golden-restaurant': {
    restaurantId: 'shiraz-golden-restaurant',
    updatedAt: '2026-07-01',
    categories: [
      category('Biryani', [
        { name: 'Special Mutton Biryani', price: 260, featured: true, history: [[220, '2025-05-01', 'restaurant', 'Restaurant admin'], [240, '2025-12-01', 'restaurant', 'Restaurant admin'], [260, '2026-06-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Chicken Biryani', price: 200, history: [[180, '2025-05-01', 'restaurant', 'Restaurant admin'], [200, '2026-06-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Egg Biryani', price: 180, history: [[160, '2025-05-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Kebabs & Chaap', [
        { name: 'Chicken Chaap', price: 240, featured: true, history: [[200, '2025-05-01', 'restaurant', 'Restaurant admin'], [240, '2026-06-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Kebab Platter', price: 300, history: [[270, '2026-06-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Desserts', [
        { name: 'Firni', price: 90, history: [[80, '2025-05-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  mocambo: {
    restaurantId: 'mocambo',
    updatedAt: '2026-06-15',
    categories: [
      category('Starters', [
        { name: 'Devilled Crab', price: 480, featured: true, history: [[420, '2025-04-01', 'restaurant', 'Restaurant admin'], [480, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Prawn Cocktail', price: 520, history: [[480, '2026-01-10', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Mains', [
        { name: 'Chicken a la Kiev', price: 540, featured: true, history: [[480, '2025-04-01', 'restaurant', 'Restaurant admin'], [540, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Grilled Fish Meunière', price: 560, history: [[520, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Sizzler Platter', price: 640, history: [[580, '2025-04-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Desserts', [
        { name: 'Baked Alaska', price: 320, featured: true, history: [[280, '2025-04-01', 'restaurant', 'Restaurant admin'], [320, '2026-01-10', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  trincas: {
    restaurantId: 'trincas',
    updatedAt: '2026-05-30',
    categories: [
      category('All Day Classics', [
        { name: 'Chicken Steak', price: 480, history: [[440, '2025-03-01', 'restaurant', 'Restaurant admin'], [480, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Grilled Fish Meunière', price: 520, history: [[490, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Devilled Crab', price: 560, history: [[520, '2026-01-15', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Desserts', [
        { name: 'Death by Chocolate', price: 300, featured: true, history: [[270, '2025-03-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  'flury-s': {
    restaurantId: 'flury-s',
    updatedAt: '2026-06-20',
    categories: [
      category('Breakfast', [
        { name: 'Eggs Benedict', price: 420, featured: true, history: [[380, '2025-02-01', 'restaurant', 'Restaurant admin'], [420, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'English Breakfast', price: 520, history: [[480, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Welsh Rarebit', price: 340, history: [[310, '2026-01-10', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Pastries & Desserts', [
        { name: 'Chocolate Eclair', price: 180, featured: true, history: [[150, '2025-02-01', 'restaurant', 'Restaurant admin'], [180, '2026-01-10', 'restaurant', 'Restaurant admin']] },
        { name: 'Pineapple Pastry', price: 160, history: [[140, '2026-01-10', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  kewpies: {
    restaurantId: 'kewpies',
    updatedAt: '2026-04-12',
    categories: [
      category('Continental', [
        { name: 'Chicken a la Kiev', price: 480, featured: true, history: [[420, '2025-01-15', 'restaurant', 'Restaurant admin'], [480, '2025-11-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Fish & Chips', price: 420, history: [[380, '2025-11-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Cakes & Desserts', [
        { name: 'Rum Balls', price: 140, featured: true, history: [[120, '2025-01-15', 'restaurant', 'Restaurant admin'], [140, '2025-11-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Pineapple Pastry', price: 150, history: [[130, '2025-11-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  'salt-lake-dosa': {
    restaurantId: 'salt-lake-dosa',
    updatedAt: '2026-07-10',
    categories: [
      category('Dosas', [
        { name: 'Mysore Masala Dosa', price: 190, featured: true, history: [[160, '2025-06-01', 'restaurant', 'Restaurant admin'], [190, '2026-03-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Ghee Roast Dosa', price: 210, history: [[180, '2026-03-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Plain Dosa', price: 120, history: [[100, '2025-06-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Tiffin & Meals', [
        { name: 'Mini Tiffin', price: 260, featured: true, history: [[230, '2025-06-01', 'restaurant', 'Restaurant admin'], [260, '2026-03-01', 'restaurant', 'Restaurant admin']] },
        { name: 'South Indian Thali', price: 320, history: [[290, '2026-03-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Beverages', [
        { name: 'Filter Coffee', price: 90, history: [[80, '2025-06-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  '6-ballygunge-place': {
    restaurantId: '6-ballygunge-place',
    updatedAt: '2026-07-25',
    categories: [
      category('Thali & Mains', [
        { name: 'Seasonal Thali', price: 850, description: 'Rotating set menu with the season', featured: true, history: [[780, '2025-07-01', 'restaurant', 'Restaurant admin'], [850, '2026-04-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Ilish Bhapa', price: 620, history: [[560, '2026-04-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Chingri Malai Curry', price: 580, history: [[520, '2025-07-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Sweets', [
        { name: 'Mishti Doi', price: 180, history: [[160, '2026-04-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  zaranj: {
    restaurantId: 'zaranj',
    updatedAt: '2026-06-01',
    categories: [
      category('Kebabs', [
        { name: 'Galouti Kebab', price: 420, featured: true, history: [[380, '2025-05-01', 'restaurant', 'Restaurant admin'], [420, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Murgh Nizami', price: 460, history: [[430, '2026-01-15', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Mains', [
        { name: 'Zafrani Pulao', price: 480, history: [[440, '2026-01-15', 'restaurant', 'Restaurant admin']] },
        { name: 'Shahi Mutton', price: 520, history: [[490, '2025-05-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Desserts', [
        { name: 'Rose Petal Phirni', price: 240, featured: true, history: [[210, '2026-01-15', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  izakaya: {
    restaurantId: 'izakaya',
    updatedAt: '2026-05-20',
    categories: [
      category('Small Plates', [
        { name: 'Chicken Yakitori', price: 380, featured: true, history: [[340, '2025-09-01', 'restaurant', 'Restaurant admin'], [380, '2026-02-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Gyoza (6 pc)', price: 340, history: [[310, '2026-02-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Ramen & Rice', [
        { name: 'Tonkotsu Ramen', price: 520, featured: true, history: [[480, '2025-09-01', 'restaurant', 'Restaurant admin'], [520, '2026-02-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Miso Black Cod', price: 640, history: [[590, '2026-02-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
  'mainland-china': {
    restaurantId: 'mainland-china',
    updatedAt: '2026-06-10',
    categories: [
      category('Dim Sums', [
        { name: 'Crystal Dim Sums (4 pc)', price: 320, featured: true, history: [[280, '2025-03-01', 'restaurant', 'Restaurant admin'], [320, '2026-01-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Chicken Sui Mai (4 pc)', price: 300, history: [[270, '2026-01-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Noodles & Rice', [
        { name: 'Chilli Garlic Noodles', price: 420, featured: true, history: [[380, '2025-03-01', 'restaurant', 'Restaurant admin'], [420, '2026-01-01', 'restaurant', 'Restaurant admin']] },
        { name: 'Burnt Garlic Fried Rice', price: 400, history: [[370, '2026-01-01', 'restaurant', 'Restaurant admin']] },
      ]),
      category('Mains', [
        { name: 'Kung Pao Chicken', price: 520, history: [[490, '2026-01-01', 'restaurant', 'Restaurant admin']] },
      ]),
    ],
  },
};

/**
 * No menu data exists yet for a venue — an explicit empty menu. The UI shows
 * the "Menu data not verified yet" state; we never fabricate dishes or
 * price history for real restaurants.
 */
function emptyMenu(restaurant: Restaurant): Menu {
  return { restaurantId: restaurant.id, updatedAt: '', categories: [] };
}

export function getMenuForRestaurant(restaurant: Restaurant): Menu {
  return SEED_MENUS[restaurant.id] ?? emptyMenu(restaurant);
}

export function allSeededRestaurantIds(): string[] {
  return Object.keys(SEED_MENUS);
}
