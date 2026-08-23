/**
 * Isolated DEV simulation data — KK Demo Restaurant + its menu (with price
 * history), offers and reviews.
 *
 * NONE of this data touches the real 206-restaurant catalogue. Every record is
 * keyed to the id `kk-demo-restaurant` and is only surfaced when
 * `isDevSimulation()` is true (see lib/devSimulation.ts). The records are
 * injected at the repository seams (restaurantRepository / menuRepository /
 * reviewRepository / OfferProvider), so production — and the real Dhaka
 * catalogue — is never modified.
 *
 * This is intentionally a self-contained "simulation island": a restaurant a
 * Khabo Kothay team member can log into, edit, and demo end-to-end without
 * affecting any real venue or real user.
 */

import type { Restaurant } from '../types';
import type { Menu, MenuCategory, MenuItem, PriceSnapshot } from '../domain/menu';
import type { Offer } from '../domain/offers';
import type { UserReview } from '../domain/review';
import type { KhaboPhoto, KhaboReview, RestaurantSignal } from '../domain/place';

export const KK_DEMO_RESTAURANT_ID = 'kk-demo-restaurant';
export const KK_DEMO_RESTAURANT_ADMIN_ID = 'kk-demo-owner';
export const KK_DEMO_RESTAURANT_ADMIN_CONTACT = '01412345678';
export const KK_DEMO_RESTAURANT_ADMIN_PASSWORD = 'demo123';

/* ------------------------------------------------------------------ */
/* Price-history snapshots (the "recorded observation" model)          */
/* ------------------------------------------------------------------ */

function snap(
  id: string,
  price: number,
  at: string,
  source: PriceSnapshot['source'],
  recordedBy: string,
  status: PriceSnapshot['status'] = 'recorded',
): PriceSnapshot {
  return { id, price, at, source, recordedBy, status };
}

function dish(d: {
  id: string;
  name: string;
  price: number;
  description?: string;
  available?: boolean;
  featured?: boolean;
  signature?: boolean;
  lastUpdated: string;
  history: PriceSnapshot[];
}): MenuItem {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    price: d.price,
    available: d.available ?? true,
    featured: d.featured,
    isSignature: d.signature ?? d.featured,
    source: d.history[d.history.length - 1].source,
    lastUpdated: d.lastUpdated,
    priceHistory: d.history,
  };
}

function category(id: string, name: string, order: number, dishes: MenuItem[]): MenuCategory {
  return { id, name, order, dishes };
}

/* ------------------------------------------------------------------ */
/* Menu (with real-looking recorded price history)                     */
/* ------------------------------------------------------------------ */

export const DEV_DEMO_MENU: Menu = {
  restaurantId: KK_DEMO_RESTAURANT_ID,
  updatedAt: '2026-07-20',
  categories: [
    category('kk-cat-starters', 'Starters', 1, [
      dish({
        id: 'kk-dish-bhorta',
        name: 'Bhorta Platter',
        price: 280,
        description: 'Seasonal vegetable bhortas with mustard oil and crisp papor',
        featured: true,
        signature: true,
        lastUpdated: '2026-03-15',
        history: [
          snap('kk-snap-bh-1', 240, '2025-09-01', 'khabo-recorded', 'Khabo Kothay'),
          snap('kk-snap-bh-2', 280, '2026-03-15', 'restaurant', 'Restaurant admin'),
        ],
      }),
      dish({
        id: 'kk-dish-chicken65',
        name: 'Chicken 65',
        price: 320,
        description: 'Crispy curry-leaf fried chicken, medium spice',
        lastUpdated: '2026-01-10',
        history: [snap('kk-snap-c65-1', 300, '2025-10-01', 'restaurant', 'Restaurant admin'), snap('kk-snap-c65-2', 320, '2026-01-10', 'restaurant', 'Restaurant admin')],
      }),
      dish({
        id: 'kk-dish-springroll',
        name: 'Veg Spring Roll',
        price: 180,
        lastUpdated: '2025-11-01',
        history: [snap('kk-snap-sr-1', 160, '2025-11-01', 'restaurant', 'Restaurant admin')],
      }),
    ]),
    category('kk-cat-biryani', 'Biryani & Rice', 2, [
      dish({
        id: 'kk-dish-kacchi',
        name: 'Kacchi Biryani',
        price: 450,
        description: 'Slow-cooked mutton kacchi with saffron rice and aloo',
        featured: true,
        signature: true,
        lastUpdated: '2026-05-20',
        history: [
          snap('kk-snap-kc-1', 400, '2025-08-01', 'restaurant', 'Restaurant admin'),
          snap('kk-snap-kc-2', 420, '2025-12-01', 'restaurant', 'Restaurant admin'),
          snap('kk-snap-kc-3', 450, '2026-05-20', 'restaurant', 'Restaurant admin'),
        ],
      }),
      dish({
        id: 'kk-dish-friedrice',
        name: 'Chicken Fried Rice',
        price: 260,
        lastUpdated: '2026-02-01',
        history: [
          snap('kk-snap-fr-1', 240, '2025-10-01', 'khabo-recorded', 'Khabo Kothay'),
          snap('kk-snap-fr-2', 260, '2026-02-01', 'restaurant', 'Restaurant admin'),
        ],
      }),
      dish({
        id: 'kk-dish-tehari',
        name: 'Beef Tehari',
        price: 380,
        description: 'Dhaka-style beef tehari with whole spices',
        lastUpdated: '2026-01-15',
        history: [snap('kk-snap-th-1', 350, '2026-01-15', 'restaurant', 'Restaurant admin')],
      }),
    ]),
    category('kk-cat-mains', 'Mains', 3, [
      dish({
        id: 'kk-dish-kosha',
        name: 'Kosha Mangsho',
        price: 420,
        description: 'Slow-braised goat in a dark spice gravy',
        featured: true,
        signature: true,
        lastUpdated: '2026-04-10',
        history: [
          snap('kk-snap-km-1', 380, '2025-09-15', 'restaurant', 'Restaurant admin'),
          snap('kk-snap-km-2', 420, '2026-04-10', 'restaurant', 'Restaurant admin'),
        ],
      }),
      dish({
        id: 'kk-dish-pomfret',
        name: 'Grilled Pomfret',
        price: 520,
        lastUpdated: '2026-02-20',
        history: [snap('kk-snap-pf-1', 480, '2026-02-20', 'khabo-recorded', 'Khabo Kothay')],
      }),
      dish({
        id: 'kk-dish-paneer',
        name: 'Paneer Butter Masala',
        price: 340,
        description: 'Vegetarian — cottage cheese in a tomato-cream gravy',
        lastUpdated: '2026-03-01',
        history: [snap('kk-snap-pn-1', 320, '2026-03-01', 'restaurant', 'Restaurant admin')],
      }),
    ]),
    category('kk-cat-desserts', 'Desserts', 4, [
      dish({
        id: 'kk-dish-mishti',
        name: 'Mishti Doi',
        price: 120,
        description: 'Sweetened hung curd, cardamom',
        lastUpdated: '2025-12-01',
        history: [snap('kk-snap-md-1', 110, '2025-12-01', 'restaurant', 'Restaurant admin')],
      }),
      dish({
        id: 'kk-dish-gulab',
        name: 'Gulab Jamun (2 pc)',
        price: 140,
        lastUpdated: '2026-01-05',
        history: [snap('kk-snap-gj-1', 130, '2026-01-05', 'restaurant', 'Restaurant admin')],
      }),
    ]),
    category('kk-cat-beverages', 'Beverages', 5, [
      dish({
        id: 'kk-dish-lassi',
        name: 'Sweet Lassi',
        price: 90,
        lastUpdated: '2025-11-01',
        history: [snap('kk-snap-la-1', 80, '2025-11-01', 'restaurant', 'Restaurant admin')],
      }),
      dish({
        id: 'kk-dish-lemontea',
        name: 'Lemon Iced Tea',
        price: 110,
        lastUpdated: '2026-02-15',
        history: [snap('kk-snap-lt-1', 100, '2026-02-15', 'restaurant', 'Restaurant admin')],
      }),
    ]),
  ],
};

/* ------------------------------------------------------------------ */
/* Offers (platform-approved demo offers for the demo restaurant)      */
/* ------------------------------------------------------------------ */

export const DEV_DEMO_OFFERS: Offer[] = [
  {
    id: 'kk-demo-offer-firstorder',
    restaurantId: KK_DEMO_RESTAURANT_ID,
    title: '20% off your first KK Demo order',
    discountLabel: '20% OFF',
    value: 'Save up to ৳200',
    validity: 'Valid through 31 Dec 2026',
    terms: 'New customers only. One redemption per person. Demo offer — not valid at real venues.',
    applicableMealTypes: ['Lunch', 'Dinner'],
    isMock: true,
    source: 'seed',
    status: 'approved',
  },
  {
    id: 'kk-demo-offer-dessert',
    restaurantId: KK_DEMO_RESTAURANT_ID,
    title: 'Free dessert over ৳800',
    discountLabel: 'FREE DESSERT',
    value: 'Worth ৳150',
    validity: 'Valid through 31 Dec 2026',
    terms: 'Auto-applied above ৳800 subtotal. Demo offer — not valid at real venues.',
    applicableMealTypes: ['Lunch', 'Dinner', 'Snacks'],
    isMock: true,
    source: 'seed',
    status: 'approved',
  },
];

/* ------------------------------------------------------------------ */
/* Reviews (KK community reviews for the demo restaurant)              */
/* ------------------------------------------------------------------ */

const KK_DEMO_KHABO_REVIEWS: KhaboReview[] = [
  {
    id: 'kk-krev-1',
    author: 'Aisha Rahman',
    rating: 5,
    date: '2026-07-18',
    comment: 'The Kacchi Biryani here is unreal — perfectly aged rice and tender mutton. The Bhorta Platter to start is a must.',
    visitStatus: 'regular',
    visitCount: 6,
    favoriteDishes: ['Kacchi Biryani', 'Mishti Doi'],
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 4,
    valueRating: 5,
    helpfulCount: 12,
    photos: [],
  },
  {
    id: 'kk-krev-2',
    author: 'Rafi Chowdhury',
    rating: 4,
    date: '2026-07-02',
    comment: 'Great family spot in Gulshan. Portions are generous and the staff are patient with kids. Slightly slow on weekends.',
    visitStatus: 'visited',
    visitCount: 2,
    favoriteDishes: ['Kosha Mangsho'],
    foodRating: 5,
    serviceRating: 4,
    ambienceRating: 4,
    valueRating: 4,
    helpfulCount: 5,
    photos: [],
  },
  {
    id: 'kk-krev-3',
    author: 'Nila Sultana',
    rating: 5,
    date: '2026-06-20',
    comment: 'Loved the rooftop seating in the evening. The Grilled Pomfret was fresh and the Lemon Iced Tea hit the spot.',
    visitStatus: 'visited',
    visitCount: 1,
    favoriteDishes: ['Grilled Pomfret', 'Lemon Iced Tea'],
    foodRating: 5,
    serviceRating: 5,
    ambienceRating: 5,
    valueRating: 4,
    helpfulCount: 8,
    photos: [],
  },
];

// Community ("Khabo Kothay photos") imagery for the demo venue — these are
// clearly-labelled community photos, not fabricated Google imagery.
const KK_DEMO_PHOTOS: KhaboPhoto[] = [
  { id: 'kk-photo-1', url: 'https://picsum.photos/seed/kk-kacchi/1200/800', alt: 'Kacchi Biryani platter at KK Demo Restaurant' },
  { id: 'kk-photo-2', url: 'https://picsum.photos/seed/kk-rooftop/1200/800', alt: 'Rooftop dining area in the evening' },
  { id: 'kk-photo-3', url: 'https://picsum.photos/seed/kk-counter/1200/800', alt: 'Signature dishes on display at the counter' },
  { id: 'kk-photo-4', url: 'https://picsum.photos/seed/kk-biryani/1200/800', alt: 'Freshly served biryani' },
  { id: 'kk-photo-5', url: 'https://picsum.photos/seed/kk-family/1200/800', alt: 'Family table set for dinner' },
];

const KK_DEMO_SIGNALS: RestaurantSignal[] = [
  { id: 'kk-sig-value', type: 'value', label: 'Great value', strength: 82, sources: ['reviews', 'tags'] },
  { id: 'kk-sig-dish', type: 'dish', label: 'Popular for biryani', strength: 90, sources: ['reviews', 'visits'] },
  { id: 'kk-sig-family', type: 'family', label: 'Family-friendly', strength: 78, sources: ['metadata'] },
  { id: 'kk-sig-revisit', type: 'revisit', label: 'Often revisited', strength: 70, sources: ['visits'] },
  { id: 'kk-sig-quiet', type: 'quiet', label: 'Quiet seating', strength: 66, sources: ['metadata'] },
];

export const DEV_DEMO_RESTAURANT: Restaurant = {
  id: KK_DEMO_RESTAURANT_ID,
  name: 'KK Demo Restaurant',
  tagline: 'Khabo Kothay internal simulation venue',
  description:
    'A fully self-contained demo restaurant used to exercise the Khabo Kothay experience end-to-end — discovery, menus, price history, offers, reviews, rewards and the restaurant-admin tools — without touching any real venue.',
  cuisines: ['Bengali', 'Biryani', 'Chinese', 'Fast Food'],
  mealTypes: ['Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner', 'Dessert'],
  budget: 'Mid-range',
  priceForTwo: 600,
  location: 'Gulshan',
  address: 'House 12, Road 4, Gulshan 1, Dhaka 1212',
  city: 'Dhaka',
  openingHours: '11:00 AM – 11:00 PM',
  isVeg: false,
  hasDelivery: true,
  hasOutdoorSeating: true,
  isFamilyFriendly: true,
  vibes: ['Family', 'Quiet', 'Instagram-worthy', 'Work-friendly', 'Rooftop'],
  lat: 23.7937,
  lng: 90.4064,
  signatureDishes: ['Kacchi Biryani', 'Kosha Mangsho', 'Bhorta Platter'],
  khabo: {
    rating: 4.7,
    reviewCount: KK_DEMO_KHABO_REVIEWS.length,
    reviews: KK_DEMO_KHABO_REVIEWS,
    photos: KK_DEMO_PHOTOS,
    tags: ['great biryani', 'generous portions', 'family friendly', 'quiet seating'],
    highlights: ['Kacchi Biryani is the signature pick', 'Quiet rooftop seating in the evenings'],
    signals: KK_DEMO_SIGNALS,
    visitCount: 1240,
    featured: true,
  },
  // Fabricated Google-style snapshot for the simulation island (clearly a demo
  // record — never synced to the real Google data source). Surfaces the
  // secondary "Google" rating + the public contact details.
  google: {
    placeId: 'kk-demo-google-place',
    mapsUri:
      'https://www.google.com/maps/place/KK+Demo+Restaurant/@23.7937,90.4064,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d23.7937!4d90.4064!16s%2Fg%2Fkkdemorestaurant',
    rating: 4.5,
    reviewCount: 980,
    reviews: [],
    photos: [],
    address: 'House 12, Road 4, Gulshan 1, Dhaka 1212',
    website: 'https://khabokothay.test/kk-demo-restaurant',
    phone: '+880 1412-345678',
    openingHours: '11:00 AM – 11:00 PM',
  },
};

/* ------------------------------------------------------------------ */
/* KK user reviews (the reviewRepository surface)                      */
/* ------------------------------------------------------------------ */

export const DEV_DEMO_REVIEWS: UserReview[] = [
  {
    id: 'kk-rev-1',
    restaurantId: KK_DEMO_RESTAURANT_ID,
    userId: 'kk-demo-customer-aisha',
    author: 'Aisha Rahman',
    rating: 5,
    date: '2026-07-18',
    comment: 'The Kacchi Biryani here is unreal — perfectly aged rice and tender mutton. The Bhorta Platter to start is a must.',
    visitStatus: 'regular',
    visitCount: 6,
    favoriteDishes: ['Kacchi Biryani', 'Mishti Doi'],
    helpfulCount: 12,
  },
  {
    id: 'kk-rev-2',
    restaurantId: KK_DEMO_RESTAURANT_ID,
    userId: 'kk-demo-customer-rafi',
    author: 'Rafi Chowdhury',
    rating: 4,
    date: '2026-07-02',
    comment: 'Great family spot in Gulshan. Portions are generous and the staff are patient with kids. Slightly slow on weekends.',
    visitStatus: 'visited',
    visitCount: 2,
    favoriteDishes: ['Kosha Mangsho'],
    helpfulCount: 5,
  },
  {
    id: 'kk-rev-3',
    restaurantId: KK_DEMO_RESTAURANT_ID,
    userId: 'kk-demo-customer-nila',
    author: 'Nila Sultana',
    rating: 5,
    date: '2026-06-20',
    comment: 'Loved the rooftop seating in the evening. The Grilled Pomfret was fresh and the Lemon Iced Tea hit the spot.',
    visitStatus: 'visited',
    visitCount: 1,
    favoriteDishes: ['Grilled Pomfret', 'Lemon Iced Tea'],
    helpfulCount: 8,
  },
];
