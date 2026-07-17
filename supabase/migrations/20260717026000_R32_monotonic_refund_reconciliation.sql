-- R32: one atomic, monotonic refund reconciliation contract.
-- Stripe refund events can arrive out of order. Independent table updates allowed an
-- older partial-refund event to downgrade a later full refund and exposed partially
-- updated booking/installment/session ledgers when a later write failed.

CREATE OR REPLACE FUNCTION public.reconcile_booking_refund(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_refund_amount_cents integer,
  p_refunded_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking_payment_status text;
  v_payment public.booking_payments%ROWTYPE;
  v_existing_refund_cents integer;
  v_refund_status text;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(trim(p_stripe_payment_intent_id), '') IS NULL
     OR p_refund_amount_cents IS NULL
     OR p_refund_amount_cents <= 0
     OR p_refunded_at IS NULL THEN
    RAISE EXCEPTION 'REFUND_RECONCILIATION_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  -- Keep lock ordering aligned with cancellation RPCs: booking first, then ledgers.
  SELECT booking.payment_status
  INTO v_booking_payment_status
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  SELECT payment.*
  INTO v_payment
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_PAYMENT_LEDGER_ROW_MISSING'
      USING ERRCODE = 'P0002';
  END IF;
  IF p_refund_amount_cents > v_payment.amount_cents THEN
    RAISE EXCEPTION 'REFUND_AMOUNT_EXCEEDS_PAYMENT'
      USING ERRCODE = '22023';
  END IF;

  v_existing_refund_cents := COALESCE(v_payment.refund_amount_cents, 0);
  IF p_refund_amount_cents <= v_existing_refund_cents THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'staleOrDuplicate', true,
      'status', v_payment.status,
      'refundAmountCents', v_existing_refund_cents
    );
  END IF;

  v_refund_status := CASE
    WHEN p_refund_amount_cents = v_payment.amount_cents THEN 'refunded'
    ELSE 'partially_refunded'
  END;

  UPDATE public.booking_payments
  SET
    refund_amount_cents = p_refund_amount_cents,
    refunded_at = p_refunded_at,
    status = v_refund_status,
    updated_at = p_refunded_at
  WHERE id = v_payment.id;

  UPDATE public.installment_payments
  SET status = v_refund_status, updated_at = p_refunded_at
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id;

  UPDATE public.whatsapp_payment_sessions
  SET payment_status = v_refund_status, updated_at = p_refunded_at
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id;

  UPDATE public.bookings
  SET
    payment_status = CASE
      WHEN v_refund_status = 'refunded' THEN 'refunded'
      WHEN payment_status = 'refund_required' THEN 'refund_required'
      ELSE 'partially_refunded'
    END,
    updated_at = p_refunded_at
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'staleOrDuplicate', false,
    'status', v_refund_status,
    'refundAmountCents', p_refund_amount_cents,
    'bookingPaymentStatus', CASE
      WHEN v_refund_status = 'refunded' THEN 'refunded'
      WHEN v_booking_payment_status = 'refund_required' THEN 'refund_required'
      ELSE 'partially_refunded'
    END
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_booking_refund(uuid, text, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_refund(uuid, text, integer, timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.reconcile_booking_refund(uuid, text, integer, timestamptz) IS
  'R32 atomically applies only strictly increasing cumulative Stripe refund amounts across booking, payment, installment and WhatsApp session ledgers.';
