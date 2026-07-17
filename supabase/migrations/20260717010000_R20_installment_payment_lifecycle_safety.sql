-- R20: close the two installment lifecycle gaps found by independent review.
--
-- 1. A captured deposit (`payment_status = partial`) must never be treated as an
--    unpaid abandoned booking by the deadline cron.
-- 2. Stripe Connect destinations are provider-owned state. Browser callers may
--    read only their own owner row and may never insert/update/delete one.
-- 3. The appointment-time cash remainder needs one owner-only, idempotent ledger
--    action so a partial booking can reach a truthful paid state without a Stripe call.

CREATE OR REPLACE FUNCTION public.cancel_overdue_unpaid_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH overdue AS (
    SELECT booking.id
    FROM public.bookings AS booking
    JOIN public.payment_settings AS settings
      ON settings.calendar_id = booking.calendar_id
    WHERE booking.payment_required = true
      -- Only states that represent no captured money are eligible. `partial`,
      -- `paid`, `refunded` and `refund_required` are deliberately excluded.
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
  )
  UPDATE public.bookings AS booking
  SET status = 'cancelled', updated_at = now()
  WHERE booking.id IN (SELECT id FROM overdue);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_overdue_unpaid_bookings()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_overdue_unpaid_bookings()
  TO service_role;

-- Replace the historical owner-or-team FOR ALL policy. Edge Functions use the
-- service role; the browser only needs a truthful read for the account owner UI.
DROP POLICY IF EXISTS "business_stripe_accounts_account_owner_all"
  ON public.business_stripe_accounts;
DROP POLICY IF EXISTS "business_stripe_accounts_owner_read"
  ON public.business_stripe_accounts;

CREATE POLICY "business_stripe_accounts_owner_read"
ON public.business_stripe_accounts
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND account_owner_id = auth.uid()
  AND public.is_account_owner(auth.uid())
);

REVOKE ALL ON TABLE public.business_stripe_accounts
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.business_stripe_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.business_stripe_accounts TO service_role;

-- Prevent a browser caller with broad historical bookings UPDATE privileges from
-- forging payment truth or directly cancelling a booking after money was captured.
-- The reviewed SECURITY DEFINER RPCs execute as their owner and remain available.
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
       AND COALESCE(OLD.payment_status, 'none') IN ('paid', 'partial') THEN
      RAISE EXCEPTION 'CAPTURED_PAYMENT_REQUIRES_SECURE_BOOKING_ACTION'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS protect_booking_payment_state_from_browser
  ON public.bookings;
CREATE TRIGGER protect_booking_payment_state_from_browser
BEFORE UPDATE OF status, payment_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.protect_booking_payment_state_from_browser();

REVOKE ALL ON FUNCTION public.protect_booking_payment_state_from_browser()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_installment_balance_collected(
  p_booking_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_calendar_user_id uuid;
  v_pending_count integer;
  v_remaining_count integer;
BEGIN
  IF p_booking_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invalid_booking_id'
    );
  END IF;

  SELECT booking.*
  INTO v_booking
  FROM public.bookings AS booking
  WHERE booking.id = p_booking_id
    AND COALESCE(booking.is_deleted, false) = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'booking_not_found'
    );
  END IF;

  SELECT calendar.user_id
  INTO v_calendar_user_id
  FROM public.calendars AS calendar
  WHERE calendar.id = v_booking.calendar_id;

  -- This is an offline-money acknowledgement, so only the account owner may
  -- perform it. Team membership is deliberately insufficient.
  IF auth.uid() IS NOT NULL AND (
    NOT public.is_account_owner(auth.uid())
    OR public.get_account_owner_id(v_calendar_user_id) IS DISTINCT FROM auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: account owner required'
      USING ERRCODE = '42501';
  END IF;

  IF v_booking.status IN ('cancelled', 'no-show') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'booking_not_collectible',
      'status', v_booking.status
    );
  END IF;

  IF v_booking.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'booking_id', p_booking_id,
      'payment_status', 'paid',
      'idempotent_replay', true
    );
  END IF;

  IF v_booking.payment_status IS DISTINCT FROM 'partial' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'booking_not_partial',
      'payment_status', v_booking.payment_status
    );
  END IF;

  SELECT count(*)
  INTO v_pending_count
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
    AND installment.payment_timing = 'appointment'
    AND installment.payment_method = 'cash'
    AND installment.status = 'pending';

  IF v_pending_count <> 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'appointment_balance_ledger_invalid',
      'pending_balances', v_pending_count
    );
  END IF;

  UPDATE public.installment_payments AS installment
  SET status = 'paid', paid_at = now(), updated_at = now()
  WHERE installment.booking_id = p_booking_id
    AND installment.payment_timing = 'appointment'
    AND installment.payment_method = 'cash'
    AND installment.status = 'pending';

  SELECT count(*)
  INTO v_remaining_count
  FROM public.installment_payments AS installment
  WHERE installment.booking_id = p_booking_id
    AND installment.status NOT IN ('paid', 'refunded');

  IF v_remaining_count <> 0 THEN
    RAISE EXCEPTION 'INSTALLMENT_LEDGER_REMAINS_UNSETTLED'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.bookings
  SET payment_status = 'paid', updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'payment_status', 'paid',
    'idempotent_replay', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.record_installment_balance_collected(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_installment_balance_collected(uuid)
  TO authenticated, service_role;
