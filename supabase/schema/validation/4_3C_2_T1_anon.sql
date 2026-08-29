-- ============================================================================
-- PHASE 4.3C.2 -- Test 1: Anonymous public regression
-- Actor: anonymous visitor. Verifies the public website data layer still works
-- after the 1_9 anon RLS (status = 'PUBLISHED' only). Read-only; no cleanup.
-- ============================================================================

SET ROLE anon;

SELECT 'counts' AS kind, obj AS label, n::text AS val FROM (
  SELECT 'restaurants'::text            AS obj, count(*) AS n FROM restaurants
  UNION ALL
  SELECT 'menus_published', count(*) FROM menus
  UNION ALL
  SELECT 'menu_items',       count(*) FROM menu_items
  UNION ALL
  SELECT 'price_observations', count(*) FROM price_observations
) s

UNION ALL

-- Simulate the app's per-restaurant menu fetch (runs as anon -> RLS applied)
SELECT 'per_restaurant_anon_menus', r.name,
       (SELECT count(*) FROM menus m WHERE m.restaurant_id = r.id)::text
FROM (SELECT id, name FROM restaurants ORDER BY random() LIMIT 3) r;

SET ROLE postgres;
