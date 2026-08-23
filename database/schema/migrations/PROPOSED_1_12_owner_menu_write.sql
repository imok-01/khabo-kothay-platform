-- ============================================================================
-- KHABO KOTHAY -- 4.3C.4A owner menu content write (PROPOSED, NOT APPLIED)
-- ============================================================================
-- Enables restaurant owners to persist full menu content (menu_items +
-- price_observations) under a DRAFT menu row through a single atomic function,
-- and adds the owner DELETE policies that the save path requires (delete-then-
-- re-insert so removed dishes disappear and prices refresh in one transaction).
--
-- Security: the function runs SECURITY INVOKER, so Row Level Security is still
-- enforced on EVERY statement it executes as the calling (owner) user. The
-- existing (user_id, restaurant_id) ownership policies therefore scope every
-- write to the owner's own restaurant — nothing bypasses RLS.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Owner DELETE policies (missing in PROPOSED_1_9 / PROPOSED_1_11). Required
--    so the save function can remove stale items/observations for the owner's
--    own menu. These mirror the existing owner INSERT/UPDATE policies.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS menu_items_owner_delete ON menu_items;
CREATE POLICY menu_items_owner_delete ON menu_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE m.id = menu_items.menu_id AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS price_observations_owner_delete ON price_observations;
CREATE POLICY price_observations_owner_delete ON price_observations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN menus m ON m.id = mi.menu_id
      JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE mi.id = price_observations.menu_item_id AND r.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Atomic content writer. SECURITY INVOKER => RLS enforced per statement as
--    the calling (owner) user. Deletes then re-inserts the menu's items +
--    observations so removed dishes disappear and prices refresh atomically.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_menu_content(
  p_menu_id uuid,
  p_items jsonb,
  p_observations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.price_observations
   WHERE menu_item_id IN (SELECT id FROM public.menu_items WHERE menu_id = p_menu_id);
  DELETE FROM public.menu_items WHERE menu_id = p_menu_id;

  INSERT INTO public.menu_items (id, menu_id, item_name, description, category, available, featured, is_signature, image_url, created_at)
  SELECT
    (i->>'id')::uuid,
    p_menu_id,
    (i->>'item_name')::text,
    NULLIF(i->>'description', '')::text,
    (i->>'category')::text,
    COALESCE((i->>'available')::boolean, true),
    COALESCE((i->>'featured')::boolean, false),
    COALESCE((i->>'is_signature')::boolean, false),
    NULLIF(i->>'image_url', '')::text,
    COALESCE((i->>'created_at')::timestamptz, now())
  FROM jsonb_array_elements(p_items) AS i;

  INSERT INTO public.price_observations (id, menu_item_id, price, currency, source_id, observed_at, raw_price, verification_status)
  SELECT
    (o->>'id')::uuid,
    (o->>'menu_item_id')::uuid,
    CASE WHEN (o->>'price') IS NULL OR (o->>'price') = '' THEN NULL ELSE (o->>'price')::numeric END,
    NULLIF(o->>'currency', '')::text,
    NULLIF(o->>'source_id', '')::uuid,
    COALESCE((o->>'observed_at')::timestamptz, now()),
    NULLIF(o->>'raw_price', '')::text,
    COALESCE((o->>'verification_status')::verification_status, 'UNVERIFIED')
  FROM jsonb_array_elements(p_observations) AS o;
END;
$$;

COMMENT ON FUNCTION public.upsert_menu_content(uuid, jsonb, jsonb)
  IS 'Owner-scoped atomic replace of a menu''s items + price observations. SECURITY INVOKER keeps RLS ownership checks active on every statement.';

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (as the owner role / Supabase Dashboard):
--
--   SELECT count(*) FROM pg_policies
--     WHERE tablename IN ('menu_items','price_observations')
--     AND policyname LIKE '%owner_delete';   -- expect 2
--
--   SELECT proname FROM pg_proc
--     WHERE proname = 'upsert_menu_content';  -- expect 1
-- ============================================================================
