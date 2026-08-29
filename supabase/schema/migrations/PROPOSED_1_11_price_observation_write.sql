-- ============================================================================
-- KHABO KOTHAY -- 4.3C.2 price_observations owner/exec write policies (1_11)
-- ============================================================================
-- PROPOSED_1_9 created price_observations read policies (public + owner-select
-- + exec-select) but omitted OWNER write policies. Restaurant owners must be
-- able to insert/update prices for THEIR restaurant's menu items, and execs
-- must be able to correct any price. RLS still scopes rows to ownership.
-- Idempotent.
-- ============================================================================

-- Owner may INSERT a price observation only for an item belonging to a menu of
-- a restaurant they own.
DROP POLICY IF EXISTS price_observations_owner_insert ON price_observations;
CREATE POLICY price_observations_owner_insert ON price_observations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN menus m ON m.id = mi.menu_id
      JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE mi.id = price_observations.menu_item_id AND r.user_id = auth.uid()
    )
  );

-- Owner may UPDATE a price observation only for their own restaurant's item.
DROP POLICY IF EXISTS price_observations_owner_update ON price_observations;
CREATE POLICY price_observations_owner_update ON price_observations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN menus m ON m.id = mi.menu_id
      JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE mi.id = price_observations.menu_item_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM menu_items mi
      JOIN menus m ON m.id = mi.menu_id
      JOIN roles r ON r.restaurant_id = m.restaurant_id
      WHERE mi.id = price_observations.menu_item_id AND r.user_id = auth.uid()
    )
  );

-- Executive / admin may manage any price observation (mirrors menus_executive_all).
DROP POLICY IF EXISTS price_observations_exec ON price_observations;
CREATE POLICY price_observations_exec ON price_observations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid() AND r.role_name IN ('executive','admin','kk_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.user_id = auth.uid() AND r.role_name IN ('executive','admin','kk_admin')
    )
  );
