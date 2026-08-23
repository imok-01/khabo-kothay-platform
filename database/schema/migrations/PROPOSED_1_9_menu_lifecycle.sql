-- ============================================================================
-- KHABO KOTHAY -- 4.3C MENU LIFECYCLE + OWNERSHIP AUDIT (PROPOSED, NOT APPLIED)
-- ============================================================================
-- Additive, non-destructive schema extension for the menu ownership workflow.
-- Pairs with the app-code changes in:
--   * src/transformers/menu.ts        (public read = PUBLISHED/ACTIVE only)
--   * src/repositories/menuRepository.ts (saveMenuDraft / submit / approve /
--     reject / archive)
--   * src/integrations/supabase/database.types.ts (MenuStatus + MenusRow cols)
--
-- Lifecycle enforced at the data layer:
--   DRAFT  --(owner submit)-->  PENDING_REVIEW  --(KK approve)-->  PUBLISHED
--   PENDING_REVIEW --(KK reject)--> ARCHIVED            (never deleted).
--   PUBLISHED --(KK archive)--> ARCHIVED.
-- Owners CANNOT publish directly; only KK approval reaches PUBLISHED.
--
-- GATED: review and apply via Supabase CLI / Dashboard SQL Editor with human
-- approval. The frontend already degrades safely if these columns are absent
-- (it never writes them unless Supabase is configured), so the app runs
-- whether or not this migration has been applied yet.
--
-- PREREQUISITES (apply first, in order):
--   1. PROPOSED_1_5_auth_foundation.sql  -- adds roles.restaurant_id + profiles
--   2. PROPOSED_1_8_menu_versioning_columns.sql -- base version/audit columns
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Extend the menu_status domain with PENDING_REVIEW (idempotent).
--    No-ops for text/check columns that already accept the value.
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
      WHERE t.typname = 'menu_status' AND e.enumlabel = 'PENDING_REVIEW'
    ) THEN
      ALTER TYPE menu_status ADD VALUE 'PENDING_REVIEW';
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. menus — 4.3C ownership audit columns (all nullable, additive).
--    created_by / published_by / published_at already added by PROPOSED_1_8;
--    here we add the remaining submit/modify tracking the workflow needs.
-- ----------------------------------------------------------------------------
ALTER TABLE menus
  ADD COLUMN IF NOT EXISTS modified_by text NULL,
  ADD COLUMN IF NOT EXISTS submitted_by text NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL;

-- ----------------------------------------------------------------------------
-- 3. Row Level Security — menus + child tables.
--    The base v1 migration (RLS_PUBLIC_READ.sql) already enabled RLS and
--    created broad `public_read` policies (USING (true)) on menus, menu_items
--    and price_observations. Those MUST be dropped here: Postgres ORs multiple
--    permissive SELECT policies, so leaving `public_read` would silently expose
--    DRAFT / PENDING_REVIEW / ARCHIVED menus (and their items) to anon. We drop
--    the broad policies first, then add status/ownership-scoped replacements.
--    These policies require PROPOSED_1_5 (roles.restaurant_id) + the
--    `executive` role; the safety check below enforces that prerequisite.
-- ----------------------------------------------------------------------------

-- 3a. Precondition: roles.restaurant_id must exist (PROPOSED_1_5 applied).
--     Raising aborts the transaction so we never apply lifecycle policies
--     against a schema that cannot enforce ownership.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'roles' AND column_name = 'restaurant_id'
  ) THEN
    RAISE EXCEPTION
      'PROPOSED_1_9 requires PROPOSED_1_5 (roles.restaurant_id). '
      'Apply migrations in order: PROPOSED_1_5 -> PROPOSED_1_8 -> PROPOSED_1_9.';
  END IF;
END $$;

-- 3b. menus — drop the legacy broad policy, then scope public read to PUBLISHED.
DROP POLICY IF EXISTS public_read ON menus;
DROP POLICY IF EXISTS menus_public_read ON menus;
CREATE POLICY menus_public_read ON menus
  FOR SELECT
  TO anon, authenticated
  USING (status = 'PUBLISHED');

-- Restaurant owner: SELECT / INSERT / UPDATE (NO DELETE) DRAFT menus for OWNED
-- restaurants (linked via roles.restaurant_id from PROPOSED_1_5). Postgres
-- allows only ONE command type per policy, so the three intents are separate
-- policies. Owners cannot set a row to PUBLISHED (hard WITH CHECK guard on
-- INSERT/UPDATE); they cannot touch other restaurants; and they cannot DELETE a
-- live PUBLISHED menu (no DELETE policy). KK archive is the only removal path.
-- SELECT is retained so owners can load their own DRAFT to edit it.
DROP POLICY IF EXISTS menus_owner_select ON menus;
CREATE POLICY menus_owner_select ON menus
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.restaurant_id = menus.restaurant_id
    )
  );

DROP POLICY IF EXISTS menus_owner_insert ON menus;
CREATE POLICY menus_owner_insert ON menus
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.restaurant_id = menus.restaurant_id
    )
    -- Hard guard: an owner's INSERT can NEVER produce a PUBLISHED row.
    AND (status IS DISTINCT FROM 'PUBLISHED')
  );

DROP POLICY IF EXISTS menus_owner_update ON menus;
CREATE POLICY menus_owner_update ON menus
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.restaurant_id = menus.restaurant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.restaurant_id = menus.restaurant_id
    )
    -- Hard guard: an owner's UPDATE can NEVER produce a PUBLISHED row.
    AND (status IS DISTINCT FROM 'PUBLISHED')
  );

-- KK executive: full control, including the approve transition to PUBLISHED.
DROP POLICY IF EXISTS menus_executive_all ON menus;
CREATE POLICY menus_executive_all ON menus
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.role_name = 'executive'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid()
        AND r.role_name = 'executive'
    )
  );

-- 3c. menu_items — publicly readable ONLY for PUBLISHED menus; owners/exec can
--     read (and owners write) items of menus they may edit.
DROP POLICY IF EXISTS public_read ON menu_items;
DROP POLICY IF EXISTS menu_items_public_read ON menu_items;
CREATE POLICY menu_items_public_read ON menu_items
  FOR SELECT
  TO anon, authenticated
  USING (menu_id IN (SELECT id FROM menus WHERE status = 'PUBLISHED'));

DROP POLICY IF EXISTS menu_items_owner_select ON menu_items;
CREATE POLICY menu_items_owner_select ON menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE m.id = menu_items.menu_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS menu_items_owner_insert ON menu_items;
CREATE POLICY menu_items_owner_insert ON menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE m.id = menu_items.menu_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS menu_items_owner_update ON menu_items;
CREATE POLICY menu_items_owner_update ON menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE m.id = menu_items.menu_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE m.id = menu_items.menu_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS menu_items_exec ON menu_items;
CREATE POLICY menu_items_exec ON menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid() AND r.role_name = 'executive'
    )
  );

-- 3d. price_observations — publicly readable ONLY for items under PUBLISHED
--     menus. Owners/exec may read observations for menus they can access.
DROP POLICY IF EXISTS public_read ON price_observations;
DROP POLICY IF EXISTS price_observations_public_read ON price_observations;
CREATE POLICY price_observations_public_read ON price_observations
  FOR SELECT
  TO anon, authenticated
  USING (
    menu_item_id IN (
      SELECT id FROM menu_items
      WHERE menu_id IN (SELECT id FROM menus WHERE status = 'PUBLISHED')
    )
  );

DROP POLICY IF EXISTS price_observations_owner ON price_observations;
CREATE POLICY price_observations_owner ON price_observations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN menus m ON m.id = mi.menu_id
      JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE mi.id = price_observations.menu_item_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS price_observations_exec ON price_observations;
CREATE POLICY price_observations_exec ON price_observations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid() AND r.role_name = 'executive'
    )
  );

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (as anon key / Supabase Dashboard):
--
--   -- prerequisite guard: roles.restaurant_id must exist (PROPOSED_1_5).
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'roles' AND column_name = 'restaurant_id';  -- expect 1
--
--   -- the legacy broad policy must be GONE (no silent anon leak):
--   SELECT count(*) FROM pg_policies
--     WHERE tablename = 'menus' AND policyname = 'public_read';  -- expect 0
--
--   -- anon must NOT see drafts:
--   SET ROLE anon;
--   SELECT count(*) FROM menus WHERE status <> 'PUBLISHED';  -- expect 0 rows
--   SELECT count(*) FROM menu_items mi
--     WHERE NOT EXISTS (SELECT 1 FROM menus m WHERE m.id = mi.menu_id AND m.status = 'PUBLISHED');  -- expect 0
--   RESET ROLE;
--
--   SELECT status, count(*) FROM menus GROUP BY status;
--     -- existing rows already PUBLISHED (from PROPOSED_1_8 backfill).
--
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'menus'
--     AND column_name IN ('modified_by','submitted_by','submitted_at');
--     -- expect the 3 new columns present.
-- ============================================================================
