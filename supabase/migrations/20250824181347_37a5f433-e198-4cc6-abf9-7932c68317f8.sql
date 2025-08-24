-- Drop the old user_id unique constraint that's causing conflicts
ALTER TABLE business_stripe_accounts 
DROP CONSTRAINT IF EXISTS business_stripe_accounts_user_id_key;