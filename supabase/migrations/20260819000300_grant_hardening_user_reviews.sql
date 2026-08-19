-- ============================================================================
-- KHABO KOTHAY — SECURITY HARDENING PHASE 1: Corrective grant (user_reviews)
-- ============================================================================
-- Discovered during Phase 1 verification: the active Supabase path reads
-- `user_reviews` (restaurantRepository.fetchAll / fetchById / fetchBundle and
-- reviewRepository) inside a Promise.all. Revoking SELECT from anon made that
-- query THROW ("permission denied for table user_reviews"), which would break
-- the restaurant catalogue/detail load in Supabase mode.
--
-- Behavior BEFORE hardening: anon had SELECT on user_reviews, but the table
-- has NO RLS policy → SELECT succeeded and returned [] (0 rows). The frontend
-- treats that as "no community reviews yet".
--
-- This corrective migration RESTORES that exact behavior: SELECT is granted
-- again, and since no RLS policy exists on user_reviews, anon/authenticated
-- still receive an empty result — no data exposure is introduced.
--
-- UNCHANGED:
--   * No RLS policy is added to user_reviews (reads stay empty for anon).
--   * All other Phase 1 grant hardening remains in place.
--   * discovery facts / frontend / read behavior.
-- ============================================================================

BEGIN;

GRANT SELECT ON TABLE user_reviews TO anon, authenticated;

COMMIT;