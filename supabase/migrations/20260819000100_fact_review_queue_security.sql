-- ============================================================================
-- KHABO KOTHAY — SECURITY FIX: fact_review_queue (Security Definer View)
-- ============================================================================
-- Supabase Security Advisor flagged `fact_review_queue`:
--     Issue: Security Definer View
--
-- ROOT CAUSE:
--   PostgreSQL views default to security_invoker = false, so the view's
--   SELECT runs with the VIEW OWNER's (postgres) privileges — NOT the
--   caller's. The default grants exposed the view to anon + authenticated,
--   meaning the internal DRAFT/REVIEW review queue was readable through the
--   public API, bypassing the table's RLS.
--
-- FIX (safe, non-destructive):
--   1) ALTER VIEW ... SET (security_invoker = true)
--        The view now runs with the CALLER's privileges, so the table's RLS
--        applies per-caller inside the view.
--   2) REVOKE ALL ON fact_review_queue FROM anon, authenticated
--        No public surface: anon/authenticated can no longer reference it.
--   3) GRANT SELECT ON fact_review_queue TO service_role
--        Internal staff / pipeline keeps review access for the future
--        admin review workflow (service role bypasses RLS, sees all statuses).
--
-- UNCHANGED:
--   * restaurant_discovery_facts table + its RLS + `public_read_approved`
--     policy — public approved-fact reads keep working exactly as before.
--   * The imported facts (no row changes).
--   * No frontend changes.
-- ============================================================================

BEGIN;

-- 1) Run the view with the caller's privileges so the table's RLS applies.
ALTER VIEW fact_review_queue SET (security_invoker = true);

-- 2) Remove the public surface (owner postgres + service_role keep access).
REVOKE ALL ON fact_review_queue FROM anon, authenticated;

-- 3) Explicitly keep service_role (internal admin / pipeline) access.
GRANT SELECT ON fact_review_queue TO service_role;

COMMIT;