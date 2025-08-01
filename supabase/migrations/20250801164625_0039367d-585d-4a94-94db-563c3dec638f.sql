-- Fix all trial periods to be 30 days instead of 7 days

-- Update all existing users with trial status to have 30-day trial end dates
UPDATE public.users 
SET trial_end_date = GREATEST(trial_end_date, now() + interval '30 days')
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NOT NULL;

-- Update users without trial_end_date to have 30-day trial
UPDATE public.users 
SET trial_end_date = now() + interval '30 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NULL;

-- Ensure the default for new users is 30 days
ALTER TABLE public.users 
ALTER COLUMN trial_end_date SET DEFAULT (now() + interval '30 days');

-- Update the update_user_status function to use 30 days instead of 7
CREATE OR REPLACE FUNCTION public.update_user_status(
  p_user_id uuid,
  p_status text,
  p_tier text DEFAULT NULL,
  p_subscription_end_date timestamp with time zone DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_now timestamp with time zone := NOW();
  v_trial_end_date timestamp with time zone;
  v_subscription_end_date timestamp with time zone;
BEGIN
  -- Input validation
  IF p_user_id IS NULL OR p_status IS NULL THEN
    RAISE EXCEPTION 'User ID and status are required';
  END IF;

  -- Status-specific logic
  CASE p_status
    WHEN 'trial' THEN
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      v_subscription_end_date := NULL;
    WHEN 'active' THEN
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days  
      v_subscription_end_date := COALESCE(p_subscription_end_date, NOW() + interval '1 month');
    WHEN 'canceled' THEN
      -- Keep existing dates when canceling
      SELECT trial_end_date, subscription_end_date 
      INTO v_trial_end_date, v_subscription_end_date
      FROM public.users 
      WHERE id = p_user_id;
      
      -- If no subscription end date exists, set it to 30 days from now
      IF v_subscription_end_date IS NULL THEN
        v_subscription_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      END IF;
    WHEN 'expired' THEN
      v_trial_end_date := NOW() - interval '1 day';
      v_subscription_end_date := NOW() - interval '1 day';
    ELSE
      RAISE EXCEPTION 'Invalid status: %', p_status;
  END CASE;

  -- Update the user record
  UPDATE public.users 
  SET 
    subscription_status = p_status,
    subscription_tier = COALESCE(p_tier, subscription_tier, 'starter'),
    trial_end_date = v_trial_end_date,
    subscription_end_date = v_subscription_end_date,
    updated_at = v_now
  WHERE id = p_user_id;

  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating user status: %', SQLERRM;
END;
$$;