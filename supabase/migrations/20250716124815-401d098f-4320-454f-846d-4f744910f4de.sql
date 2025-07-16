-- STAP 1: Database Correctie - Fix trial dates for all existing users

-- First, let's update all existing users with proper trial dates based on their created_at
UPDATE public.users 
SET 
  trial_start_date = created_at,
  trial_end_date = created_at + interval '7 days'
WHERE created_at IS NOT NULL;

-- Update subscription status based on actual trial end dates
UPDATE public.users 
SET subscription_status = CASE 
  WHEN trial_end_date <= NOW() THEN 'expired'
  WHEN trial_end_date > NOW() THEN 'trial'
  ELSE subscription_status
END
WHERE trial_end_date IS NOT NULL;

-- Create function to get clear user status types
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_status TEXT;
BEGIN
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Determine user status type
  IF v_user.subscription_status = 'trial' AND v_user.trial_end_date > NOW() THEN
    v_status := 'active_trial';
  ELSIF v_user.subscription_status = 'expired' OR (v_user.subscription_status = 'trial' AND v_user.trial_end_date <= NOW()) THEN
    v_status := 'expired_trial';
  ELSIF v_user.subscription_status IN ('active', 'paid') THEN
    v_status := 'paid_subscriber';
  ELSIF v_user.subscription_status = 'canceled' AND v_user.subscription_end_date > NOW() THEN
    v_status := 'canceled_but_active';
  ELSIF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    v_status := 'setup_incomplete';
  ELSE
    v_status := 'unknown';
  END IF;
  
  RETURN v_status;
END;
$$;

-- Update all expired trials to have correct status
UPDATE public.users 
SET subscription_status = 'expired'
WHERE subscription_status = 'trial' 
  AND trial_end_date <= NOW();

-- Add a computed column for easier status checking
CREATE OR REPLACE VIEW public.user_status_overview AS
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.business_name,
  u.created_at,
  u.trial_start_date,
  u.trial_end_date,
  u.subscription_status,
  u.subscription_tier,
  u.subscription_end_date,
  public.get_user_status_type(u.id) as user_status_type,
  CASE 
    WHEN u.subscription_status = 'trial' AND u.trial_end_date > NOW() THEN 
      EXTRACT(DAYS FROM (u.trial_end_date - NOW()))::integer
    ELSE 0
  END as days_remaining
FROM public.users u;

-- Grant access to the view
GRANT SELECT ON public.user_status_overview TO authenticated;