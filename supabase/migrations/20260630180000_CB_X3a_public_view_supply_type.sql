-- CB X3a: expose service_types.supply_type on the anon-facing public_service_types view.
--
-- WHY: the public customer booking form (PublicBooking.tsx, /book/:slug) must know a
-- service's place-of-supply so it can REQUIRE the customer country for a
-- remote_service/digital service (cross-border VAT cannot be computed without it; the
-- create-booking-payment edge fn 400s on a remote taxable service with no country) and
-- keep it optional for in_person. The form reads services through public_service_types
-- (anon SELECT; the base service_types table's anon SELECT is revoked), and that view
-- did NOT carry supply_type, so the client could not branch. Add it.
--
-- SAFETY: supply_type is a non-sensitive service CLASSIFICATION enum
-- (in_person | remote_service | digital), not customer PII. The view already exposes the
-- service id/name/duration/price to anon; a place-of-supply label is strictly less
-- sensitive. No customer/tax/owner column is added. Additive + idempotent (CREATE OR
-- REPLACE preserves the existing grants). The WHERE filter is unchanged (only active,
-- non-deleted services on active, non-deleted calendars), so no row-visibility change.
--
-- DOWN (manual): re-run the prior definition without the supply_type column:
--   CREATE OR REPLACE VIEW public.public_service_types AS
--     SELECT st.id, st.name, st.duration, st.price, st.calendar_id, st.is_active
--       FROM service_types st JOIN calendars c ON c.id = st.calendar_id
--      WHERE st.is_active = true AND COALESCE(st.is_deleted, false) = false
--        AND c.is_active = true AND COALESCE(c.is_deleted, false) = false;

CREATE OR REPLACE VIEW public.public_service_types AS
  SELECT
    st.id,
    st.name,
    st.duration,
    st.price,
    st.calendar_id,
    st.is_active,
    st.supply_type
  FROM service_types st
    JOIN calendars c ON c.id = st.calendar_id
  WHERE st.is_active = true
    AND COALESCE(st.is_deleted, false) = false
    AND c.is_active = true
    AND COALESCE(c.is_deleted, false) = false;
