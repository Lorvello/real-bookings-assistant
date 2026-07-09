-- R27 (fix, launch-ready-loop full-journey agent simulation, provenance: R26 finding):
-- R26's adversarial round fired 2 real concurrent-INSERT races directly at Postgres for the
-- SAME calendar/slot and found the exclusion-constraint loser's error is non-deterministic:
-- `23P01` (exclusion violation) once, `40P01` (deadlock_detected) once. book_appointment's
-- insert handler in whatsapp-agent/tools.ts and this function's own EXCEPTION block both only
-- mapped `23P01` to the friendly "slot_taken" result; a `40P01` loser fell through to a raw
-- Postgres diagnostic string. tools.ts's book_appointment handler is fixed in the SAME round
-- (adds `insErr.code === "40P01"` alongside the existing `23P01` check). This migration is the
-- reschedule_appointment half of that fix: reschedule_booking_atomic is a SECURITY DEFINER RPC
-- that already catches `WHEN others` and maps known SQLSTATEs to a friendly jsonb error before
-- ever returning to tools.ts, so the mapping lives HERE, not in tools.ts's `rrErr` branch (that
-- branch only sees a raw error if the RPC call itself fails to execute, e.g. a bad argument;
-- it never sees exclusion/deadlock, both are caught inside this function's own EXCEPTION block).
-- A deadlock loser in a concurrent reschedule race is functionally identical to an exclusion-
-- violation loser from the customer's point of view (their concurrent attempt did not win the
-- slot), so it gets the exact same 'slot_taken' friendly result, not a raw DB error surfaced to
-- the model/customer. Body is byte-identical to the live SEQP2R5 definition except the single
-- SQLSTATE check on the line noted below; every other line (past-guard, calendar-switch,
-- agent_actions logging) is unchanged, zero behavioural drift beyond the new error mapping.
CREATE OR REPLACE FUNCTION public.reschedule_booking_atomic(
  p_booking_id uuid,
  p_new_start timestamptz,
  p_new_end timestamptz,
  p_service_type_id uuid DEFAULT NULL,
  p_calendar_id uuid DEFAULT NULL,
  p_conversation_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_cal uuid;
  v_old_cal uuid;
  v_status text;
  v_svc uuid;
  v_ok boolean;
  v_old_start timestamptz;
  v_old_end timestamptz;
BEGIN
  SELECT calendar_id, status, service_type_id, start_time, end_time
    INTO v_cal, v_status, v_svc, v_old_start, v_old_end
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'geen_boeking');
  END IF;

  v_old_cal := v_cal;

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

  -- SEQP2R5: log the move in the SAME transaction as the move itself.
  INSERT INTO public.agent_actions (
    booking_id, calendar_id, action_type, actor, old_value, new_value, conversation_id, channel
  ) VALUES (
    p_booking_id,
    v_cal,
    'reschedule',
    'agent',
    jsonb_build_object('start_time', v_old_start, 'end_time', v_old_end, 'calendar_id', v_old_cal),
    jsonb_build_object('start_time', p_new_start, 'end_time', p_new_end, 'calendar_id', v_cal),
    p_conversation_id,
    'whatsapp'
  );

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN others THEN
    -- R27: added '40P01' (deadlock_detected) alongside the pre-existing '23P01' (exclusion
    -- violation) check. Both are concurrent-race outcomes a loser can genuinely get from the
    -- SAME underlying contention on `bookings_no_overlap` (R26 observed both codes from
    -- identical concurrent-insert races against the same slot); both get the same friendly
    -- 'slot_taken' result.
    IF SQLSTATE IN ('23P01', '40P01') OR SQLERRM ILIKE '%no_overlap%' OR SQLERRM ILIKE '%exclusion%' OR SQLERRM ILIKE '%deadlock%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
    ELSIF SQLERRM = 'niet_beschikbaar' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'niet_beschikbaar');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) TO service_role;
