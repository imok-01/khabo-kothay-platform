import { getRewards, tokenBalance, useRewards } from '../store/demoDb';
import { REWARD_CATALOGUE } from '../data/rewards';

/**
 * Rewards adapter — the hooks-layer seam for the demo rewards store and the
 * reward catalogue. Components/pages import from here, never from the demo
 * store or the raw dataset. Swappable for a Supabase-backed rewards service.
 */
export { getRewards, REWARD_CATALOGUE, tokenBalance, useRewards };
