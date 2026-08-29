BEGIN;

INSERT INTO auth.users (id, email, email_confirmed_at)
VALUES ('a1111111-1111-1111-1111-111111111111','test-owner@khabo-kothay.com', now());
INSERT INTO roles (user_id, role_name, restaurant_id)
VALUES ('a1111111-1111-1111-1111-111111111111','restaurant_owner','932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7');

SELECT set_config('request.jwt.claims','{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}',false);
SET ROLE authenticated;

SELECT 'existing_menu_id' AS t, id AS menu_id
FROM menus WHERE restaurant_id='932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7' LIMIT 1;

SELECT 'policy_subquery_pass' AS t,
  EXISTS (
    SELECT 1 FROM menus m JOIN roles r ON r.restaurant_id = m.restaurant_id
    WHERE m.id = (SELECT id FROM menus WHERE restaurant_id='932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7' LIMIT 1)
      AND r.user_id = auth.uid()
  ) AS pass;

INSERT INTO menu_items (menu_id, item_name, category, description)
SELECT id, 'Diag Item','mains','x'
FROM menus WHERE restaurant_id='932a72f8-7ae6-5ae7-bb1b-5eeac0a4dac7' LIMIT 1
RETURNING 'real_insert_ok' AS t, id, menu_id;

SET ROLE postgres;
ROLLBACK;
