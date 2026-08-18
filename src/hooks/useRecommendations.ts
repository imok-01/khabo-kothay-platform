import {
  hasPersonalizationSignals,
  hiddenGems,
  matchScore,
  surprisePick,
  topMatches,
  worthTheTrip,
} from '../services/recommendationService';

/**
 * Recommendation adapter — the hooks-layer seam for the deterministic scoring
 * functions. Discovery pages import from here, never from the scoring service
 * directly. Scoring logic itself is untouched.
 */
export {
  hasPersonalizationSignals,
  hiddenGems,
  matchScore,
  surprisePick,
  topMatches,
  worthTheTrip,
};
