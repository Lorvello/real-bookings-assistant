-- R49: re-assert service_role-only EXECUTE on reschedule_booking_atomic (DoD round-14 MINOR, grant drift)
-- R33 intended service_role-only (called from whatsapp-agent via service_role), but the live grants
-- drifted back to include anon/authenticated (Postgres PUBLIC default re-applied on a later REPLACE).
-- Not exploitable (keyed on an unguessable, non-enumerable bookings.id; service_type cross-calendar
-- injection is rejected by validate_booking_security), but anon/authenticated have no business calling it.
DO $r49$
DECLARE sig text := 'public.reschedule_booking_atomic(uuid,timestamp with time zone,timestamp with time zone,uuid)';
BEGIN
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', sig);
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', sig);
  EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', sig);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
END
$r49$;
