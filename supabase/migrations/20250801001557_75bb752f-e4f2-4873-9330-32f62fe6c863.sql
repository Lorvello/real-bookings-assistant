-- Fix inconsistent user subscription status
-- Update users who have active subscription tier but expired status
UPDATE public.users 
SET 
  subscription_status = 'active',
  updated_at = NOW()
WHERE subscription_tier IS NOT NULL 
  AND subscription_tier != 'starter'::subscription_tier
  AND subscription_status = 'expired'
  AND email = 'mathewevangroen@gmail.com';

-- Also fix the specific user case
UPDATE public.users 
SET 
  subscription_status = 'active',
  updated_at = NOW()
WHERE email = 'mathewevangroen@gmail.com' 
  AND subscription_tier = 'starter'::subscription_tier
  AND subscription_status = 'expired';

-- Add constraint to prevent subscription_tier without active status
-- (Only add if not already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_subscription_consistency'
  ) THEN
    ALTER TABLE public.users 
    ADD CONSTRAINT check_subscription_consistency 
    CHECK (
      (subscription_tier IS NULL AND subscription_status IN ('trial', 'expired')) 
      OR 
      (subscription_tier IS NOT NULL AND subscription_status IN ('active', 'canceled'))
    );
  END IF;
END $$;