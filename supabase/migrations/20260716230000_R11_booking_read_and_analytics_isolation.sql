-- R11: remove direct anonymous booking reads and close tenant-blind analytics.
--
-- Public booking retrieval is exclusively capability-token based through the
-- hardened RPCs from R10. The base table and its full-row period view must not
-- be a second anonymous surface.
REVOKE SELECT ON TABLE public.bookings FROM anon;
REVOKE SELECT ON TABLE public.bookings_with_period FROM anon;

-- Materialized views do not enforce base-table RLS. These four views contain
-- per-calendar commercial metrics and previously granted direct SELECT to both
-- client roles, allowing any visitor or signed-in user to read every tenant
-- after a refresh. There are no runtime client callsites; backend maintenance
-- and any future tenant-scoped wrapper continue through service_role.
REVOKE SELECT ON TABLE public.business_intelligence_mv
  FROM anon, authenticated;
REVOKE SELECT ON TABLE public.future_insights_mv
  FROM anon, authenticated;
REVOKE SELECT ON TABLE public.live_operations_mv
  FROM anon, authenticated;
REVOKE SELECT ON TABLE public.performance_efficiency_mv
  FROM anon, authenticated;

GRANT SELECT ON TABLE public.business_intelligence_mv TO service_role;
GRANT SELECT ON TABLE public.future_insights_mv TO service_role;
GRANT SELECT ON TABLE public.live_operations_mv TO service_role;
GRANT SELECT ON TABLE public.performance_efficiency_mv TO service_role;
