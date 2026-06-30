-- E-3 (sev-2): owner booking actions from the logged-in dashboard.
-- The owner could NOT act on a booking: BookingDetailModal was read-only, no
-- useBookings/calendar hook exposed cancel/mark-no-show, and although `no-show`
-- is a valid status (displayed + counted in the No-Show Rate analytics card),
-- there was NO owner action to SET it, nor an owner cancel/reschedule. A merchant
-- whose customer does not show up had no way to record it (no-show analytics stayed
-- empty) nor to cancel/move a booking except via the customer's WhatsApp.
--
-- This RPC is the server-side guard for the new owner CANCEL + MARK-NO-SHOW actions.
-- Authorization mirrors the canonical team-aware owner pattern caller_owns_calendar
-- (20260612210000_fix_cross_tenant_dashboard_read_leak): COALESCE(account_owner_id, id)
-- of the booking's calendar owner must equal the caller's account (auth.uid()). No IDOR:
-- a different tenant's JWT cannot mutate this booking. service_role / internal chains
-- (auth.uid() IS NULL) bypass, same as the read RPCs.
--
-- Guardrails (only transitions that make sense):
--   * MARK-NO-SHOW: only from confirmed/pending; refused if the appointment is still in
--     the future (you cannot no-show a booking that has not happened yet); refused if
--     already cancelled/completed/no-show.
--   * CANCEL: refused if already cancelled/completed/no-show.
-- Slot freeing is automatic: the bookings_no_overlap EXCLUDE constraint already excludes
-- status IN ('cancelled','no-show'), so setting either status reopens the slot with no
-- double-book risk (no application code needed).
-- Payment: a paid booking that is cancelled or marked no-show is NOT auto-refunded
-- (router rule #3). We flag payment_status='refund_required' and append an internal note
-- so the owner handles the refund manually (mirrors the E-6 confirmBookingPaid pattern).

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
