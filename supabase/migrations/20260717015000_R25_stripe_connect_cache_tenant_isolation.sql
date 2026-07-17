-- R25: a calendar owner may edit ordinary booking settings, but a Stripe
-- Connect account identifier is server-owned routing data. Allowing the
-- browser to rewrite it lets one tenant point a cached account at another
-- tenant before a privileged Edge route creates a Stripe dashboard/session.

CREATE OR REPLACE FUNCTION public.guard_calendar_settings_server_owned_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin')
     AND (
       (TG_OP = 'INSERT' AND NEW.stripe_connect_account_id IS NOT NULL)
       OR (
         TG_OP = 'UPDATE'
         AND NEW.stripe_connect_account_id IS DISTINCT FROM OLD.stripe_connect_account_id
       )
     )
  THEN
    RAISE EXCEPTION 'STRIPE_CONNECT_CACHE_SERVER_OWNED'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_calendar_settings_server_owned_fields()
FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_calendar_settings_server_owned_fields
ON public.calendar_settings;

CREATE TRIGGER guard_calendar_settings_server_owned_fields
BEFORE INSERT OR UPDATE ON public.calendar_settings
FOR EACH ROW
EXECUTE FUNCTION public.guard_calendar_settings_server_owned_fields();

-- Quarantine any cache value that cannot be tied to the calendar account
-- owner. The cache is no longer an authority, but clearing poisoned legacy
-- values prevents them from misleading operators or future code.
UPDATE public.calendar_settings AS settings
SET stripe_connect_account_id = NULL
FROM public.calendars AS calendar
JOIN public.users AS owner
  ON owner.id = calendar.user_id
WHERE calendar.id = settings.calendar_id
  AND settings.stripe_connect_account_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.business_stripe_accounts AS account
    WHERE account.stripe_account_id = settings.stripe_connect_account_id
      AND account.account_owner_id = COALESCE(owner.account_owner_id, owner.id)
  );

COMMENT ON COLUMN public.calendar_settings.stripe_connect_account_id IS
  'Non-authoritative server-written cache. Privileged Stripe routes must resolve business_stripe_accounts by account_owner_id, environment and platform_account_id.';
