-- R11 / F-006 (sev-1 defense-in-depth): harden the unguarded
-- admin_update_user_subscription() SECDEF overloads.
--
-- admin_update_user_subscription() has THREE overloads. The client-granted one
-- (uuid, text, subscription_tier, ts, ts, text, text) already checks
-- `IF NOT public.is_admin()`. The two OTHER overloads run SECURITY DEFINER (as
-- postgres = trigger-EXEMPT, the one architecturally-real escalation class) but
-- carry NO admin/ownership check:
--   * (uuid, text, text, timestamptz, timestamptz)                 -- 5-arg
--   * (uuid, text, text, text, text, text, text)                   -- all-text
-- They are safe TODAY only because (a) they are granted to postgres+service_role
-- (not authenticated/anon) and (b) PostgREST returns PGRST203 when it cannot
-- resolve the overload. Defence (b) is a fragile accident of overload ambiguity,
-- not an intentional control. This migration replaces that accident with an
-- explicit control on TWO layers:
--   1. add `IF NOT public.is_admin()` at the top of each unguarded overload, so
--      even if one were ever called directly (or made resolvable), a non-admin
--      caller is denied.
--   2. REVOKE EXECUTE from authenticated, anon and PUBLIC, so the only callers
--      are postgres + service_role (trusted server-side paths).
-- Bodies are otherwise preserved verbatim from the live definitions.

-- ---- overload 1: 5-arg (text tier, timestamptz dates) ----
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_user_id uuid,
  p_subscription_status text DEFAULT NULL::text,
  p_subscription_tier text DEFAULT NULL::text,
  p_trial_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_subscription_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_updated_user RECORD;
BEGIN
  -- F-006: this SECDEF overload runs as postgres (trigger-exempt). Gate it.
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Update user subscription details
  UPDATE public.users
  SET
    subscription_status = COALESCE(p_subscription_status::text, subscription_status),
    subscription_tier = COALESCE(p_subscription_tier::public.subscription_tier, subscription_tier),
    trial_end_date = COALESCE(p_trial_end_date, trial_end_date),
    subscription_end_date = COALESCE(p_subscription_end_date, subscription_end_date),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_user;

  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_updated_user),
    'message', 'User subscription updated successfully'
  );
END;
$function$;

-- ---- overload 2: all-text (7-arg) ----
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_user_id uuid,
  p_subscription_status text DEFAULT NULL::text,
  p_subscription_tier text DEFAULT NULL::text,
  p_trial_end_date text DEFAULT NULL::text,
  p_subscription_end_date text DEFAULT NULL::text,
  p_business_name text DEFAULT NULL::text,
  p_business_type text DEFAULT NULL::text
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_current_user record;
BEGIN
  -- F-006: this SECDEF overload runs as postgres (trigger-exempt). Gate it.
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- Get current user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Update user subscription and business data
  UPDATE public.users
  SET
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_tier = CASE
      WHEN p_subscription_tier IS NULL THEN NULL
      WHEN p_subscription_tier = '' THEN NULL
      ELSE p_subscription_tier::public.subscription_tier
    END,
    trial_end_date = CASE
      WHEN p_trial_end_date IS NULL THEN trial_end_date
      WHEN p_trial_end_date = '' THEN NULL
      ELSE p_trial_end_date::timestamp with time zone
    END,
    subscription_end_date = CASE
      WHEN p_subscription_end_date IS NULL THEN subscription_end_date
      WHEN p_subscription_end_date = '' THEN NULL
      ELSE p_subscription_end_date::timestamp with time zone
    END,
    business_name = CASE
      WHEN p_business_name IS NULL THEN business_name
      WHEN p_business_name = '' THEN NULL
      ELSE p_business_name
    END,
    business_type = CASE
      WHEN p_business_type IS NULL THEN business_type
      WHEN p_business_type = '' THEN NULL
      ELSE p_business_type
    END,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Get updated user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User subscription updated successfully',
    'user', row_to_json(v_current_user)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update user: ' || SQLERRM
    );
END;
$function$;

-- Layer 2: explicit grant lockdown on the two unguarded overloads.
-- (Belt-and-suspenders: they were already granted only to postgres+service_role,
-- but make the denial of authenticated/anon/PUBLIC explicit so a future blanket
-- GRANT cannot silently re-expose them.)
REVOKE EXECUTE ON FUNCTION public.admin_update_user_subscription(
  uuid, text, text, timestamp with time zone, timestamp with time zone
) FROM authenticated, anon, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.admin_update_user_subscription(
  uuid, text, text, text, text, text, text
) FROM authenticated, anon, PUBLIC;
