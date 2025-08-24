-- Add platform tracking to business_stripe_accounts
ALTER TABLE public.business_stripe_accounts 
ADD COLUMN environment text DEFAULT 'test',
ADD COLUMN platform_account_id text;

-- Add unique constraint to prevent reuse across platforms
CREATE UNIQUE INDEX idx_stripe_account_platform 
ON public.business_stripe_accounts (stripe_account_id, platform_account_id, environment);

-- Add index for efficient lookups
CREATE INDEX idx_business_stripe_accounts_lookup 
ON public.business_stripe_accounts (account_owner_id, environment, platform_account_id);