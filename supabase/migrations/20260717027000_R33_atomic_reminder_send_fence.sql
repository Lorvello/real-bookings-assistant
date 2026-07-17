-- R33: close the remaining reminder send-time races found by independent review.
--
-- The provider call cannot share a transaction with Postgres. The safe boundary is:
--   1. claim a short lease and capture an immutable recipient/presentation snapshot;
--   2. immediately before provider I/O, lock and revalidate the booking/settings plus snapshot;
--   3. persist the provider-attempt marker before releasing those locks;
--   4. reject eligibility/contact writes while that short marker is active.
-- Provider delivery remains a separate webhook truth; provider acceptance never means delivered.

ALTER TABLE public.booking_reminders_sent
  ADD COLUMN IF NOT EXISTS recipient_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_name_snapshot text,
  ADD COLUMN IF NOT EXISTS customer_locale_snapshot text,
  ADD COLUMN IF NOT EXISTS calendar_timezone_snapshot text,
  ADD COLUMN IF NOT EXISTS business_name_snapshot text;

UPDATE public.booking_reminders_sent AS reminder
SET
  recipient_snapshot = CASE reminder.channel
    WHEN 'email' THEN booking.customer_email
    WHEN 'whatsapp' THEN booking.customer_phone
    ELSE NULL
  END,
  customer_name_snapshot = booking.customer_name,
  customer_locale_snapshot = CASE
    WHEN lower(COALESCE(booking.customer_locale, 'nl')) = 'en' THEN 'en'
    ELSE 'nl'
  END,
  calendar_timezone_snapshot = COALESCE(
    NULLIF(calendar.timezone, ''),
    'Europe/Amsterdam'
  ),
  business_name_snapshot = COALESCE(
    NULLIF(overview.business_name, ''),
    'het bedrijf'
  )
FROM public.bookings AS booking
JOIN public.calendars AS calendar
  ON calendar.id = booking.calendar_id
LEFT JOIN LATERAL (
  SELECT business.business_name
  FROM public.business_overview AS business
  WHERE business.calendar_id = booking.calendar_id
  ORDER BY business.last_updated DESC NULLS LAST
  LIMIT 1
) AS overview ON true
WHERE reminder.booking_id = booking.id
  AND (
    reminder.recipient_snapshot IS NULL
    OR reminder.customer_name_snapshot IS NULL
    OR reminder.customer_locale_snapshot IS NULL
    OR reminder.calendar_timezone_snapshot IS NULL
    OR reminder.business_name_snapshot IS NULL
  );

CREATE OR REPLACE FUNCTION public.capture_booking_reminder_claim_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_timezone text;
  v_business_name text;
  v_channel text;
BEGIN
  -- Result/reconciliation writes clear the token; they must never rewrite evidence.
  IF TG_OP = 'UPDATE' AND NEW.claim_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Once any attempt was counted or keyed, keep the original channel and payload. This
  -- prevents a lost-result retry from switching email <-> WhatsApp and acquiring a new key.
  IF TG_OP = 'UPDATE'
     AND (
       COALESCE(OLD.attempt_count, 0) > 0
       OR OLD.delivery_key IS NOT NULL
       OR OLD.provider_attempt_started_at IS NOT NULL
     ) THEN
    NEW.channel := OLD.channel;
    NEW.recipient_snapshot := OLD.recipient_snapshot;
    NEW.customer_name_snapshot := OLD.customer_name_snapshot;
    NEW.customer_locale_snapshot := OLD.customer_locale_snapshot;
    NEW.calendar_timezone_snapshot := OLD.calendar_timezone_snapshot;
    NEW.business_name_snapshot := OLD.business_name_snapshot;
    RETURN NEW;
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = NEW.booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REMINDER_BOOKING_NOT_FOUND';
  END IF;

  v_channel := CASE
    WHEN COALESCE(v_booking.customer_email, '') <> '' THEN 'email'
    WHEN COALESCE(v_booking.customer_phone, '') <> '' THEN 'whatsapp'
    ELSE NULL
  END;

  SELECT COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  INTO v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.id = v_booking.calendar_id;

  SELECT COALESCE(NULLIF(business.business_name, ''), 'het bedrijf')
  INTO v_business_name
  FROM public.business_overview AS business
  WHERE business.calendar_id = v_booking.calendar_id
  ORDER BY business.last_updated DESC NULLS LAST
  LIMIT 1;

  NEW.channel := v_channel;
  NEW.recipient_snapshot := CASE v_channel
    WHEN 'email' THEN v_booking.customer_email
    WHEN 'whatsapp' THEN v_booking.customer_phone
    ELSE NULL
  END;
  NEW.customer_name_snapshot := v_booking.customer_name;
  NEW.customer_locale_snapshot := CASE
    WHEN lower(COALESCE(v_booking.customer_locale, 'nl')) = 'en' THEN 'en'
    ELSE 'nl'
  END;
  NEW.calendar_timezone_snapshot := COALESCE(v_timezone, 'Europe/Amsterdam');
  NEW.business_name_snapshot := COALESCE(v_business_name, 'het bedrijf');
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.capture_booking_reminder_claim_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_capture_booking_reminder_claim_snapshot
  ON public.booking_reminders_sent;
CREATE TRIGGER trg_capture_booking_reminder_claim_snapshot
  BEFORE INSERT OR UPDATE OF claim_token, claimed_at
  ON public.booking_reminders_sent
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_booking_reminder_claim_snapshot();

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
    OR OLD.is_deleted IS DISTINCT FROM NEW.is_deleted
    OR OLD.customer_email IS DISTINCT FROM NEW.customer_email
    OR OLD.customer_phone IS DISTINCT FROM NEW.customer_phone
    OR OLD.customer_name IS DISTINCT FROM NEW.customer_name
    OR OLD.customer_locale IS DISTINCT FROM NEW.customer_locale;

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

DROP TRIGGER IF EXISTS trg_guard_booking_reminder_generation ON public.bookings;
CREATE TRIGGER trg_guard_booking_reminder_generation
  BEFORE UPDATE OF
    start_time, status, payment_status, is_deleted,
    customer_email, customer_phone, customer_name, customer_locale
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_booking_reminder_generation();

CREATE OR REPLACE FUNCTION public.guard_booking_reminder_evidence_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.booking_reminders_sent AS reminder
    WHERE reminder.booking_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'BOOKING_REMINDER_EVIDENCE_REQUIRES_SOFT_DELETE'
      USING ERRCODE = '55000';
  END IF;
  RETURN OLD;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_booking_reminder_evidence_delete()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_guard_booking_reminder_evidence_delete
  ON public.bookings;
CREATE TRIGGER trg_guard_booking_reminder_evidence_delete
  BEFORE DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_booking_reminder_evidence_delete();

CREATE INDEX IF NOT EXISTS booking_reminders_pending_reconcile_idx
  ON public.booking_reminders_sent (claim_expires_at, created_at, id)
  WHERE status = 'pending';

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
      -- An active provider attempt is protected. Once its lease expired, provider timeouts
      -- are already bounded below that lease and email retries retain the same provider key.
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

REVOKE ALL ON FUNCTION public.reconcile_booking_reminders_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_reminders_v2()
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
  v_booking public.bookings%ROWTYPE;
  v_settings public.calendar_settings%ROWTYPE;
  v_reminder public.booking_reminders_sent%ROWTYPE;
  v_expected_key text;
  v_channel text;
  v_recipient text;
  v_locale text;
  v_timezone text;
  v_business_name text;
  v_second_due boolean;
  v_due boolean;
  v_snapshot_matches boolean;
  v_retryable_refresh boolean;
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

  -- Booking first is the canonical lock order. Booking UPDATE/DELETE takes the same row lock;
  -- whichever transaction wins is observed before provider I/O, never concurrently committed.
  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT settings.*
  INTO v_settings
  FROM public.calendar_settings AS settings
  WHERE settings.calendar_id = v_booking.calendar_id
  FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT reminder.*
  INTO v_reminder
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.schedule_generation = p_schedule_generation
  FOR UPDATE;
  IF NOT FOUND
     OR v_reminder.claim_token IS DISTINCT FROM p_claim_token
     OR v_reminder.claim_expires_at <= now()
     OR v_reminder.status <> 'pending' THEN
    RETURN false;
  END IF;

  v_channel := CASE
    WHEN COALESCE(v_booking.customer_email, '') <> '' THEN 'email'
    WHEN COALESCE(v_booking.customer_phone, '') <> '' THEN 'whatsapp'
    ELSE NULL
  END;
  v_recipient := CASE v_channel
    WHEN 'email' THEN v_booking.customer_email
    WHEN 'whatsapp' THEN v_booking.customer_phone
    ELSE NULL
  END;
  v_locale := CASE
    WHEN lower(COALESCE(v_booking.customer_locale, 'nl')) = 'en' THEN 'en'
    ELSE 'nl'
  END;

  SELECT COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  INTO v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.id = v_booking.calendar_id
    AND calendar.is_active IS TRUE
    AND COALESCE(calendar.is_deleted, false) = false
  FOR SHARE;

  SELECT COALESCE(NULLIF(business.business_name, ''), 'het bedrijf')
  INTO v_business_name
  FROM public.business_overview AS business
  WHERE business.calendar_id = v_booking.calendar_id
  ORDER BY business.last_updated DESC NULLS LAST
  LIMIT 1;
  v_business_name := COALESCE(v_business_name, 'het bedrijf');

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

  v_snapshot_matches :=
    v_reminder.channel IS NOT DISTINCT FROM v_channel
    AND v_reminder.recipient_snapshot IS NOT DISTINCT FROM v_recipient
    AND v_reminder.customer_name_snapshot IS NOT DISTINCT FROM v_booking.customer_name
    AND v_reminder.customer_locale_snapshot IS NOT DISTINCT FROM v_locale
    AND v_reminder.calendar_timezone_snapshot IS NOT DISTINCT FROM COALESCE(
      v_timezone,
      'Europe/Amsterdam'
    )
    AND v_reminder.business_name_snapshot IS NOT DISTINCT FROM v_business_name;

  IF NOT v_due
     OR v_booking.reminder_generation <> p_schedule_generation
     OR v_booking.status <> 'confirmed'
     OR COALESCE(v_booking.is_deleted, false)
     OR v_booking.start_time IS DISTINCT FROM v_reminder.booking_start_time_snapshot
     OR v_booking.start_time <= now()
     OR COALESCE(v_booking.payment_status, '') IN ('refunded', 'partially_refunded')
     OR v_channel IS NULL
     OR v_timezone IS NULL
     OR NOT v_snapshot_matches
     OR p_channel IS DISTINCT FROM v_channel THEN
    -- Before any provider attempt, a stale claim may refresh safely on the next invocation.
    -- Once an attempt/key exists, park it: automatic channel/key switching could duplicate.
    v_retryable_refresh := NOT v_snapshot_matches
      AND v_reminder.attempt_count = 0
      AND v_reminder.delivery_key IS NULL
      AND v_reminder.provider_attempt_started_at IS NULL;
    UPDATE public.booking_reminders_sent
    SET
      status = CASE WHEN v_retryable_refresh THEN 'pending' ELSE 'superseded' END,
      resolved_at = CASE WHEN v_retryable_refresh THEN NULL ELSE now() END,
      claim_token = NULL,
      claim_expires_at = NULL,
      provider_attempt_started_at = NULL,
      last_error_code = CASE
        WHEN v_retryable_refresh THEN 'REMINDER_SNAPSHOT_STALE_RETRY'
        WHEN NOT v_snapshot_matches THEN 'REMINDER_SNAPSHOT_CHANGED_AFTER_ATTEMPT'
        ELSE 'REMINDER_NOT_ELIGIBLE_AT_PROVIDER_BEGIN'
      END
    WHERE id = v_reminder.id;
    RETURN false;
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
  WHERE reminder.id = v_reminder.id;

  RETURN true;
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

-- Retire every v1 mutation/read path for mixed-version safety. Old Edge code now fails at
-- its first RPC before it can reach provider I/O, including an invocation already in flight.
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

COMMENT ON FUNCTION public.begin_booking_reminder_attempt_v2(
  uuid, smallint, uuid, uuid, text, text, text
) IS 'R33: booking-first transaction lock plus fresh eligibility/contact/settings snapshot validation immediately before provider I/O.';
COMMENT ON FUNCTION public.reconcile_booking_reminders_v2() IS
  'R33: bounded stale-claim reconciliation, including expired started email attempts; active provider leases remain fenced.';
COMMENT ON EXTENSION pg_cron IS
  'R33 reminder pipeline remains intentionally quiesced pending matching DB/Edge deployment, local/TEST evidence, Vault verification, rollback canary, and human activation.';
