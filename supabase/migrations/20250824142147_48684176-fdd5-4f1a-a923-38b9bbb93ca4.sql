-- Add unique constraint on calendar_id in business_stripe_accounts table
-- This ensures one Stripe account per calendar
ALTER TABLE public.business_stripe_accounts 
ADD CONSTRAINT business_stripe_accounts_calendar_id_unique UNIQUE (calendar_id);