-- R2-ISO (RUN 2 tenant isolation): close a 4th cross-tenant config-read path.
--
-- LEAK CLASS (found RUN-2, not enumerated in RUN-1): two SECURITY DEFINER RPCs
-- read a tenant's CUSTOM automation content by p_calendar_id with NO ownership
-- guard and are EXECUTE-granted to anon + authenticated. Any logged-in tenant
-- (or anon) could supply another tenant's calendar_id (discoverable via the
-- public booking views) and read that tenant's private template / quick-reply
-- content, bypassing the correct table-level RLS on whatsapp_templates and
-- quick_reply_flows.
--   * render_whatsapp_template  (both overloads)  -> template content
--   * match_quick_reply_flow    (both overloads)  -> flow name + flow_data
--
-- FIX (mirrors the RUN-1 FQ-12-LEAK2 orphan-RPC pattern + the project-standard
-- get_dashboard_metrics guard idiom):
--   1. Add a caller-ownership guard: authenticated callers must own the calendar
--      (team-aware via caller_owns_calendar). service_role / internal call-chains
--      (auth.uid() IS NULL) keep working for cron / agent tooling.
--   2. Revoke EXECUTE from PUBLIC (which anon inherits; no public/anon caller
--      callers are the auth-gated owner-dashboard hooks useWhatsAppTemplates /
--      useQuickReplyFlows, which always pass the owner's OWN calendar_id).
-- No edge function calls these RPCs, so no redeploy is required.

-- ============================================================
-- render_whatsapp_template (text, uuid, jsonb)  [3-arg overload]
-- ============================================================
CREATE OR REPLACE FUNCTION public.render_whatsapp_template(
  p_template_key text,
  p_calendar_id uuid,
  p_variables jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_template record;
  v_content text;
  v_key text;
  v_value text;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template
  FROM public.whatsapp_templates
  WHERE template_key = p_template_key
    AND calendar_id = p_calendar_id
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Template not found');
  END IF;

  v_content := v_template.content;

  FOR v_key IN SELECT jsonb_object_keys(p_variables)
  LOOP
    v_value := p_variables ->> v_key;
    v_content := replace(v_content, '{{' || v_key || '}}', v_value);
  END LOOP;

  RETURN jsonb_build_object(
    'content', v_content,
    'quick_replies', v_template.quick_replies
  );
END;
$$;

-- ============================================================
-- render_whatsapp_template (uuid, text, jsonb, text)  [4-arg overload]
-- ============================================================
CREATE OR REPLACE FUNCTION public.render_whatsapp_template(
  p_calendar_id uuid,
  p_template_key text,
  p_variables jsonb DEFAULT '{}'::jsonb,
  p_language text DEFAULT 'nl'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_template record;
  v_content text;
  v_variable text;
  v_value text;
BEGIN
  -- SECURITY: block cross-tenant reads.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_template
  FROM public.whatsapp_templates
  WHERE calendar_id = p_calendar_id
    AND template_key = p_template_key
    AND language = p_language
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Template not found'
    );
  END IF;

  v_content := v_template.content;

  IF v_template.variables IS NOT NULL THEN
    FOREACH v_variable IN ARRAY v_template.variables
    LOOP
      v_value := p_variables ->> v_variable;
      IF v_value IS NOT NULL THEN
        v_content := REPLACE(v_content, '{{' || v_variable || '}}', v_value);
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'content', v_content,
    'quick_replies', v_template.quick_replies,
    'template_key', v_template.template_key
  );
END;
$$;

-- ============================================================
-- match_quick_reply_flow (text, uuid)  [message-first overload]
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(
  p_message text,
  p_calendar_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_flow record;
  v_keyword text;
BEGIN
  -- SECURITY: block cross-tenant reads.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  FOR v_flow IN
    SELECT * FROM public.quick_reply_flows
    WHERE calendar_id = p_calendar_id
      AND is_active = true
  LOOP
    IF v_flow.trigger_keywords IS NOT NULL THEN
      FOREACH v_keyword IN ARRAY v_flow.trigger_keywords
      LOOP
        IF LOWER(p_message) LIKE '%' || LOWER(v_keyword) || '%' THEN
          RETURN jsonb_build_object(
            'flow_id', v_flow.id,
            'flow_name', v_flow.flow_name,
            'flow_data', v_flow.flow_data
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- ============================================================
-- match_quick_reply_flow (uuid, text)  [calendar-first overload; the FE caller]
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_quick_reply_flow(
  p_calendar_id uuid,
  p_message_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_flow record;
  v_keyword text;
BEGIN
  -- SECURITY: block cross-tenant reads.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;

  FOR v_flow IN
    SELECT * FROM public.quick_reply_flows
    WHERE calendar_id = p_calendar_id
      AND is_active = true
  LOOP
    IF v_flow.trigger_keywords IS NOT NULL THEN
      FOREACH v_keyword IN ARRAY v_flow.trigger_keywords
      LOOP
        IF LOWER(p_message_text) LIKE '%' || LOWER(v_keyword) || '%' THEN
          RETURN jsonb_build_object(
            'flow_id', v_flow.id,
            'flow_name', v_flow.flow_name,
            'flow_data', v_flow.flow_data
          );
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- Grant posture: no anon caller exists. Revoke from PUBLIC (anon inherits the
-- default PUBLIC EXECUTE grant), then keep authenticated + service_role.
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.render_whatsapp_template(text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.render_whatsapp_template(uuid, text, jsonb, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_quick_reply_flow(text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.match_quick_reply_flow(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.render_whatsapp_template(text, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.render_whatsapp_template(uuid, text, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_quick_reply_flow(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_quick_reply_flow(uuid, text) TO authenticated, service_role;
