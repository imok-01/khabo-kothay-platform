-- ============================================================================
-- KHABO KOTHAY — PUBLIC-READ ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Purpose: grant the public/anon role read access to the restaurant-discovery
-- tables only, so the Vite frontend (anon key) can render listings, detail
-- pages, menus and prices WITHOUT exposing user/private data.
--
-- Approved scope (DATABASE_INTEGRATION_PLAN.md G1):
--   Public read  -> restaurants, restaurant_sources, restaurant_aliases,
--                   restaurant_attributes, restaurant_tags, menus, menu_items,
--                   price_observations, image_references, review_signals
--   Never public -> user_profiles, favorites, user_reviews, roles,
--                   saved_restaurants, change_requests, audit_logs,
--                   verification_records, review_samples
--
-- Run this ONCE from the Supabase Dashboard -> SQL Editor after the v1.2
-- migration. It is idempotent (DROP IF EXISTS + CREATE).
--
-- Security posture:
--   * RLS is ENABLED on every table (default deny).
--   * ONLY the discovery tables get a `public_read` SELECT policy.
--   * User/private tables keep RLS enabled with NO policy -> anon reads are
--     denied (empty result, never an error) until an auth phase grants them.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Enable RLS on every table (deny-by-default baseline)
-- ----------------------------------------------------------------------------
ALTER TABLE restaurants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_sources    ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_aliases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items            ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_observations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE image_references      ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_samples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_restaurants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2. Public-read policies (anon + authenticated) — discovery tables only
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS public_read ON restaurants;
CREATE POLICY public_read ON restaurants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON restaurant_sources;
CREATE POLICY public_read ON restaurant_sources
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON restaurant_aliases;
CREATE POLICY public_read ON restaurant_aliases
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON restaurant_attributes;
CREATE POLICY public_read ON restaurant_attributes
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON restaurant_tags;
CREATE POLICY public_read ON restaurant_tags
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON menus;
CREATE POLICY public_read ON menus
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON menu_items;
CREATE POLICY public_read ON menu_items
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON price_observations;
CREATE POLICY public_read ON price_observations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON image_references;
CREATE POLICY public_read ON image_references
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS public_read ON review_signals;
CREATE POLICY public_read ON review_signals
  FOR SELECT TO anon, authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 3. Explicit read grants for the anon/authenticated roles (belt + braces:
--    PostgREST uses these roles; grants pair with the RLS policies above).
-- ----------------------------------------------------------------------------
GRANT SELECT ON restaurants           TO anon, authenticated;
GRANT SELECT ON restaurant_sources    TO anon, authenticated;
GRANT SELECT ON restaurant_aliases    TO anon, authenticated;
GRANT SELECT ON restaurant_attributes TO anon, authenticated;
GRANT SELECT ON restaurant_tags       TO anon, authenticated;
GRANT SELECT ON menus                 TO anon, authenticated;
GRANT SELECT ON menu_items            TO anon, authenticated;
GRANT SELECT ON price_observations    TO anon, authenticated;
GRANT SELECT ON image_references      TO anon, authenticated;
GRANT SELECT ON review_signals        TO anon, authenticated;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (Supabase Dashboard -> SQL Editor):
--
--   SELECT tablename FROM pg_tables
--   WHERE schemaname = 'public' AND rowsecurity ORDER BY tablename;
--     -- expect all 19 tables listed
--
--   SELECT tablename, policyname FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename;
--     -- expect exactly one `public_read` policy on the 10 discovery tables
--
--   As anon (frontend): SELECT count(*) FROM restaurants;      -- -> 206
--                       SELECT count(*) FROM menu_items;       -- -> 4278
--                       SELECT count(*) FROM user_profiles;    -- -> 0 (denied)
-- ============================================================================
