import { CUISINES, NEIGHBORHOODS } from '../data/restaurants';

/**
 * TaxonomyService — the app's single access point for the discovery
 * vocabularies (cuisines, neighbourhoods).
 *
 * Components and libs must import these from here, never from the raw
 * dataset module. When the taxonomy is later served by the backend
 * (restaurant_tags / restaurant_attributes), only this module changes.
 */
export { CUISINES, NEIGHBORHOODS };
