-- Update existing users with proper trial dates and statuses
UPDATE public.users 
SET 
  trial_start_date = COALESCE(trial_start_date, created_at),
  trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
WHERE trial_start_date IS NULL OR trial_end_date IS NULL;

-- Update subscription status based on trial end date
UPDATE public.users 
SET subscription_status = CASE 
  WHEN trial_end_date <= NOW() AND subscription_status = 'trial' THEN 'expired'
  WHEN trial_end_date > NOW() AND subscription_status NOT IN ('active', 'paid', 'canceled') THEN 'trial'
  ELSE subscription_status
END
WHERE subscription_status IS NULL OR subscription_status = 'trial';

-- Create function to automatically update expired trials
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

-- Create function to update existing users retroactively
CREATE OR REPLACE FUNCTION public.update_existing_users_retroactively()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update existing users without trial dates
  UPDATE public.users 
  SET 
    trial_start_date = COALESCE(trial_start_date, created_at),
    trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
  WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
  
  -- Update subscription status for expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND subscription_status != 'expired';
  
  -- Set default subscription tier for existing users
  UPDATE public.users 
  SET subscription_tier = 'starter'
  WHERE subscription_tier IS NULL 
    AND subscription_status IN ('active', 'paid');
    
  -- Log the update
  RAISE NOTICE 'Updated existing users retroactively';
END;
$$;