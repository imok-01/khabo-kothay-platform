import { CUISINES, NEIGHBORHOODS } from '../services/taxonomyService';

/**
 * Taxonomy adapter — the hooks-layer seam for the discovery vocabularies
 * (cuisines, neighbourhoods). Discovery UI imports from here, never from the
 * taxonomy service directly. The service remains the single backend seam.
 */
export { CUISINES, NEIGHBORHOODS };
