-- R15: repair R14 on databases where its first local/preproduction form was
-- already applied. service_role needs ordinary DML, never TRUNCATE/REFERENCES/
-- TRIGGER/MAINTAIN privileges.

REVOKE ALL ON TABLE public.booking_confirmation_deliveries
  FROM service_role;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.booking_confirmation_deliveries TO service_role;
