-- Add missing subscription fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
ADD COLUMN IF NOT EXISTS grace_period_end timestamp with time zone;

-- Update the subscription status constraint to include all states
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS valid_subscription_status;

ALTER TABLE public.users 
ADD CONSTRAINT valid_subscription_status 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'canceled', 'paid'));

-- Add constraint for payment status
ALTER TABLE public.users 
ADD CONSTRAINT valid_payment_status 
CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'pending'));

-- Create function to auto-update expired trials
CREATE OR REPLACE FUNCTION public.update_expired_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= now();
  
  -- Update expired subscriptions
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status IN ('active', 'paid') 
    AND subscription_end_date <= now();
END;
$$;