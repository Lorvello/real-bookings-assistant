-- Reconcile fields used by booking functions and represented in the generated
-- production types, but missing from the historical migration chain.
--
-- Keep the legacy `calender_name` spelling for backwards compatibility with
-- existing webhook payloads and database functions.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS calender_name text;
