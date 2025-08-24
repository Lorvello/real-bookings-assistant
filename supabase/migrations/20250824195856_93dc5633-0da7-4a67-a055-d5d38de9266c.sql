-- Add unique index to prevent duplicate Stripe accounts
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_business_stripe_accounts_unique 
ON public.business_stripe_accounts(stripe_account_id, environment);

-- Add column to store Stripe account ID in calendar_settings for faster access
ALTER TABLE public.calendar_settings 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id text;

-- Add comment for the new column
COMMENT ON COLUMN public.calendar_settings.stripe_connect_account_id IS 'Cached Stripe Connect account ID for quick access';