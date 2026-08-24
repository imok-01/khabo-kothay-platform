-- ============================================================================
-- KHABO KOTHAY -- 4.x Restaurant onboarding application workflow
-- ============================================================================
-- Replaces the unsafe "signup immediately mints a restaurant_admin account"
-- flow with an approval-based workflow:
--
--   phone OTP  ->  application form (PENDING)  ->  KK executive review
--             ->  APPROVED  : restaurant profile + single restaurant_owner role
--                             are created (the ONLY place an owner role is minted)
--             ->  REJECTED / CONTACTED : status only, no access ever granted
--
-- Security model:
--   * Applicants may only INSERT their OWN row (forced to PENDING) and SELECT
--     their OWN row. They can NEVER write `roles` (no roles insert policy).
--   * Executives may only SELECT all applications. Every status change happens
--     through the SECURITY DEFINER RPC `review_restaurant_application`, which
--     (a) checks the caller is an executive, (b) locks the row to prevent
--     concurrent double-approval, (c) refuses to re-approve, and (d) only
--     creates the restaurant + owner role on APPROVED.
--   * A normal verified phone user can therefore NEVER become a restaurant_owner
--     without KK executive approval.
--
-- Idempotent: safe to re-run.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Application entity. Stores the submitted request; ownership/access is
--    derived later (on approval) from `roles`, never from this table directly.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  applicant_phone    text NOT NULL,
  applicant_name     text NOT NULL,
  applicant_role     text NOT NULL DEFAULT 'Owner',
  restaurant_name    text NOT NULL,
  address            text,
  area               text,
  cuisine            text,            -- free-form / comma list (restaurants table has no cuisine column)
  contact_details    text,
  website            text,
  notes              text,
  status             text NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','APPROVED','REJECTED','CONTACTED')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS restaurant_applications_status_idx
  ON public.restaurant_applications (status);
CREATE INDEX IF NOT EXISTS restaurant_applications_applicant_idx
  ON public.restaurant_applications (applicant_user_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security.
-- ----------------------------------------------------------------------------
ALTER TABLE public.restaurant_applications ENABLE ROW LEVEL SECURITY;

-- Applicants insert only their own row, and only as PENDING.
DROP POLICY IF EXISTS restaurant_applications_applicant_insert
  ON public.restaurant_applications;
CREATE POLICY restaurant_applications_applicant_insert
  ON public.restaurant_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = applicant_user_id AND status = 'PENDING');

-- Applicants read only their own application(s).
DROP POLICY IF EXISTS restaurant_applications_applicant_select
  ON public.restaurant_applications;
CREATE POLICY restaurant_applications_applicant_select
  ON public.restaurant_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = applicant_user_id);

-- Executives may list/read all applications. Mutations are performed ONLY via
-- the SECURITY DEFINER RPC below (no client UPDATE/DELETE policy exists), so a
-- direct status flip can never grant access without the server-side logic.
DROP POLICY IF EXISTS restaurant_applications_executive_select
  ON public.restaurant_applications;
CREATE POLICY restaurant_applications_executive_select
  ON public.restaurant_applications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.roles
      WHERE user_id = auth.uid() AND role_name = 'executive'
    )
  );

GRANT SELECT, INSERT ON public.restaurant_applications TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. Secure approval / review. SECURITY DEFINER so it can create the restaurant
--    profile + the owner `roles` row, while still enforcing that the CALLER is
--    an executive before doing anything.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_restaurant_application(
  p_application_id uuid,
  p_status         text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app           public.restaurant_applications%ROWTYPE;
  v_reviewer      uuid := auth.uid();
  v_user          uuid;
  v_restaurant_id uuid;
BEGIN
  -- Only KK executives may review applications.
  IF NOT EXISTS (
    SELECT 1 FROM public.roles
    WHERE user_id = v_reviewer AND role_name = 'executive'
  ) THEN
    RAISE EXCEPTION 'Only Khabo Kothay executives may review applications';
  END IF;

  IF p_status NOT IN ('APPROVED', 'REJECTED', 'CONTACTED') THEN
    RAISE EXCEPTION 'Invalid application status: %', p_status;
  END IF;

  -- Lock the row for the duration of this transaction to prevent a second
  -- concurrent approval from double-creating the restaurant/role.
  SELECT * INTO v_app
  FROM public.restaurant_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Refuse to re-approve an already-approved (or already decided) application,
  -- so the owner role can never be duplicated.
  IF v_app.status = 'APPROVED' THEN
    RAISE EXCEPTION 'Application already approved';
  END IF;

  v_user := v_app.applicant_user_id;

  IF p_status = 'APPROVED' THEN
    -- Create the restaurant profile. It is NOT published into public discovery
    -- (separate future verification/publication workflow owns that).
    INSERT INTO public.restaurants (
      name, description, address, area, phone, website, status
    ) VALUES (
      v_app.restaurant_name,
      COALESCE(v_app.notes, ''),
      v_app.address,
      v_app.area,
      v_app.contact_details,
      v_app.website,
      'UNKNOWN'
    ) RETURNING id INTO v_restaurant_id;

    -- The single, server-enforced place a restaurant_owner role is minted.
    -- Links the already-verified applicant identity to the new restaurant.
    INSERT INTO public.roles (user_id, role_name, restaurant_id)
    VALUES (v_user, 'restaurant_admin', v_restaurant_id);

    UPDATE public.restaurant_applications
    SET status = 'APPROVED', reviewed_at = now(), reviewed_by = v_reviewer
    WHERE id = p_application_id;

    RETURN v_restaurant_id;
  ELSE
    -- REJECTED / CONTACTED: status only. No restaurant, no role, ever.
    UPDATE public.restaurant_applications
    SET status = p_status, reviewed_at = now(), reviewed_by = v_reviewer
    WHERE id = p_application_id;

    RETURN NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.review_restaurant_application(uuid, text)
  IS 'KK executive approves, rejects or contacts restaurant applications. APPROVED creates the restaurant profile plus the single restaurant_owner role for the verified applicant, while REJECTED or CONTACTED never grant access and refuse re-approval.';

GRANT EXECUTE ON FUNCTION public.review_restaurant_application(uuid, text) TO authenticated;

COMMIT;

-- ----------------------------------------------------------------------------
-- Post-apply verification (Supabase SQL editor / psql):
--
--   SELECT count(*) FROM pg_policies
--     WHERE tablename = 'restaurant_applications';        -- expect 3
--
--   SELECT proname FROM pg_proc
--     WHERE proname = 'review_restaurant_application';    -- expect 1
-- ============================================================================
