-- ============================================================================
-- 4.3C.4B executive review queue — runtime validation (impersonation, rolled back)
-- Flow: owner submits PENDING_REVIEW -> owner CANNOT publish -> anon cannot see
-- pending -> executive sees it in queue -> executive approves -> anon sees it.
-- ============================================================================

BEGIN;

-- Seed identities as superuser (rolled back with the transaction).
INSERT INTO auth.users (id) VALUES ('a1111111-1111-1111-1111-111111111111'), ('b2222222-2222-2222-2222-222222222222') ON CONFLICT DO NOTHING;
INSERT INTO roles (id, user_id, restaurant_id, role_name) VALUES
  ('e1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'restaurant_admin'),
  ('f2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', '932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'executive')
ON CONFLICT DO NOTHING;

SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}';

CREATE TEMP TABLE _r (name text, ok boolean, detail text);
CREATE TEMP TABLE _t (draft_id uuid);
GRANT INSERT, SELECT ON _r TO anon;
GRANT SELECT ON _t TO anon;

-- Owner: create DRAFT, write content, submit for review.
WITH ins AS (
  INSERT INTO menus (restaurant_id, title, status, created_by, modified_by, version, created_at)
  VALUES ('932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7', 'Owner Draft', 'DRAFT',
          'a1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 2, now())
  RETURNING id
)
INSERT INTO _t SELECT id FROM ins;

SELECT upsert_menu_content(
  (SELECT draft_id FROM _t),
  '[{"id":"bbbb1111-1111-1111-1111-111111111111","item_name":"Test Curry","description":null,"category":"Mains","available":true,"featured":false,"is_signature":true,"image_url":null,"created_at":"2026-01-01T00:00:00Z"}]'::jsonb,
  '[{"id":"cccc1111-1111-1111-1111-111111111111","menu_item_id":"bbbb1111-1111-1111-1111-111111111111","price":350,"currency":"BDT","source_id":null,"observed_at":"2026-01-01T00:00:00Z","raw_price":null,"verification_status":"RESTAURANT_CONFIRMED"}]'::jsonb
);

UPDATE menus SET status='PENDING_REVIEW', submitted_by='a1111111-1111-1111-1111-111111111111', submitted_at=now() WHERE id=(SELECT draft_id FROM _t);

INSERT INTO _r
SELECT 'owner_submitted_pending',
       (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t)) = 'PENDING_REVIEW',
       (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t));

-- Owner CANNOT directly publish (owner_update WITH CHECK excludes PUBLISHED).
DO $$
DECLARE denied boolean := false;
BEGIN
  UPDATE menus SET status='PUBLISHED', published_by='a1111111-1111-1111-1111-111111111111', published_at=now()
   WHERE id=(SELECT draft_id FROM _t);
  denied := false;
EXCEPTION WHEN OTHERS THEN denied := true;
END $$;
INSERT INTO _r
SELECT 'owner_cannot_publish',
       (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t)) = 'PENDING_REVIEW',
       'still_' || (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t));

-- Anon cannot see the PENDING submission (public read is PUBLISHED-only).
RESET ROLE;
SET ROLE anon;
INSERT INTO _r
SELECT 'anon_cannot_see_pending',
       (SELECT count(*) FROM menu_items WHERE menu_id=(SELECT draft_id FROM _t)) = 0,
       format('pending_items_visible=%s', (SELECT count(*) FROM menu_items WHERE menu_id=(SELECT draft_id FROM _t)));

-- Executive (b222) sees it in the queue and approves it.
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"b2222222-2222-2222-2222-222222222222","role":"authenticated"}';

INSERT INTO _r
SELECT 'exec_sees_pending_in_queue',
       (SELECT count(*) FROM menus WHERE status='PENDING_REVIEW' AND id=(SELECT draft_id FROM _t)) = 1,
       format('queue_matches=%s', (SELECT count(*) FROM menus WHERE status='PENDING_REVIEW' AND id=(SELECT draft_id FROM _t)));

UPDATE menus SET status='PUBLISHED', published_by='b2222222-2222-2222-2222-222222222222', published_at=now()
 WHERE id=(SELECT draft_id FROM _t);

INSERT INTO _r
SELECT 'exec_approved_published',
       (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t)) = 'PUBLISHED',
       (SELECT status FROM menus WHERE id=(SELECT draft_id FROM _t));

-- Anon now sees the approved (published) menu's items.
RESET ROLE;
SET ROLE anon;
INSERT INTO _r
SELECT 'anon_sees_published',
       (SELECT count(*) FROM menu_items WHERE menu_id=(SELECT draft_id FROM _t)) >= 1,
       format('published_items_visible=%s', (SELECT count(*) FROM menu_items WHERE menu_id=(SELECT draft_id FROM _t)));

SELECT * FROM _r;

ROLLBACK;
