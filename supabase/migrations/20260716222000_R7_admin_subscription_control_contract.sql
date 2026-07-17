-- R7: make the visible admin subscription controls both callable and fail-closed.
--
-- Reproduced final-schema defect:
--   * the browser calls an overloaded admin_update_user_subscription RPC shape that
--     PostgREST cannot resolve reliably and authenticated has no EXECUTE grant;
--   * get_user_subscription_details is intentionally service-only because its legacy
--     body has no authorization check, but the browser still calls it directly.
--
-- These two uniquely named wrappers check the signed-in admin identity before
-- entering the legacy implementation. Their exact signatures remove PostgREST
-- overload ambiguity. The legacy functions remain non-client-callable.

CREATE OR REPLACE FUNCTION public.admin_update_user_subscription_safe(
  p_user_id uuid,
  p_subscription_status text DEFAULT NULL,
  p_subscription_tier text DEFAULT NULL,
  p_trial_end_date text DEFAULT NULL,
  p_subscription_end_date text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_business_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- All arguments are explicitly text, selecting the exact seven-text legacy
  -- overload without relying on PostgREST's ambiguous JSON type inference.
  RETURN public.admin_update_user_subscription(
    p_user_id::uuid,
    p_subscription_status::text,
    p_subscription_tier::text,
    p_trial_end_date::text,
    p_subscription_end_date::text,
    p_business_name::text,
    p_business_type::text
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_user_subscription_details_safe(
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  RETURN public.get_user_subscription_details(p_user_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_update_user_subscription_safe(
  uuid, text, text, text, text, text, text
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription_safe(
  uuid, text, text, text, text, text, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_user_subscription_details_safe(uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_user_subscription_details_safe(uuid)
TO authenticated;

-- These existing functions already contain an is_admin() body guard and are used
-- directly by the authenticated admin UI. Remove inherited PUBLIC/anon access and
-- leave one explicit browser role.
REVOKE ALL ON FUNCTION public.admin_apply_developer_status(uuid, text, text)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_apply_developer_status(uuid, text, text)
TO authenticated;

REVOKE ALL ON FUNCTION public.admin_extend_trial(uuid, integer)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_extend_trial(uuid, integer)
TO authenticated;

REVOKE ALL ON FUNCTION public.admin_setup_mock_incomplete_user(uuid)
FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_setup_mock_incomplete_user(uuid)
TO authenticated;

COMMENT ON FUNCTION public.admin_update_user_subscription_safe(
  uuid, text, text, text, text, text, text
) IS
  'Authenticated-admin-only, unambiguous subscription update entrypoint for the admin UI.';

COMMENT ON FUNCTION public.admin_get_user_subscription_details_safe(uuid) IS
  'Authenticated-admin-only subscription detail entrypoint for the admin UI.';
