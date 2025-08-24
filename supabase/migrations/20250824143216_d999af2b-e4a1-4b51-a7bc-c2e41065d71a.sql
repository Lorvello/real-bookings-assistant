-- After cleaning duplicates, enforce one Stripe account per calendar
ALTER TABLE public.business_stripe_accounts 
ADD CONSTRAINT business_stripe_accounts_calendar_id_unique UNIQUE (calendar_id);