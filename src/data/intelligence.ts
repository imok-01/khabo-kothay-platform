import type { RestaurantIntelligence } from '../domain/intelligence';

/**
 * Executive-approved baseline recommendation metadata for every restaurant.
 *
 * This is the Khabo Kothay curated layer — it is NOT derived from free text.
 * A restaurant mentioning "biryani" in its description does not become a
 * biryani specialist here; only the attributes in this table count, and the
 * recommendation engine reads exactly this (plus executive-approved
 * restaurant suggestions). Everything is 'seed' provenance.
 *
 * Structured so a future backend can serve the same shape from a database.
 */
export const SEED_INTELLIGENCE: Record<string, RestaurantIntelligence> = {
  'bhojohori-manna': {
    specialties: ['Seafood', 'Thali', 'Kolkata-style'],
    bestFor: ['Family dinner', 'Lunch', 'Dinner'],
    foodCharacteristics: ['Rich & hearty', 'Large portions'],
    diningFeatures: ['Delivery', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  trincas: {
    specialties: ['Kolkata-style', 'Fine dining'],
    bestFor: ['Date night', 'Celebration', 'Dinner'],
    foodCharacteristics: ['Rich & hearty'],
    diningFeatures: ['Live music', 'Reservations', 'Family friendly'],
    provenance: 'seed',
  },
  'shiraz-golden-restaurant': {
    specialties: ['Biryani', 'Kebab'],
    bestFor: ['Lunch', 'Dinner', 'Family dinner'],
    foodCharacteristics: ['Rich & hearty', 'Large portions'],
    diningFeatures: ['Delivery', 'Family friendly'],
    provenance: 'seed',
  },
  kewpies: {
    specialties: ['Breakfast', 'Desserts', 'Kolkata-style'],
    bestFor: ['Breakfast', 'Quick bite', 'Family dinner'],
    foodCharacteristics: ['Dessert-focused', 'Quick bites'],
    diningFeatures: ['Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  '6-ballygunge-place': {
    specialties: ['Thali', 'Seafood', 'Fine dining'],
    bestFor: ['Date night', 'Family dinner', 'Celebration'],
    foodCharacteristics: ['Rich & hearty', 'Large portions'],
    diningFeatures: ['Outdoor seating', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  'roast-and-soda': {
    specialties: ['Coffee', 'Desserts'],
    bestFor: ['Date night', 'Quick bite', 'Work/study'],
    foodCharacteristics: ['Dessert-focused', 'Quick bites'],
    diningFeatures: ['Delivery', 'Takeaway'],
    provenance: 'seed',
  },
  arsalan: {
    specialties: ['Biryani', 'Kebab'],
    bestFor: ['Family dinner', 'Lunch', 'Dinner', 'Late night'],
    foodCharacteristics: ['Rich & hearty', 'Large portions'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  mocambo: {
    specialties: ['Fine dining', 'Desserts', 'Kolkata-style'],
    bestFor: ['Celebration', 'Date night', 'Dinner'],
    foodCharacteristics: ['Rich & hearty'],
    diningFeatures: ['Live music', 'Reservations', 'Family friendly'],
    provenance: 'seed',
  },
  'oh-calcutta': {
    specialties: ['Seafood', 'Thali', 'Fine dining'],
    bestFor: ['Date night', 'Celebration', 'Dinner'],
    foodCharacteristics: ['Rich & hearty', 'Large portions'],
    diningFeatures: ['Delivery', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  'mainland-china': {
    specialties: ['Dim Sum', 'Wok'],
    bestFor: ['Family dinner', 'Lunch', 'Dinner', 'Work/study'],
    foodCharacteristics: ['Mild', 'Spicy'],
    diningFeatures: ['Delivery', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  zaranj: {
    specialties: ['Awadhi', 'Kebab', 'Fine dining'],
    bestFor: ['Date night', 'Celebration', 'Dinner'],
    foodCharacteristics: ['Rich & hearty'],
    diningFeatures: ['Reservations'],
    provenance: 'seed',
  },
  'saltlake-cafe': {
    specialties: ['Coffee', 'Breakfast'],
    bestFor: ['Breakfast', 'Work/study', 'Lunch', 'Quick bite'],
    foodCharacteristics: ['Mild', 'Healthy'],
    diningFeatures: ['Outdoor seating', 'Pet friendly', 'Delivery'],
    provenance: 'seed',
  },
  'newtown-noodle': {
    specialties: ['Wok'],
    bestFor: ['Lunch', 'Dinner', 'Late night', 'Quick bite'],
    foodCharacteristics: ['Spicy', 'Quick bites'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  'havmor-dosa': {
    specialties: ['Dosa', 'Coffee'],
    bestFor: ['Breakfast', 'Lunch', 'Quick bite'],
    foodCharacteristics: ['Mild', 'Vegetarian-friendly'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  'old-china': {
    specialties: ['Momos', 'Dim Sum', 'Wok'],
    bestFor: ['Lunch', 'Dinner', 'Family dinner'],
    foodCharacteristics: ['Spicy'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  serafina: {
    specialties: ['Pizza', 'Desserts'],
    bestFor: ['Lunch', 'Dinner', 'Family dinner', 'Work/study'],
    foodCharacteristics: ['Mild', 'Vegetarian-friendly'],
    diningFeatures: ['Delivery', 'Outdoor seating', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  'kathi-junction': {
    specialties: ['Rolls'],
    bestFor: ['Late night', 'Quick bite', 'Friends'],
    foodCharacteristics: ['Quick bites', 'Spicy'],
    diningFeatures: ['Delivery', 'Takeaway'],
    provenance: 'seed',
  },
  'the-corner-bakeshop': {
    specialties: ['Sourdough', 'Desserts', 'Coffee'],
    bestFor: ['Breakfast', 'Quick bite', 'Work/study'],
    foodCharacteristics: ['Dessert-focused', 'Healthy'],
    diningFeatures: ['Takeaway'],
    provenance: 'seed',
  },
  'salt-lake-dosa': {
    specialties: ['Dosa', 'Thali', 'Coffee'],
    bestFor: ['Breakfast', 'Lunch', 'Dinner', 'Family dinner'],
    foodCharacteristics: ['Vegetarian-friendly', 'Large portions', 'Mild'],
    diningFeatures: ['Delivery', 'Family friendly'],
    provenance: 'seed',
  },
  'flury-s': {
    specialties: ['Breakfast', 'Desserts', 'Coffee', 'Kolkata-style'],
    bestFor: ['Breakfast', 'Family dinner', 'Celebration'],
    foodCharacteristics: ['Dessert-focused', 'Quick bites'],
    diningFeatures: ['Takeaway', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  'szechuan-park': {
    specialties: ['Wok', 'Seafood'],
    bestFor: ['Dinner', 'Late night', 'Friends'],
    foodCharacteristics: ['Spicy'],
    diningFeatures: ['Delivery', 'Takeaway'],
    provenance: 'seed',
  },
  'dada-boudi': {
    // Note: its description mentions biryani, but this is a tiffin joint —
    // it must NOT surface as a biryani specialist.
    specialties: ['Tiffin', 'Kolkata-style'],
    bestFor: ['Breakfast', 'Lunch', 'Quick bite'],
    foodCharacteristics: ['Quick bites', 'Vegetarian-friendly'],
    diningFeatures: ['Delivery', 'Family friendly'],
    provenance: 'seed',
  },
  izakaya: {
    specialties: ['Fine dining', 'Seafood'],
    bestFor: ['Date night', 'Late night', 'Celebration'],
    foodCharacteristics: ['Mild', 'Spicy'],
    diningFeatures: ['Reservations'],
    provenance: 'seed',
  },
  'bombay-bites': {
    specialties: ['Chaat'],
    bestFor: ['Lunch', 'Quick bite', 'Dinner'],
    foodCharacteristics: ['Quick bites', 'Vegetarian-friendly', 'Spicy'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  'la-mia-italiana': {
    specialties: ['Fine dining', 'Desserts'],
    bestFor: ['Date night', 'Family dinner', 'Celebration', 'Dinner'],
    foodCharacteristics: ['Mild', 'Rich & hearty'],
    diningFeatures: ['Outdoor seating', 'Family friendly', 'Reservations'],
    provenance: 'seed',
  },
  'gulab-sweets': {
    specialties: ['Desserts', 'Kolkata-style'],
    bestFor: ['Breakfast', 'Quick bite', 'Family dinner'],
    foodCharacteristics: ['Dessert-focused', 'Vegetarian-friendly', 'Quick bites'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
  'thai-orchid': {
    specialties: ['Curry', 'Seafood'],
    bestFor: ['Date night', 'Dinner', 'Celebration'],
    foodCharacteristics: ['Spicy', 'Mild'],
    diningFeatures: ['Outdoor seating', 'Delivery', 'Reservations'],
    provenance: 'seed',
  },
  'park-hotel-coffee-house': {
    specialties: ['Coffee', 'Kolkata-style'],
    bestFor: ['Breakfast', 'Quick bite', 'Work/study'],
    foodCharacteristics: ['Quick bites', 'Vegetarian-friendly'],
    diningFeatures: ['Takeaway'],
    provenance: 'seed',
  },
  'gypsy-diner': {
    specialties: ['Burgers', 'Desserts'],
    bestFor: ['Lunch', 'Dinner', 'Family dinner', 'Late night'],
    foodCharacteristics: ['Large portions', 'Rich & hearty'],
    diningFeatures: ['Delivery', 'Takeaway', 'Family friendly'],
    provenance: 'seed',
  },
};

export function seedIntelligence(restaurantId: string): RestaurantIntelligence | undefined {
  return SEED_INTELLIGENCE[restaurantId];
}
