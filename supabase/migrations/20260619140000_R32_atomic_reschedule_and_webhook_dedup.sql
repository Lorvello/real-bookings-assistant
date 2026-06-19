-- R32 (adversarial DoD-close) — two launch-readiness hardenings found by the
-- adversarial customer-journey review:
--
--   #1 Reschedule was non-atomic. tools.ts did free-slot -> validate -> move as
--      three separate edge-function calls, with restore-on-failure only inside the
--      JS error branches. A crash/timeout BETWEEN freeing the slot and moving it
--      left a confirmed booking 'cancelled' with no replacement and no trace — the
--      customer was silently un-booked. This wraps the whole thing in one
--      transaction so any failure rolls everything back to the original booking.
--
--   #2 Meta re-delivers a webhook whenever it does not get a timely 200, and the
--      webhook awaits the full agent run (several seconds) before returning 200.
--      process_whatsapp_message inserted into whatsapp_messages (UNIQUE message_id)
--      with no ON CONFLICT, so a retry errored but the webhook invoked the agent
--      anyway -> the customer got a second reply to one message. The insert is now
--      idempotent and the function reports duplicate=true so the webhook can skip
--      the agent on a retry.

-- ---------------------------------------------------------------------------
-- #1 Atomic reschedule
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

  v_svc := COALESCE(p_service_type_id, v_svc);

  -- Free the slot first so validate_booking_security does not count the booking's
  -- OWN current slot as a conflict (a small shift would otherwise always read as
  -- unavailable). This UPDATE is rolled back with everything else if any step
  -- below fails — the booking is never left cancelled-with-no-replacement.
  UPDATE public.bookings SET status = 'cancelled' WHERE id = p_booking_id;

  -- Boolean overload: (calendar_id uuid, service_type_id uuid, start, end, email)
  v_ok := public.validate_booking_security(v_cal::uuid, v_svc::uuid, p_new_start, p_new_end, NULL::text);
  IF v_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'niet_beschikbaar';
  END IF;

  -- Move to the new time and restore the original status. The bookings_no_overlap
  -- GiST exclusion constraint catches a race (slot taken in between) and raises,
  -- which the handler below turns into a clean error after a full rollback.
  UPDATE public.bookings
     SET start_time = p_new_start,
         end_time   = p_new_end,
         status     = v_status,
         service_type_id = v_svc
   WHERE id = p_booking_id;

  RETURN jsonb_build_object('ok', true);
EXCEPTION
  WHEN others THEN
    -- Any failure rolls back the cancel + move, so the booking is left exactly as
    -- it was. Map the known cases for the agent; everything else is surfaced raw.
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

-- ---------------------------------------------------------------------------
-- #2 Idempotent process_whatsapp_message (dedup Meta retries)
-- Body is unchanged except: the message insert is ON CONFLICT (message_id) DO
-- NOTHING, and a duplicate short-circuits with duplicate=true (skipping the n8n
-- webhook_events insert too). The normal path returns duplicate=false.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_whatsapp_message(
  p_phone_number text, p_message_id text, p_message_content text, p_calendar_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
  v_calendar_owner uuid;
  v_limit_check boolean;
  v_msg_id uuid;
BEGIN
  -- Get calendar owner
  SELECT user_id INTO v_calendar_owner
  FROM public.calendars
  WHERE id = p_calendar_id;

  -- Check if contact already exists
  SELECT id INTO v_contact_id
  FROM public.whatsapp_contacts
  WHERE phone_number = p_phone_number;

  -- If contact doesn't exist, check limits
  IF v_contact_id IS NULL THEN
    SELECT public.check_whatsapp_contact_limit(v_calendar_owner, p_calendar_id) INTO v_limit_check;

    IF NOT v_limit_check THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'WhatsApp contact limit reached for this subscription tier',
        'error_code', 'CONTACT_LIMIT_REACHED'
      );
    END IF;
  END IF;

  -- Create or update contact
  INSERT INTO public.whatsapp_contacts (phone_number)
  VALUES (p_phone_number)
  ON CONFLICT (phone_number)
  DO UPDATE SET last_seen_at = now()
  RETURNING id INTO v_contact_id;

  -- Create or find conversation
  INSERT INTO public.whatsapp_conversations (calendar_id, contact_id)
  VALUES (p_calendar_id, v_contact_id)
  ON CONFLICT (calendar_id, contact_id)
  DO UPDATE SET last_message_at = now()
  RETURNING id INTO v_conversation_id;

  -- Save message — idempotent on the UNIQUE message_id. On a Meta retry of the
  -- same message.id the insert does nothing and v_msg_id stays NULL.
  INSERT INTO public.whatsapp_messages (
    conversation_id, message_id, direction, message_type, content
  ) VALUES (
    v_conversation_id, p_message_id, 'inbound', 'text', p_message_content
  )
  ON CONFLICT (message_id) DO NOTHING
  RETURNING id INTO v_msg_id;

  IF v_msg_id IS NULL THEN
    -- Already processed this exact inbound message — do NOT re-trigger n8n and
    -- signal the webhook to skip the agent.
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true,
      'conversation_id', v_conversation_id
    );
  END IF;

  -- Trigger webhook for n8n processing
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    p_calendar_id,
    'whatsapp.message.received',
    jsonb_build_object(
      'contact_id', v_contact_id,
      'conversation_id', v_conversation_id,
      'phone_number', p_phone_number,
      'message', p_message_content,
      'context', public.get_conversation_context(p_phone_number, p_calendar_id)
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'conversation_id', v_conversation_id
  );
END;
$function$;
