-- WHATSAPP_E2E_TEST_INFRA Item 3 (gate-rejection visibility). SEPARATE initiative from the
-- sequenced-roadmap loop (SEQPxRy tags); tagged WHATSAPPE2E3 to keep provenance clear.
--
-- Today a dropped real inbound WhatsApp message (any of the 3 access gates: phone resolution,
-- entitlement, bot-toggle) is a buried row in webhook_security_logs with no dashboard visibility.
-- This migration adds a read-only RPC so a tenant can see when THEIR OWN messages were blocked by
-- the entitlement or bot-toggle gate (the two gate types that carry an owner/calendar id in
-- event_data). Phone-resolution failures (ambiguous-tenant / codeless-stranger) are NOT
-- tenant-attributable by definition (that is the whole reason they are ambiguous/codeless), so
-- they are handled separately by a severity-escalation change in the edge function, not this RPC.
--
-- Mirrors the existing get_customer_metrics / caller_owns_calendar pattern
-- (20260612210000_fix_cross_tenant_dashboard_read_leak.sql): unnest + caller_owns_calendar check,
-- SECURITY DEFINER, explicit REVOKE/GRANT (never relying on project defaults, per the grants
-- lockdown standing doctrine).

CREATE OR REPLACE FUNCTION public.get_whatsapp_gate_rejections(p_calendar_ids uuid[], p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own every requested calendar;
  -- service_role / internal (auth.uid() IS NULL) bypass, same guard as get_customer_metrics.
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(p_calendar_ids) AS cid WHERE NOT public.caller_owns_calendar(cid)
  ) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'entitlement_blocked', COALESCE((
      -- EXISTS, not a JOIN: whatsapp_forward_gated is logged once per blocked message at the
      -- ACCOUNT level (event_data only carries owner, no specific calendar), so a plain JOIN
      -- against calendars would emit one duplicate row per matching calendar the owner has,
      -- inflating the count for any multi-calendar account. EXISTS keeps it one row per log event.
      SELECT jsonb_agg(jsonb_build_object(
        'created_at', l.created_at,
        'status', l.event_data->>'status'
      ) ORDER BY l.created_at DESC)
      FROM public.webhook_security_logs l
      WHERE l.event_type = 'whatsapp_forward_gated'
        AND EXISTS (
          SELECT 1 FROM public.calendars c
          WHERE c.user_id = (l.event_data->>'owner')::uuid AND c.id = ANY(p_calendar_ids)
        )
        AND l.created_at >= now() - (p_days || ' days')::interval
    ), '[]'::jsonb),
    'bot_off_blocked', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'created_at', l.created_at,
        'calendar_id', l.event_data->>'calendar'
      ) ORDER BY l.created_at DESC)
      FROM public.webhook_security_logs l
      WHERE l.event_type = 'whatsapp_forward_bot_off'
        AND (l.event_data->>'calendar')::uuid = ANY(p_calendar_ids)
        AND l.created_at >= now() - (p_days || ' days')::interval
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_whatsapp_gate_rejections(uuid[], integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_gate_rejections(uuid[], integer) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_whatsapp_gate_rejections(uuid[], integer) IS
  'WHATSAPP_E2E_TEST_INFRA Item 3: owner-scoped read of entitlement/bot-toggle WhatsApp gate
  rejections from webhook_security_logs, mirroring caller_owns_calendar. Phone-resolution
  rejections (ambiguous/codeless) are not tenant-attributable and are handled by severity
  escalation in the whatsapp-webhook edge function instead.';
