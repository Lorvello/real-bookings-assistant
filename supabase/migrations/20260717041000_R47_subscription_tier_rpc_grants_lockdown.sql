-- R47: close the legacy arbitrary-user subscription-tier disclosure.
--
-- get_user_subscription_tier(uuid) is SECURITY DEFINER and accepts an
-- arbitrary user id. It has no application or policy call sites, so it must
-- not remain executable through the anonymous or authenticated API roles.

REVOKE ALL ON FUNCTION public.get_user_subscription_tier(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_tier(uuid)
  TO service_role;

COMMENT ON FUNCTION public.get_user_subscription_tier(uuid) IS
  'Service-role-only legacy tier lookup. R47 removed anonymous/authenticated arbitrary-user disclosure.';
