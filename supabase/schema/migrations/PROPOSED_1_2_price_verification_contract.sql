-- ============================================================================
-- KHABO KOTHAY — PROPOSED MIGRATION v1.2 (price + verification contract)
-- ============================================================================
-- STATUS: FOUNDER-APPROVED FOR EXECUTION. NOT YET EXECUTED (pending DDL access).
-- Source: database/docs/DB_FIX_PROPOSAL.md (fixes F1/F2/F3 from DATABASE_QA_REPORT.md)
-- Execution: run in the Supabase Dashboard SQL Editor (or with DB-level access).
--
-- RULES:
--   * Additive only — no column removed, no provenance lost.
--   * Does NOT modify the approved v1.1 migration file.
--   * Ambiguous alias rows (American Burger, Mezzan) are EXCLUDED until the
--     founder decides attribution (decisions D1/D2 in the proposal).
--   * No data import is performed by this file.
--   * Idempotent: safe to run on a fresh v1.1 DB AND on the live project
--     (which already has these columns as TEXT — see section 2b).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1) verification_status enum extension (F2)
--    Postgres 12+ supports ALTER TYPE ... ADD VALUE inside a transaction only
--    if the new value is not used in the same transaction. These two new
--    values are used by the price_observations default/inserts below, so if
--    this runs in one transaction the ALTERs must come first — which they do.
-- ----------------------------------------------------------------------------
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'UNVERIFIED';
ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'NEEDS_REVIEW';

-- ----------------------------------------------------------------------------
-- 2) price_observations contract (F1) — additive, provenance preserved
-- ----------------------------------------------------------------------------
ALTER TABLE price_observations
    ADD COLUMN IF NOT EXISTS raw_price TEXT,
    ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNVERIFIED';

-- ----------------------------------------------------------------------------
-- 2b) LIVE-SCHEMA RECONCILIATION (verified 2026-08-18, read-only pre-flight)
--
-- The live project ALREADY has raw_price TEXT + verification_status TEXT on
-- price_observations (pilot import used them), but the column is TEXT, nullable,
-- with no default — diverging from the approved contract (enum type, NOT NULL,
-- DEFAULT 'UNVERIFIED'). All 1,080 live values are 'UNVERIFIED'/'NEEDS_REVIEW',
-- so the conversion below is safe and idempotent.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- Type: TEXT -> verification_status enum (only if not already the enum)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND udt_name = 'text'
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status TYPE verification_status
      USING verification_status::verification_status;
  END IF;

  -- Default: 'UNVERIFIED'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status SET DEFAULT 'UNVERIFIED';
  END IF;

  -- NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'price_observations'
      AND column_name = 'verification_status' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE price_observations
      ALTER COLUMN verification_status SET NOT NULL;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Restaurant menu aliases (F3)
--    APPROVED MECHANISM (founder decision): generator-side alias input file
--      database/imports/source/restaurant_menu_aliases.csv
--    containing ONLY the 6 HIGH-confidence mappings (no American Burger,
--    no Mezzan — pending founder decisions D1/D2; no O' Play — MEDIUM/D4).
--    No DB seed is required for Option A. The Option B seed INSERTs below
--    are retained as commented reference only and are NOT part of this
--    migration.
-- ----------------------------------------------------------------------------

-- Helper: stable uuidv5 within the pipeline namespace
-- (namespace ce5cb46e-302f-4e0c-b938-1a7faf364718, kind 'restaurant_alias')

-- 1. Waffle Up -> Waffle Up - Banani
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/waffle-up'),
--        r.id, 'Waffle Up'
-- FROM restaurants r WHERE r.name = 'Waffle Up - Banani';

-- 2. Hungry Rooster -> Hungry Rooster - Banani
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/hungry-rooster'),
--        r.id, 'Hungry Rooster'
-- FROM restaurants r WHERE r.name = 'Hungry Rooster - Banani';

-- 3. Attin Arabian -> Attin Arabian Restaurant
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/attin-arabian'),
--        r.id, 'Attin Arabian'
-- FROM restaurants r WHERE r.name = 'Attin Arabian Restaurant';

-- 4. Kebabzz -> Kebabzz Banani
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/kebabzz'),
--        r.id, 'Kebabzz'
-- FROM restaurants r WHERE r.name = 'Kebabzz Banani';

-- 5. Lakeshore Suites / Seven Spices -> Lakeshore Suites
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/lakeshore-suites-seven-spices'),
--        r.id, 'Lakeshore Suites / Seven Spices'
-- FROM restaurants r WHERE r.name = 'Lakeshore Suites';

-- 6. Crowne Plaza Dhaka Gulshan -> Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/crowne-plaza'),
--        r.id, 'Crowne Plaza Dhaka Gulshan'
-- FROM restaurants r WHERE r.name = 'Crowne Plaza Dhaka Gulshan Crowne Plaza Dhaka Gulshan';

-- 7. O' Play -> O' Play Restaurant  (D4: confirm merge — identity already has menus)
-- INSERT INTO restaurant_aliases (id, restaurant_id, alias_name)
-- SELECT uuid_generate_v5('ce5cb46e-302f-4e0c-b938-1a7faf364718', 'khabo-kothay-pilot-v1/restaurant_alias/o-play'),
--        r.id, 'O'' Play'
-- FROM restaurants r WHERE r.name = 'O'' Play Restaurant';

-- 8. American Burger (30 rows) — EXCLUDED: ambiguous (D1: American Burger Banani vs American Burger | Gulshan 2)
-- 9. Mezzan (4 rows)           — EXCLUDED: ambiguous (D2: Mezzan Haile Aiun, Dhaka vs Gulshan)

COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION (manual, before any import):
--   SELECT enum_range(NULL::verification_status);  -- expect 8 values incl. UNVERIFIED, NEEDS_REVIEW
--   SELECT column_name, data_type, is_nullable, column_default
--     FROM information_schema.columns WHERE table_name = 'price_observations';
--     -- verification_status must be the enum type, NOT NULL, default 'UNVERIFIED'
--   SELECT count(*) FROM price_observations;  -- expect 1,080 (pilot rows preserved; no new import)
-- ============================================================================
