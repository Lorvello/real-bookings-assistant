-- R33 (adversarial DoD-close, round 2) — two correctness hardenings:
--
--   #1 handle_new_booking() force-confirmed EVERY booking (NEW.status:='confirmed'
--      + confirmed_at) on BEFORE INSERT, overriding the 'pending' that the pay-and-book
--      paths set. Result: a Pay & Book reservation was recorded 'confirmed' (with
--      confirmed_at) BEFORE any payment — the owner dashboard showed it confirmed
--      during the unpaid window, and confirmBookingPaid became a no-op.
--      The differentiator is the payment_required flag, NOT the status value: the
--      WEB create-booking path inserts status='pending' for ALL bookings and RELIES
--      on this trigger to confirm the non-pay ones, so we cannot simply "respect
--      pending". Fix: force-confirm only when payment is NOT required; a
--      payment_required booking keeps its pending status and gets no confirmed_at
--      (confirmBookingPaid flips it to confirmed+paid on payment, the cron reclaims
--      it if never paid). Non-pay bookings (payment_required=false, the default for
--      web/WhatsApp/dashboard/admin inserts) behave exactly as before.
--
--   #2 reschedule_booking_atomic had no hard past-time guard: the boolean
--      validate_booking_security overload it calls does not check start <= now()
--      (only the slug overload does), so only the LLM/prompt prevented a move into
--      the past. Add a server-authoritative guard so a reschedule can never land in
--      the past regardless of what the model sends.

-- ---------------------------------------------------------------------------
-- #1 Respect pending for pay-and-book; force-confirm only non-pay bookings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_booking()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Force confirmed ONLY when no up-front payment is required. A pay-and-book
  -- reservation (payment_required = true) stays 'pending' until the Stripe webhook
  -- confirms payment; it must not be stamped confirmed/confirmed_at up front.
  IF COALESCE(NEW.payment_required, false) = true THEN
    NEW.status := COALESCE(NEW.status, 'pending');
  ELSE
    NEW.status := 'confirmed';
    NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  END IF;

  -- Genereer confirmation token als deze niet is opgegeven
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- #2 Atomic reschedule + hard server-side past-time guard
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reschedule_booking_atomic(
  p_booking_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz,
  p_service_type_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_cal uuid;
  v_status text;
  v_svc uuid;
  v_ok boolean;
BEGIN
  SELECT calendar_id, status, service_type_id
    INTO v_cal, v_status, v_svc
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'geen_boeking');
  END IF;

  -- Hard past-time guard (server-authoritative; the boolean validate overload
  -- does not check this). A reschedule can never land in the past.
  IF p_new_start <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'in_verleden');
  END IF;

  v_svc := COALESCE(p_service_type_id, v_svc);

  -- Free the slot first so validate_booking_security does not count the booking's
  -- OWN current slot as a conflict. Rolled back with everything else on any failure.
  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;

  v_ok := public.validate_booking_security(v_cal::uuid, v_svc::uuid, p_new_start, p_new_end, NULL::text);
  IF v_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'niet_beschikbaar';
  END IF;

  UPDATE public.bookings
     SET start_time = p_new_start,
         end_time   = p_new_end,
         status     = v_status,
         service_type_id = v_svc
   WHERE id = p_booking_id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN others THEN
    IF SQLSTATE = '23P01' OR SQLERRM ILIKE '%no_overlap%' OR SQLERRM ILIKE '%exclusion%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
    ELSIF SQLERRM = 'niet_beschikbaar' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'niet_beschikbaar');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid) TO service_role;
