-- R6: restore the minimum table privilege baseline expected by server-side Edge
-- Functions while removing privileges that bypass or sit outside row-level security.
--
-- Reproduced on a clean 405-version bootstrap:
--   * service_role could not SELECT public.bookings (or most other product tables);
--   * anon/authenticated/service_role retained TRUNCATE, REFERENCES, TRIGGER and
--     MAINTAIN on nearly every public table after broad historical GRANT/REVOKE churn.
--
-- API clients never need schema-maintenance or TRUNCATE rights. service_role does
-- need normal DML because trusted Edge Functions use it for backend product work.

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO service_role;

REVOKE ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
FROM anon, authenticated;

GRANT USAGE, SELECT, UPDATE
ON ALL SEQUENCES IN SCHEMA public
TO service_role;

-- New project migrations run as postgres. Keep future postgres-owned relations on
-- the same least-privilege baseline. Any client-facing anon/authenticated DML must
-- continue to be granted explicitly alongside a reviewed RLS policy.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLES
  FROM anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLES
  TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES
  ON SEQUENCES
  FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE
  ON SEQUENCES
  TO service_role;
