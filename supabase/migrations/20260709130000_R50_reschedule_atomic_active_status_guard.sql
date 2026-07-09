-- R50 (fix, launch-ready-loop full-journey agent simulation, provenance: R49 finding):
-- reschedule_booking_atomic had NO active-status guard. It read whatever status a booking
-- currently had via its own `SELECT ... FOR UPDATE`, moved start_time/end_time to the new
-- slot, restored that SAME (possibly already-cancelled) status on the final UPDATE, and
-- returned {ok:true} unconditionally. tools.ts's caller (reschedule_appointment, ~line 3525)
-- only checks rres.ok, never re-reads the resulting status, so a booking cancelled (e.g. a
-- concurrent Stripe-wall auto-cancel) in the narrow window between resolveTarget's read and
-- this RPC call, inside the SAME reschedule_appointment turn, would silently "succeed" and
-- get its time moved while remaining dead, and the agent would tell the customer "Gedaan, de
-- afspraak staat nu op [nieuwe tijd]", a false-success claim. Live-reproduced R49: flipped a
-- settled Bo booking to status='cancelled', called reschedule_booking_atomic directly, got
-- {ok:true} with start_time/end_time silently moved while status stayed 'cancelled'.
--
-- This is the SAME failure class R40/R48 fixed for cancel_appointment's raw .update() (a
-- WHERE-clause status re-assertion + affected-row check), but reschedule commits through a
-- completely different code path (this Postgres RPC, not a JS .update() call), so R48's fix
-- never touched it. Mirrors R48's own approach for consistency: re-assert an active-status
-- check immediately after the row lock, return the SAME 'geen_boeking' failure shape the
-- "not found" branch already uses (tools.ts already treats 'geen_boeking' as "Ik kan geen
-- aankomende afspraak vinden om te verzetten.", so no tools.ts change is needed, the RPC's
-- existing error contract already covers this case honestly), rather than proceeding to move
-- a dead booking and reporting false success.
--
-- Body is otherwise byte-identical to the live R27 definition (deadlock/exclusion error
-- mapping, agent_actions logging, p_conversation_id) except the new guard clause immediately
-- after the initial SELECT ... FOR UPDATE.
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

  -- R50: the active-status guard R49 found missing. A booking that is not confirmed/pending
  -- (already cancelled, e.g. by a concurrent Stripe-wall auto-cancel that landed between the
  -- caller's own resolveTarget read and this RPC call) is not a real, actionable appointment
  -- to move, exactly the same standard resolveTarget's own SELECT already applies before ever
  -- calling this RPC (see R48's ROUNDS entry). Returning the SAME 'geen_boeking' shape the
  -- NOT FOUND branch above already uses means tools.ts needs no new error-branch handling,
  -- the existing "Ik kan geen aankomende afspraak vinden om te verzetten." message is already
  -- the honest, correct customer-facing response for both cases.
  IF v_status NOT IN ('confirmed', 'pending') THEN
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
  -- v_status here is guaranteed 'confirmed' or 'pending' by the guard above, so this can
  -- never restore a 'cancelled' status onto a moved booking.
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
    -- R27: '40P01' (deadlock_detected) alongside '23P01' (exclusion violation), both
    -- concurrent-race outcomes a loser can genuinely get from the same underlying contention.
    IF SQLSTATE IN ('23P01', '40P01') OR SQLERRM ILIKE '%no_overlap%' OR SQLERRM ILIKE '%exclusion%' OR SQLERRM ILIKE '%deadlock%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
    ELSIF SQLERRM = 'niet_beschikbaar' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'niet_beschikbaar');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

-- R46-class grant re-assertion: CREATE OR REPLACE resets grants to the schema default (EXECUTE
-- to PUBLIC); re-assert the locked posture so this migration cannot silently reopen anon/
-- authenticated access to this SECURITY DEFINER function on replay (fresh DB / db reset).
REVOKE EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) TO service_role;
