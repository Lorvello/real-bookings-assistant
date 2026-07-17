-- R34: close the final independent payment-review findings.
--
-- 1. Stripe success and refund events now share one booking-first lock order and
--    one transactional state machine. A delayed success can no longer overwrite a
--    refund, and booking payment_status is derived across every captured PI.
-- 2. Browser cancellation guards include every retained-money state.
-- 3. Deadline cancellation closes its local installment/session schedules.
-- 4. Selected installment plans stay valid when a service price changes, while
--    disabled persisted plans remain safely decodable by the settings read path.

-- Disabled legacy rows were never authorized for charging, but the owner settings
-- reader still decodes them. Canonicalize only malformed disabled rows before making
-- the shape constraint unconditional.
UPDATE public.service_installment_configs AS config
SET
  plan_type = 'preset',
  preset_plan = '50_50',
  custom_deposits = '[]'::jsonb,
  fixed_deposit_amount = NULL,
  updated_at = now()
WHERE config.enabled IS NOT TRUE
  AND NOT (
    (
      config.plan_type = 'preset'
      AND config.preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')
      AND (
        config.preset_plan <> 'fixed_deposit'
        OR (
          config.fixed_deposit_amount IS NOT NULL
          AND config.fixed_deposit_amount > 0
        )
      )
    )
    OR (
      config.plan_type = 'custom'
      AND public.installment_deposits_are_runtime_valid(config.custom_deposits)
    )
  );

ALTER TABLE public.service_installment_configs
  DROP CONSTRAINT IF EXISTS service_installment_configs_plan_shape_check,
  ADD CONSTRAINT service_installment_configs_plan_shape_check CHECK (
    (
      plan_type = 'preset'
      AND preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')
      AND (
        preset_plan <> 'fixed_deposit'
        OR (fixed_deposit_amount IS NOT NULL AND fixed_deposit_amount > 0)
      )
    )
    OR (
      plan_type = 'custom'
      AND public.installment_deposits_are_runtime_valid(custom_deposits)
    )
  );

-- Serialize a config write with a concurrent service-price write on the service row.
CREATE OR REPLACE FUNCTION public.enforce_service_installment_plan_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_service_price numeric;
  v_plan jsonb;
BEGIN
  SELECT service.price
  INTO v_service_price
  FROM public.service_types AS service
  WHERE service.id = NEW.service_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSTALLMENT_SERVICE_MISSING'
      USING ERRCODE = '23503';
  END IF;

  IF NEW.enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  v_plan := CASE
    WHEN NEW.plan_type = 'preset' THEN jsonb_strip_nulls(
      jsonb_build_object(
        'type', 'preset',
        'preset', NEW.preset_plan,
        'fixed_deposit_amount', NEW.fixed_deposit_amount
      )
    )
    ELSE jsonb_build_object(
      'type', 'custom',
      'deposits', NEW.custom_deposits
    )
  END;

  IF NOT public.installment_plan_is_runtime_valid_for_price(
    v_plan,
    v_service_price
  ) THEN
    RAISE EXCEPTION 'INSTALLMENT_PLAN_PRICE_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_service_installment_plan_price()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_selected_installment_plan_on_price_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_config public.service_installment_configs%ROWTYPE;
  v_plan jsonb;
BEGIN
  SELECT config.*
  INTO v_config
  FROM public.service_installment_configs AS config
  WHERE config.service_type_id = NEW.id
    AND config.enabled IS TRUE;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_plan := CASE
    WHEN v_config.plan_type = 'preset' THEN jsonb_strip_nulls(
      jsonb_build_object(
        'type', 'preset',
        'preset', v_config.preset_plan,
        'fixed_deposit_amount', v_config.fixed_deposit_amount
      )
    )
    ELSE jsonb_build_object(
      'type', 'custom',
      'deposits', v_config.custom_deposits
    )
  END;

  IF NOT public.installment_plan_is_runtime_valid_for_price(v_plan, NEW.price) THEN
    RAISE EXCEPTION 'INSTALLMENT_PLAN_PRICE_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_selected_installment_plan_on_price_change()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_selected_installment_plan_on_price_change
  ON public.service_types;
CREATE TRIGGER enforce_selected_installment_plan_on_price_change
BEFORE UPDATE OF price ON public.service_types
FOR EACH ROW
WHEN (OLD.price IS DISTINCT FROM NEW.price)
EXECUTE FUNCTION public.enforce_selected_installment_plan_on_price_change();

-- Close every local unpaid schedule in the same transaction as the booking. A
-- booking_payments row is deliberately not marked canceled: only Stripe can tell us
-- whether an asynchronous PI is still capable of settling. A later authoritative
-- success is accepted and flags the already-cancelled booking refund_required.
CREATE OR REPLACE FUNCTION public.cancel_overdue_unpaid_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH overdue AS MATERIALIZED (
    SELECT booking.id
    FROM public.bookings AS booking
    JOIN public.payment_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    WHERE booking.payment_required = true
      AND COALESCE(booking.payment_status, 'none') IN (
        'none', 'unpaid', 'pending', 'failed'
      )
      AND booking.status NOT IN ('cancelled', 'completed', 'no-show')
      AND COALESCE(booking.is_deleted, false) = false
      AND settings.auto_cancel_unpaid_bookings = true
      AND booking.start_time > now()
      AND booking.created_at < now() - make_interval(
        hours => settings.payment_deadline_hours
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.booking_payments AS payment
        WHERE payment.booking_id = booking.id
          AND payment.status IN (
            'succeeded', 'completed', 'partially_refunded', 'refunded'
          )
          AND payment.amount_cents > COALESCE(payment.refund_amount_cents, 0)
      )
    FOR UPDATE OF booking SKIP LOCKED
  ), cancelled AS (
    UPDATE public.bookings AS booking
    SET
      status = 'cancelled',
      cancelled_at = COALESCE(booking.cancelled_at, now()),
      cancellation_reason = COALESCE(
        booking.cancellation_reason,
        'Automatic cancellation: payment deadline expired'
      ),
      updated_at = now()
    FROM overdue
    WHERE booking.id = overdue.id
    RETURNING booking.id
  ), cancelled_installments AS (
    UPDATE public.installment_payments AS installment
    SET status = 'cancelled', updated_at = now()
    WHERE installment.booking_id IN (SELECT id FROM cancelled)
      AND installment.status IN ('pending', 'processing', 'overdue', 'failed')
    RETURNING installment.id
  ), cancelled_sessions AS (
    UPDATE public.whatsapp_payment_sessions AS session
    SET payment_status = 'cancelled', updated_at = now()
    WHERE session.booking_id IN (SELECT id FROM cancelled)
      AND session.payment_status IN ('pending', 'processing', 'failed')
    RETURNING session.id
  )
  SELECT count(*)::integer
  INTO v_count
  FROM cancelled;

  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_overdue_unpaid_bookings()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_overdue_unpaid_bookings()
  TO service_role;

-- Browser updates must never bypass the reviewed cancellation RPCs while any
-- captured balance can remain.
CREATE OR REPLACE FUNCTION public.protect_booking_payment_state_from_browser()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'BOOKING_PAYMENT_STATUS_SERVER_MANAGED'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IN ('cancelled', 'no-show')
       AND OLD.status NOT IN ('cancelled', 'completed', 'no-show')
       AND COALESCE(OLD.payment_status, 'none') IN (
         'paid', 'partial', 'partially_refunded', 'refund_required'
       ) THEN
      RAISE EXCEPTION 'CAPTURED_PAYMENT_REQUIRES_SECURE_BOOKING_ACTION'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_booking_payment_state_from_browser()
  FROM PUBLIC, anon, authenticated;

-- Stripe success owns the complete local transition. The booking row is always
-- locked first, then all payment rows, then dependent ledgers. Refund reconciliation
-- below uses exactly the same order.
CREATE OR REPLACE FUNCTION public.finalize_booking_payment_success(
  p_booking_id uuid,
  p_stripe_payment_intent_id text,
  p_payment_kind text,
  p_paid_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_has_outstanding_installments boolean := false;
  v_captured_total_cents bigint := 0;
  v_refunded_total_cents bigint := 0;
  v_retained_total_cents bigint := 0;
  v_target_payment_status text;
  v_installment_count integer := 0;
  v_session_count integer := 0;
  v_note text;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(trim(p_stripe_payment_intent_id), '') IS NULL
     OR p_payment_kind NOT IN ('full', 'installment')
     OR p_paid_at IS NULL THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT payment.*
  INTO v_payment
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_LEDGER_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_payment.status IN ('partially_refunded', 'refunded') THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'refund_ignored',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', v_booking.payment_status,
      'ledgerStatus', v_payment.status
    );
  END IF;

  IF v_payment.status NOT IN (
    'pending', 'processing', 'failed', 'canceled', 'cancelled',
    'succeeded', 'completed'
  ) THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_LEDGER_CONFLICT:%', v_payment.status
      USING ERRCODE = '55000';
  END IF;

  -- Lock dependent rows before inspecting or changing them. Refund reconciliation
  -- takes the same booking -> payment -> installment -> session order.
  PERFORM 1
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
  ORDER BY installment.id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  ORDER BY session.id
  FOR UPDATE;

  UPDATE public.booking_payments
  SET status = 'succeeded', updated_at = GREATEST(updated_at, p_paid_at)
  WHERE id = v_payment.id;

  IF p_payment_kind = 'installment' THEN
    IF EXISTS (
      SELECT 1
      FROM public.installment_payments AS installment
      WHERE installment.booking_id = p_booking_id
        AND installment.installment_number = 1
        AND installment.status IN ('partially_refunded', 'refunded')
    ) THEN
      RAISE EXCEPTION 'PAYMENT_SUCCESS_INSTALLMENT_REFUND_CONFLICT'
        USING ERRCODE = '55000';
    END IF;

    UPDATE public.installment_payments AS installment
    SET
      status = 'paid',
      stripe_payment_intent_id = COALESCE(
        installment.stripe_payment_intent_id,
        p_stripe_payment_intent_id
      ),
      paid_at = COALESCE(installment.paid_at, p_paid_at),
      updated_at = GREATEST(installment.updated_at, p_paid_at)
    WHERE installment.booking_id = p_booking_id
      AND installment.installment_number = 1
      AND (
        installment.stripe_payment_intent_id IS NULL
        OR installment.stripe_payment_intent_id = p_stripe_payment_intent_id
      )
      AND installment.status IN (
        'pending', 'processing', 'failed', 'cancelled', 'canceled', 'paid'
      );
    GET DIAGNOSTICS v_installment_count = ROW_COUNT;

    IF v_installment_count <> 1 THEN
      RAISE EXCEPTION 'PAYMENT_SUCCESS_INSTALLMENT_LEDGER_MISSING'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.whatsapp_payment_sessions AS session
    WHERE session.booking_id = p_booking_id
      AND (
        session.stripe_payment_intent_id IS NULL
        OR session.stripe_payment_intent_id = p_stripe_payment_intent_id
      )
      AND session.payment_status IN ('partially_refunded', 'refunded')
  ) THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_SESSION_REFUND_CONFLICT'
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.whatsapp_payment_sessions AS session
  SET
    payment_status = 'paid',
    stripe_payment_intent_id = COALESCE(
      session.stripe_payment_intent_id,
      p_stripe_payment_intent_id
    ),
    updated_at = GREATEST(session.updated_at, p_paid_at)
  WHERE session.booking_id = p_booking_id
    AND (
      session.stripe_payment_intent_id IS NULL
      OR session.stripe_payment_intent_id = p_stripe_payment_intent_id
    )
    AND session.payment_status IN (
      'pending', 'processing', 'failed', 'cancelled', 'canceled', 'paid'
    );
  GET DIAGNOSTICS v_session_count = ROW_COUNT;

  IF p_payment_kind = 'installment' AND v_session_count <> 1 THEN
    RAISE EXCEPTION 'PAYMENT_SUCCESS_SESSION_LEDGER_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_payment_kind = 'installment' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.installment_payments AS installment
      WHERE installment.booking_id = p_booking_id
        AND installment.status NOT IN ('paid', 'refunded')
    )
    INTO v_has_outstanding_installments;
  END IF;

  SELECT
    COALESCE(sum(payment.amount_cents), 0)::bigint,
    COALESCE(sum(COALESCE(payment.refund_amount_cents, 0)), 0)::bigint
  INTO v_captured_total_cents, v_refunded_total_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  v_retained_total_cents := GREATEST(
    v_captured_total_cents - v_refunded_total_cents,
    0
  );

  IF v_booking.status IN ('cancelled', 'completed', 'no-show')
     OR v_booking.payment_status = 'refund_required' THEN
    IF v_retained_total_cents > 0 THEN
      IF v_booking.payment_status IS DISTINCT FROM 'refund_required' THEN
        v_note := format(
          '[R34 %s] Stripe success for PI %s landed after booking status=%s; booking was not resurrected and manual refund is required.',
          p_paid_at,
          p_stripe_payment_intent_id,
          v_booking.status
        );
      END IF;

      UPDATE public.bookings AS booking
      SET
        payment_status = 'refund_required',
        internal_notes = CASE
          WHEN v_note IS NULL THEN booking.internal_notes
          ELSE trim(
            BOTH E'\n' FROM COALESCE(booking.internal_notes, '') || E'\n' || v_note
          )
        END,
        updated_at = GREATEST(booking.updated_at, p_paid_at)
      WHERE booking.id = p_booking_id;

      RETURN jsonb_build_object(
        'success', true,
        'applied', true,
        'action', 'refund_required',
        'shouldDeliverConfirmation', false,
        'bookingPaymentStatus', 'refund_required',
        'capturedTotalCents', v_captured_total_cents,
        'refundedTotalCents', v_refunded_total_cents,
        'retainedTotalCents', v_retained_total_cents
      );
    END IF;

    UPDATE public.bookings AS booking
    SET
      payment_status = 'refunded',
      updated_at = GREATEST(booking.updated_at, p_paid_at)
    WHERE booking.id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'action', 'refund_ignored',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', 'refunded',
      'capturedTotalCents', v_captured_total_cents,
      'refundedTotalCents', v_refunded_total_cents,
      'retainedTotalCents', v_retained_total_cents
    );
  END IF;

  IF v_refunded_total_cents > 0 THEN
    v_target_payment_status := CASE
      WHEN v_retained_total_cents = 0 THEN 'refunded'
      ELSE 'partially_refunded'
    END;

    UPDATE public.bookings AS booking
    SET
      payment_status = v_target_payment_status,
      updated_at = GREATEST(booking.updated_at, p_paid_at)
    WHERE booking.id = p_booking_id;

    RETURN jsonb_build_object(
      'success', true,
      'applied', true,
      'action', 'refund_state_preserved',
      'shouldDeliverConfirmation', false,
      'bookingPaymentStatus', v_target_payment_status,
      'capturedTotalCents', v_captured_total_cents,
      'refundedTotalCents', v_refunded_total_cents,
      'retainedTotalCents', v_retained_total_cents
    );
  END IF;

  v_target_payment_status := CASE
    WHEN p_payment_kind = 'installment' AND v_has_outstanding_installments
      THEN 'partial'
    ELSE 'paid'
  END;

  UPDATE public.bookings AS booking
  SET
    payment_status = v_target_payment_status,
    status = 'confirmed',
    updated_at = GREATEST(booking.updated_at, p_paid_at)
  WHERE booking.id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'action', 'confirmed',
    'shouldDeliverConfirmation', true,
    'bookingPaymentStatus', v_target_payment_status,
    'hasOutstandingInstallments', v_has_outstanding_installments,
    'capturedTotalCents', v_captured_total_cents,
    'refundedTotalCents', v_refunded_total_cents,
    'retainedTotalCents', v_retained_total_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.finalize_booking_payment_success(
  uuid, text, text, timestamptz
) IS
  'R34 atomically finalizes one authoritative Stripe success across the booking, canonical payment ledger, installment ledger and WhatsApp session without overwriting refund truth.';

-- Refund truth is monotone per PI and aggregate across the whole booking. A full
-- refund of one of two captured PIs is therefore partially_refunded, not refunded.
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
  v_booking public.bookings%ROWTYPE;
  v_payment public.booking_payments%ROWTYPE;
  v_existing_refund_cents integer;
  v_refund_status text;
  v_booking_payment_status text;
  v_captured_total_cents bigint := 0;
  v_refunded_total_cents bigint := 0;
  v_retained_total_cents bigint := 0;
BEGIN
  IF p_booking_id IS NULL
     OR NULLIF(trim(p_stripe_payment_intent_id), '') IS NULL
     OR p_refund_amount_cents IS NULL
     OR p_refund_amount_cents <= 0
     OR p_refunded_at IS NULL THEN
    RAISE EXCEPTION 'REFUND_RECONCILIATION_INPUT_INVALID'
      USING ERRCODE = '22023';
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_BOOKING_MISSING'
      USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
  ORDER BY payment.id
  FOR UPDATE;

  SELECT payment.*
  INTO v_payment
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.stripe_payment_intent_id = p_stripe_payment_intent_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REFUND_PAYMENT_LEDGER_ROW_MISSING'
      USING ERRCODE = 'P0002';
  END IF;
  IF p_refund_amount_cents > v_payment.amount_cents THEN
    RAISE EXCEPTION 'REFUND_AMOUNT_EXCEEDS_PAYMENT'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
  ORDER BY installment.id
  FOR UPDATE;

  PERFORM 1
  FROM public.whatsapp_payment_sessions AS session
  WHERE session.booking_id = p_booking_id
  ORDER BY session.id
  FOR UPDATE;

  v_existing_refund_cents := COALESCE(v_payment.refund_amount_cents, 0);
  IF p_refund_amount_cents <= v_existing_refund_cents THEN
    RETURN jsonb_build_object(
      'success', true,
      'applied', false,
      'staleOrDuplicate', true,
      'status', v_payment.status,
      'refundAmountCents', v_existing_refund_cents,
      'bookingPaymentStatus', v_booking.payment_status
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
    updated_at = GREATEST(updated_at, p_refunded_at)
  WHERE id = v_payment.id;

  UPDATE public.installment_payments
  SET status = v_refund_status, updated_at = GREATEST(updated_at, p_refunded_at)
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id;

  UPDATE public.whatsapp_payment_sessions
  SET
    payment_status = v_refund_status,
    updated_at = GREATEST(updated_at, p_refunded_at)
  WHERE booking_id = p_booking_id
    AND stripe_payment_intent_id = p_stripe_payment_intent_id;

  SELECT
    COALESCE(sum(payment.amount_cents), 0)::bigint,
    COALESCE(sum(COALESCE(payment.refund_amount_cents, 0)), 0)::bigint
  INTO v_captured_total_cents, v_refunded_total_cents
  FROM public.booking_payments AS payment
  WHERE payment.booking_id = p_booking_id
    AND payment.status IN (
      'succeeded', 'completed', 'partially_refunded', 'refunded'
    );

  v_retained_total_cents := GREATEST(
    v_captured_total_cents - v_refunded_total_cents,
    0
  );

  v_booking_payment_status := CASE
    WHEN v_captured_total_cents > 0 AND v_retained_total_cents = 0
      THEN 'refunded'
    WHEN v_booking.payment_status = 'refund_required'
      OR v_booking.status IN ('cancelled', 'completed', 'no-show')
      THEN 'refund_required'
    ELSE 'partially_refunded'
  END;

  UPDATE public.bookings AS booking
  SET
    payment_status = v_booking_payment_status,
    updated_at = GREATEST(booking.updated_at, p_refunded_at)
  WHERE booking.id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'applied', true,
    'staleOrDuplicate', false,
    'status', v_refund_status,
    'refundAmountCents', p_refund_amount_cents,
    'bookingPaymentStatus', v_booking_payment_status,
    'capturedTotalCents', v_captured_total_cents,
    'refundedTotalCents', v_refunded_total_cents,
    'retainedTotalCents', v_retained_total_cents
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_booking_refund(
  uuid, text, integer, timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_booking_refund(
  uuid, text, integer, timestamptz
) TO service_role;

COMMENT ON FUNCTION public.reconcile_booking_refund(
  uuid, text, integer, timestamptz
) IS
  'R34 atomically applies a strictly increasing cumulative refund and derives booking payment truth over every captured PaymentIntent.';
