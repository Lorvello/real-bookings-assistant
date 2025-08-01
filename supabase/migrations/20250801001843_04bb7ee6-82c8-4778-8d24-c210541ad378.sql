-- Revert the subscription status fix migration
-- Change the specific user back to expired status
UPDATE public.users 
SET 
  subscription_status = 'expired',
  updated_at = NOW()
WHERE email = 'mathewevangroen@gmail.com';

-- Drop the constraint that was added
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS check_subscription_consistency;