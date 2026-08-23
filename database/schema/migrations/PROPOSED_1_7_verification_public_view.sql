-- ============================================================================
-- KHABO KOTHAY -- P0.2 ADDRESS VERIFICATION READ MODEL (PROPOSED, NOT APPLIED)
-- ============================================================================
-- Companion to the Phase 4.2F audit decision. Implements the chosen option:
--   * address_display stays a curated restaurants column (resolves the
--     PROPOSED_1_6 drift) — the verification-backed display address.
--   * verification_records is exposed to the anon frontend ONLY through a
--     secure, owner-run view (`verification_records_public`) that projects the
--     public columns. The base table keeps its RLS (anon denied), so no
--     admin/owner data ever reaches the browser.
--
-- This migration is GATED: it must be reviewed and applied by a human with
-- Supabase access (DB CLI / Dashboard SQL Editor). The app-code half
-- (queries.selectVerificationRecordsForRestaurant → this view, wired into
-- detail-only fetchBundle with graceful fallback) is already shipped and
-- degrades safely until this view exists.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Resolve the PROPOSED_1_6 drift: add the curated display-address column.
--    The generated client types already reference `restaurants.address_display`;
--    this makes the column actually exist in the schema.
-- ----------------------------------------------------------------------------
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS address_display TEXT NULL;

COMMENT ON COLUMN restaurants.address_display IS
  'KK-curated, human-readable address used for display. Treated as the '
  'verification-backed display address: populated from the highest-priority '
  'verification_records entry for field_name = ''address''. Falls back to the '
  'raw imported `address` when no curated value exists.';

-- ----------------------------------------------------------------------------
-- 2. Anon-safe verification view.
--    Runs as the view owner (security_invoker = false) so it bypasses the base
--    table's RLS and exposes ONLY the public columns. Direct anon SELECT on
--    `verification_records` remains denied (no policy) — admin data stays
--    hidden; only this projection is readable.
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS verification_records_public;

CREATE VIEW verification_records_public
WITH (security_invoker = false) AS
SELECT
  id,
  restaurant_id,
  field_name,
  field_value,
  status,
  verification_source,
  verified_at,
  created_at
FROM verification_records;

COMMENT ON VIEW verification_records_public IS
  'Public, read-only projection of verification_records for the anon frontend. '
  'Owner-run (bypasses base-table RLS); exposes only display-safe columns. '
  'Drives the detail-page "verified address" badge.';

-- ----------------------------------------------------------------------------
-- 3. Grant the public roles SELECT on the VIEW only (never the base table).
-- ----------------------------------------------------------------------------
GRANT SELECT ON verification_records_public TO anon, authenticated;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (Supabase Dashboard -> SQL Editor, as anon key):
--
--   SELECT count(*) FROM verification_records;            -- -> 0 (denied)
--   SELECT count(*) FROM verification_records_public;     -- -> N (granted)
--   SELECT field_name, status FROM verification_records_public
--     WHERE restaurant_id = '<uuid>' AND field_name = 'address';
--     -- shows the public verification status for the badge; no admin columns.
-- ============================================================================
