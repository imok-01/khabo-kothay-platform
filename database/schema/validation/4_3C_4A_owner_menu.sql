-- ============================================================================
-- 4.3C.4A owner menu draft workflow — runtime validation (impersonation)
-- Mirrors the 4.3C.2 harness: impersonate the Meat Theory owner (a111…) via
-- SET ROLE + request.jwt.claims so auth.uid() resolves; mutating steps run
-- inside a transaction that is ROLLED BACK so no test data persists.
-- ============================================================================

BEGIN;

-- Seed the owner role link as superuser (this whole script rolls back, so it
-- does not persist). Without it the owner RLS policies would deny everything.
INSERT INTO auth.users (id) VALUES ('a1111111-1111-1111-1111-111111111111') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, user_id, restaurant_id, role_name)
VALUES ('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'restaurant_admin')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';

CREATE TEMP TABLE _r (name text, ok boolean, detail text);
CREATE TEMP TABLE _t (draft_id uuid);
GRANT INSERT, SELECT ON _r TO anon;
GRANT INSERT, SELECT ON _t TO anon;

-- T1: owner creates a DRAFT menu for their own restaurant (Meat Theory)
WITH ins AS (
  INSERT INTO menus (restaurant_id, title, status, created_by, modified_by, version, created_at)
  VALUES ('932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'Owner Draft', 'DRAFT',
          'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 2, now())
  RETURNING id
)
INSERT INTO _t SELECT id FROM ins;

-- T1b: owner can LOAD (select) their own menu rows
INSERT INTO _r
SELECT 'owner_can_load_own_menu',
       (SELECT count(*) FROM menus WHERE restaurant_id = '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7') >= 1,
       format('own_menus=%s', (SELECT count(*) FROM menus WHERE restaurant_id = '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7'));

-- T2: owner persists content via the upsert_menu_content RPC (items + obs)
SELECT upsert_menu_content(
  (SELECT draft_id FROM _t),
  '[{"id":"bbbb1111-1111-1111-1111-111111111111","item_name":"Test Curry","description":null,"category":"Mains","available":true,"featured":false,"is_signature":true,"image_url":null,"created_at":"2026-01-01T00:00:00Z"}]'::jsonb,
  '[{"id":"cccc1111-1111-1111-1111-111111111111","menu_item_id":"bbbb1111-1111-1111-1111-111111111111","price":350,"currency":"BDT","source_id":null,"observed_at":"2026-01-01T00:00:00Z","raw_price":null,"verification_status":"RESTAURANT_CONFIRMED"}]'::jsonb
);

INSERT INTO _r
SELECT 'owner_write_content',
       (SELECT count(*) FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t)) = 1
       AND (SELECT count(*) FROM price_observations
            WHERE menu_item_id IN (SELECT id FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t))) = 1,
       format('items=%s obs=%s',
              (SELECT count(*) FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t)),
              (SELECT count(*) FROM price_observations WHERE menu_item_id IN (SELECT id FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t))));

-- T2b: re-save (delete-then-reinsert) keeps exactly one item (removed-dish handling)
SELECT upsert_menu_content(
  (SELECT draft_id FROM _t),
  '[{"id":"bbbb1111-1111-1111-1111-111111111111","item_name":"Test Curry","description":null,"category":"Mains","available":true,"featured":false,"is_signature":true,"image_url":null,"created_at":"2026-01-01T00:00:00Z"}]'::jsonb,
  '[]'::jsonb
);
INSERT INTO _r
SELECT 'owner_resave_drops_observations',
       (SELECT count(*) FROM price_observations WHERE menu_item_id IN (SELECT id FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t))) = 0,
       format('obs_after_resave=%s', (SELECT count(*) FROM price_observations WHERE menu_item_id IN (SELECT id FROM menu_items WHERE menu_id = (SELECT draft_id FROM _t))));

-- T3: submit DRAFT -> PENDING_REVIEW
UPDATE menus SET status = 'PENDING_REVIEW', submitted_by = 'a1111111-1111-1111-1111-111111111111', submitted_at = now()
 WHERE id = (SELECT draft_id FROM _t);
INSERT INTO _r
SELECT 'submit_draft_to_review',
       (SELECT status FROM menus WHERE id = (SELECT draft_id FROM _t)) = 'PENDING_REVIEW',
       (SELECT status FROM menus WHERE id = (SELECT draft_id FROM _t));

-- T4: cross-restaurant denial (still impersonated as owner a111)
DO $$
DECLARE
  ub_menu uuid;
  denied_insert boolean := false;
  denied_content boolean := false;
BEGIN
  SELECT id INTO ub_menu FROM menus
   WHERE restaurant_id = 'fbaa4d68-0098-500f-8edc-0c58814d9750' AND status = 'PUBLISHED' LIMIT 1;

  BEGIN
    INSERT INTO menus (restaurant_id, title, status, created_by, modified_by, version, created_at)
    VALUES ('fbaa4d68-0098-500f-8edc-0c58814d9750', 'Hacked', 'DRAFT',
            'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 99, now());
    denied_insert := false;
  EXCEPTION WHEN OTHERS THEN
    denied_insert := true;
  END;

  BEGIN
    PERFORM upsert_menu_content(ub_menu,
      '[{"id":"dddd1111-1111-1111-1111-111111111111","item_name":"X","description":null,"category":"C","available":true,"featured":false,"is_signature":false,"image_url":null,"created_at":"2026-01-01T00:00:00Z"}]'::jsonb,
      '[]'::jsonb);
    denied_content := false;
  EXCEPTION WHEN OTHERS THEN
    denied_content := true;
  END;

  INSERT INTO _r VALUES ('cross_restaurant_denied',
    denied_insert AND denied_content,
    format('menu_insert_denied=%s content_write_denied=%s', denied_insert, denied_content));
END $$;

-- T5: anon cannot see the owner's non-published menus
RESET ROLE;
SET ROLE anon;
INSERT INTO _r
SELECT 'anon_cannot_see_nonpublished',
       (SELECT count(*) FROM menus WHERE restaurant_id = '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7' AND status <> 'PUBLISHED') = 0,
       format('nonpublished_visible=%s', (SELECT count(*) FROM menus WHERE restaurant_id = '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7' AND status <> 'PUBLISHED'));

-- T6: global published catalogue unchanged (no regression in public reads)
INSERT INTO _r
SELECT 'published_menus_count',
       (SELECT count(*) FROM menus WHERE status = 'PUBLISHED') = 206,
       format('published=%s', (SELECT count(*) FROM menus WHERE status = 'PUBLISHED'));

SELECT * FROM _r;

ROLLBACK;
