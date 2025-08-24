-- Make calendar_id nullable and add proper unique constraint for business_stripe_accounts
ALTER TABLE business_stripe_accounts 
ALTER COLUMN calendar_id DROP NOT NULL;

-- Add unique constraint to prevent duplicate accounts per owner/environment/platform
ALTER TABLE business_stripe_accounts 
ADD CONSTRAINT unique_stripe_account_per_owner_env_platform 
UNIQUE (account_owner_id, environment, platform_account_id);