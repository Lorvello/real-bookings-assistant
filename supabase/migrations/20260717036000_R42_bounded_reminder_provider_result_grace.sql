-- R42: never reclaim a reminder after provider I/O has started. Keep the exact
-- provider-result fence for one bounded late-receipt window, then release the
-- row without retrying the external send.

CREATE OR REPLACE FUNCTION public.preserve_booking_reminder_provider_result_fence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_grace_release boolean;
BEGIN
  v_grace_release :=
    NEW.last_error_code = 'REMINDER_PROVIDER_RESULT_UNRESOLVED_AFTER_GRACE'
    AND COALESCE(OLD.claim_expires_at, '-infinity'::timestamptz) <= clock_timestamp()
    AND NEW.claim_token IS NULL
    AND NEW.provider_attempt_started_at IS NULL;

  IF OLD.delivery_mode = 'send'
     AND OLD.provider_attempt_started_at IS NOT NULL
     AND OLD.provider_accepted_at IS NULL
     AND NEW.provider_accepted_at IS NULL
     AND NOT v_grace_release
     AND (
       NEW.claim_token IS DISTINCT FROM OLD.claim_token
       OR NEW.provider_attempt_started_at IS DISTINCT FROM OLD.provider_attempt_started_at
     ) THEN
    NEW.claim_token := OLD.claim_token;
    NEW.claim_expires_at := CASE
      -- A replay of the same negative result must not slide the deadline
      -- forever. Only the first negative transition starts the grace window.
      WHEN OLD.last_error_code =
        'REMINDER_PROVIDER_RESULT_PENDING_AFTER_NEGATIVE_RESULT'
        THEN OLD.claim_expires_at
      ELSE GREATEST(
        COALESCE(OLD.claim_expires_at, '-infinity'::timestamptz),
        clock_timestamp() + interval '5 minutes'
      )
    END;
    NEW.provider_attempt_started_at := OLD.provider_attempt_started_at;
    NEW.resolved_at := NULL;
    NEW.last_error_code := 'REMINDER_PROVIDER_RESULT_PENDING_AFTER_NEGATIVE_RESULT';
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
    provider_accepted_at,
    resolved_at,
    last_error_code
  ON public.booking_reminders_sent
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_booking_reminder_provider_result_fence();

COMMENT ON FUNCTION public.preserve_booking_reminder_provider_result_fence() IS
  'R42: preserves an unresolved provider-result fence for five minutes and permits only the explicit expired-grace close path to clear it.';

-- Keep the R28 implementation as a private implementation detail. The public
-- wrapper locks the active schedule row and refuses to mint a second claim once
-- provider I/O has begun, even after the ordinary 90-second claim lease expires.
ALTER FUNCTION public.claim_booking_reminder_v2(uuid, smallint)
  RENAME TO claim_booking_reminder_v2_unfenced;

REVOKE ALL ON FUNCTION public.claim_booking_reminder_v2_unfenced(uuid, smallint)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.claim_booking_reminder_v2(
  p_booking_id uuid,
  p_reminder_number smallint
)
RETURNS TABLE(
  claim_token uuid,
  schedule_generation uuid,
  attempt_count integer,
  status text,
  calendar_timezone text,
  customer_email text,
  customer_phone text,
  customer_name text,
  customer_locale text,
  channel text,
  start_time timestamptz,
  business_name text,
  calendar_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_existing public.booking_reminders_sent%ROWTYPE;
BEGIN
  SELECT booking.* INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF FOUND THEN
    SELECT reminder.* INTO v_existing
    FROM public.booking_reminders_sent AS reminder
    WHERE reminder.booking_id = p_booking_id
      AND reminder.reminder_number = p_reminder_number
      AND reminder.schedule_generation = v_booking.reminder_generation
    FOR UPDATE;

    IF FOUND
       AND v_existing.delivery_mode = 'send'
       AND v_existing.provider_attempt_started_at IS NOT NULL
       AND v_existing.provider_accepted_at IS NULL THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.claim_booking_reminder_v2_unfenced(
    p_booking_id,
    p_reminder_number
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint)
  TO service_role;

COMMENT ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint) IS
  'R42: claims a due reminder unless the active schedule already has unresolved provider I/O; unresolved sends are never reclaimed.';
COMMENT ON FUNCTION public.claim_booking_reminder_v2_unfenced(uuid, smallint) IS
  'R42 private implementation: original R28 claim path, callable only through the provider-fenced public wrapper.';

-- Preserve the R40 invalid-booking reconciliation as a private path, but make
-- it explicitly ignore provider-result rows. Those rows are handled only by
-- the bounded provider-grace state machine below.
ALTER FUNCTION public.reconcile_booking_reminders_v2()
  RENAME TO reconcile_booking_reminders_invalid_state_v2;

CREATE OR REPLACE FUNCTION public.reconcile_booking_reminders_invalid_state_v2()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH candidates AS (
    SELECT reminder.id
    FROM public.booking_reminders_sent AS reminder
    JOIN public.bookings AS booking
      ON booking.id = reminder.booking_id
    JOIN public.calendar_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    WHERE reminder.status = 'pending'
      AND reminder.provider_attempt_started_at IS NULL
      AND (
        reminder.schedule_generation <> booking.reminder_generation
        OR COALESCE(booking.payment_status, '') IN ('refunded', 'partially_refunded')
        OR booking.status <> 'confirmed'
        OR COALESCE(booking.is_deleted, false)
        OR booking.start_time <= now()
        OR (
          COALESCE(booking.customer_email, '') = ''
          AND COALESCE(booking.customer_phone, '') = ''
        )
        OR (
          reminder.reminder_number = 1
          AND settings.second_reminder_enabled
          AND booking.start_time <= now()
            + make_interval(mins => settings.second_reminder_timing_minutes)
        )
      )
    ORDER BY reminder.claim_expires_at NULLS FIRST, reminder.created_at, reminder.id
    FOR UPDATE OF reminder SKIP LOCKED
    LIMIT 200
  ), reconciled AS (
    UPDATE public.booking_reminders_sent AS reminder
    SET
      status = CASE
        WHEN reminder.schedule_generation <> booking.reminder_generation
          THEN 'superseded'
        WHEN COALESCE(booking.payment_status, '') IN ('refunded', 'partially_refunded')
          THEN 'payment_refunded'
        WHEN booking.status <> 'confirmed'
          OR COALESCE(booking.is_deleted, false)
          OR booking.start_time <= now()
          THEN 'booking_cancelled'
        WHEN COALESCE(booking.customer_email, '') = ''
          AND COALESCE(booking.customer_phone, '') = ''
          THEN 'no_contact_info'
        WHEN reminder.reminder_number = 1
          AND settings.second_reminder_enabled
          AND booking.start_time <= now()
            + make_interval(mins => settings.second_reminder_timing_minutes)
          THEN 'superseded'
        ELSE reminder.status
      END,
      resolved_at = now(),
      claim_token = NULL,
      claim_expires_at = NULL,
      provider_attempt_started_at = NULL,
      last_error_code = CASE
        WHEN reminder.schedule_generation <> booking.reminder_generation
          THEN 'REMINDER_GENERATION_SUPERSEDED'
        ELSE reminder.last_error_code
      END
    FROM candidates, public.bookings AS booking, public.calendar_settings AS settings
    WHERE reminder.id = candidates.id
      AND booking.id = reminder.booking_id
      AND settings.calendar_id = booking.calendar_id
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_count FROM reconciled;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_booking_reminders_invalid_state_v2()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reconcile_booking_reminders_v2()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_provider_count integer;
  v_invalid_count integer;
BEGIN
  WITH candidates AS (
    SELECT
      reminder.id,
      reminder.last_error_code IN (
        'REMINDER_PROVIDER_RESULT_PENDING_AFTER_RECONCILIATION',
        'REMINDER_PROVIDER_RESULT_PENDING_AFTER_NEGATIVE_RESULT'
      ) AS close_grace
    FROM public.booking_reminders_sent AS reminder
    WHERE reminder.delivery_mode = 'send'
      AND reminder.provider_attempt_started_at IS NOT NULL
      AND reminder.provider_accepted_at IS NULL
      AND COALESCE(reminder.claim_expires_at, '-infinity'::timestamptz)
        <= clock_timestamp()
    ORDER BY reminder.claim_expires_at NULLS FIRST, reminder.created_at, reminder.id
    FOR UPDATE OF reminder SKIP LOCKED
    LIMIT 200
  ), reconciled AS (
    UPDATE public.booking_reminders_sent AS reminder
    SET
      status = CASE
        WHEN reminder.status = 'pending' THEN 'delivery_unknown'
        ELSE reminder.status
      END,
      resolved_at = CASE
        WHEN candidates.close_grace THEN clock_timestamp()
        ELSE NULL
      END,
      claim_token = CASE
        WHEN candidates.close_grace THEN NULL
        ELSE reminder.claim_token
      END,
      claim_expires_at = CASE
        WHEN candidates.close_grace THEN NULL
        ELSE clock_timestamp() + interval '5 minutes'
      END,
      provider_attempt_started_at = CASE
        WHEN candidates.close_grace THEN NULL
        ELSE reminder.provider_attempt_started_at
      END,
      last_error_code = CASE
        WHEN candidates.close_grace
          THEN 'REMINDER_PROVIDER_RESULT_UNRESOLVED_AFTER_GRACE'
        ELSE 'REMINDER_PROVIDER_RESULT_PENDING_AFTER_RECONCILIATION'
      END
    FROM candidates
    WHERE reminder.id = candidates.id
    RETURNING 1
  )
  SELECT count(*)::integer INTO v_provider_count FROM reconciled;

  v_invalid_count := public.reconcile_booking_reminders_invalid_state_v2();
  RETURN v_provider_count + v_invalid_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_booking_reminders_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_reminders_v2()
  TO service_role;

COMMENT ON FUNCTION public.reconcile_booking_reminders_v2() IS
  'R42: gives unresolved provider results one five-minute late-receipt grace, then closes the fence without retrying delivery.';
COMMENT ON FUNCTION public.reconcile_booking_reminders_invalid_state_v2() IS
  'R42 private implementation: terminally classifies invalid pending reminders that have not entered provider I/O.';
