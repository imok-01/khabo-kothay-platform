// AUTO-GENERATED — do not edit by hand.
// Curated collections rebuilt against the real Dhaka dataset by
// scripts/generate-dhaka-data.mjs — every collection matches real data.
import type { Restaurant } from '../types';

export interface Collection {
  slug: string;
  title: string;
  description: string;
  /** restaurant whose photography is used for the cover */
  coverRestaurantId: string;
  /** explore URL params for "view all" */
  exploreParams: Record<string, string>;
  match: (r: Restaurant) => boolean;
}

export const collections: Collection[] = [
  {
    slug: "top-rated",
    title: "Highest rated in Banani & Gulshan",
    description: "The most-loved tables in the area, straight from real Google ratings.",
    coverRestaurantId: "burgergo-gulshan",
    exploreParams: {"sortBy":"rating"},
    match: (r) => (r.khabo.reviewCount > 0 ? r.khabo.rating : (r.google?.rating ?? 0)) >= 4.6,
  },
  {
    slug: "gulshan-dining",
    title: "Gulshan favourites",
    description: "Reliable tables and fine dining around Gulshan Avenue and Road 45.",
    coverRestaurantId: "moja-korean-fusion-restaurant",
    exploreParams: {"location":"Gulshan","sortBy":"rating"},
    match: (r) => r.location === 'Gulshan',
  },
  {
    slug: "banani-bites",
    title: "Banani bites",
    description: "Road-side gems and office-hour favourites in Banani.",
    coverRestaurantId: "tree-house",
    exploreParams: {"location":"Banani","sortBy":"rating"},
    match: (r) => r.location === 'Banani',
  },
  {
    slug: "chinese-cravings",
    title: "Chinese cravings",
    description: "Wok-fired noodles, dumplings and sizzlers in Dhaka.",
    coverRestaurantId: "yum-cha-district",
    exploreParams: {"cuisine":"Chinese","sortBy":"rating"},
    match: (r) => r.cuisines.includes('Chinese'),
  },
  {
    slug: "bangladeshi-classics",
    title: "Bangladeshi classics",
    description: "Home-style Bangladeshi cooking — kacchi, biryani and beyond.",
    coverRestaurantId: "jassica-spa",
    exploreParams: {"cuisine":"Bangladeshi","sortBy":"rating"},
    match: (r) => r.cuisines.includes('Bangladeshi'),
  },
  {
    slug: "italian-evenings",
    title: "Italian evenings",
    description: "Wood-fired pizza and handmade pasta for a slow dinner.",
    coverRestaurantId: "pizzaburg-gulshan",
    exploreParams: {"cuisine":"Italian","sortBy":"rating"},
    match: (r) => r.cuisines.includes('Italian'),
  },
  {
    slug: "japanese-table",
    title: "Japanese & sushi",
    description: "Sushi counters and izakaya plates around Banani and Gulshan.",
    coverRestaurantId: "takumi",
    exploreParams: {"cuisine":"Japanese","sortBy":"rating"},
    match: (r) => r.cuisines.includes('Japanese'),
  },
  {
    slug: "quick-and-casual",
    title: "Quick & casual",
    description: "Fast food, burgers and no-fuss bites for a busy day.",
    coverRestaurantId: "burgergo-gulshan",
    exploreParams: {"cuisine":"Fast Food","sortBy":"rating"},
    match: (r) => r.cuisines.includes('Fast Food'),
  },
  {
    slug: "delivered",
    title: "Delivered to your door",
    description: "Venues that list delivery across Banani and Gulshan.",
    coverRestaurantId: "burgergo-gulshan",
    exploreParams: {"delivery":"1","sortBy":"rating"},
    match: (r) => r.hasDelivery,
  },
];

export const getCollection = (slug: string) => collections.find((c) => c.slug === slug);
