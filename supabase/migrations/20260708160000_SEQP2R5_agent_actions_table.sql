-- SEQP2R5 (Sequenced Roadmap Phase 2, round 5): owner activity log data model.
-- Decision + full design already made in
-- ../../../Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r4_datamodel.md; this migration
-- builds it, wires the three agent mutation write sites (book/reschedule/cancel), plus the
-- owner-actor path (owner_update_booking_status, E3), so an owner can see WHO changed a
-- booking, from WHAT to WHAT, over WHICH channel. Override/undo (P2-3) is a separate round;
-- the overridden_at/overridden_by/override_action columns exist now so that round needs no
-- second migration for its data model.

-- 1. THE TABLE.
CREATE TABLE public.agent_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  calendar_id       uuid NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  action_type       text NOT NULL CHECK (action_type IN ('book', 'reschedule', 'cancel', 'no_show')),
  actor             text NOT NULL DEFAULT 'agent' CHECK (actor IN ('agent', 'owner')),
  -- old/new snapshots as jsonb so one column shape covers all mutation types (book: old_value
  -- NULL; reschedule: {start_time,end_time,calendar_id}; cancel/no_show: {status,
  -- cancellation_reason[,payment_status]}).
  old_value         jsonb,
  new_value         jsonb NOT NULL,
  -- Trace-back: which conversation/channel triggered this, so an owner can open the actual
  -- WhatsApp exchange. Nullable because owner-actor rows (dashboard clicks) have no conversation.
  conversation_id   uuid REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  channel           text NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'dashboard', 'system')),
  -- Override/undo support (populated later by P2-3, columns exist now so the schema does not
  -- need a second migration when override ships).
  overridden_at     timestamptz,
  overridden_by     uuid REFERENCES public.users(id),
  override_action   text CHECK (override_action IN ('undo', 'flagged_for_followup')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_actions_calendar_created ON public.agent_actions (calendar_id, created_at DESC);
CREATE INDEX idx_agent_actions_booking ON public.agent_actions (booking_id);

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

-- 2. RLS: reuse caller_owns_calendar() in the exact shape used elsewhere (e.g.
-- owner_update_booking_status, get_dashboard_metrics), team-aware via account_owner_id.
CREATE POLICY agent_actions_owner_read ON public.agent_actions
  FOR SELECT TO authenticated
  USING (public.caller_owns_calendar(calendar_id));

COMMENT ON POLICY agent_actions_owner_read ON public.agent_actions IS
  'SEQP2R5: tenant owner (+ team members under the same account_owner_id) can read their own agent_actions rows, mirroring the caller_owns_calendar pattern used by owner_update_booking_status and the dashboard metrics RPCs.';

-- 3. Writes only via SECURITY DEFINER RPCs / service_role from the edge functions; no direct
-- authenticated INSERT/UPDATE/DELETE. Explicit REVOKE/GRANT, never relying on Supabase project
-- defaults (this whole exercise, P2-0, exists because relying on defaults is exactly how
-- claim_booking_reminder/record_booking_reminder_result silently ended up open).
REVOKE ALL ON public.agent_actions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agent_actions TO authenticated; -- gated by agent_actions_owner_read above
GRANT ALL ON public.agent_actions TO service_role;

-- 4. reschedule_booking_atomic gains an optional trailing p_conversation_id (uuid, default
-- NULL), and now writes its own agent_actions row INSIDE the same transaction as the move
-- itself (design note §5: this is the one write site best placed in SQL, not tools.ts, so the
-- log and the atomic move commit or roll back together, no race). old_value is captured from
-- the SAME pre-move SELECT ... FOR UPDATE the function already does (no second SELECT added).
-- p_conversation_id defaults to NULL so a caller that never passes it still gets a valid log
-- row (conversation_id NULL), never a broken function.
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
    IF SQLSTATE = '23P01' OR SQLERRM ILIKE '%no_overlap%' OR SQLERRM ILIKE '%exclusion%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'slot_taken');
    ELSIF SQLERRM = 'niet_beschikbaar' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'niet_beschikbaar');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

-- Live-caught during this same round (Mgmt-API applies as role postgres, and this project has
-- an ALTER DEFAULT PRIVILEGES entry for role postgres on functions that grants EXECUTE
-- DIRECTLY to anon/authenticated/service_role on every newly CREATEd function, confirmed via
-- pg_default_acl, independent of PUBLIC): a brand-new function signature (this 6-arg overload
-- did not exist before this migration) needs anon/authenticated REVOKEd EXPLICITLY, not just
-- FROM PUBLIC, or the direct default-privilege grant silently survives the PUBLIC revoke.
-- REVOKE ALL ... FROM PUBLIC alone was confirmed live to leave anon_exec=true,
-- authenticated_exec=true on this exact overload; this is the fixed, verified-clean form.
REVOKE ALL ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid, uuid) TO service_role;

-- Drop the old 5-arg overload explicitly (same discipline as R48's own comment: two
-- overloads of the same name is an ambiguity risk for PostgREST/any stray caller; tools.ts is
-- updated in this same round to always pass 6 args).
DROP FUNCTION IF EXISTS public.reschedule_booking_atomic(uuid, timestamptz, timestamptz, uuid, uuid);

-- 5. owner_update_booking_status (E3) gains the owner-actor agent_actions row. Same signature
-- (CREATE OR REPLACE preserves ACLs, no DROP+CREATE here, so no grants gap to reintroduce),
-- REVOKE/GRANT re-stated anyway as defense-in-depth per this project's own standing convention.
-- Reuses v_b (the pre-mutation SELECT * INTO the function already does), no second SELECT.
CREATE OR REPLACE FUNCTION public.owner_update_booking_status(
  p_booking_id uuid,
  p_new_status text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $function$
DECLARE
  v_b public.bookings%ROWTYPE;
  v_paid boolean;
  v_note text;
  v_flag_payment boolean := false;
BEGIN
  -- Only the two owner-action transitions are allowed through this RPC.
  IF p_new_status NOT IN ('cancelled', 'no-show') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status',
      'message', 'Only cancel or no-show are supported.');
  END IF;

  SELECT * INTO v_b FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found',
      'message', 'Booking not found.');
  END IF;

  -- AUTHORIZATION (team-aware, IDOR-proof). authenticated callers must own the
  -- booking's calendar; service_role / internal chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(v_b.calendar_id) THEN
    RAISE EXCEPTION 'Access denied: booking not owned by caller' USING ERRCODE = '42501';
  END IF;

  -- Cannot re-transition a terminal booking.
  IF v_b.status IN ('cancelled', 'completed', 'no-show') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_transition',
      'message', format('Booking is already %s.', v_b.status),
      'current_status', v_b.status);
  END IF;

  -- MARK-NO-SHOW guardrails.
  IF p_new_status = 'no-show' THEN
    -- A booking that has not started yet cannot be a no-show.
    IF v_b.start_time > now() THEN
      RETURN jsonb_build_object('success', false, 'error', 'booking_in_future',
        'message', 'You cannot mark a future appointment as a no-show.',
        'current_status', v_b.status);
    END IF;
  END IF;

  -- Payment: never auto-refund (router rule #3). If money was taken, flag for manual
  -- handling instead of silently dropping it.
  v_paid := COALESCE(v_b.payment_status, 'none') = 'paid';
  IF v_paid THEN
    v_flag_payment := true;
    v_note := format('[E3] Owner set status=%s on a PAID booking at %s; manual refund decision required (no auto-refund).',
      p_new_status, now());
  END IF;

  -- TOCTOU-safe single UPDATE: re-assert the booking is still in a non-terminal state
  -- so two concurrent owner clicks cannot both win.
  UPDATE public.bookings
     SET status = p_new_status,
         cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN now() ELSE cancelled_at END,
         cancellation_reason = CASE
           WHEN p_new_status = 'cancelled'
             THEN COALESCE(p_reason, 'Cancelled by owner from dashboard')
           ELSE cancellation_reason END,
         payment_status = CASE WHEN v_flag_payment THEN 'refund_required' ELSE payment_status END,
         internal_notes = CASE
           WHEN v_flag_payment
             THEN TRIM(BOTH E'\n' FROM COALESCE(internal_notes, '') || E'\n' || v_note)
           ELSE internal_notes END,
         updated_at = now()
   WHERE id = p_booking_id
     AND status NOT IN ('cancelled', 'completed', 'no-show');

  IF NOT FOUND THEN
    -- Lost the race; another writer already moved it to a terminal state.
    RETURN jsonb_build_object('success', false, 'error', 'invalid_transition',
      'message', 'Booking status changed in the meantime; reload and try again.');
  END IF;

  -- SEQP2R5: owner-actor log row, same transaction as the UPDATE above.
  INSERT INTO public.agent_actions (
    booking_id, calendar_id, action_type, actor, old_value, new_value, conversation_id, channel
  ) VALUES (
    p_booking_id,
    v_b.calendar_id,
    CASE WHEN p_new_status = 'no-show' THEN 'no_show' ELSE 'cancel' END,
    'owner',
    jsonb_build_object('status', v_b.status),
    jsonb_build_object('status', p_new_status)
      || CASE WHEN v_flag_payment THEN jsonb_build_object('payment_status', 'refund_required') ELSE '{}'::jsonb END,
    NULL,
    'dashboard'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'status', p_new_status,
    'payment_flagged_refund_required', v_flag_payment
  );
END;
$function$;

-- No anon caller for an owner action; restrict to authenticated + service_role.
REVOKE EXECUTE ON FUNCTION public.owner_update_booking_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_booking_status(uuid, text, text) TO authenticated, service_role;
