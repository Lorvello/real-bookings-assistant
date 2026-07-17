-- R22: truthful, retry-safe reminder delivery ledger.
--
-- Reproduced before this migration:
--   * a successful first reminder remained attempt_count=0;
--   * sent_at was populated at claim time, before any provider accepted the message;
--   * Resend retries had no stable provider idempotency key or provider receipt;
--   * a successful provider call followed by a failed result RPC could be retried;
--   * request-controlled WhatsApp stubbing could write a false production `sent` row.
--
-- Email retries are provider-idempotent. WhatsApp Cloud API has no equivalent exact replay
-- key in this integration, so a real Meta attempt is pessimistically parked as
-- delivery_unknown immediately before the network call. A known response finalizes it. A
-- crash or failed DB finalization leaves it terminal and visible for human reconciliation,
-- preventing an automatic duplicate customer message.

-- Quiesce the legacy sender before changing any RPC contract. R23 validates the
-- environment-isolated activation shape but deliberately keeps cron off; activation is a
-- later human gate after the matching Edge/RPC version and rollback canary are verified.
SELECT cron.unschedule('process-booking-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-booking-reminders'
);

ALTER TABLE public.booking_reminders_sent
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'send',
  ADD COLUMN IF NOT EXISTS delivery_key text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_error_code text;

UPDATE public.booking_reminders_sent
SET
  created_at = COALESCE(sent_at, created_at),
  last_attempted_at = COALESCE(last_attempted_at, sent_at),
  resolved_at = CASE
    WHEN status <> 'pending' THEN COALESCE(resolved_at, sent_at)
    ELSE resolved_at
  END;

ALTER TABLE public.booking_reminders_sent
  ALTER COLUMN sent_at DROP NOT NULL,
  ALTER COLUMN sent_at DROP DEFAULT;

UPDATE public.booking_reminders_sent
SET sent_at = NULL
WHERE status <> 'sent';

ALTER TABLE public.booking_reminders_sent
  DROP CONSTRAINT IF EXISTS booking_reminders_sent_status_check,
  ADD CONSTRAINT booking_reminders_sent_status_check CHECK (
    status IN (
      'sent',
      'recorded',
      'pending',
      'pending_template_approval',
      'invalid_phone_format',
      'booking_cancelled',
      'payment_refunded',
      'stripe_check_failed',
      'email_send_failed',
      'whatsapp_send_failed',
      'delivery_unknown',
      'no_contact_info'
    )
  ),
  ADD CONSTRAINT booking_reminders_sent_delivery_mode_check CHECK (
    delivery_mode IN ('send', 'record-only')
  ),
  ADD CONSTRAINT booking_reminders_sent_delivery_key_check CHECK (
    delivery_key IS NULL OR (
      length(delivery_key) BETWEEN 20 AND 200
      AND delivery_key !~ '[[:cntrl:]]'
    )
  ),
  ADD CONSTRAINT booking_reminders_sent_record_only_receipt_check CHECK (
    delivery_mode <> 'record-only'
    OR (provider_message_id IS NULL AND provider_accepted_at IS NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS booking_reminders_sent_delivery_key_uidx
  ON public.booking_reminders_sent (delivery_key)
  WHERE delivery_key IS NOT NULL;

-- The dashboard is intentionally owner/member-readable through RLS. A prior global table
-- privilege baseline removed the authenticated table-level SELECT grant, so Postgres rejected
-- the query before RLS could scope it. Restore SELECT only; all mutations remain service-only.
REVOKE ALL ON TABLE public.booking_reminders_sent FROM anon;
GRANT SELECT ON TABLE public.booking_reminders_sent TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.begin_booking_reminder_provider_attempt(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_channel text,
  p_delivery_mode text,
  p_delivery_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_started boolean := false;
  v_expected_key text;
BEGIN
  v_expected_key := format(
    'booking-reminder/%s/%s/%s',
    p_booking_id,
    p_reminder_number,
    p_channel
  );

  IF p_channel <> 'whatsapp'
     OR p_delivery_mode <> 'send'
     OR p_delivery_key IS DISTINCT FROM v_expected_key THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_ATTEMPT_INVALID';
  END IF;

  UPDATE public.booking_reminders_sent AS reminder
  SET
    status = 'delivery_unknown',
    attempt_count = reminder.attempt_count + 1,
    last_attempted_at = now(),
    resolved_at = now(),
    delivery_mode = p_delivery_mode,
    delivery_key = p_delivery_key,
    provider_message_id = NULL,
    provider_accepted_at = NULL,
    last_error_code = 'WHATSAPP_DELIVERY_OUTCOME_UNKNOWN'
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.status = 'pending'
    AND reminder.channel = p_channel
    AND reminder.claimed_at IS NOT NULL
    AND reminder.claimed_at > now() - interval '3 minutes'
    AND EXISTS (
      SELECT 1
      FROM public.bookings AS booking
      WHERE booking.id = reminder.booking_id
        AND booking.status = 'confirmed'
        AND COALESCE(booking.is_deleted, false) = false
        AND booking.start_time > now()
        AND COALESCE(booking.payment_status, '') <> 'refunded'
    )
  RETURNING true INTO v_started;

  RETURN COALESCE(v_started, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_booking_reminder_provider_attempt(
  uuid, smallint, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_booking_reminder_provider_attempt(
  uuid, smallint, text, text, text
) TO service_role;

DROP FUNCTION IF EXISTS public.record_booking_reminder_result(
  uuid, smallint, boolean, integer, text, text
);

CREATE FUNCTION public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer,
  p_failure_reason text DEFAULT NULL,
  p_channel text DEFAULT NULL,
  p_delivery_mode text DEFAULT 'send',
  p_provider_message_id text DEFAULT NULL,
  p_delivery_key text DEFAULT NULL
)
RETURNS TABLE(attempt_count integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.booking_reminders_sent%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_expected_key text;
  v_attempt_count integer;
  v_status text;
  v_eligible boolean;
  v_refunded boolean;
BEGIN
  IF p_reminder_number NOT IN (1, 2)
     OR p_max_attempts NOT BETWEEN 1 AND 100
     OR p_channel NOT IN ('email', 'whatsapp')
     OR p_delivery_mode NOT IN ('send', 'record-only') THEN
    RAISE EXCEPTION 'REMINDER_RESULT_INVALID';
  END IF;

  v_expected_key := format(
    'booking-reminder/%s/%s/%s',
    p_booking_id,
    p_reminder_number,
    p_channel
  );
  IF p_delivery_key IS DISTINCT FROM v_expected_key THEN
    RAISE EXCEPTION 'REMINDER_DELIVERY_KEY_INVALID';
  END IF;
  IF p_delivery_mode = 'record-only'
     AND (p_delivered OR p_provider_message_id IS NOT NULL) THEN
    RAISE EXCEPTION 'REMINDER_RECORD_ONLY_RECEIPT_INVALID';
  END IF;
  IF p_delivery_mode = 'send'
     AND p_delivered
     AND NULLIF(trim(p_provider_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_RECEIPT_REQUIRED';
  END IF;
  IF NOT p_delivered AND p_provider_message_id IS NOT NULL THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_RECEIPT_UNEXPECTED';
  END IF;
  IF p_failure_reason IS NOT NULL AND p_failure_reason NOT IN (
    'stripe_refund_confirmed',
    'stripe_check_failed',
    'email_send_failed',
    'invalid_phone_format',
    'meta_template_gated',
    'whatsapp_send_failed',
    'whatsapp_delivery_unknown'
  ) THEN
    RAISE EXCEPTION 'REMINDER_FAILURE_REASON_INVALID';
  END IF;

  SELECT reminder.*
  INTO v_row
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REMINDER_RESULT_WITHOUT_CLAIM';
  END IF;

  IF v_row.status IN (
    'sent',
    'recorded',
    'pending_template_approval',
    'invalid_phone_format',
    'booking_cancelled',
    'payment_refunded',
    'stripe_check_failed',
    'email_send_failed',
    'whatsapp_send_failed',
    'no_contact_info'
  ) THEN
    IF v_row.delivery_key = p_delivery_key
       AND (
         (v_row.status = 'sent' AND p_delivered AND p_delivery_mode = 'send')
         OR (v_row.status = 'recorded' AND p_delivery_mode = 'record-only')
       ) THEN
      RETURN QUERY SELECT v_row.attempt_count, v_row.status;
      RETURN;
    END IF;
    RAISE EXCEPTION 'REMINDER_RESULT_CONFLICT';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REMINDER_BOOKING_NOT_FOUND';
  END IF;

  v_eligible := v_booking.status = 'confirmed'
    AND COALESCE(v_booking.is_deleted, false) = false
    AND v_booking.start_time > now();
  v_refunded := COALESCE(v_booking.payment_status, '') = 'refunded';
  v_attempt_count := v_row.attempt_count + CASE
    WHEN v_row.status = 'delivery_unknown' THEN 0
    ELSE 1
  END;

  v_status := CASE
    WHEN v_refunded OR p_failure_reason = 'stripe_refund_confirmed'
      THEN 'payment_refunded'
    WHEN NOT v_eligible THEN 'booking_cancelled'
    WHEN p_delivery_mode = 'record-only' THEN 'recorded'
    WHEN p_delivered THEN 'sent'
    WHEN p_failure_reason = 'invalid_phone_format' THEN 'invalid_phone_format'
    WHEN p_failure_reason = 'whatsapp_delivery_unknown' THEN 'delivery_unknown'
    WHEN p_failure_reason = 'stripe_check_failed'
         AND v_attempt_count >= p_max_attempts THEN 'stripe_check_failed'
    WHEN p_failure_reason = 'email_send_failed'
         AND v_attempt_count >= p_max_attempts THEN 'email_send_failed'
    WHEN p_failure_reason = 'whatsapp_send_failed'
         AND v_attempt_count >= p_max_attempts THEN 'whatsapp_send_failed'
    WHEN v_attempt_count >= p_max_attempts THEN 'pending_template_approval'
    ELSE 'pending'
  END;

  UPDATE public.booking_reminders_sent AS reminder
  SET
    status = v_status,
    attempt_count = v_attempt_count,
    channel = p_channel,
    delivery_mode = p_delivery_mode,
    delivery_key = p_delivery_key,
    provider_message_id = CASE
      WHEN p_delivered THEN p_provider_message_id
      ELSE reminder.provider_message_id
    END,
    provider_accepted_at = CASE
      WHEN p_delivered THEN now()
      ELSE reminder.provider_accepted_at
    END,
    sent_at = CASE
      WHEN p_delivered THEN now()
      ELSE reminder.sent_at
    END,
    last_attempted_at = now(),
    resolved_at = CASE WHEN v_status = 'pending' THEN NULL ELSE now() END,
    last_error_code = CASE
      WHEN p_delivered OR p_delivery_mode = 'record-only' THEN NULL
      WHEN p_failure_reason IS NULL THEN 'DELIVERY_NOT_ACCEPTED'
      ELSE upper(p_failure_reason)
    END
  WHERE reminder.id = v_row.id;

  RETURN QUERY SELECT v_attempt_count, v_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_booking_reminder_result(
  uuid, smallint, boolean, integer, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(
  uuid, smallint, boolean, integer, text, text, text, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.get_due_booking_reminders()
RETURNS TABLE(
  booking_id uuid,
  reminder_number smallint,
  channel text,
  customer_email text,
  customer_phone text,
  customer_name text,
  customer_locale text,
  start_time timestamptz,
  business_name text,
  calendar_id uuid,
  calendar_timezone text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH due AS (
    SELECT
      booking.id,
      booking.customer_email,
      booking.customer_phone,
      booking.customer_name,
      booking.customer_locale,
      booking.start_time,
      booking.calendar_id,
      booking.payment_status,
      settings.first_reminder_enabled,
      settings.first_reminder_timing_hours,
      settings.second_reminder_enabled,
      settings.second_reminder_timing_minutes,
      COALESCE(overview.business_name, 'het bedrijf') AS business_name,
      COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam') AS calendar_timezone,
      CASE
        WHEN booking.customer_email IS NOT NULL AND booking.customer_email <> '' THEN 'email'
        WHEN booking.customer_phone IS NOT NULL AND booking.customer_phone <> '' THEN 'whatsapp'
        ELSE NULL
      END AS channel,
      CASE
        WHEN lower(COALESCE(booking.customer_locale, 'nl')) = 'en' THEN 'en'
        ELSE 'nl'
      END AS locale_norm
    FROM public.bookings AS booking
    JOIN public.calendar_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    LEFT JOIN public.business_overview AS overview
      ON overview.calendar_id = booking.calendar_id
    LEFT JOIN public.calendars AS calendar
      ON calendar.id = booking.calendar_id
    WHERE booking.status = 'confirmed'
      AND COALESCE(booking.is_deleted, false) = false
      AND booking.start_time > now()
      AND COALESCE(booking.payment_status, '') <> 'refunded'
      AND (
        COALESCE(booking.customer_email, '') <> ''
        OR COALESCE(booking.customer_phone, '') <> ''
      )
  )
  SELECT
    due.id,
    1::smallint,
    due.channel,
    due.customer_email,
    due.customer_phone,
    due.customer_name,
    due.locale_norm,
    due.start_time,
    due.business_name,
    due.calendar_id,
    due.calendar_timezone
  FROM due
  WHERE due.channel IS NOT NULL
    AND due.first_reminder_enabled
    AND due.start_time <= now() + make_interval(hours => due.first_reminder_timing_hours)
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_reminders_sent AS reminder
      WHERE reminder.booking_id = due.id
        AND reminder.reminder_number = 1
        AND (
          reminder.status IN (
            'sent', 'recorded', 'pending_template_approval',
            'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed',
            'email_send_failed', 'whatsapp_send_failed', 'delivery_unknown',
            'no_contact_info'
          )
          OR (
            reminder.status = 'payment_refunded'
            AND COALESCE(due.payment_status, '') = 'refunded'
          )
        )
    )
  UNION ALL
  SELECT
    due.id,
    2::smallint,
    due.channel,
    due.customer_email,
    due.customer_phone,
    due.customer_name,
    due.locale_norm,
    due.start_time,
    due.business_name,
    due.calendar_id,
    due.calendar_timezone
  FROM due
  WHERE due.channel IS NOT NULL
    AND due.second_reminder_enabled
    AND due.start_time <= now() + make_interval(mins => due.second_reminder_timing_minutes)
    AND NOT EXISTS (
      SELECT 1
      FROM public.booking_reminders_sent AS reminder
      WHERE reminder.booking_id = due.id
        AND reminder.reminder_number = 2
        AND (
          reminder.status IN (
            'sent', 'recorded', 'pending_template_approval',
            'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed',
            'email_send_failed', 'whatsapp_send_failed', 'delivery_unknown',
            'no_contact_info'
          )
          OR (
            reminder.status = 'payment_refunded'
            AND COALESCE(due.payment_status, '') = 'refunded'
          )
        )
    )
  UNION ALL
  SELECT
    reminder.booking_id,
    reminder.reminder_number,
    NULL::text,
    booking.customer_email,
    booking.customer_phone,
    booking.customer_name,
    CASE
      WHEN lower(COALESCE(booking.customer_locale, 'nl')) = 'en' THEN 'en'
      ELSE 'nl'
    END,
    booking.start_time,
    COALESCE(overview.business_name, 'het bedrijf'),
    booking.calendar_id,
    COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  FROM public.booking_reminders_sent AS reminder
  JOIN public.bookings AS booking ON booking.id = reminder.booking_id
  LEFT JOIN public.business_overview AS overview
    ON overview.calendar_id = booking.calendar_id
  LEFT JOIN public.calendars AS calendar
    ON calendar.id = booking.calendar_id
  WHERE reminder.status = 'pending'
    AND COALESCE(booking.customer_email, '') = ''
    AND COALESCE(booking.customer_phone, '') = '';
$function$;

REVOKE ALL ON FUNCTION public.get_due_booking_reminders()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders()
  TO service_role;

COMMENT ON FUNCTION public.begin_booking_reminder_provider_attempt(
  uuid, smallint, text, text, text
) IS 'R22: service-only WhatsApp at-most-once guard. Persists a delivery_unknown terminal state immediately before the external Meta request so an accepted send followed by a process/DB failure is never automatically duplicated.';

COMMENT ON FUNCTION public.record_booking_reminder_result(
  uuid, smallint, boolean, integer, text, text, text, text, text
) IS 'R22: atomic reminder outcome ledger. Counts every actual attempt, distinguishes local record-only evidence from delivery, stores stable delivery identity and provider receipt, and supports exact success replay without duplicate state.';
