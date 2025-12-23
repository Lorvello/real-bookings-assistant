-- Step 1: Add the time_period column
ALTER TABLE public.bookings 
ADD COLUMN time_period text DEFAULT 'future';

COMMENT ON COLUMN public.bookings.time_period IS 'Automatisch berekende indicator: past, today, of future';