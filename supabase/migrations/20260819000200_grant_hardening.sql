-- ============================================================================
-- KHABO KOTHAY — SECURITY HARDENING PHASE 1: Table grant hardening
-- ============================================================================
-- Approved by the Security Audit (recommendation #1).
--
-- Context:
--   `anon` and `authenticated` currently hold FULL table privileges
--   (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) on every public
--   table at the SQL-grant level. RLS neutralizes this today, but it is a
--   latent footgun: any future RLS/policy mistake immediately grants anon full
--   DML. This migration removes the unnecessary privileges.
--
-- WHAT CHANGES:
--   1) REVOKE ALL table privileges from `anon` + `authenticated` on all 20
--      public tables.
--   2) RE-GRANT SELECT ONLY on the 11 tables the frontend reads publicly
--      (catalogue, menus, pricing, photos, review signals, discovery facts).
--   3) The 9 tables with no public read requirement keep NO anon/authenticated
--      grant (they already have no SELECT policy, so nothing changes behavior).
--
-- UNCHANGED (per requirements):
--   * RLS policies (incl. `public_read_approved` on restaurant_discovery_facts).
--   * Discovery facts data.
--   * Frontend / read behavior.
--
-- NOTE: RLS is unaffected by table grants — the approved-scoped policy on
-- `restaurant_discovery_facts` continues to work exactly as before.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) Revoke ALL privileges on every public table from anon + authenticated.
-- ----------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE
  audit_logs,
  change_requests,
  favorites,
  image_references,
  menu_items,
  menus,
  price_observations,
  restaurant_aliases,
  restaurant_attributes,
  restaurant_discovery_facts,
  restaurant_sources,
  restaurant_tags,
  restaurants,
  review_samples,
  review_signals,
  roles,
  saved_restaurants,
  user_profiles,
  user_reviews,
  verification_records
FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2) Re-grant SELECT ONLY where public reads are required.
-- ----------------------------------------------------------------------------
GRANT SELECT ON TABLE
  restaurants,
  restaurant_sources,
  restaurant_aliases,
  restaurant_attributes,
  restaurant_tags,
  menus,
  menu_items,
  price_observations,
  image_references,
  review_signals,
  restaurant_discovery_facts
TO anon, authenticated;

COMMIT;