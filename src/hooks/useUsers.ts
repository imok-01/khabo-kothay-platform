import { getAllUsers, saveUser, useUsers } from '../store/demoDb';

/**
 * User-store adapter — the hooks-layer seam for the demo user store.
 *
 * Lives in the hooks layer so contexts/pages never import the demo store
 * directly. When the demo store is replaced by a Supabase-backed user
 * repository, these swap to the new source without touching consumers.
 */
export { getAllUsers, saveUser, useUsers };
