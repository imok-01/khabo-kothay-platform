import type { RestaurantImageSource } from '../domain/images';
import { unsplashPhotoUrl } from '../repositories/ImageProvider';

/**
 * Curated placeholder photography mapped per restaurant. All photo IDs were
 * verified against the Unsplash CDN; imagery is demo placeholder data that a
 * real image backend can replace without changing components (see
 * src/repositories/ImageProvider.ts).
 */
const UNSPLASH_LICENSE = 'Unsplash License';

function img(photoId: string, alt: string): RestaurantImageSource {
  return {
    provider: 'unsplash',
    imageUrl: unsplashPhotoUrl(photoId),
    alt,
    attribution: 'Photo: Unsplash',
    license: UNSPLASH_LICENSE,
  };
}

export const RESTAURANT_IMAGES: Record<string, RestaurantImageSource[]> = {
  'bhojohori-manna': [
    img('1580828343064-fde4fc206bc6', 'Rich, slow-cooked Bengali-style curry served in a traditional pot'),
    img('1547592180-85f173990554', 'Steaming regional curry dish at the table'),
  ],
  trincas: [
    img('1414235077428-338989a2e8c0', 'Warmly lit heritage restaurant interior'),
    img('1517248135467-4c7edcad34c4', 'Set restaurant table in a classic dining room'),
  ],
  'shiraz-golden-restaurant': [
    img('1580828343064-fde4fc206bc6', 'Fragrant mutton curry with rice'),
    img('1512058564366-18510be2db19', 'Spiced rice and curry plate'),
  ],
  kewpies: [
    img('1567620905732-2d1ec7ab7445', 'Stack of breakfast pancakes with fresh fruit'),
    img('1559339352-11d035aa65de', 'Layer cake slice with cream'),
  ],
  '6-ballygunge-place': [
    img('1466978913421-dad2ebd01d17', 'Elegant heritage dining room'),
    img('1504674900247-0877df9cc836', 'Generous spread of regional dishes'),
  ],
  'roast-and-soda': [
    img('1476224203421-9ac39bcb3327', 'Café table with coffee and small plates'),
    img('1529042410759-befb1204b468', 'Retro café corner with drinks'),
  ],
  arsalan: [
    img('1580828343064-fde4fc206bc6', 'Biryani rice with tender meat'),
    img('1512058564366-18510be2db19', 'Spiced biryani served in a pot'),
  ],
  mocambo: [
    img('1517248135467-4c7edcad34c4', 'Classic dining room with red accents'),
    img('1519708227418-c8fd9a32b7a2', 'Plated continental dish on dark tableware'),
  ],
  'oh-calcutta': [
    img('1504674900247-0877df9cc836', 'Fine-dining spread of Bengali courses'),
    img('1482049016688-2d3e1b311543', 'Carefully plated seafood dish'),
  ],
  'mainland-china': [
    img('1585032226651-759b368d7246', 'Noodle bowl with vegetables'),
    img('1563245372-f21724e3856d', 'Asian curry with fresh herbs'),
  ],
  zaranj: [
    img('1519708227418-c8fd9a32b7a2', 'Moody plated fine-dining dish'),
    img('1482049016688-2d3e1b311543', 'Refined plated starter'),
  ],
  'saltlake-cafe': [
    img('1476224203421-9ac39bcb3327', 'Bright café table with coffee'),
    img('1498837167922-ddd27525d352', 'All-day brunch plate'),
  ],
  'newtown-noodle': [
    img('1585032226651-759b368d7246', 'Steaming noodle bowl'),
    img('1563245372-f21724e3856d', 'Wok-fried noodle dish'),
  ],
  'havmor-dosa': [
    img('1512058564366-18510be2db19', 'Golden dosa with chutneys'),
    img('1512621776951-a57141f2eefd', 'Fresh vegetarian plate'),
  ],
  'old-china': [
    img('1585032226651-759b368d7246', 'Hakka noodle bowl'),
    img('1571091718767-18b5b1457add', 'Crispy fried chicken plate'),
  ],
  serafina: [
    img('1565299624946-b28f40a0ae38', 'Wood-fired pizza with melted cheese'),
    img('1540189549336-e6e99c3679fe', 'Handmade pasta with tomato sauce'),
  ],
  'kathi-junction': [
    img('1571091718767-18b5b1457add', 'Grilled chicken roll wrapped in paratha'),
    img('1600891964092-4316c288032e', 'Char-grilled skewers and street snacks'),
  ],
  'the-corner-bakeshop': [
    img('1559339352-11d035aa65de', 'Artisan layer cake'),
    img('1533777324565-a040eb52facd', 'Freshly baked pastries'),
  ],
  'salt-lake-dosa': [
    img('1512621776951-a57141f2eefd', 'Vegetarian South Indian meal'),
    img('1512058564366-18510be2db19', 'Crisp dosa with side dishes'),
  ],
  'flury-s': [
    img('1559339352-11d035aa65de', 'Heritage tearoom pastries and cake'),
    img('1414235077428-338989a2e8c0', 'Classic café interior with tea service'),
  ],
  'szechuan-park': [
    img('1563245372-f21724e3856d', 'Fiery Szechuan-style curry'),
    img('1600891964092-4316c288032e', 'Wok-fried chilli chicken'),
  ],
  'dada-boudi': [
    img('1569718212165-3a8278d5f624', 'Homestyle tiffin spread'),
    img('1512058564366-18510be2db19', 'Comforting rice and curry'),
  ],
  izakaya: [
    img('1563245372-f21724e3856d', 'Japanese curry with rice'),
    img('1519708227418-c8fd9a32b7a2', 'Intimate izakaya-style small plate'),
  ],
  'bombay-bites': [
    img('1559847844-5315695dadae', 'Indian street-food snack plate'),
    img('1569718212165-3a8278d5f624', 'Chat-style bite-size snacks'),
  ],
  'la-mia-italiana': [
    img('1540189549336-e6e99c3679fe', 'Freshly made tagliatelle with ragù'),
    img('1565299624946-b28f40a0ae38', 'Margherita pizza from a wood oven'),
  ],
  'gulab-sweets': [
    img('1559339352-11d035aa65de', 'Traditional sweet shop treats'),
    img('1533777324565-a040eb52facd', 'Handmade Indian sweets'),
  ],
  'thai-orchid': [
    img('1563245372-f21724e3856d', 'Green Thai curry with herbs'),
    img('1504674900247-0877df9cc836', 'Thai sharing platter'),
  ],
  'park-hotel-coffee-house': [
    img('1498837167922-ddd27525d352', 'Heritage café with filter coffee'),
    img('1476224203421-9ac39bcb3327', 'Classic café table setting'),
  ],
  'gypsy-diner': [
    img('1555939594-58d7cb561ad1', 'Stacked burger with fries'),
    img('1600891964092-4316c288032e', 'Retro diner grill plate'),
  ],
};

export const getRestaurantImages = (id: string): RestaurantImageSource[] =>
  RESTAURANT_IMAGES[id] ?? [];

/** A fallback image used when a restaurant has no curated photography. */
export const DEFAULT_IMAGE: RestaurantImageSource = {
  provider: 'unsplash',
  imageUrl: unsplashPhotoUrl('1504674900247-0877df9cc836'),
  alt: 'A spread of Indian dishes',
  attribution: 'Photo: Unsplash',
  license: UNSPLASH_LICENSE,
};
