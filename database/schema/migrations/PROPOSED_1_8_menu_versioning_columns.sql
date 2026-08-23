-- ============================================================================
-- KHABO KOTHAY -- 4.3B.1 MENU VERSIONING COLUMNS (PROPOSED, NOT APPLIED)
-- ============================================================================
-- Additive, non-destructive schema extension for the menu foundation.
-- Pairs with the app-code changes in src/transformers/menu.ts and the
-- extended row types in src/integrations/supabase/database.types.ts.
--
-- Nothing here drops or rewrites data:
--   * new columns are NULLable with safe defaults;
--   * existing `menus` rows are backfilled to PUBLISHED v1 (the current
--     "ACTIVE" behaviour) so the transformer's preference chain is a no-op
--     until real DRAFT/PUBLISHED workflows land in 4.3C.
--
-- GATED: review and apply via Supabase CLI / Dashboard SQL Editor with human
-- approval. The frontend already degrades safely if these columns are absent
-- (transformer falls back to ACTIVE + default flags), so the app runs whether
-- or not this migration has been applied yet.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extend the menu_status domain with DRAFT / PUBLISHED (idempotent).
--    Only touches the type if it is a real Postgres enum; text/check columns
--    already accept the new values, so this is a no-op for them.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  is_enum boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'menu_status' AND typtype = 'e'
  ) INTO is_enum;

  IF is_enum THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'menu_status' AND e.enumlabel = 'PUBLISHED'
    ) THEN
      ALTER TYPE menu_status ADD VALUE 'PUBLISHED';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'menu_status' AND e.enumlabel = 'DRAFT'
    ) THEN
      ALTER TYPE menu_status ADD VALUE 'DRAFT';
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. menus — versioning + ownership/audit columns (all nullable).
-- ----------------------------------------------------------------------------
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS version integer NULL,
  ADD COLUMN IF NOT EXISTS parent_menu_id uuid NULL,
  ADD COLUMN IF NOT EXISTS effective_from timestamptz NULL,
  ADD COLUMN IF NOT EXISTS effective_to timestamptz NULL,
  ADD COLUMN IF NOT EXISTS created_by text NULL,
  ADD COLUMN IF NOT EXISTS published_by text NULL,
  ADD COLUMN IF NOT EXISTS published_at timestamptz NULL;

-- ----------------------------------------------------------------------------
-- 3. menu_items — availability + merchandising + provenance columns.
-- ----------------------------------------------------------------------------
ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS available boolean NULL,
  ADD COLUMN IF NOT EXISTS featured boolean NULL,
  ADD COLUMN IF NOT EXISTS is_signature boolean NULL,
  ADD COLUMN IF NOT EXISTS image_url text NULL,
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz NULL;

-- ----------------------------------------------------------------------------
-- 4. Backfill is intentionally SPLIT OUT into PROPOSED_1_8_backfill.sql and
--    applied as a SEPARATE transaction. Postgres forbids using a freshly-added
--    enum value ('PUBLISHED') in DML within the same transaction that added it
--    (error 55P04). The backfill MUST also run so the existing ACTIVE menus
--    become PUBLISHED and stay visible under the 1_9 anon RLS (status =
--    'PUBLISHED' only); without it every current menu would vanish publicly.
-- ----------------------------------------------------------------------------

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (as anon key / Supabase Dashboard):
--
--   SELECT status, count(*) FROM menus GROUP BY status;
--     -- expect existing rows now PUBLISHED; no row lost.
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'menu_items'
--     AND column_name IN ('available','featured','is_signature','image_url');
--     -- expect the 4 new columns present.
-- ============================================================================
