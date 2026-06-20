-- R48: stop anon triggering unguarded MUTATING maintenance RPCs (DoD round-11 MAJOR)
--
-- Round 11 confirmed all anon READS are now PII/KPI-free (R44-R47), but found unguarded SECURITY DEFINER
-- maintenance/cron functions still anon-EXECUTE (via Postgres' default PUBLIC grant) that MUTATE global
-- state: archive_old_security_events DELETEs the security audit log; update_expired_trials /
-- update_existing_users_retroactively / process_automatic_status_transitions UPDATE users.subscription_status
-- globally; cleanup_*/process_*_webhook/refresh_* mutate invitations/waitlist/webhook_events/matviews. None
-- target arbitrary users or grant paid status (fixed predicates), so MAJOR not BLOCKER — but they must not be
-- anon-triggerable. Group Y1 keeps an authenticated frontend caller; Group Y2 is service_role-only.
DO $r48$
DECLARE
  fn text;
  y1 text[] := ARRAY[  -- authenticated + service_role (owner-facing frontend hooks call these)
    'public.cleanup_expired_invitations()',
    'public.cleanup_duplicate_availability_rules(uuid,integer)',
    'public.process_webhook_queue()',
    'public.refresh_analytics_views()',
    'public.refresh_dashboard_metrics()'
  ];
  y2 text[] := ARRAY[  -- service_role only (cron / edge; no frontend caller)
    'public.archive_old_security_events()',
    'public.update_expired_trials()',
    'public.update_existing_users_retroactively()',
    'public.process_automatic_status_transitions()',
    'public.cleanup_expired_waitlist()',
    'public.process_booking_webhook_events()',
    'public.refresh_booking_time_periods()',
    'public.refresh_business_availability_overview()'
  ];
BEGIN
  FOREACH fn IN ARRAY y1 LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY y2 LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$r48$;
