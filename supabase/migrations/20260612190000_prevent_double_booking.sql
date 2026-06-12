-- Prevent double-bookings atomically at the database level.
--
-- check_booking_conflicts() existed but was only used by get_available_slots()
-- at DISPLAY time. Neither create-booking, the BEFORE INSERT triggers
-- (validate_booking_insert / handle_new_booking), nor any constraint enforced it
-- at INSERT time — so two customers seeing the same free slot (or any direct
-- insert) could both succeed and double-book the same calendar/time. There is no
-- "allow double bookings" setting in the schema (the column does not exist and
-- get_available_slots always calls the conflict check with the default false), so
-- overlapping non-cancelled bookings are never legitimate.
--
-- Enforce it race-proof with a GiST exclusion constraint: no two non-cancelled
-- bookings on the same calendar may have overlapping [start_time, end_time)
-- ranges. tstzrange is half-open, so back-to-back slots (10:00-11:00 then
-- 11:00-12:00) do NOT conflict. The bookings table is currently empty, so adding
-- the constraint cannot fail on existing data.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    calendar_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status NOT IN ('cancelled', 'no-show'));
