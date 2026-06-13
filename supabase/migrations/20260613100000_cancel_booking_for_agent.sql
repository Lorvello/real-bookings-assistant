-- LR-R60: agent-cancel met telefoon-ownership-check + handhaving van het annuleer-beleid.
-- De WhatsApp-agent beloofde annuleren/verzetten maar had er geen tool voor (LR-R59 GAP A),
-- en cancel_booking_by_token handhaafde cancellation_deadline_hours niet (GAP B).
-- Deze RPC wordt als agent-tool 'Cancel appointment' aangeroepen: hij verifieert dat de
-- boeking bij het telefoonnummer van de afzender hoort, checkt allow_cancellations en
-- dwingt cancellation_deadline_hours af, en zet dan status='cancelled'.
-- Reschedule = cancel (deze RPC) + book_appointment.

CREATE OR REPLACE FUNCTION public.cancel_booking_for_agent(
  p_booking_id uuid,
  p_phone text,
  p_reason text DEFAULT 'Geannuleerd via WhatsApp'
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_b bookings%ROWTYPE;
  v_allow boolean;
  v_deadline int;
  v_hours numeric;
BEGIN
  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Boeking niet gevonden');
  END IF;

  -- Ownership: de afzender mag alleen z'n eigen boeking annuleren.
  IF v_b.customer_phone IS DISTINCT FROM p_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deze boeking hoort niet bij dit telefoonnummer');
  END IF;

  IF v_b.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deze afspraak is al geannuleerd');
  END IF;

  -- Beleid: allow_cancellations + cancellation_deadline_hours (GAP B).
  SELECT cs.allow_cancellations, cs.cancellation_deadline_hours
    INTO v_allow, v_deadline
  FROM calendar_settings cs
  WHERE cs.calendar_id = v_b.calendar_id;

  IF v_allow IS NOT NULL AND v_allow = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Annuleren via de assistent is niet toegestaan; neem contact op met de zaak');
  END IF;

  v_hours := EXTRACT(EPOCH FROM (v_b.start_time - now())) / 3600;
  IF v_deadline IS NOT NULL AND v_hours < v_deadline THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Te laat om te annuleren: dat moet minimaal %s uur van tevoren. Neem contact op met de zaak.', v_deadline));
  END IF;

  UPDATE bookings
     SET status = 'cancelled',
         cancelled_at = now(),
         cancellation_reason = p_reason,
         updated_at = now()
   WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'cancelled_at', now());
END;
$function$;
