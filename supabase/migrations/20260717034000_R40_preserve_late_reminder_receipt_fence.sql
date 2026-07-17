-- R40: reconciliation may classify an expired provider attempt, but it must not
-- destroy the token/key needed to attach a late authoritative provider receipt.

CREATE OR REPLACE FUNCTION public.reconcile_booking_reminders_v2()
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
      AND (
        reminder.provider_attempt_started_at IS NULL
        OR reminder.claim_expires_at <= now()
      )
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
        -- The external provider may already have accepted this delivery. Park the
        -- row visibly, but preserve its exact result fence for a late receipt.
        WHEN reminder.provider_attempt_started_at IS NOT NULL
          AND reminder.delivery_mode = 'send'
          THEN 'delivery_unknown'
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
      claim_token = CASE
        WHEN reminder.provider_attempt_started_at IS NOT NULL
          AND reminder.delivery_mode = 'send'
          THEN reminder.claim_token
        ELSE NULL
      END,
      claim_expires_at = CASE
        WHEN reminder.provider_attempt_started_at IS NOT NULL
          AND reminder.delivery_mode = 'send'
          THEN reminder.claim_expires_at
        ELSE NULL
      END,
      provider_attempt_started_at = CASE
        WHEN reminder.provider_attempt_started_at IS NOT NULL
          AND reminder.delivery_mode = 'send'
          THEN reminder.provider_attempt_started_at
        ELSE NULL
      END,
      last_error_code = CASE
        WHEN reminder.provider_attempt_started_at IS NOT NULL
          AND reminder.delivery_mode = 'send'
          THEN 'REMINDER_PROVIDER_RESULT_PENDING_AFTER_RECONCILIATION'
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

REVOKE ALL ON FUNCTION public.reconcile_booking_reminders_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_reminders_v2()
  TO service_role;

COMMENT ON FUNCTION public.reconcile_booking_reminders_v2() IS
  'R40: terminally classifies stale reminders while preserving the exact fence for any in-flight provider result.';
