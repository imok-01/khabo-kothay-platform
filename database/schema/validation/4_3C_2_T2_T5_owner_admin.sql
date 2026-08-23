-- ============================================================================
-- PHASE 4.3C.2 -- Tests 2-5: owner lifecycle + security boundary + admin
-- Wrapped in BEGIN/ROLLBACK so no test data persists.
-- Impersonates roles via SET ROLE + request.jwt.claims (auth.uid() resolves).
-- All step evidence is collected into tmp_results and emitted once at the end
-- (supabase db query only returns the final result set).
--
--   owner  a1111111-1111-1111-1111-111111111111 -> Meat Theory (932a72f8-...)
--   admin  b2222222-2222-2222-2222-222222222222 -> executive (global)
--   other  Uncle Bobo's Banani (fbaa4d68-...) is NOT owned by the owner.
-- ============================================================================

BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('a1111111-1111-1111-1111-111111111111', 'test-owner@khabo-kothay.com', now());
INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('b2222222-2222-2222-2222-222222222222', 'test-admin@khabo-kothay.com', now());

INSERT INTO roles (user_id, role_name, restaurant_id)
VALUES ('a1111111-1111-1111-1111-111111111111', 'restaurant_owner', '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7');
INSERT INTO roles (user_id, role_name, restaurant_id)
VALUES ('b2222222-2222-2222-2222-222222222222', 'executive', NULL);

CREATE TEMP TABLE tmp_ids (menu_id uuid, item_id uuid, poi_id uuid);
CREATE TEMP TABLE tmp_results (test text, detail text);
GRANT ALL ON tmp_ids TO authenticated, anon;
GRANT ALL ON tmp_results TO authenticated, anon;
INSERT INTO tmp_ids (menu_id, item_id, poi_id) VALUES (NULL, NULL, NULL);

-- ---- impersonate OWNER ----
SELECT set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', false);
SET ROLE authenticated;

-- T3: owner creates a DRAFT menu (own restaurant)
WITH new_menu AS (
  INSERT INTO menus (restaurant_id, title, status, created_by)
  VALUES ('932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'Test Draft Menu', 'DRAFT', 'a1111111-1111-1111-1111-111111111111')
  RETURNING id
)
UPDATE tmp_ids SET menu_id = (SELECT id FROM new_menu);
INSERT INTO tmp_results (test, detail)
SELECT 'T3_create_draft', (SELECT status FROM menus WHERE id = (SELECT menu_id FROM tmp_ids));

-- T3b: owner adds an item + a price observation, then edits them
WITH new_item AS (
  INSERT INTO menu_items (menu_id, item_name, category, description)
  SELECT (SELECT menu_id FROM tmp_ids), 'Test Item', 'mains', 'orig desc' RETURNING id
)
UPDATE tmp_ids SET item_id = (SELECT id FROM new_item);
WITH new_poi AS (
  INSERT INTO price_observations (menu_item_id, price, currency, verification_status)
  SELECT (SELECT item_id FROM tmp_ids), 100, 'Tk', 'UNVERIFIED' RETURNING id
)
UPDATE tmp_ids SET poi_id = (SELECT id FROM new_poi);

UPDATE menu_items SET item_name = 'Edited Name', description = 'Edited desc'
WHERE id = (SELECT item_id FROM tmp_ids);
UPDATE price_observations SET price = 150 WHERE id = (SELECT poi_id FROM tmp_ids);

INSERT INTO tmp_results (test, detail)
SELECT 'T3b_item_name', (SELECT item_name FROM menu_items WHERE id = (SELECT item_id FROM tmp_ids));
INSERT INTO tmp_results (test, detail)
SELECT 'T3b_price', (SELECT price::text FROM price_observations WHERE id = (SELECT poi_id FROM tmp_ids));

-- T3c: owner submits for review
UPDATE menus SET status = 'PENDING_REVIEW' WHERE id = (SELECT menu_id FROM tmp_ids);
INSERT INTO tmp_results (test, detail)
SELECT 'T3c_submit_status', (SELECT status FROM menus WHERE id = (SELECT menu_id FROM tmp_ids));

-- T4: SECURITY BOUNDARY - owner tries to edit Uncle Bobo's (different restaurant)
WITH upd AS (
  UPDATE menus SET title = 'HACKED'
  WHERE restaurant_id = 'fbaa4d68-0098-500f-8edc-0c58814d9750'
  RETURNING id
)
INSERT INTO tmp_results (test, detail) SELECT 'T4_boundary_rows_changed', (SELECT count(*)::text FROM upd);
INSERT INTO tmp_results (test, detail)
SELECT 'T4_hacked_menus', count(*)::text FROM menus WHERE title = 'HACKED';

-- ---- impersonate ADMIN (executive) ----
SET ROLE postgres;
SELECT set_config('request.jwt.claims', '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}', false);
SET ROLE authenticated;

-- T5: admin approves -> PUBLISHED
UPDATE menus SET status = 'PUBLISHED' WHERE id = (SELECT menu_id FROM tmp_ids);
INSERT INTO tmp_results (test, detail)
SELECT 'T5_admin_publish_status', (SELECT status FROM menus WHERE id = (SELECT menu_id FROM tmp_ids));

-- T5b: end-to-end - anon now sees the published menu
SET ROLE anon;
INSERT INTO tmp_results (test, detail)
SELECT 'T5b_anon_visible', count(*)::text FROM menus WHERE id = (SELECT menu_id FROM tmp_ids);

SET ROLE postgres;
SELECT * FROM tmp_results;
ROLLBACK;
