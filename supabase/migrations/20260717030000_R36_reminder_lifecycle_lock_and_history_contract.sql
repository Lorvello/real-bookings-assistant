-- R36: close the remaining reminder lifecycle races found by the independent R33 review.
--
-- 1. Calendar deletion previously cascaded to bookings, but R33 rejected every booking
--    delete once any reminder evidence existed. The owner-facing calendar delete action was
--    therefore permanently broken. Historical reminder rows may now cascade with an
--    intentional hard delete; only a genuinely active provider attempt is fenced.
-- 2. Provider begin and provider result now take locks in parent-to-child order:
--    calendar -> booking -> reminder. This matches calendar deletion and makes a late result
--    serialize with cancellation/refund/reschedule even after its claim lease has expired.
-- 3. The production reschedule RPC temporarily sets status=cancelled while validating the
--    replacement slot. A later schedule-changing update must upgrade that temporary
--    booking_cancelled annotation to schedule_superseded.

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
    OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id
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

  IF OLD.start_time IS DISTINCT FROM NEW.start_time
     OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id THEN
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
    start_time, calendar_id, status, payment_status, is_deleted,
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
  -- Intentional hard deletion (including calendar ON DELETE CASCADE) owns the historical
  -- data lifecycle. Only refuse while a provider request can still be in flight.
  IF EXISTS (
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
    WHEN OLD.start_time IS DISTINCT FROM NEW.start_time
      OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id
      OR OLD.reminder_generation IS DISTINCT FROM NEW.reminder_generation
      THEN 'schedule_superseded'
    WHEN COALESCE(NEW.payment_status, '') IN ('refunded', 'partially_refunded')
      THEN 'payment_refunded'
    WHEN NEW.status <> 'confirmed' OR COALESCE(NEW.is_deleted, false)
      THEN 'booking_cancelled'
    ELSE NULL
  END;

  IF v_state IS NOT NULL THEN
    UPDATE public.booking_reminders_sent AS reminder
    SET
      post_acceptance_state = v_state,
      last_error_code = upper(v_state) || '_AFTER_PROVIDER_ACCEPTANCE'
    WHERE reminder.booking_id = NEW.id
      AND reminder.status IN ('provider_accepted', 'delivered')
      AND (
        reminder.post_acceptance_state IS NULL
        -- reschedule_booking_atomic's temporary cancellation is implementation detail;
        -- the final schedule mutation is the durable business truth.
        OR (
          v_state = 'schedule_superseded'
          AND reminder.post_acceptance_state = 'booking_cancelled'
        )
      );
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.annotate_booking_reminder_post_acceptance()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_annotate_booking_reminder_post_acceptance
  ON public.bookings;
CREATE TRIGGER trg_annotate_booking_reminder_post_acceptance
  AFTER UPDATE OF start_time, calendar_id, status, payment_status, is_deleted
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.annotate_booking_reminder_post_acceptance();

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
  v_calendar_id uuid;
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

  -- Read the parent id without a lock, lock the parent, then re-lock/revalidate the child.
  -- If a concurrent calendar move/delete wins between these statements, this attempt stops.
  SELECT booking.calendar_id
  INTO v_calendar_id
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  INTO v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.id = v_calendar_id
    AND calendar.is_active IS TRUE
    AND COALESCE(calendar.is_deleted, false) = false
  FOR SHARE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
    AND booking.calendar_id = v_calendar_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT settings.*
  INTO v_settings
  FROM public.calendar_settings AS settings
  WHERE settings.calendar_id = v_calendar_id
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

  SELECT COALESCE(NULLIF(business.business_name, ''), 'het bedrijf')
  INTO v_business_name
  FROM public.business_overview AS business
  WHERE business.calendar_id = v_calendar_id
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
    AND v_reminder.calendar_timezone_snapshot IS NOT DISTINCT FROM v_timezone
    AND v_reminder.business_name_snapshot IS NOT DISTINCT FROM v_business_name;

  IF NOT v_due
     OR v_booking.reminder_generation <> p_schedule_generation
     OR v_booking.status <> 'confirmed'
     OR COALESCE(v_booking.is_deleted, false)
     OR v_booking.start_time IS DISTINCT FROM v_reminder.booking_start_time_snapshot
     OR v_booking.start_time <= now()
     OR COALESCE(v_booking.payment_status, '') IN ('refunded', 'partially_refunded')
     OR v_channel IS NULL
     OR NOT v_snapshot_matches
     OR p_channel IS DISTINCT FROM v_channel THEN
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
  v_calendar_id uuid;
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

  -- Serialize every late result with calendar deletion and every booking mutation, even
  -- after the claim lease itself expired. The claim token remains the worker fence.
  SELECT booking.calendar_id
  INTO v_calendar_id
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'REMINDER_BOOKING_NOT_FOUND'; END IF;

  PERFORM 1
  FROM public.calendars AS calendar
  WHERE calendar.id = v_calendar_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REMINDER_CALENDAR_NOT_FOUND'; END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
    AND booking.calendar_id = v_calendar_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'REMINDER_BOOKING_NOT_FOUND'; END IF;

  SELECT reminder.*
  INTO v_row
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = p_booking_id
    AND reminder.reminder_number = p_reminder_number
    AND reminder.schedule_generation = p_schedule_generation
  FOR UPDATE;
  IF NOT FOUND
     OR v_row.claim_token IS DISTINCT FROM p_claim_token THEN
    RAISE EXCEPTION 'REMINDER_RESULT_STALE_CLAIM';
  END IF;

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

COMMENT ON FUNCTION public.begin_booking_reminder_attempt_v2(
  uuid, smallint, uuid, uuid, text, text, text
) IS 'R36: calendar-booking-reminder lock order and fresh eligibility snapshot immediately before provider I/O.';
COMMENT ON FUNCTION public.record_booking_reminder_result_v2(
  uuid, smallint, uuid, uuid, boolean, integer, text, text, text, text, text
) IS 'R36: calendar-booking-reminder lock order serializes late provider results with delete, cancellation, refund, and reschedule.';
COMMENT ON FUNCTION public.guard_booking_reminder_evidence_delete() IS
  'R36: intentional hard deletion may cascade historical evidence; only an active provider attempt is fenced.';
