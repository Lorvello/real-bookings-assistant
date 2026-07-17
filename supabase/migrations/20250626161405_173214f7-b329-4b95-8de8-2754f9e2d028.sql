
-- Make customer_email column nullable in the bookings table
ALTER TABLE public.bookings 
ALTER COLUMN customer_email DROP NOT NULL;

-- Update waitlist table to also make customer_email nullable for consistency
ALTER TABLE public.waitlist 
ALTER COLUMN customer_email DROP NOT NULL;
