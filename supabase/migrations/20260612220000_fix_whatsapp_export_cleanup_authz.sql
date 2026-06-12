-- SECURITY: close cross-tenant holes in the WhatsApp privacy RPCs.
--
-- 1) cleanup_whatsapp_data_for_calendar(uuid): SECURITY DEFINER, no ownership
--    check -> any authenticated user could run another tenant's retention-cleanup
--    (DELETE of WhatsApp messages/context past the retention cutoff) by passing a
--    foreign calendar_id. Confirmed live: user B executed it against user A's
--    calendar with no authorization error. Add a team-aware ownership guard;
--    service_role / internal retention jobs (auth.uid() NULL) still bypass.
--
-- 2) export_whatsapp_data: had TWO overloads. The 3-arg (calendar_id,start,end)
--    variant had NO ownership check -> cross-tenant export of conversations +
--    contact phone numbers. The 1-arg variant DID check ownership but (a) used
--    unqualified table names under search_path='' (so it errored), and (b)
--    collided with the 3-arg overload, making the frontend's {p_calendar_id}-only
--    call ambiguous (PGRST203 -> export broken for everyone). Drop the unguarded
--    3-arg overload (no caller passes date ranges - verified by grep) and rebuild
--    the 1-arg with schema-qualified tables. This removes the leak AND restores a
--    working export.

-- 1) cleanup: ownership guard
CREATE OR REPLACE FUNCTION public.cleanup_whatsapp_data_for_calendar(p_calendar_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  retention_days integer;
  cutoff_date timestamp with time zone;
BEGIN
  -- SECURITY: authenticated callers must own the calendar; service_role /
  -- internal retention jobs (auth.uid() NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  retention_days := public.get_whatsapp_data_retention_days(p_calendar_id);
  cutoff_date := NOW() - (retention_days || ' days')::interval;

  DELETE FROM public.whatsapp_messages wm
  USING public.whatsapp_conversations wc
  WHERE wm.conversation_id = wc.id
    AND wc.calendar_id = p_calendar_id
    AND wm.created_at < cutoff_date;

  DELETE FROM public.conversation_context cc
  USING public.whatsapp_conversations wc
  WHERE cc.conversation_id = wc.id
    AND wc.calendar_id = p_calendar_id
    AND cc.created_at < cutoff_date;
END;
$function$;

-- 2a) drop the unguarded, ambiguity-causing 3-arg overload
DROP FUNCTION IF EXISTS public.export_whatsapp_data(uuid, date, date);

-- 2b) rebuild 1-arg export: ownership guard + schema-qualified tables
CREATE OR REPLACE FUNCTION public.export_whatsapp_data(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.calendars
    WHERE id = p_calendar_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'export_date', now(),
    'calendar_id', p_calendar_id,
    'contacts', (
      SELECT jsonb_agg(row_to_json(wc.*))
      FROM public.whatsapp_contacts wc
      WHERE wc.id IN (
        SELECT DISTINCT contact_id
        FROM public.whatsapp_conversations
        WHERE calendar_id = p_calendar_id
      )
    ),
    'conversations', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'conversation', row_to_json(conv.*),
          'messages', (
            SELECT jsonb_agg(row_to_json(msg.*) ORDER BY msg.created_at)
            FROM public.whatsapp_messages msg
            WHERE msg.conversation_id = conv.id
          )
        )
      )
      FROM public.whatsapp_conversations conv
      WHERE conv.calendar_id = p_calendar_id
    ),
    'templates', (
      SELECT jsonb_agg(row_to_json(tmpl.*))
      FROM public.whatsapp_templates tmpl
      WHERE tmpl.calendar_id = p_calendar_id
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- No anon caller for these owner privacy actions.
REVOKE EXECUTE ON FUNCTION public.cleanup_whatsapp_data_for_calendar(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.export_whatsapp_data(uuid) FROM anon;
