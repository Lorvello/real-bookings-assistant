-- R29: retire source-dead SECURITY DEFINER functions that are either broken against the
-- current schema or publicly executable through PostgreSQL's default function privilege.
-- Explicit signatures and no CASCADE make this fail closed if a hidden database dependency
-- still exists. Current product/payment/rate-limit paths use newer guarded functions.

REVOKE ALL ON FUNCTION public.admin_generate_mock_data(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.admin_set_user_status(uuid, text, boolean, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_user_status(uuid, text, text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.validate_payment_security(
  inet, uuid, integer, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_payment_attempt(inet, uuid, boolean)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_public_rate_limit(
  inet, text, text, integer, integer
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_payment_rate_limit(inet, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.cleanup_old_whatsapp_data()
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.admin_generate_mock_data(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_user_status(uuid, text);
DROP FUNCTION IF EXISTS public.admin_set_user_status(uuid, text, boolean, boolean);
DROP FUNCTION IF EXISTS public.update_user_status(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.validate_payment_security(
  inet, uuid, integer, text, text, text, text
);
DROP FUNCTION IF EXISTS public.record_payment_attempt(inet, uuid, boolean);
DROP FUNCTION IF EXISTS public.check_public_rate_limit(
  inet, text, text, integer, integer
);
DROP FUNCTION IF EXISTS public.check_payment_rate_limit(inet, uuid);
DROP FUNCTION IF EXISTS public.cleanup_old_whatsapp_data();
