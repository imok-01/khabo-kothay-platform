-- ============================================================================
-- KHABO KOTHAY -- 4.3C.2 RLS GRANTS (PROPOSED_1_10)
-- ============================================================================
-- The 1_9 RLS policies grant owner/executive *write permission* (TO authenticated)
-- but the SQL table GRANTs were missing, so authenticated could not actually
-- INSERT/UPDATE/DELETE menus/menu_items/price_observations, and could not even
-- evaluate the policies because they reference `roles` (no SELECT grant).
--
-- This migration adds the necessary table-level GRANTs. Row-level security
-- (RLS) still governs WHICH rows each role may touch; a GRANT only lifts the
-- table-level privilege gate. Idempotent.
-- ============================================================================

-- Owner/exec policies read `roles` to resolve ownership; authenticated needs
-- SELECT on it (RLS on roles itself still scopes what rows are visible).
GRANT SELECT ON roles TO authenticated;

-- Menu lifecycle write paths (all gated by the 1_9 owner/exec policies).
GRANT INSERT, UPDATE, DELETE ON menus TO authenticated;
GRANT INSERT, UPDATE, DELETE ON menu_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON price_observations TO authenticated;
