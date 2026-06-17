-- Fix: process_whatsapp_message crashte op regel 62 (webhook_events-insert) omdat de
-- payload get_conversation_context aanroept, en die functie had een SQL-fout: de
-- previous_bookings-subquery deed `jsonb_agg(...) ... ORDER BY b.created_at DESC LIMIT 5`,
-- d.w.z. een ORDER BY/LIMIT NA een aggregaat -> "column b.created_at must appear in the
-- GROUP BY clause". Daardoor faalde het hele opslaan van een inkomend bericht.
--
-- Fix: alle drie lijst-subqueries (recent_messages, context_history, previous_bookings)
-- limiteren+sorteren nu eerst in een subquery en aggregeren daarna met de ORDER BY BINNEN
-- jsonb_agg. Dit lost de crash op EN respecteert de LIMITs (die voorheen no-ops waren).
-- Security-check + signatuur ongewijzigd.
create or replace function public.get_conversation_context(p_phone_number text, p_calendar_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'contact', row_to_json(wc.*),
    'conversation', row_to_json(conv.*),
    'recent_messages', (
      SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.created_at DESC)
      FROM (
        SELECT * FROM public.whatsapp_messages
        WHERE conversation_id = conv.id
        ORDER BY created_at DESC
        LIMIT 10
      ) m
    ),
    'active_booking_intent', (
      SELECT row_to_json(bi.*)
      FROM public.booking_intents bi
      WHERE bi.conversation_id = conv.id
      AND bi.status = 'collecting_info'
      ORDER BY bi.created_at DESC
      LIMIT 1
    ),
    'context_history', (
      SELECT jsonb_agg(row_to_json(cc.*) ORDER BY cc.created_at DESC)
      FROM (
        SELECT * FROM public.conversation_context
        WHERE conversation_id = conv.id
        AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at DESC
        LIMIT 20
      ) cc
    ),
    'previous_bookings', (
      SELECT jsonb_agg(row_to_json(b.*) ORDER BY b.created_at DESC)
      FROM (
        SELECT * FROM public.bookings
        WHERE customer_phone = p_phone_number
        AND calendar_id = p_calendar_id
        ORDER BY created_at DESC
        LIMIT 5
      ) b
    )
  ) INTO v_result
  FROM public.whatsapp_contacts wc
  LEFT JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id AND conv.calendar_id = p_calendar_id
  WHERE wc.phone_number = p_phone_number;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;
