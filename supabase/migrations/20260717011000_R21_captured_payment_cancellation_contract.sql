-- R21: every supported cancellation route must preserve captured-money truth.
-- A partial deposit is real money just like a full prepayment: cancellation/no-show
-- never auto-refunds it and always marks the booking for a manual refund decision.

CREATE OR REPLACE FUNCTION public.lock_booking_captured_balance_cents(
  p_booking_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SET search_path = ''
AS $function$
DECLARE
  v_balance bigint;
BEGIN
  -- Lock every canonical payment row before deriving the remaining captured
  -- balance so a concurrent refund cannot race a cancellation decision.
  PERFORM 1
  FROM public.booking_payments
  WHERE booking_id = p_booking_id
  FOR UPDATE;

  SELECT COALESCE(
    sum(GREATEST(payment.amount_cents - COALESCE(payment.refund_amount_cents, 0), 0)),
    0
  )::bigint
  INTO v_balance
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  RETURN v_balance;
END;
$function$;

REVOKE ALL ON FUNCTION public.lock_booking_captured_balance_cents(uuid)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.owner_update_booking_status(
  p_booking_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_b public.bookings%ROWTYPE;
  v_captured_balance_cents bigint;
  v_captured boolean;
  v_note text;
  v_flag_payment boolean := false;
BEGIN
  IF p_new_status NOT IN ('cancelled', 'no-show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_status',
      'message', 'Only cancel or no-show are supported.'
    );
  END IF;

  SELECT * INTO v_b
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'Booking not found.'
    );
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT public.caller_owns_calendar(v_b.calendar_id) THEN
    RAISE EXCEPTION 'Access denied: booking not owned by caller'
      USING ERRCODE = '42501';
  END IF;

  IF v_b.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_transition',
      'message', format('Booking is already %s.', v_b.status),
      'current_status', v_b.status
    );
  END IF;

  IF p_new_status = 'no-show' AND v_b.start_time > now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'booking_in_future',
      'message', 'You cannot mark a future appointment as a no-show.',
      'current_status', v_b.status
    );
  END IF;

  v_captured_balance_cents :=
    public.lock_booking_captured_balance_cents(v_b.id);
  v_captured := v_captured_balance_cents > 0
    OR COALESCE(v_b.payment_status, 'none') IN (
      'paid', 'partial', 'partially_refunded', 'refund_required'
    );
  IF v_captured THEN
    v_flag_payment := true;
    v_note := format(
      '[R21] Owner set status=%s on a booking with captured payment (%s) at %s; manual refund decision required (no auto-refund).',
      p_new_status,
      v_b.payment_status,
      now()
    );
  END IF;

  UPDATE public.bookings
  SET
    status = p_new_status,
    cancelled_at = CASE
      WHEN p_new_status = 'cancelled' THEN now()
      ELSE cancelled_at
    END,
    cancellation_reason = CASE
      WHEN p_new_status = 'cancelled'
        THEN COALESCE(p_reason, 'Cancelled by owner from dashboard')
      ELSE cancellation_reason
    END,
    payment_status = CASE
      WHEN v_flag_payment THEN 'refund_required'
      ELSE payment_status
    END,
    internal_notes = CASE
      WHEN v_flag_payment THEN trim(
        BOTH E'\n' FROM COALESCE(internal_notes, '') || E'\n' || v_note
      )
      ELSE internal_notes
    END,
    updated_at = now()
  WHERE id = p_booking_id
    AND status NOT IN ('cancelled', 'completed', 'no-show');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_transition',
      'message', 'Booking status changed in the meantime; reload and try again.'
    );
  END IF;

  UPDATE public.installment_payments
  SET status = 'cancelled', updated_at = now()
  WHERE booking_id = p_booking_id
    AND status = 'pending';

  INSERT INTO public.agent_actions (
    booking_id,
    calendar_id,
    action_type,
    actor,
    old_value,
    new_value,
    conversation_id,
    channel
  )
  VALUES (
    p_booking_id,
    v_b.calendar_id,
    CASE WHEN p_new_status = 'no-show' THEN 'no_show' ELSE 'cancel' END,
    'owner',
    jsonb_build_object(
      'status', v_b.status,
      'payment_status', v_b.payment_status
    ),
    jsonb_build_object('status', p_new_status) || CASE
      WHEN v_flag_payment
        THEN jsonb_build_object('payment_status', 'refund_required')
      ELSE '{}'::jsonb
    END,
    NULL,
    'dashboard'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', p_new_status,
    'payment_flagged_refund_required', v_flag_payment,
    'captured_balance_cents', v_captured_balance_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.owner_update_booking_status(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_booking_status(uuid, text, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_booking_by_token(
  p_token text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_allow boolean;
  v_deadline numeric;
  v_hours numeric;
  v_captured_balance_cents bigint;
  v_captured boolean;
  v_note text;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid token');
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  JOIN public.calendars AS calendar ON calendar.id = booking.calendar_id
  WHERE booking.confirmation_token = p_token
    AND calendar.is_active = true
    AND COALESCE(calendar.is_deleted, false) = false
    AND COALESCE(booking.is_deleted, false) = false
  FOR UPDATE OF booking;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found');
  END IF;

  IF v_booking.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Booking is already %s', v_booking.status)
    );
  END IF;

  SELECT settings.allow_cancellations, settings.cancellation_deadline_hours
  INTO v_allow, v_deadline
  FROM public.calendar_settings AS settings
  WHERE settings.calendar_id = v_booking.calendar_id;

  IF v_allow IS FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cancellations are not allowed for this calendar. Please contact the business.'
    );
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_booking.start_time - now())) / 3600;
  IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Too late to cancel: this must be done at least %s hours in advance. Please contact the business.',
        v_deadline
      )
    );
  END IF;

  v_captured_balance_cents :=
    public.lock_booking_captured_balance_cents(v_booking.id);
  v_captured := v_captured_balance_cents > 0
    OR COALESCE(v_booking.payment_status, 'none') IN (
      'paid', 'partial', 'partially_refunded', 'refund_required'
    );
  IF v_captured THEN
    v_note := format(
      '[R21] Customer cancelled a booking with captured payment (%s) at %s; manual refund decision required (no auto-refund).',
      v_booking.payment_status,
      now()
    );
  END IF;

  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = COALESCE(p_reason, 'Cancelled by customer'),
    payment_status = CASE
      WHEN v_captured THEN 'refund_required'
      ELSE payment_status
    END,
    internal_notes = CASE
      WHEN v_captured THEN trim(
        BOTH E'\n' FROM COALESCE(internal_notes, '') || E'\n' || v_note
      )
      ELSE internal_notes
    END,
    updated_at = now()
  WHERE id = v_booking.id
    AND status NOT IN ('cancelled', 'completed', 'no-show');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Booking status changed; reload and try again.'
    );
  END IF;

  UPDATE public.installment_payments
  SET status = 'cancelled', updated_at = now()
  WHERE booking_id = v_booking.id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'payment_flagged_refund_required', v_captured,
    'captured_balance_cents', v_captured_balance_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_booking_by_token(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_token(text, text)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cancel_booking_for_agent(
  p_booking_id uuid,
  p_phone text,
  p_reason text DEFAULT 'Geannuleerd via WhatsApp'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_allow boolean;
  v_deadline numeric;
  v_hours numeric;
  v_captured_balance_cents bigint;
  v_captured boolean;
  v_note text;
BEGIN
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Boeking niet gevonden');
  END IF;
  IF v_booking.customer_phone IS DISTINCT FROM p_phone THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deze boeking hoort niet bij dit telefoonnummer'
    );
  END IF;
  IF v_booking.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Deze afspraak is al %s', v_booking.status)
    );
  END IF;

  SELECT settings.allow_cancellations, settings.cancellation_deadline_hours
  INTO v_allow, v_deadline
  FROM public.calendar_settings AS settings
  WHERE settings.calendar_id = v_booking.calendar_id;

  IF v_allow IS FALSE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Annuleren via de assistent is niet toegestaan; neem contact op met de zaak'
    );
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_booking.start_time - now())) / 3600;
  IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Te laat om te annuleren: dat moet minimaal %s uur van tevoren. Neem contact op met de zaak.',
        v_deadline
      )
    );
  END IF;

  v_captured_balance_cents :=
    public.lock_booking_captured_balance_cents(v_booking.id);
  v_captured := v_captured_balance_cents > 0
    OR COALESCE(v_booking.payment_status, 'none') IN (
      'paid', 'partial', 'partially_refunded', 'refund_required'
    );
  IF v_captured THEN
    v_note := format(
      '[R21] WhatsApp cancellation on a booking with captured payment (%s) at %s; manual refund decision required (no auto-refund).',
      v_booking.payment_status,
      now()
    );
  END IF;

  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    payment_status = CASE
      WHEN v_captured THEN 'refund_required'
      ELSE payment_status
    END,
    internal_notes = CASE
      WHEN v_captured THEN trim(
        BOTH E'\n' FROM COALESCE(internal_notes, '') || E'\n' || v_note
      )
      ELSE internal_notes
    END,
    updated_at = now()
  WHERE id = p_booking_id
    AND status NOT IN ('cancelled', 'completed', 'no-show');

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Boeking is intussen gewijzigd; probeer opnieuw'
    );
  END IF;

  UPDATE public.installment_payments
  SET status = 'cancelled', updated_at = now()
  WHERE booking_id = p_booking_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'cancelled_at', now(),
    'payment_flagged_refund_required', v_captured,
    'captured_balance_cents', v_captured_balance_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_booking_for_agent(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_for_agent(uuid, text, text)
  TO service_role;
