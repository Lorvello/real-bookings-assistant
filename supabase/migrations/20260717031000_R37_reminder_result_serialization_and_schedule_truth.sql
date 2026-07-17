-- R37: close the final independent reminder review findings.
--
-- Booking mutations serialize with reminder results by locking every reminder row in the
-- AFTER trigger. The result RPC locks the stable reminder row first and deliberately never
-- waits on a booking/calendar row: if result wins, the later mutation annotates it; if the
-- mutation wins, result waits for the reminder lock and then reads the committed booking.
-- This avoids the old stale-calendar lookup while retaining deterministic, cycle-free locks.
-- A provider attempt also blocks hard deletion until it has a definite result/reconciliation.
-- End-time and service changes now rotate the generation and count as schedule supersession.

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
    OR OLD.end_time IS DISTINCT FROM NEW.end_time
    OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id
    OR OLD.service_type_id IS DISTINCT FROM NEW.service_type_id
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
     OR OLD.end_time IS DISTINCT FROM NEW.end_time
     OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id
     OR OLD.service_type_id IS DISTINCT FROM NEW.service_type_id THEN
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
    start_time, end_time, calendar_id, service_type_id, status, payment_status, is_deleted,
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
  -- A provider request remains potentially in flight until result/reconciliation clears
  -- provider_attempt_started_at. Lease expiry alone cannot prove the provider stopped.
  IF EXISTS (
    SELECT 1
    FROM public.booking_reminders_sent AS reminder
    WHERE reminder.booking_id = OLD.id
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

CREATE OR REPLACE FUNCTION public.annotate_booking_reminder_post_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_state text;
  v_temporary_cancel_restored boolean;
BEGIN
  -- Lock even a not-yet-accepted row. A late result then waits for this transaction and
  -- reads its committed booking; if result already holds the row, this trigger waits and
  -- subsequently annotates the accepted receipt. The result RPC never locks the parent,
  -- so this booking -> reminder order cannot form a cycle.
  PERFORM 1
  FROM public.booking_reminders_sent AS reminder
  WHERE reminder.booking_id = NEW.id
  ORDER BY reminder.id
  FOR UPDATE;

  v_state := CASE
    WHEN OLD.start_time IS DISTINCT FROM NEW.start_time
      OR OLD.end_time IS DISTINCT FROM NEW.end_time
      OR OLD.calendar_id IS DISTINCT FROM NEW.calendar_id
      OR OLD.service_type_id IS DISTINCT FROM NEW.service_type_id
      OR OLD.reminder_generation IS DISTINCT FROM NEW.reminder_generation
      THEN 'schedule_superseded'
    WHEN COALESCE(NEW.payment_status, '') IN ('refunded', 'partially_refunded')
      THEN 'payment_refunded'
    WHEN NEW.status <> 'confirmed' OR COALESCE(NEW.is_deleted, false)
      THEN 'booking_cancelled'
    ELSE NULL
  END;

  v_temporary_cancel_restored :=
    OLD.status = 'cancelled'
    AND NEW.status IN ('confirmed', 'pending')
    AND v_state IS NULL;

  IF v_state IS NOT NULL THEN
    UPDATE public.booking_reminders_sent AS reminder
    SET
      post_acceptance_state = v_state,
      last_error_code = upper(v_state) || '_AFTER_PROVIDER_ACCEPTANCE'
    WHERE reminder.booking_id = NEW.id
      AND reminder.status IN ('provider_accepted', 'delivered')
      AND (
        reminder.post_acceptance_state IS NULL
        OR (
          v_state = 'schedule_superseded'
          AND reminder.post_acceptance_state = 'booking_cancelled'
        )
      );
  ELSIF v_temporary_cancel_restored THEN
    UPDATE public.booking_reminders_sent AS reminder
    SET post_acceptance_state = NULL, last_error_code = NULL
    WHERE reminder.booking_id = NEW.id
      AND reminder.status IN ('provider_accepted', 'delivered')
      AND reminder.post_acceptance_state = 'booking_cancelled';
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.annotate_booking_reminder_post_acceptance()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS trg_annotate_booking_reminder_post_acceptance
  ON public.bookings;
CREATE TRIGGER trg_annotate_booking_reminder_post_acceptance
  AFTER UPDATE OF
    start_time, end_time, calendar_id, service_type_id, status, payment_status, is_deleted
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.annotate_booking_reminder_post_acceptance();

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

  -- This stable row is the serialization point. Booking mutation triggers lock the same
  -- row and retain that lock through commit. No calendar id is read before that mutation
  -- commits, so a cross-calendar reschedule cannot make the provider receipt disappear.
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

  SELECT booking.*
  INTO v_booking
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

COMMENT ON FUNCTION public.record_booking_reminder_result_v2(
  uuid, smallint, uuid, uuid, boolean, integer, text, text, text, text, text
) IS 'R37: stable reminder-row serialization preserves late provider receipts across concurrent calendar moves.';
COMMENT ON FUNCTION public.annotate_booking_reminder_post_acceptance() IS
  'R37: every booking mutation serializes on reminder rows and records cancellation, refund, or any schedule/service change after provider acceptance.';
COMMENT ON FUNCTION public.guard_booking_reminder_evidence_delete() IS
  'R37: hard delete waits for a definite provider result/reconciliation; lease expiry alone is not provider completion.';
