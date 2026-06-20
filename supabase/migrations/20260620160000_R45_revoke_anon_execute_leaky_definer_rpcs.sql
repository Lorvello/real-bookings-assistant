-- R45: close anon cross-tenant leak + destructive RPC via 12 SECURITY DEFINER functions (DoD round-10 BLOCKER)
--
-- These 12 functions guard ownership with `IF auth.uid() IS NOT NULL AND NOT caller_owns_calendar(...)`.
-- The intent was "service_role (auth.uid() NULL) bypasses; everyone else must own the calendar". But the
-- ANON REST role ALSO has auth.uid() = NULL, so the ownership check is skipped for anonymous callers too —
-- and Postgres grants EXECUTE to PUBLIC by default, so anon could reach them. Result (proven live with the
-- anon key): any anonymous internet caller could read another tenant's dashboard KPIs / today's schedule
-- (names+times) / WhatsApp conversation context, and — via cleanup_whatsapp_data_for_calendar — DELETE a
-- tenant's WhatsApp message history (HTTP 204). Same leak class as R44, re-emerging through RPC.
--
-- The guard already correctly blocks AUTHENTICATED non-owners (their auth.uid() is not null → the check
-- runs). The only hole is the anon/PUBLIC path. Fix: REVOKE EXECUTE FROM PUBLIC + anon (removes the default
-- grant and the leak path), and GRANT to authenticated + service_role (the only legitimate callers: the
-- logged-in dashboard hooks + the service_role edge function). No legitimate anon caller invokes these
-- (the public booking page uses different, PII-free RPCs, which are untouched here).
DO $r45$
DECLARE
  fn text;
  sigs text[] := ARRAY[
    'public.get_dashboard_metrics(uuid)',
    'public.get_dashboard_metrics_safe(uuid)',
    'public.get_todays_schedule(uuid)',
    'public.get_booking_trends(uuid,integer)',
    'public.get_customer_metrics(uuid[],timestamp with time zone,timestamp with time zone)',
    'public.get_conversation_context(text,uuid)',
    'public.get_user_status_type(uuid)',
    'public.cleanup_whatsapp_data_for_calendar(uuid)',
    'public.complete_user_setup(uuid)',
    'public.create_default_whatsapp_templates(uuid)',
    'public.manual_process_webhooks(uuid)',
    'public.test_webhook_system(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY sigs LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$r45$;
