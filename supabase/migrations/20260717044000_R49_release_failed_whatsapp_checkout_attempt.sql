-- R49: an asynchronous Checkout failure must release both ownership layers.
-- R48 releases the booking-global provider reservation. This migration also
-- retires the exact local WhatsApp attempt so a later request can create a new
-- Checkout generation while preserving the failed provider identity in the
-- durable session ledger.

CREATE OR REPLACE FUNCTION public.record_booking_checkout_failure(
  p_booking_id uuid,
  p_stripe_session_id text,
  p_stripe_mode text,
  p_failed_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_session public.whatsapp_payment_sessions%ROWTYPE;
  v_attempt public.whatsapp_payment_attempts%ROWTYPE;
  v_attempt_found boolean := false;
  v_attempt_released boolean := false;
  v_retained_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(btrim(p_stripe_session_id), '') IS NULL
     OR p_stripe_mode NOT IN ('test', 'live')
     OR p_failed_at IS NULL THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM payment.id
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  PERFORM installment.id
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
  ORDER BY installment.id
  FOR UPDATE;

  -- Match the local payment-attempt lock order: attempt before session.
  SELECT attempt.*
  INTO v_attempt
  FROM public.whatsapp_payment_attempts AS attempt
  WHERE attempt.booking_id = p_booking_id
  FOR UPDATE;
  v_attempt_found := FOUND;

  PERFORM session.id
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  ORDER BY session.id
  FOR UPDATE;

  SELECT session.*
  INTO v_session
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
    AND session.stripe_session_id = p_stripe_session_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'session_not_local',
      'local_attempt_released', false
    );
  END IF;

  IF v_session.stripe_mode IS NOT NULL
     AND v_session.stripe_mode IS DISTINCT FROM p_stripe_mode THEN
    RAISE EXCEPTION 'CHECKOUT_FAILURE_MODE_CONFLICT'
      USING ERRCODE = '22023';
  END IF;

  IF v_session.payment_status IN (
    'paid', 'succeeded', 'completed', 'partially_refunded', 'refunded'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'terminal_session_preserved',
      'local_attempt_released', false
    );
  END IF;

  UPDATE public.whatsapp_payment_sessions AS session
  SET
    payment_status = 'failed',
    stripe_mode = COALESCE(session.stripe_mode, p_stripe_mode),
    provider_status = 'complete',
    provider_payment_status = 'unpaid',
    provider_reconciled_at = GREATEST(
      COALESCE(session.provider_reconciled_at, '-infinity'::timestamptz),
      p_failed_at
    ),
    updated_at = GREATEST(session.updated_at, p_failed_at)
  WHERE session.id = v_session.id
    AND session.payment_status IN ('pending', 'processing', 'failed');

  -- Release only the exact completed local generation named by the signed
  -- provider event. A delayed failure for an older Checkout can never retire a
  -- newer replacement generation because every local identity must still match.
  IF v_attempt_found
     AND v_attempt.state = 'completed'
     AND v_attempt.payment_session_id = v_session.id
     AND v_attempt.stripe_session_id = p_stripe_session_id
     AND v_attempt.stripe_mode = p_stripe_mode
     AND v_attempt.attempt_generation = v_session.attempt_generation
     AND (
       v_attempt.provider_ownership_version < 2
       OR v_attempt.request_fingerprint IS NOT DISTINCT FROM
          v_session.request_fingerprint
     ) THEN
    UPDATE public.whatsapp_payment_attempts AS attempt
    SET
      state = 'claimed',
      claim_token = gen_random_uuid(),
      claim_expires_at = LEAST(p_failed_at, clock_timestamp())
        - interval '1 microsecond',
      previous_stripe_session_id = p_stripe_session_id,
      stripe_session_id = NULL,
      payment_url = NULL,
      provider_status = 'complete',
      provider_payment_status = 'unpaid',
      provider_reconciled_at = GREATEST(
        COALESCE(attempt.provider_reconciled_at, '-infinity'::timestamptz),
        p_failed_at
      ),
      updated_at = GREATEST(attempt.updated_at, p_failed_at)
    WHERE attempt.booking_id = p_booking_id
      AND attempt.state = 'completed'
      AND attempt.payment_session_id = v_session.id
      AND attempt.attempt_generation = v_session.attempt_generation
      AND attempt.stripe_session_id = p_stripe_session_id
      AND attempt.stripe_mode = p_stripe_mode;

    v_attempt_released := FOUND;
  END IF;

  SELECT COALESCE(sum(
    GREATEST(
      payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
      0
    )
  ), 0)::bigint
  INTO v_retained_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  IF v_retained_cents = 0
     AND COALESCE(v_booking.payment_status, 'none') IN (
       'none', 'unpaid', 'pending', 'failed'
     ) THEN
    UPDATE public.bookings AS booking
    SET
      payment_status = 'failed',
      updated_at = GREATEST(booking.updated_at, p_failed_at)
    WHERE booking.id = p_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'action', 'unsettled_session_failed',
    'local_attempt_released', v_attempt_released
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_booking_checkout_failure(
  uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_checkout_failure(
  uuid, text, text, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.record_booking_checkout_failure(
  uuid, text, text, timestamptz
) IS
  'Records one Checkout failure and releases only the exact completed local WhatsApp attempt generation so a later request can retry safely.';
