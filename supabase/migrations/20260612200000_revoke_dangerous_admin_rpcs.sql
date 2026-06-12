-- SECURITY: close a critical second privilege-escalation / data-destruction
-- vector via SECURITY DEFINER RPCs.
--
-- These functions run as the definer (postgres), so they BYPASS RLS *and* the
-- guard_users_subscription_columns trigger from the earlier privilege-escalation
-- fix (that trigger checks current_user IN (authenticated,anon), which is false
-- inside a SECURITY DEFINER function). They take a p_user_id / p_calendar_id from
-- the caller and mutate that user's state with NO is_admin()/auth.uid() check, yet
-- EXECUTE was granted to `authenticated`.
--
-- Confirmed live: a normal authenticated user successfully called
-- admin_clear_user_data(<any user_id>) and got {"success":true} — i.e. any
-- logged-in user could DELETE another tenant's entire data (bookings, calendars,
-- availability, waitlist...). admin_update_user_subscription / update_user_status
-- were only incidentally blocked (overload ambiguity / a type bug), not by design.
--
-- None of these are called from the frontend via an authenticated JWT (verified by
-- grep). Edge functions use service_role (kept) and internal SECURITY DEFINER
-- call-chains run as postgres (owner, kept) — neither is affected. The grant that
-- exposed them was the default PUBLIC grant (proacl shows `=X/postgres`), so we
-- must revoke from PUBLIC — revoking from authenticated/anon alone is a no-op.

REVOKE EXECUTE ON FUNCTION public.admin_clear_user_data(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_developer_update_user_subscription(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_status(uuid, text, boolean, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_status(uuid, text, text, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_generate_mock_data(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_generate_comprehensive_mock_data(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_mock_data(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_ensure_user_has_calendar(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_user_has_calendar_and_service(uuid) FROM PUBLIC, anon, authenticated;

-- admin_update_user_subscription: 2 of its 3 overloads have NO is_admin() guard
-- (escalation: set any user's subscription_tier). The dev dashboard uses
-- admin_apply_developer_status (is_admin-guarded), NOT these. Revoke the two
-- unguarded overloads; the guarded 3rd (p_subscription_tier subscription_tier) is
-- left intact.
REVOKE EXECUTE ON FUNCTION public.admin_update_user_subscription(uuid, text, text, timestamp with time zone, timestamp with time zone) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_user_subscription(uuid, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- get_user_subscription_details: no authz -> any authenticated user could read
-- ANOTHER user's subscription status/tier by user_id (cross-tenant info leak).
REVOKE EXECUTE ON FUNCTION public.get_user_subscription_details(uuid) FROM PUBLIC, anon, authenticated;
