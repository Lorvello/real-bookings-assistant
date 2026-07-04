-- IUX R100 (F-R79-2 fix): out-of-order WhatsApp message arrival can silently drop a
-- customer-supplied name-correction. Root cause (found R79, re-confirmed live R100 after
-- checking R95-R98's adjacent work did NOT touch it): conversation history is ordered by
-- `whatsapp_messages.created_at` (DB insert time), while Meta's own `message.timestamp`
-- (the customer's true send time, present on every inbound webhook payload) is received
-- but never persisted. A flaky connection (or two fast customer messages) can make a
-- detail-only follow-up ("op naam van Piet graag") land in the DB BEFORE the request it
-- actually followed, and the agent's context window then shows it in the wrong order.
--
-- Fix (this migration + webhook + agent code, narrow/non-invasive per the run-spec's
-- own "guard" alternative): persist Meta's message timestamp alongside the existing
-- insertion-order created_at. This does NOT re-sequence the whole history (too invasive,
-- risks the just-stabilized R95-R98 window logic) — it gives the agent code a signal to
-- detect true out-of-order arrival (a message whose own send-time is EARLIER than the
-- immediately preceding stored message's send-time) and correct the small recency window
-- ordering for exactly that narrow case. Normal in-order delivery is provably unaffected:
-- when meta_timestamp order agrees with created_at order (the overwhelming common case),
-- the corrective branch never fires and history is unchanged.

ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS meta_timestamp timestamptz NULL;

COMMENT ON COLUMN public.whatsapp_messages.meta_timestamp IS
  'Meta Cloud API message.timestamp (customer''s true send time), NULL for rows persisted '
  'before R100 or for outbound/system rows. Used only to DETECT out-of-order arrival vs '
  'created_at (DB insert time); created_at remains the primary key for all existing ordering.';

CREATE OR REPLACE FUNCTION public.process_whatsapp_message(
  p_phone_number text, p_message_id text, p_message_content text, p_calendar_id uuid,
  p_message_timestamp timestamptz DEFAULT NULL
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
  -- R100: now also stores Meta's own message timestamp (p_message_timestamp), so
  -- out-of-order arrival can be DETECTED against created_at (see whatsapp-agent/index.ts).
  INSERT INTO public.whatsapp_messages (
    conversation_id, message_id, direction, message_type, content, meta_timestamp
  ) VALUES (
    v_conversation_id, p_message_id, 'inbound', 'text', p_message_content, p_message_timestamp
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
