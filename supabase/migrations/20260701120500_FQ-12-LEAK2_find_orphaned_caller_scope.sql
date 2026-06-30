-- FQ-12 LEAK2 (sev-2): cross-tenant PII read via find_orphaned_whatsapp_conversations().
--
-- The SECURITY DEFINER RPC (migration 20250630144206) returned EVERY NULL-calendar
-- conversation whose contact phone matches ANY booking, across ALL tenants, with
-- NO caller-ownership guard. EXECUTE is granted to authenticated (the dashboard
-- hook useOrphanedConversations calls it), so any logged-in tenant T1 could read a
-- foreign tenant's conversation incl. contact_phone / contact_name (PII).
--
-- Fix: keep EXECUTE on authenticated (the frontend caller needs it) but scope the
-- result to the CALLER. The orphan-qualifying booking must now live on a calendar
-- owned by auth.uid(). Internal / cron / service-role call-chains (auth.uid() IS
-- NULL, e.g. the link tooling) keep the global view so existing automation is
-- unaffected. The return shape is unchanged.
--
-- search_path is pinned to '' and all names are schema-qualified per the project's
-- security-definer convention.

CREATE OR REPLACE FUNCTION public.find_orphaned_whatsapp_conversations()
RETURNS TABLE(
  conversation_id uuid,
  contact_phone text,
  contact_name text,
  message_count bigint,
  last_activity timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    wc.id as conversation_id,
    wco.phone_number as contact_phone,
    COALESCE(wco.display_name, wco.first_name || ' ' || wco.last_name) as contact_name,
    (SELECT COUNT(*) FROM public.whatsapp_messages wm WHERE wm.conversation_id = wc.id) as message_count,
    wc.last_message_at as last_activity
  FROM public.whatsapp_conversations wc
  JOIN public.whatsapp_contacts wco ON wc.contact_id = wco.id
  WHERE wc.calendar_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.calendars cal ON cal.id = b.calendar_id
      WHERE b.customer_phone = wco.phone_number
        -- caller-ownership scope: authenticated callers only see orphans tied to
        -- a booking on a calendar they own; service-role / internal call-chains
        -- (v_uid IS NULL) keep the global view for cron / link tooling.
        AND (v_uid IS NULL OR cal.user_id = v_uid)
    )
  ORDER BY wc.last_message_at DESC NULLS LAST;
END;
$$;

-- Preserve the grant posture set by R46 (authenticated + service_role; never anon/PUBLIC).
REVOKE EXECUTE ON FUNCTION public.find_orphaned_whatsapp_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_orphaned_whatsapp_conversations() TO authenticated, service_role;
