-- ============================================================================
-- KHABO KOTHAY -- 4.3C.6C PILOT INFRASTRUCTURE (PROPOSED, NOT APPLIED)
-- ============================================================================
-- Reliability infrastructure for the first controlled consumer pilot:
--   * analytics_events  — anonymous, PII-free event storage (no dashboard).
--   * restaurant_reports — user-submitted "report incorrect information"
--     surfaced to KK admins (replaces localStorage-only persistence).
--
-- This migration is GATED: apply via Supabase DB CLI / Dashboard SQL Editor.
-- The app code (src/lib/analytics.ts, src/hooks/useReports.ts) is already
-- shipped and degrades safely — it only writes to these tables when Supabase
-- is configured AND the relevant feature flag is on. In offline mode it keeps
-- using the local store, so the app is unaffected until this is applied.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. analytics_events — coarse, anonymous event log.
--    No PII: event names + coarse props (ids/sources only). No user identity.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event      TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.analytics_events IS
  'Anonymous, PII-free pilot analytics. event = coarse name, properties = '
  'ids/sources only. No emails, names, or coordinates.';

CREATE INDEX IF NOT EXISTS analytics_events_event_idx
  ON public.analytics_events (event);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON public.analytics_events (created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or signed-in) may INSERT an event. No SELECT for anon — the
-- pilot has no public analytics surface; only authenticated admins may read.
DROP POLICY IF EXISTS "analytics_insert" ON public.analytics_events;
CREATE POLICY "analytics_insert" ON public.analytics_events
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_select_auth" ON public.analytics_events;
CREATE POLICY "analytics_select_auth" ON public.analytics_events
  FOR SELECT TO authenticated USING (true);

-- ----------------------------------------------------------------------------
-- 2. restaurant_reports — user "report incorrect information" submissions.
--    Content is coarse (restaurant id + reason category + status) — no PII.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_reports (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.restaurant_reports IS
  'User-submitted restaurant corrections. Coarse fields only (restaurant id, '
  'reason category, status) — no PII.';

CREATE INDEX IF NOT EXISTS restaurant_reports_status_idx
  ON public.restaurant_reports (status);
CREATE INDEX IF NOT EXISTS restaurant_reports_created_at_idx
  ON public.restaurant_reports (created_at);

ALTER TABLE public.restaurant_reports ENABLE ROW LEVEL SECURITY;

-- Submitters (anon or signed-in) may INSERT a report. No SELECT for anon —
-- only authenticated KK admins read via the admin surface.
DROP POLICY IF EXISTS "reports_insert" ON public.restaurant_reports;
CREATE POLICY "reports_insert" ON public.restaurant_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reports_select_auth" ON public.restaurant_reports;
CREATE POLICY "reports_select_auth" ON public.restaurant_reports
  FOR SELECT TO authenticated USING (true);

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply checks (Supabase Dashboard -> SQL Editor):
--
--   SELECT count(*) FROM analytics_events;        -- grows as events fire
--   SELECT count(*) FROM restaurant_reports;     -- grows as users report
--   SELECT id, restaurant_id, reason, status
--     FROM restaurant_reports ORDER BY created_at DESC;  -- admin visibility
-- ============================================================================
