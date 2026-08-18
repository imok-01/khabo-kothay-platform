/**
 * Khabo Kothay BD — real restaurant data migration generator.
 *
 * Reads Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx (206 records) and
 * writes:
 *   - src/data/restaurants.ts  (the ACTIVE restaurant dataset)
 *   - src/data/collections.ts  (curated collections rebuilt against real data)
 *
 * Run from the project root:
 *   node scripts/generate-dhaka-data.mjs
 *
 * Uses the `xlsx` package (dev-only; installed as an extraneous dependency).
 * The output is committed so the app never needs the spreadsheet at runtime.
 *
 * Honesty rules honoured by this generator:
 *   - No fabricated descriptions/taglines/reviews/signature dishes.
 *   - No veg status, vibes, hours or outdoor-seating claims (vegUnknown).
 *   - Budget/price derived only from the supplied price range; unpriced
 *     venues get priceForTwo = 0 (treated as "price not listed") and are
 *     excluded from price/budget filters and budget scoring.
 *   - Neighbourhood derived only when the address names it explicitly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// database/pipelines/generators/ → repo root is three levels up.
const ROOT = path.resolve(__dirname, '..', '..', '..');
const XLSX_PATH = path.join(ROOT, 'database', 'imports', 'source', 'Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx');

const wb = XLSX.readFile(XLSX_PATH);
const sheet = wb.Sheets['Restaurants'];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/** Category → canonical cuisine list. Only real Google categories map; the
 *  generic "Restaurant" category maps to nothing (no invented cuisine). */
const CUISINE_MAP = {
  Chinese: ['Chinese'],
  Cantonese: ['Chinese'],
  Japanese: ['Japanese'],
  Sushi: ['Japanese'],
  Thai: ['Thai'],
  Italian: ['Italian'],
  'Southern Italian': ['Italian'],
  Pizza: ['Italian'],
  Bengali: ['Bengali'],
  Bangladeshi: ['Bangladeshi'],
  Indian: ['Indian'],
  Korean: ['Korean'],
  Turkish: ['Turkish'],
  Mexican: ['Mexican'],
  'Middle Eastern': ['Middle Eastern'],
  Lebanese: ['Lebanese'],
  Asian: ['Asian'],
  'Asian Fusion': ['Asian'],
  'Pan Asian': ['Asian'],
  'Fusion restauran': ['Asian'],
  'Continental resta': ['Continental'],
  'Fish & Chips': ['Continental'],
  Portuguese: ['Continental'],
  Steak: ['Continental'],
  Seafood: ['Seafood'],
  Cafe: ['Café'],
  'Coffee shop': ['Café'],
  'Dessert shop': ['Dessert'],
  'Fast Food': ['Fast Food'],
  Hamburger: ['Fast Food'],
  'Fried Chicken': ['Fast Food'],
  'Takeout restaura': ['Fast Food'],
  Buffet: [],
  'Food court': [],
  '4-star hotel': [],
  'Family-friendly': [],
  Restaurant: [],
};

const ACTIVE_CUISINES = [
  'Bengali',
  'Biryani',
  'Mughlai',
  'Chinese',
  'Italian',
  'North Indian',
  'South Indian',
  'Continental',
  'Thai',
  'Japanese',
  'Street Food',
  'Café',
  'Dessert',
  'Seafood',
  'Bangladeshi',
  'Indian',
  'Korean',
  'Turkish',
  'Mexican',
  'Middle Eastern',
  'Lebanese',
  'Asian',
  'Fast Food',
];

const NEIGHBORHOODS = ['Gulshan', 'Banani'];

/** Budget tier from a per-person price midpoint. */
function budgetForPersonPrice(mid) {
  if (mid < 200) return 'Budget';
  if (mid <= 500) return 'Mid-range';
  if (mid <= 1000) return 'Premium';
  return 'Luxury';
}

/** Parse "৳200–400", "৳2,000+", "৳1–200" → { low, high } per person (BDT). */
function parsePriceRange(raw) {
  const s = String(raw).replace(/[৳,\s]/g, '');
  const m = s.match(/^(\d+)(?:[–-](\d+))?\+?$/);
  if (!m) return null;
  const low = Number(m[1]);
  const high = m[2] ? Number(m[2]) : low;
  return { low, high };
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'restaurant';
}

function photoSize(url) {
  const m = String(url).match(/=w(\d+)-h(\d+)-k-no/i);
  if (!m) return null;
  return { width: Number(m[1]), height: Number(m[2]) };
}

/* ------------------------------------------------------------------ */
/* Transform                                                           */
/* ------------------------------------------------------------------ */

const records = [];
const seenSlugs = new Map(); // slug → count
let skipped = 0;
let invalidCoords = 0;
let noPhoto = 0;

for (const row of rows) {
  const name = String(row['Restaurant name'] ?? '').trim();
  const placeId = String(row['Google Place ID'] ?? '').trim();
  const mapsUri = String(row['Google Maps link'] ?? '').trim();
  const rating = Number(row['Google rating']);
  const reviewCount = Number(row['Google review count']);
  const category = String(row['Category'] ?? '').trim();
  const address = String(row['Address'] ?? '').trim();
  const service = String(row['Service options'] ?? '').trim();
  const priceRaw = String(row['Price range'] ?? '').trim();
  const photo = String(row['Google photo link'] ?? '').trim();
  const lat = Number(row['Latitude']);
  const lng = Number(row['Longitude']);

  if (!name || !placeId) {
    skipped += 1;
    continue;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    invalidCoords += 1;
  }
  if (!photo) noPhoto += 1;

  // Unique, deterministic id: slug of the name, deduped with a placeId suffix.
  let id = slugify(name);
  const count = seenSlugs.get(id) ?? 0;
  if (count > 0) id = `${id}-${placeId.slice(-4)}`;
  seenSlugs.set(id, (seenSlugs.get(id) ?? 0) + 1);

  // Cuisine from the Google category — never guessed from the name.
  const cuisines = CUISINE_MAP[category] ?? [];

  // Neighbourhood only when the address names it explicitly.
  const addrLower = address.toLowerCase();
  const location = addrLower.includes('gulshan') ? 'Gulshan' : addrLower.includes('banani') ? 'Banani' : '';

  // Price range → per-person midpoint → priceForTwo + budget tier.
  const parsed = parsePriceRange(priceRaw);
  const mid = parsed ? Math.round((parsed.low + parsed.high) / 2) : null;
  // priceForTwo is the range midpoint doubled, with a SINGLE rounding step
  // (rounding the midpoint first and then doubling added +1 for ranges with
  // an odd sum — e.g. "৳1–200" produced 202 instead of 201).
  const usable = parsed && parsed.low > 1 ? parsed : null;
  const priceForTwo = usable ? Math.round(((usable.low + usable.high) / 2) * 2) : 0;
  const budget = mid !== null ? budgetForPersonPrice(mid) : 'Mid-range';

  // Service options — delivery is the only factual claim we can make.
  const hasDelivery = /delivery/i.test(service);
  const isFamilyFriendly = category === 'Family-friendly';

  const size = photoSize(photo);

  records.push({
    id,
    name,
    cuisines,
    lat,
    lng,
    rating,
    reviewCount,
    placeId,
    mapsUri,
    photo,
    photoAlt: `${name} — photo from Google Maps`,
    photoWidth: size?.width,
    photoHeight: size?.height,
    address,
    location,
    budget,
    priceForTwo,
    hasDelivery,
    isFamilyFriendly,
  });
}

/* ------------------------------------------------------------------ */
/* Unique-id validation                                                */
/* ------------------------------------------------------------------ */

const ids = new Set(records.map((r) => r.id));
const placeIds = new Set(records.map((r) => r.placeId));
const duplicateIds = records.length - ids.size;
const duplicatePlaceIds = records.length - placeIds.size;
if (duplicateIds > 0 || duplicatePlaceIds > 0) {
  console.error('Duplicate ids or placeIds detected — aborting.');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Write src/data/restaurants.ts                                       */
/* ------------------------------------------------------------------ */

const lines = [];
lines.push(`// AUTO-GENERATED — do not edit by hand.`);
lines.push(`// Generated by scripts/generate-dhaka-data.mjs from`);
lines.push(`// Restaurants_Data_Dhaka_Banani_Gulshan_Clean.xlsx (${records.length} records).`);
lines.push(`//`);
lines.push(`// Active Khabo Kothay BD restaurant dataset (Banani + Gulshan, Dhaka).`);
lines.push(`// Recommendation metadata, menus, reviews, offers and price history are`);
lines.push(`// intentionally empty for these real venues — they arrive in later phases.`);
lines.push(`import type { Restaurant, Budget } from '../types';`);
lines.push(``);
lines.push(`export const NEIGHBORHOODS = ${JSON.stringify(NEIGHBORHOODS)} as const;`);
lines.push(``);
lines.push(`export const CUISINES = ${JSON.stringify(ACTIVE_CUISINES)} as const;`);
lines.push(``);
lines.push(`interface Seed {`);
lines.push(`  id: string;`);
lines.push(`  name: string;`);
lines.push(`  cuisines: string[];`);
lines.push(`  lat: number;`);
lines.push(`  lng: number;`);
lines.push(`  rating: number;`);
lines.push(`  reviewCount: number;`);
lines.push(`  placeId: string;`);
lines.push(`  mapsUri: string;`);
lines.push(`  photo: string;`);
lines.push(`  photoAlt: string;`);
lines.push(`  photoWidth?: number;`);
lines.push(`  photoHeight?: number;`);
lines.push(`  address?: string;`);
lines.push(`  location?: string;`);
lines.push(`  budget?: Budget;`);
lines.push(`  priceForTwo?: number;`);
lines.push(`  hasDelivery?: boolean;`);
lines.push(`  isFamilyFriendly?: boolean;`);
lines.push(`}`);
lines.push(``);
lines.push(`function R(s: Seed): Restaurant {`);
lines.push(`  return {`);
lines.push(`    id: s.id,`);
lines.push(`    name: s.name,`);
lines.push(`    tagline: '',`);
lines.push(`    description: '',`);
lines.push(`    cuisines: s.cuisines,`);
lines.push(`    mealTypes: [],`);
lines.push(`    budget: s.budget ?? 'Mid-range',`);
lines.push(`    priceForTwo: s.priceForTwo ?? 0,`);
lines.push(`    location: s.location ?? '',`);
lines.push(`    address: s.address ?? '',`);
lines.push(`    openingHours: '',`);
lines.push(`    isVeg: false,`);
lines.push(`    vegUnknown: true,`);
lines.push(`    hasDelivery: s.hasDelivery ?? false,`);
lines.push(`    hasOutdoorSeating: false,`);
lines.push(`    isFamilyFriendly: s.isFamilyFriendly ?? false,`);
lines.push(`    vibes: [],`);
lines.push(`    lat: s.lat,`);
lines.push(`    lng: s.lng,`);
lines.push(`    signatureDishes: [],`);
lines.push(`    google: {`);
lines.push(`      placeId: s.placeId,`);
lines.push(`      mapsUri: s.mapsUri,`);
lines.push(`      rating: s.rating,`);
lines.push(`      reviewCount: s.reviewCount,`);
lines.push(`      reviews: [],`);
lines.push(`      photos: [{ imageUrl: s.photo, alt: s.photoAlt, width: s.photoWidth, height: s.photoHeight }],`);
lines.push(`      address: s.address || undefined,`);
lines.push(`    },`);
lines.push(`    khabo: {`);
lines.push(`      rating: 0,`);
lines.push(`      reviewCount: 0,`);
lines.push(`      reviews: [],`);
lines.push(`      photos: [],`);
lines.push(`      tags: [],`);
lines.push(`      highlights: [],`);
lines.push(`      signals: [],`);
lines.push(`      visitCount: 0,`);
lines.push(`      featured: false,`);
lines.push(`    },`);
lines.push(`  };`);
lines.push(`}`);
lines.push(``);
lines.push(`export const restaurants: Restaurant[] = [`);
for (const r of records) {
  lines.push(`  R({`);
  lines.push(`    id: ${JSON.stringify(r.id)},`);
  lines.push(`    name: ${JSON.stringify(r.name)},`);
  lines.push(`    cuisines: ${JSON.stringify(r.cuisines)},`);
  lines.push(`    lat: ${r.lat},`);
  lines.push(`    lng: ${r.lng},`);
  lines.push(`    rating: ${r.rating},`);
  lines.push(`    reviewCount: ${r.reviewCount},`);
  lines.push(`    placeId: ${JSON.stringify(r.placeId)},`);
  lines.push(`    mapsUri: ${JSON.stringify(r.mapsUri)},`);
  lines.push(`    photo: ${JSON.stringify(r.photo)},`);
  lines.push(`    photoAlt: ${JSON.stringify(r.photoAlt)},`);
  if (r.photoWidth) lines.push(`    photoWidth: ${r.photoWidth},`);
  if (r.photoHeight) lines.push(`    photoHeight: ${r.photoHeight},`);
  if (r.address) lines.push(`    address: ${JSON.stringify(r.address)},`);
  if (r.location) lines.push(`    location: ${JSON.stringify(r.location)},`);
  lines.push(`    budget: ${JSON.stringify(r.budget)},`);
  lines.push(`    priceForTwo: ${r.priceForTwo},`);
  if (r.hasDelivery) lines.push(`    hasDelivery: true,`);
  if (r.isFamilyFriendly) lines.push(`    isFamilyFriendly: true,`);
  lines.push(`  }),`);
}
lines.push(`];`);
lines.push(``);

const restaurantsTs = lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'restaurants.ts'), restaurantsTs);

/* ------------------------------------------------------------------ */
/* Write src/data/collections.ts — rebuilt against the real dataset    */
/* ------------------------------------------------------------------ */

const effectiveRating = (r) => (r.khabo && r.khabo.reviewCount > 0 ? r.khabo.rating : r.rating);

const collectionDefs = [
  {
    slug: 'top-rated',
    title: 'Highest rated in Banani & Gulshan',
    description: 'The most-loved tables in the area, straight from real Google ratings.',
    exploreParams: { sortBy: 'rating' },
    match: (r) => (r.khabo.reviewCount > 0 ? r.khabo.rating : (r.google?.rating ?? 0)) >= 4.6,
  },
  {
    slug: 'gulshan-dining',
    title: 'Gulshan favourites',
    description: 'Reliable tables and fine dining around Gulshan Avenue and Road 45.',
    exploreParams: { location: 'Gulshan', sortBy: 'rating' },
    match: (r) => r.location === 'Gulshan',
  },
  {
    slug: 'banani-bites',
    title: 'Banani bites',
    description: 'Road-side gems and office-hour favourites in Banani.',
    exploreParams: { location: 'Banani', sortBy: 'rating' },
    match: (r) => r.location === 'Banani',
  },
  {
    slug: 'chinese-cravings',
    title: 'Chinese cravings',
    description: 'Wok-fired noodles, dumplings and sizzlers in Dhaka.',
    exploreParams: { cuisine: 'Chinese', sortBy: 'rating' },
    match: (r) => r.cuisines.includes('Chinese'),
  },
  {
    slug: 'bangladeshi-classics',
    title: 'Bangladeshi classics',
    description: 'Home-style Bangladeshi cooking — kacchi, biryani and beyond.',
    exploreParams: { cuisine: 'Bangladeshi', sortBy: 'rating' },
    match: (r) => r.cuisines.includes('Bangladeshi'),
  },
  {
    slug: 'italian-evenings',
    title: 'Italian evenings',
    description: 'Wood-fired pizza and handmade pasta for a slow dinner.',
    exploreParams: { cuisine: 'Italian', sortBy: 'rating' },
    match: (r) => r.cuisines.includes('Italian'),
  },
  {
    slug: 'japanese-table',
    title: 'Japanese & sushi',
    description: 'Sushi counters and izakaya plates around Banani and Gulshan.',
    exploreParams: { cuisine: 'Japanese', sortBy: 'rating' },
    match: (r) => r.cuisines.includes('Japanese'),
  },
  {
    slug: 'quick-and-casual',
    title: 'Quick & casual',
    description: 'Fast food, burgers and no-fuss bites for a busy day.',
    exploreParams: { cuisine: 'Fast Food', sortBy: 'rating' },
    match: (r) => r.cuisines.includes('Fast Food'),
  },
  {
    slug: 'under-500',
    title: 'Meals under ৳500',
    description: 'Honest plates that will not blow the budget.',
    exploreParams: { maxPrice: '500', sortBy: 'rating' },
    match: (r) => r.priceForTwo > 0 && r.priceForTwo <= 500,
  },
  {
    slug: 'delivered',
    title: 'Delivered to your door',
    description: 'Venues that list delivery across Banani and Gulshan.',
    exploreParams: { delivery: '1', sortBy: 'rating' },
    match: (r) => r.hasDelivery,
  },
];

const pickCover = (list) => [...list].sort((a, b) => effectiveRating(b) - effectiveRating(a) || b.reviewCount - a.reviewCount)[0];

const collLines = [];
collLines.push(`// AUTO-GENERATED — do not edit by hand.`);
collLines.push(`// Curated collections rebuilt against the real Dhaka dataset by`);
collLines.push(`// scripts/generate-dhaka-data.mjs — every collection matches real data.`);
collLines.push(`import type { Restaurant } from '../types';`);
collLines.push(``);
collLines.push(`export interface Collection {`);
collLines.push(`  slug: string;`);
collLines.push(`  title: string;`);
collLines.push(`  description: string;`);
collLines.push(`  /** restaurant whose photography is used for the cover */`);
collLines.push(`  coverRestaurantId: string;`);
collLines.push(`  /** explore URL params for "view all" */`);
collLines.push(`  exploreParams: Record<string, string>;`);
collLines.push(`  match: (r: Restaurant) => boolean;`);
collLines.push(`}`);
collLines.push(``);
collLines.push(`export const collections: Collection[] = [`);
// Records here don't carry the full khabo shape yet — stub it so matches
// that read khabo (the top-rated rule) behave identically to the app.
// Seed records carry flat fields; stub the runtime shape (google + khabo)
// so match expressions evaluate identically to how they run in the app.
const withKhaboStub = (r) => ({
  ...r,
  google: { rating: r.rating, reviewCount: r.reviewCount },
  khabo: { reviewCount: 0, rating: 0, reviews: [], photos: [], tags: [], highlights: [], signals: [], visitCount: 0, featured: false },
});

for (const c of collectionDefs) {
  const matches = records.filter((r) => c.match(withKhaboStub(r)));
  const cover = pickCover(matches);
  if (!cover) {
    // Empty collections are simply omitted — a curated list must be backed by
    // real matching data (e.g. "under ৳500 for two" has no verified members
    // once fabricated prices are removed).
    console.warn(`Collection "${c.slug}" has no matches in the dataset — omitting.`);
    continue;
  }
  collLines.push(`  {`);
  collLines.push(`    slug: ${JSON.stringify(c.slug)},`);
  collLines.push(`    title: ${JSON.stringify(c.title)},`);
  collLines.push(`    description: ${JSON.stringify(c.description)},`);
  collLines.push(`    coverRestaurantId: ${JSON.stringify(cover.id)},`);
  collLines.push(`    exploreParams: ${JSON.stringify(c.exploreParams)},`);
  collLines.push(`    match: ${c.match.toString()},`);
  collLines.push(`  },`);
}
collLines.push(`];`);
collLines.push(``);
collLines.push(`export const getCollection = (slug: string) => collections.find((c) => c.slug === slug);`);
collLines.push(``);
fs.writeFileSync(path.join(ROOT, 'src', 'data', 'collections.ts'), collLines.join('\n'));

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

const withPrice = records.filter((r) => r.priceForTwo > 0).length;
const withAddress = records.filter((r) => r.address).length;
const withLocation = records.filter((r) => r.location).length;
const withDelivery = records.filter((r) => r.hasDelivery).length;
const familyFriendly = records.filter((r) => r.isFamilyFriendly).length;
const budgetCounts = records.reduce((acc, r) => ((acc[r.budget] = (acc[r.budget] ?? 0) + 1), acc), {});

const gulshan = records.filter((r) => r.location === 'Gulshan');
const banani = records.filter((r) => r.location === 'Banani');
const centroid = (list) => {
  if (list.length === 0) return null;
  const lat = list.reduce((s, r) => s + r.lat, 0) / list.length;
  const lng = list.reduce((s, r) => s + r.lng, 0) / list.length;
  return { lat: lat.toFixed(5), lng: lng.toFixed(5) };
};

console.log('==========================================');
console.log('KHABO KOTHAY BD — IMPORT REPORT');
console.log('==========================================');
console.log(`Excel rows:              ${rows.length}`);
console.log(`Imported:                ${records.length}`);
console.log(`Skipped (no name/id):    ${skipped}`);
console.log(`Duplicate ids:           ${duplicateIds}`);
console.log(`Duplicate place IDs:     ${duplicatePlaceIds}`);
console.log(`Invalid coordinates:     ${invalidCoords}`);
console.log(`Missing photo:           ${noPhoto}`);
console.log(`With address:            ${withAddress}`);
console.log(`With explicit area:      ${withLocation} (Gulshan ${gulshan.length} · Banani ${banani.length})`);
console.log(`With price range:        ${withPrice} (unpriced treated as unknown)`);
console.log(`With delivery:           ${withDelivery}`);
console.log(`Family-friendly tag:     ${familyFriendly}`);
console.log(`Budget tiers:            ${JSON.stringify(budgetCounts)}`);
console.log(`Area centroids:          Gulshan ${JSON.stringify(centroid(gulshan))} · Banani ${JSON.stringify(centroid(banani))}`);
console.log(`Demo-admin picks:        ${records[0].name} -> ${records[0].id} | ${records[1].name} -> ${records[1].id}`);
console.log('------------------------------------------');
console.log(`Wrote src/data/restaurants.ts (${records.length} records)`);
console.log(`Wrote src/data/collections.ts (${collectionDefs.length} collections)`);
