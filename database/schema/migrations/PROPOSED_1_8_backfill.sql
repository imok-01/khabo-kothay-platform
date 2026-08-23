-- ============================================================================
-- KHABO KOTHAY -- 4.3B.1 MENU BACKFILL (PROPOSED_1_8 companion, NOT in 1_8)
-- ============================================================================
-- Applied as its OWN transaction, AFTER PROPOSED_1_8 has committed the
-- `menu_status` enum values DRAFT/PUBLISHED. Postgres error 55P04 forbids
-- using a new enum value in DML inside the same transaction that added it, so
-- this backfill lives separately.
--
-- PURPOSE: the 206 pre-version menus are currently status 'ACTIVE'. The 1_9
-- anon RLS only exposes status = 'PUBLISHED', and the transformer's public
-- fallback is PUBLISHED ?? ACTIVE. Under RLS the DB layer hides ACTIVE from
-- anon, so ACTIVE menus would become invisible. This backfill promotes
-- ACTIVE (and any NULL-status) rows to PUBLISHED v1, preserving created_at as
-- effective_from. UNKNOWN rows are intentionally left hidden (they were never
-- public; the transformer only fell back to ACTIVE, not UNKNOWN).
--
-- Idempotent: after the first run the WHERE clause matches nothing, so
-- re-applying is a no-op. Safe to re-run.
-- ============================================================================

UPDATE menus
SET
  status = 'PUBLISHED',
  version = 1,
  effective_from = created_at
WHERE status = 'ACTIVE' OR status IS NULL;
