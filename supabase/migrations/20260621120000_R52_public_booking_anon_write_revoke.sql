-- R52 — revoke the bogus anon WRITE grants on calendars + service_types (defense-in-depth).
--
-- The public /book/:slug page reads these two tables with the anon key. An audit found anon
-- held INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on BOTH (a repo-wide default-grant
-- artifact). Writes are blocked TODAY only by RLS (auth.uid()=user_id is NULL for anon, so
-- write policies never match), but anon should never hold these grants on a tenant table —
-- one permissive/missing policy would turn it into cross-tenant write/wipe. Verified safe:
-- the public page never writes these (bookings go through the create-booking edge function as
-- service_role; waitlist joins via the add_to_waitlist SECURITY DEFINER RPC), so revoking
-- anon writes changes no live behavior. Verified live after applying: the page's anon read
-- path (calendars id,name,slug by slug; service_types id,name,duration,price by calendar_id)
-- still works.

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.calendars FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.service_types FROM anon;

-- DEFERRED (separate item, NOT in this migration): anon can still `select=*` these tables and
-- read calendars.user_id (the tenant owner's auth UID) cross-tenant + service_types stripe/tax
-- columns. A column-level GRANT was tried and REVERTED because it breaks anon evaluation of the
-- service_types OWNER RLS policies, which cross-reference calendars.user_id in a subquery (anon
-- then needs SELECT on user_id to even run the query -> the page's service list 500s). The
-- correct fix is the R44 pattern: owner-privileged views (public_calendars id,name,slug;
-- public_service_types id,name,duration,price,calendar_id with the active-calendar filter baked
-- in) granted to anon, REVOKE SELECT on the base tables from anon, and repoint the 3 frontend
-- read sites (PublicBooking.tsx x2, usePublicBookingCreation.tsx x1) to the views. That is a
-- coordinated frontend deploy + post-deploy revoke, tracked in _SYSTEM_OVERHAUL_STATE.md.
