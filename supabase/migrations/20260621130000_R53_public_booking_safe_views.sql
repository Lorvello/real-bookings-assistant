-- R53 — close the anon read leak on calendars + service_types via owner-privileged views
-- + base-table SELECT revoke (R44 pattern). Pairs with R52 (which revoked anon writes).
--
-- Problem (R52 header): anon could `select=*` the base tables and read calendars.user_id
-- (tenant owner auth UID) cross-tenant + service_types stripe/tax columns. A column-level
-- GRANT was reverted because the service_types OWNER RLS policies cross-reference
-- calendars.user_id, so restricting anon's calendars columns breaks anon evaluation of those
-- policies (the public service list 500s).
--
-- Fix: two owner-privileged views exposing ONLY the columns the public /book page needs, with
-- the active+not-deleted security filter baked in. A plain (non-security_invoker) view runs as
-- its owner, so it reads the base tables with the owner's privileges and does NOT depend on
-- anon's base-table grants — which lets us fully REVOKE anon SELECT on the base tables. The
-- three anon read sites (PublicBooking.tsx calendars+service_types, usePublicBookingCreation.tsx
-- calendars) are repointed to these views in the same commit. authenticated keeps base-table
-- SELECT (the dashboard reads base tables directly); the create-booking edge function runs as
-- service_role; the get_available_slots / validate_booking_security RPCs are SECURITY DEFINER —
-- all unaffected.

CREATE OR REPLACE VIEW public.public_calendars AS
  SELECT id, name, slug, is_active
  FROM public.calendars
  WHERE is_active = true AND COALESCE(is_deleted, false) = false;

CREATE OR REPLACE VIEW public.public_service_types AS
  SELECT st.id, st.name, st.duration, st.price, st.calendar_id, st.is_active
  FROM public.service_types st
  JOIN public.calendars c ON c.id = st.calendar_id
  WHERE st.is_active = true AND COALESCE(st.is_deleted, false) = false
    AND c.is_active = true AND COALESCE(c.is_deleted, false) = false;

GRANT SELECT ON public.public_calendars TO anon, authenticated;
GRANT SELECT ON public.public_service_types TO anon, authenticated;

-- Close the leak: anon no longer reads the base tables directly (the page uses the views).
REVOKE SELECT ON public.calendars FROM anon;
REVOKE SELECT ON public.service_types FROM anon;
