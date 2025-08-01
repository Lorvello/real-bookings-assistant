-- Update existing users with 7-day trials to 30-day trials
UPDATE public.users 
SET trial_end_date = trial_start_date + interval '30 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NOT NULL 
  AND trial_start_date IS NOT NULL
  AND trial_end_date < trial_start_date + interval '30 days';

-- For users without trial_start_date, use created_at as basis
UPDATE public.users 
SET trial_end_date = created_at + interval '30 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NOT NULL 
  AND trial_start_date IS NULL
  AND trial_end_date < created_at + interval '30 days';

-- Update default for future users
ALTER TABLE public.users 
ALTER COLUMN trial_end_date SET DEFAULT (now() + interval '30 days');

-- Update the user status function to use 30 days for new trials
CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id UUID,
  p_status TEXT,
  p_subscription_tier TEXT DEFAULT NULL,
  p_trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_user RECORD;
  v_trial_end_date TIMESTAMP WITH TIME ZONE;
  v_subscription_end_date TIMESTAMP WITH TIME ZONE;
  v_subscription_tier TEXT;
  v_subscription_status TEXT;
  v_user_type TEXT;
  v_result JSON;
BEGIN
  -- Get current user data
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  
  -- Calculate dates and values based on status
  CASE p_status
    WHEN 'active_trial' THEN
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      v_subscription_end_date := NULL;
      v_subscription_tier := COALESCE(p_subscription_tier, 'professional');
      v_subscription_status := 'trial';
    WHEN 'trial_ending_soon' THEN
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      v_subscription_end_date := NULL;
      v_subscription_tier := COALESCE(p_subscription_tier, 'professional');
      v_subscription_status := 'trial';
    WHEN 'expired_trial' THEN
      v_trial_end_date := NOW() - interval '1 day';
      v_subscription_end_date := NULL;
      v_subscription_tier := NULL;
      v_subscription_status := 'expired';
    WHEN 'active_subscriber' THEN
      v_trial_end_date := NULL;
      v_subscription_end_date := COALESCE(p_subscription_end_date, NOW() + interval '30 days');
      v_subscription_tier := COALESCE(p_subscription_tier, 'professional');
      v_subscription_status := 'active';
    WHEN 'canceled_subscriber' THEN
      v_trial_end_date := NULL;
      v_subscription_end_date := COALESCE(p_subscription_end_date, NOW() + interval '7 days');
      v_subscription_tier := COALESCE(p_subscription_tier, 'professional');
      v_subscription_status := 'canceled';
    WHEN 'canceled_and_inactive' THEN
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() - interval '1 day';
      v_subscription_tier := NULL;
      v_subscription_status := 'expired';
    ELSE
      RAISE EXCEPTION 'Invalid status: %', p_status;
  END CASE;