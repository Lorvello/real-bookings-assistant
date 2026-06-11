-- Drop duplicate triggers on public.bookings.
--
-- Two pairs of triggers were registered with identical timing/events/function,
-- so each function ran twice per booking operation:
--   * handle_new_booking()              via handle_new_booking_trigger + on_booking_created (BEFORE INSERT)
--   * trigger_business_overview_v2_refresh() via trigger_bookings_refresh_business_overview_v2
--                                            + trigger_bookings_v2_refresh (AFTER INSERT/UPDATE/DELETE)
--
-- handle_new_booking is idempotent so the double-run was harmless, but the
-- business-overview refresh doing twice the work on every booking insert/
-- update/delete is wasteful. Keep one trigger of each pair; drop the duplicate.

DROP TRIGGER IF EXISTS on_booking_created ON public.bookings;
DROP TRIGGER IF EXISTS trigger_bookings_v2_refresh ON public.bookings;
