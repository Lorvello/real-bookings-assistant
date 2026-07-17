-- R41: a negative result writer must not destroy the durable fence while a
-- provider result can still arrive. This keeps provider acceptance monotonic
-- regardless of which concurrent result writer obtains the row lock first.

CREATE OR REPLACE FUNCTION public.preserve_booking_reminder_provider_result_fence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF OLD.delivery_mode = 'send'
     AND OLD.provider_attempt_started_at IS NOT NULL
     AND OLD.provider_accepted_at IS NULL
     AND NEW.provider_accepted_at IS NULL
     AND NEW.claim_token IS NULL
     AND NEW.claim_expires_at IS NULL
     AND NEW.provider_attempt_started_at IS NULL THEN
    NEW.claim_token := OLD.claim_token;
    NEW.claim_expires_at := OLD.claim_expires_at;
    NEW.provider_attempt_started_at := OLD.provider_attempt_started_at;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.preserve_booking_reminder_provider_result_fence()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_preserve_booking_reminder_provider_result_fence
  ON public.booking_reminders_sent;
CREATE TRIGGER trg_preserve_booking_reminder_provider_result_fence
  BEFORE UPDATE OF
    status,
    claim_token,
    claim_expires_at,
    provider_attempt_started_at,
    provider_accepted_at
  ON public.booking_reminders_sent
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_booking_reminder_provider_result_fence();

COMMENT ON FUNCTION public.preserve_booking_reminder_provider_result_fence() IS
  'R41: preserves an in-flight provider-result fence across negative result writers until authoritative provider acceptance clears it.';
