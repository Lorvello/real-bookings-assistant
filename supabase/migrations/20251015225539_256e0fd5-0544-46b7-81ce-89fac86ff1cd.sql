-- Add grace_period_end column to users table for missed payment grace period
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMP WITH TIME ZONE;

-- Add index for performance on grace period queries
CREATE INDEX IF NOT EXISTS idx_users_grace_period 
ON users(grace_period_end) 
WHERE grace_period_end IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.grace_period_end IS 
'Grace period end timestamp for missed payments. Users maintain full access during grace period (typically 7 days).';

-- Update get_user_status_type function to support grace period
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text AS $$
DECLARE
  v_user RECORD;
  v_subscriber RECORD;
  v_now timestamptz := now();
BEGIN
  -- Get user data
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Check if business setup is complete
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Check for missed payment with grace period (NEW LOGIC)
  IF v_user.subscription_status IN ('past_due', 'incomplete', 'missed_payment') THEN
    -- Check if still in grace period
    IF v_user.grace_period_end IS NOT NULL AND v_user.grace_period_end > v_now THEN
      RETURN 'missed_payment_grace';
    ELSE
      RETURN 'missed_payment';
    END IF;
  END IF;
  
  -- Check if user is an active paid subscriber
  SELECT * INTO v_subscriber 
  FROM subscribers 
  WHERE user_id = p_user_id;
  
  IF FOUND AND v_subscriber.subscribed = true THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Check cancellation status
  IF v_user.subscription_status = 'canceled' THEN
    IF v_user.subscription_end_date IS NOT NULL AND v_user.subscription_end_date > v_now THEN
      RETURN 'canceled_but_active';
    ELSE
      RETURN 'canceled_and_inactive';
    END IF;
  END IF;
  
  -- Check trial status
  IF v_user.subscription_status = 'trial' THEN
    IF v_user.trial_end_date IS NOT NULL THEN
      IF v_user.trial_end_date > v_now THEN
        RETURN 'active_trial';
      ELSE
        RETURN 'expired_trial';
      END IF;
    ELSE
      RETURN 'active_trial';
    END IF;
  END IF;
  
  -- Check if trial has expired
  IF v_user.trial_end_date IS NOT NULL AND v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Default to unknown if no conditions match
  RETURN 'unknown';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;