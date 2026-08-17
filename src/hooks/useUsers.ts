import { useUsers } from '../store/demoDb';

/**
 * Reactive snapshot of all stored demo users.
 *
 * Lives in the hooks layer so contexts/pages never import the demo store
 * directly. When the demo store is replaced by a Supabase-backed user
 * repository, this hook swaps to the new source without touching AuthContext.
 */
export { useUsers };
