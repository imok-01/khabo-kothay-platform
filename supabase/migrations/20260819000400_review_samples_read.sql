-- Review Samples public read access
--
-- The Review Samples display layer reads `review_samples` on the public
-- restaurant detail page. The table has RLS enabled with zero policies and no
-- anon/authenticated grant, so anonymous reads currently throw
-- "permission denied". Mirror the existing public-read posture used by
-- `review_signals`: SELECT grant + a public_read policy. The table holds only
-- curated, attribution-backed review text intended for public display.
--
-- Writes remain service_role/postgres only (unchanged). No DML here.

GRANT SELECT ON TABLE public.review_samples TO anon, authenticated;

CREATE POLICY public_read ON public.review_samples
  FOR SELECT TO anon, authenticated
  USING (true);