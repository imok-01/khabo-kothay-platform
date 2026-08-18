import {
  getGoogleRefreshMeta,
  refreshGoogleBulk,
  refreshGoogleSummary,
  subscribeGoogleRefresh,
} from '../services/googleDataService';
import { isGooglePlacesConfigured } from '../services/googlePlacesClient';

/**
 * Google Places adapter — the hooks-layer seam for live Google data refresh
 * controls and Places configuration checks. UI imports from here, never from
 * the Google services directly.
 */
export {
  getGoogleRefreshMeta,
  isGooglePlacesConfigured,
  refreshGoogleBulk,
  refreshGoogleSummary,
  subscribeGoogleRefresh,
};
