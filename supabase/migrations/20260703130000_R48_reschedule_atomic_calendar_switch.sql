-- R48 (T3, new agent capability): reschedule_booking_atomic gains an optional
-- p_calendar_id so a multi-calendar tenant's customer can reschedule to a
-- DIFFERENT staff member / location, not just a new time on the SAME calendar.
--
-- Before this: the function always read v_cal FROM THE EXISTING BOOKING ROW and
-- used it for the whole move (slot-free, validate_booking_security, the final
-- UPDATE), so even if the caller passed a new service_type_id belonging to a
-- DIFFERENT calendar, availability was checked against the OLD calendar's slot
-- table and the booking stayed on the OLD calendar_id. Not a data-integrity bug
-- (no cross-tenant write: v_cal always came from the booking's own current row,
-- itself already inside the owner's calendar set), but a real usability gap: the
-- agent had no way to honour "kan ik naar [andere medewerker] verzetten" short of
-- a separate cancel + book (two confirms, and book_appointment's own duplicate-
-- booking guard would need explicit handling).
--
-- p_calendar_id defaults to NULL, in which case the ORIGINAL calendar_id is kept
-- exactly as before (COALESCE), so every existing single-calendar caller and
-- every existing same-calendar multi-calendar reschedule is byte-for-byte
-- unchanged. The caller (tools.ts) always resolves p_calendar_id server-side via
-- the SAME resolveBookingCalendar() allowlist-routing already used by
-- get_available_slots/book_appointment, so the model can never pass a UUID
-- outside the owner's own calendar set (no new trust boundary opened).

CREATE OR REPLACE FUNCTION public.reschedule_booking_atomic(
  p_booking_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz,
  p_service_type_id uuid DEFAULT NULL,
  p_calendar_id uuid DEFAULT NULL
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
  -- R48: only switch calendars when the caller explicitly resolved a new one;
  -- unset (NULL) keeps the booking's own current calendar, unchanged behaviour.
  v_cal := COALESCE(p_calendar_id, v_cal);

  -- Free the slot first so validate_booking_security does not count the booking's
  -- OWN current slot as a conflict. Rolled back with everything else on any failure.
  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;

  -- v_cal may now be a DIFFERENT calendar than the booking's original one (R48);
  -- validate_booking_security correctly checks THAT calendar's slot table, since
  -- the freed row above no longer occupies either calendar's schedule.
  v_ok := public.validate_booking_security(v_cal::uuid, v_svc::uuid, p_new_start, p_new_end, NULL::text);
  IF v_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'niet_beschikbaar';
  END IF;

  -- Move to the new time (and possibly new calendar) and restore the original status.
  UPDATE public.bookings
     SET start_time = p_new_start,
         end_time   = p_new_end,
         status     = v_status,
         service_type_id = v_svc,
         calendar_id = v_cal
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

REVOKE ALL ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid) TO service_role;

-- The old 4-arg signature is superseded by the 5-arg one above (same name, new
-- optional trailing param = a new overload in Postgres, not a replacement). Drop
-- the old overload explicitly so PostgREST/pg never has two ambiguous candidates
-- for a 4-arg call (tools.ts is updated in this same round to always pass 5 args,
-- but belt-and-suspenders: any stray old caller would otherwise silently keep
-- hitting the old single-calendar-only behaviour instead of erroring loudly).
DROP FUNCTION IF EXISTS public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid);
