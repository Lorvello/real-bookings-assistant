-- R28: generation-fenced reminder pipeline v2.
--
-- Safety properties:
--   * production cron remains OFF until the v2 Edge function is deployed and verified;
--   * every claim has an opaque fencing token and a short lease;
--   * every booking schedule has a generation UUID, included in the provider idempotency key;
--   * reschedules keep prior-generation evidence instead of deleting it;
--   * a provider response is recorded as provider_accepted, never as delivered;
--   * eligibility-changing booking writes cannot pass a provider attempt already in flight;
--   * only one reminder is due for a late-created booking (the nearer reminder wins).

SELECT cron.unschedule('process-booking-reminders')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-booking-reminders'
);

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_generation uuid;

UPDATE public.bookings
SET reminder_generation = gen_random_uuid()
WHERE reminder_generation IS NULL;

ALTER TABLE public.bookings
  ALTER COLUMN reminder_generation SET DEFAULT gen_random_uuid(),
  ALTER COLUMN reminder_generation SET NOT NULL;

ALTER TABLE public.booking_reminders_sent
  ADD COLUMN IF NOT EXISTS schedule_generation uuid,
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_attempt_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_start_time_snapshot timestamptz,
  ADD COLUMN IF NOT EXISTS post_acceptance_state text;

UPDATE public.booking_reminders_sent AS reminder
SET
  schedule_generation = booking.reminder_generation,
  booking_start_time_snapshot = booking.start_time
FROM public.bookings AS booking
WHERE booking.id = reminder.booking_id
  AND reminder.schedule_generation IS NULL;

ALTER TABLE public.booking_reminders_sent
  ALTER COLUMN schedule_generation SET NOT NULL;

-- R22 inherited old `sent` rows without provider receipts. They are historical activity,
-- not proof that a real provider accepted or delivered anything.
UPDATE public.booking_reminders_sent
SET
  status = CASE
    WHEN NULLIF(trim(provider_message_id), '') IS NOT NULL
      THEN 'provider_accepted'
    ELSE 'legacy_unverified'
  END,
  sent_at = NULL,
  resolved_at = COALESCE(resolved_at, last_attempted_at, created_at),
  last_error_code = CASE
    WHEN NULLIF(trim(provider_message_id), '') IS NULL
      THEN 'LEGACY_DELIVERY_UNVERIFIED'
    ELSE last_error_code
  END
WHERE status = 'sent';

ALTER TABLE public.booking_reminders_sent
  DROP CONSTRAINT IF EXISTS booking_reminders_sent_status_check,
  ADD CONSTRAINT booking_reminders_sent_status_check CHECK (
    status IN (
      'provider_accepted',
      'delivered',
      'legacy_unverified',
      'recorded',
      'pending',
      'pending_template_approval',
      'invalid_phone_format',
      'booking_cancelled',
      'payment_refunded',
      'stripe_check_failed',
      'email_send_failed',
      'whatsapp_send_failed',
      'whatsapp_configuration_missing',
      'delivery_unknown',
      'no_contact_info',
      'superseded'
    )
  ),
  ADD CONSTRAINT booking_reminders_sent_claim_pair_check CHECK (
    (claim_token IS NULL AND claim_expires_at IS NULL)
    OR (claim_token IS NOT NULL AND claim_expires_at IS NOT NULL)
  ),
  ADD CONSTRAINT booking_reminders_sent_post_acceptance_check CHECK (
    post_acceptance_state IS NULL
    OR post_acceptance_state IN (
      'booking_cancelled',
      'payment_refunded',
      'schedule_superseded'
    )
  );

ALTER TABLE public.booking_reminders_sent
  DROP CONSTRAINT IF EXISTS booking_reminders_sent_booking_id_reminder_number_key;

ALTER TABLE public.booking_reminders_sent
  ADD CONSTRAINT booking_reminders_sent_booking_reminder_generation_key
  UNIQUE (booking_id, reminder_number, schedule_generation);

CREATE INDEX IF NOT EXISTS booking_reminders_active_claim_idx
  ON public.booking_reminders_sent (booking_id, schedule_generation, claim_expires_at)
  WHERE claim_token IS NOT NULL;

DROP TRIGGER IF EXISTS trg_reset_reminders_on_reschedule ON public.bookings;
DROP FUNCTION IF EXISTS public.reset_reminders_on_reschedule();

CREATE OR REPLACE FUNCTION public.guard_booking_reminder_generation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_sensitive_change boolean;
BEGIN
  v_sensitive_change :=
    OLD.start_time IS DISTINCT FROM NEW.start_time
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.payment_status IS DISTINCT FROM NEW.payment_status
    OR OLD.is_deleted IS DISTINCT FROM NEW.is_deleted;

  IF v_sensitive_change AND EXISTS (
    SELECT 1
    FROM public.booking_reminders_sent AS reminder
    WHERE reminder.booking_id = OLD.id
      AND reminder.schedule_generation = OLD.reminder_generation
      AND reminder.claim_token IS NOT NULL
      AND reminder.claim_expires_at > now()
      AND reminder.provider_attempt_started_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_ATTEMPT_IN_PROGRESS_RETRY'
      USING ERRCODE = '55000';
  END IF;

  IF OLD.start_time IS DISTINCT FROM NEW.start_time THEN
    NEW.reminder_generation := gen_random_uuid();
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_booking_reminder_generation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER trg_guard_booking_reminder_generation
  BEFORE UPDATE OF start_time, status, payment_status, is_deleted
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_booking_reminder_generation();

-- A provider acceptance remains immutable delivery evidence. If the booking is later
-- cancelled, refunded, or rescheduled, annotate that later business state instead of
-- rewriting the accepted event into a contradictory terminal status.
CREATE OR REPLACE FUNCTION public.annotate_booking_reminder_post_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_state text;
BEGIN
  v_state := CASE
    WHEN COALESCE(NEW.payment_status, '') IN ('refunded', 'partially_refunded')
      THEN 'payment_refunded'
    WHEN NEW.status <> 'confirmed' OR COALESCE(NEW.is_deleted, false)
      THEN 'booking_cancelled'
    WHEN OLD.start_time IS DISTINCT FROM NEW.start_time
      THEN 'schedule_superseded'
    ELSE NULL
  END;

  IF v_state IS NOT NULL THEN
    UPDATE public.booking_reminders_sent AS reminder
    SET
      post_acceptance_state = v_state,
      last_error_code = upper(v_state) || '_AFTER_PROVIDER_ACCEPTANCE'
    WHERE reminder.booking_id = NEW.id
      AND reminder.status IN ('provider_accepted', 'delivered')
      AND reminder.post_acceptance_state IS NULL;
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.annotate_booking_reminder_post_acceptance()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_annotate_booking_reminder_post_acceptance
  ON public.bookings;
CREATE TRIGGER trg_annotate_booking_reminder_post_acceptance
  AFTER UPDATE OF start_time, status, payment_status, is_deleted
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.annotate_booking_reminder_post_acceptance();

CREATE OR REPLACE FUNCTION public.reconcile_booking_reminders_v2()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH reconciled AS (
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
    FROM public.bookings AS booking
    JOIN public.calendar_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    WHERE reminder.booking_id = booking.id
      AND reminder.status = 'pending'
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

CREATE OR REPLACE FUNCTION public.get_due_booking_reminders_v2(
  p_booking_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(booking_id uuid, reminder_number smallint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  WITH eligible AS (
    SELECT
      booking.id,
      booking.start_time,
      booking.reminder_generation,
      settings.first_reminder_enabled,
      settings.first_reminder_timing_hours,
      settings.second_reminder_enabled,
      settings.second_reminder_timing_minutes,
      settings.second_reminder_enabled
        AND booking.start_time <= now()
          + make_interval(mins => settings.second_reminder_timing_minutes)
        AS second_is_due
    FROM public.bookings AS booking
    JOIN public.calendar_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    WHERE (p_booking_id IS NULL OR booking.id = p_booking_id)
      AND booking.status = 'confirmed'
      AND COALESCE(booking.is_deleted, false) = false
      AND booking.start_time > now()
      AND COALESCE(booking.payment_status, '') NOT IN ('refunded', 'partially_refunded')
      AND (
        COALESCE(booking.customer_email, '') <> ''
        OR COALESCE(booking.customer_phone, '') <> ''
      )
  ), candidates AS (
    SELECT eligible.id AS booking_id, 2::smallint AS reminder_number,
      eligible.start_time, eligible.reminder_generation
    FROM eligible
    WHERE eligible.second_is_due
    UNION ALL
    SELECT eligible.id, 1::smallint, eligible.start_time,
      eligible.reminder_generation
    FROM eligible
    WHERE NOT eligible.second_is_due
      AND eligible.first_reminder_enabled
      AND eligible.start_time <= now()
        + make_interval(hours => eligible.first_reminder_timing_hours)
  )
  SELECT candidate.booking_id, candidate.reminder_number
  FROM candidates AS candidate
  LEFT JOIN public.booking_reminders_sent AS reminder
    ON reminder.booking_id = candidate.booking_id
   AND reminder.reminder_number = candidate.reminder_number
   AND reminder.schedule_generation = candidate.reminder_generation
  WHERE reminder.id IS NULL
    OR reminder.status = 'pending'
    OR reminder.status IN ('payment_refunded', 'booking_cancelled', 'no_contact_info')
  ORDER BY candidate.start_time, candidate.booking_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 50);
$function$;

REVOKE ALL ON FUNCTION public.get_due_booking_reminders_v2(uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders_v2(uuid, integer)
  TO service_role;

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
  v_settings public.calendar_settings%ROWTYPE;
  v_existing public.booking_reminders_sent%ROWTYPE;
  v_token uuid := gen_random_uuid();
  v_channel text;
  v_timezone text;
  v_business_name text;
  v_locale text;
  v_due boolean;
  v_second_due boolean;
BEGIN
  IF p_reminder_number NOT IN (1, 2) THEN
    RAISE EXCEPTION 'REMINDER_NUMBER_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT booking.* INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT settings.* INTO v_settings
  FROM public.calendar_settings AS settings
  WHERE settings.calendar_id = v_booking.calendar_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_second_due := v_settings.second_reminder_enabled
    AND v_booking.start_time <= now()
      + make_interval(mins => v_settings.second_reminder_timing_minutes);
  v_due := CASE p_reminder_number
    WHEN 2 THEN v_second_due
    WHEN 1 THEN NOT v_second_due
      AND v_settings.first_reminder_enabled
      AND v_booking.start_time <= now()
        + make_interval(hours => v_settings.first_reminder_timing_hours)
    ELSE false
  END;

  IF NOT v_due
     OR v_booking.status <> 'confirmed'
     OR COALESCE(v_booking.is_deleted, false)
     OR v_booking.start_time <= now()
     OR COALESCE(v_booking.payment_status, '') IN ('refunded', 'partially_refunded') THEN
    RETURN;
  END IF;

  v_channel := CASE
    WHEN COALESCE(v_booking.customer_email, '') <> '' THEN 'email'
    WHEN COALESCE(v_booking.customer_phone, '') <> '' THEN 'whatsapp'
    ELSE NULL
  END;
  IF v_channel IS NULL THEN RETURN; END IF;

  SELECT reminder.* INTO v_existing
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.schedule_generation = v_booking.reminder_generation
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status IN ('payment_refunded', 'booking_cancelled', 'no_contact_info') THEN
      UPDATE public.booking_reminders_sent
      SET status = 'pending', resolved_at = NULL, last_error_code = NULL
      WHERE id = v_existing.id;
      v_existing.status := 'pending';
    END IF;
    IF v_existing.status <> 'pending'
       OR (
         v_existing.claim_token IS NOT NULL
         AND v_existing.claim_expires_at > now()
       ) THEN
      RETURN;
    END IF;

    UPDATE public.booking_reminders_sent
    SET
      claim_token = v_token,
      claim_expires_at = now() + interval '90 seconds',
      claimed_at = now(),
      provider_attempt_started_at = NULL,
      channel = v_channel,
      booking_start_time_snapshot = v_booking.start_time,
      delivery_key = NULL,
      resolved_at = NULL
    WHERE id = v_existing.id;
  ELSE
    INSERT INTO public.booking_reminders_sent (
      booking_id,
      reminder_number,
      schedule_generation,
      status,
      attempt_count,
      claim_token,
      claim_expires_at,
      claimed_at,
      channel,
      booking_start_time_snapshot,
      delivery_mode
    ) VALUES (
      p_booking_id,
      p_reminder_number,
      v_booking.reminder_generation,
      'pending',
      0,
      v_token,
      now() + interval '90 seconds',
      now(),
      v_channel,
      v_booking.start_time,
      'send'
    );
  END IF;

  SELECT COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  INTO v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.id = v_booking.calendar_id;

  SELECT COALESCE(NULLIF(overview.business_name, ''), 'het bedrijf')
  INTO v_business_name
  FROM public.business_overview AS overview
  WHERE overview.calendar_id = v_booking.calendar_id;
  v_business_name := COALESCE(v_business_name, 'het bedrijf');
  v_locale := CASE
    WHEN lower(COALESCE(v_booking.customer_locale, 'nl')) = 'en' THEN 'en'
    ELSE 'nl'
  END;

  RETURN QUERY SELECT
    v_token,
    v_booking.reminder_generation,
    COALESCE(v_existing.attempt_count, 0),
    'pending'::text,
    COALESCE(v_timezone, 'Europe/Amsterdam'),
    v_booking.customer_email,
    v_booking.customer_phone,
    v_booking.customer_name,
    v_locale,
    v_channel,
    v_booking.start_time,
    v_business_name,
    v_booking.calendar_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint)
  TO service_role;

CREATE OR REPLACE FUNCTION public.begin_booking_reminder_attempt_v2(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_schedule_generation uuid,
  p_claim_token uuid,
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
    'booking-reminder/%s/%s/%s/%s',
    p_booking_id, p_reminder_number, p_channel, p_schedule_generation
  );
  IF p_channel NOT IN ('email', 'whatsapp')
     OR p_delivery_mode NOT IN ('send', 'record-only')
     OR p_delivery_key IS DISTINCT FROM v_expected_key THEN
    RAISE EXCEPTION 'REMINDER_ATTEMPT_INVALID' USING ERRCODE = '22023';
  END IF;

  UPDATE public.booking_reminders_sent AS reminder
  SET
    status = CASE
      WHEN p_channel = 'whatsapp' AND p_delivery_mode = 'send'
        THEN 'delivery_unknown'
      ELSE 'pending'
    END,
    attempt_count = reminder.attempt_count + 1,
    last_attempted_at = now(),
    provider_attempt_started_at = now(),
    delivery_mode = p_delivery_mode,
    delivery_key = p_delivery_key,
    provider_message_id = NULL,
    provider_accepted_at = NULL,
    last_error_code = CASE
      WHEN p_channel = 'whatsapp' AND p_delivery_mode = 'send'
        THEN 'WHATSAPP_DELIVERY_OUTCOME_UNKNOWN'
      ELSE NULL
    END
  FROM public.bookings AS booking
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.schedule_generation = p_schedule_generation
    AND reminder.claim_token = p_claim_token
    AND reminder.claim_expires_at > now()
    AND reminder.status = 'pending'
    AND booking.id = reminder.booking_id
    AND booking.reminder_generation = p_schedule_generation
    AND booking.status = 'confirmed'
    AND COALESCE(booking.is_deleted, false) = false
    AND booking.start_time = reminder.booking_start_time_snapshot
    AND booking.start_time > now()
    AND COALESCE(booking.payment_status, '') NOT IN ('refunded', 'partially_refunded')
  RETURNING true INTO v_started;

  RETURN COALESCE(v_started, false);
END;
$function$;

REVOKE ALL ON FUNCTION public.begin_booking_reminder_attempt_v2(
  uuid, smallint, uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_booking_reminder_attempt_v2(
  uuid, smallint, uuid, uuid, text, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.record_booking_reminder_result_v2(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_schedule_generation uuid,
  p_claim_token uuid,
  p_provider_accepted boolean,
  p_max_attempts integer,
  p_failure_reason text,
  p_channel text,
  p_delivery_mode text,
  p_provider_message_id text,
  p_delivery_key text
)
RETURNS TABLE(attempt_count integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_row public.booking_reminders_sent%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_status text;
  v_expected_key text;
  v_post_acceptance_state text;
  v_attempt_count integer;
BEGIN
  IF p_reminder_number NOT IN (1, 2)
     OR p_max_attempts NOT BETWEEN 1 AND 100
     OR p_channel NOT IN ('email', 'whatsapp')
     OR p_delivery_mode NOT IN ('send', 'record-only') THEN
    RAISE EXCEPTION 'REMINDER_RESULT_INVALID' USING ERRCODE = '22023';
  END IF;
  v_expected_key := format(
    'booking-reminder/%s/%s/%s/%s',
    p_booking_id, p_reminder_number, p_channel, p_schedule_generation
  );
  IF p_delivery_key IS DISTINCT FROM v_expected_key THEN
    RAISE EXCEPTION 'REMINDER_DELIVERY_KEY_INVALID' USING ERRCODE = '22023';
  END IF;
  IF p_delivery_mode = 'record-only'
     AND (p_provider_accepted OR p_provider_message_id IS NOT NULL) THEN
    RAISE EXCEPTION 'REMINDER_RECORD_ONLY_RECEIPT_INVALID';
  END IF;
  IF p_delivery_mode = 'send'
     AND p_provider_accepted
     AND NULLIF(trim(p_provider_message_id), '') IS NULL THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_RECEIPT_REQUIRED';
  END IF;
  IF NOT p_provider_accepted AND p_provider_message_id IS NOT NULL THEN
    RAISE EXCEPTION 'REMINDER_PROVIDER_RECEIPT_UNEXPECTED';
  END IF;
  IF p_failure_reason IS NOT NULL AND p_failure_reason NOT IN (
    'stripe_refund_confirmed', 'stripe_check_failed', 'email_send_failed',
    'invalid_phone_format', 'meta_template_gated', 'whatsapp_send_failed',
    'whatsapp_delivery_unknown', 'whatsapp_configuration_missing'
  ) THEN
    RAISE EXCEPTION 'REMINDER_FAILURE_REASON_INVALID';
  END IF;

  SELECT reminder.* INTO v_row
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.schedule_generation = p_schedule_generation
  FOR UPDATE;
  IF NOT FOUND
     OR v_row.claim_token IS DISTINCT FROM p_claim_token THEN
    RAISE EXCEPTION 'REMINDER_RESULT_STALE_CLAIM';
  END IF;

  SELECT booking.* INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REMINDER_BOOKING_NOT_FOUND'; END IF;

  -- Provider begin normally increments the attempt. Pre-provider failures (Stripe
  -- verification/configuration) legitimately finalize without begin, so count them here.
  v_attempt_count := v_row.attempt_count + CASE
    WHEN v_row.provider_attempt_started_at IS NULL THEN 1
    ELSE 0
  END;

  IF p_provider_accepted THEN
    v_status := 'provider_accepted';
    v_post_acceptance_state := CASE
      WHEN v_booking.reminder_generation <> p_schedule_generation
        THEN 'schedule_superseded'
      WHEN COALESCE(v_booking.payment_status, '') IN ('refunded', 'partially_refunded')
        THEN 'payment_refunded'
      WHEN v_booking.status <> 'confirmed'
        OR COALESCE(v_booking.is_deleted, false)
        OR v_booking.start_time <= now()
        THEN 'booking_cancelled'
      ELSE NULL
    END;
  ELSE
    v_status := CASE
      WHEN v_booking.reminder_generation <> p_schedule_generation THEN 'superseded'
      WHEN COALESCE(v_booking.payment_status, '') IN ('refunded', 'partially_refunded')
        OR p_failure_reason = 'stripe_refund_confirmed' THEN 'payment_refunded'
      WHEN v_booking.status <> 'confirmed'
        OR COALESCE(v_booking.is_deleted, false)
        OR v_booking.start_time <= now()
        THEN 'booking_cancelled'
      WHEN p_delivery_mode = 'record-only' THEN 'recorded'
      WHEN p_failure_reason = 'invalid_phone_format' THEN 'invalid_phone_format'
      WHEN p_failure_reason = 'whatsapp_configuration_missing'
        THEN 'whatsapp_configuration_missing'
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
  END IF;

  UPDATE public.booking_reminders_sent AS reminder
  SET
    status = v_status,
    attempt_count = v_attempt_count,
    channel = p_channel,
    delivery_mode = p_delivery_mode,
    provider_message_id = CASE
      WHEN p_provider_accepted THEN p_provider_message_id
      ELSE reminder.provider_message_id
    END,
    provider_accepted_at = CASE
      WHEN p_provider_accepted THEN now()
      ELSE reminder.provider_accepted_at
    END,
    sent_at = NULL,
    resolved_at = CASE WHEN v_status = 'pending' THEN NULL ELSE now() END,
    post_acceptance_state = v_post_acceptance_state,
    last_error_code = CASE
      WHEN p_provider_accepted AND v_post_acceptance_state IS NOT NULL
        THEN upper(v_post_acceptance_state) || '_AFTER_PROVIDER_ACCEPTANCE'
      WHEN p_provider_accepted OR p_delivery_mode = 'record-only' THEN NULL
      WHEN p_failure_reason IS NULL THEN 'DELIVERY_NOT_ACCEPTED'
      ELSE upper(p_failure_reason)
    END,
    claim_token = NULL,
    claim_expires_at = NULL,
    provider_attempt_started_at = NULL
  WHERE reminder.id = v_row.id;

  RETURN QUERY SELECT v_attempt_count, v_status;
END;
$function$;

REVOKE ALL ON FUNCTION public.record_booking_reminder_result_v2(
  uuid, smallint, uuid, uuid, boolean, integer, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result_v2(
  uuid, smallint, uuid, uuid, boolean, integer, text, text, text, text, text
) TO service_role;

-- Keep v1 identities discoverable during the rollout, but make them inert and remove even
-- service-role execution. An old Edge deployment must fail before provider I/O instead of
-- continuing against a half-upgraded schema.
CREATE OR REPLACE FUNCTION public.get_due_booking_reminders()
RETURNS TABLE(
  booking_id uuid, reminder_number smallint, channel text,
  customer_email text, customer_phone text, customer_name text,
  customer_locale text, start_time timestamptz, business_name text,
  calendar_id uuid, calendar_timezone text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT
    NULL::uuid, NULL::smallint, NULL::text, NULL::text, NULL::text,
    NULL::text, NULL::text, NULL::timestamptz, NULL::text, NULL::uuid,
    NULL::text
  WHERE false;
$function$;

CREATE OR REPLACE FUNCTION public.claim_booking_reminder(
  p_booking_id uuid, p_reminder_number smallint
)
RETURNS TABLE(
  attempt_count integer, status text, calendar_timezone text,
  customer_email text, customer_phone text, customer_name text, channel text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RAISE EXCEPTION 'REMINDER_PIPELINE_V1_RETIRED';
END;
$function$;

REVOKE ALL ON FUNCTION public.get_due_booking_reminders()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.begin_booking_reminder_provider_attempt(
  uuid, smallint, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(
  uuid, smallint, boolean, integer, text, text, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_due_booking_reminders_v2(uuid, integer) IS
  'R28: bounded current-generation reminder candidates. At most one reminder per booking is due; the nearer second reminder supersedes the first for late bookings.';
COMMENT ON FUNCTION public.claim_booking_reminder_v2(uuid, smallint) IS
  'R28: service-only token-fenced claim returning a fresh complete payload and schedule generation.';
COMMENT ON FUNCTION public.begin_booking_reminder_attempt_v2(
  uuid, smallint, uuid, uuid, text, text, text
) IS 'R28: validates claim token plus booking generation immediately before provider I/O and starts one counted attempt.';
COMMENT ON FUNCTION public.record_booking_reminder_result_v2(
  uuid, smallint, uuid, uuid, boolean, integer, text, text, text, text, text
) IS 'R28: token-fenced outcome ledger. Provider acceptance is not delivery; sent_at remains null until a future provider-delivery webhook confirms it.';

COMMENT ON EXTENSION pg_cron IS
  'R28 reminder pipeline v2 is intentionally quiesced. Human activation is required only after DB migration, v2 Edge deployment, local/TEST contract evidence, Vault URL/secret verification, and a rollback-ready canary.';
