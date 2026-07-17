-- Create admin_set_user_status function for developer tools
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status_type text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_trial_end_date timestamp with time zone;
  v_subscription_end_date timestamp with time zone;
  v_subscription_status text;
  v_subscription_tier text;
BEGIN
  -- Map status types to database values
  CASE p_status_type
    WHEN 'setup_incomplete' THEN
      v_subscription_status := 'trial';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() + interval '7 days';
      v_subscription_end_date := NULL;
    WHEN 'active_trial' THEN
      v_subscription_status := 'trial';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() + interval '7 days';
      v_subscription_end_date := NULL;
    WHEN 'expired_trial' THEN
      v_subscription_status := 'expired';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() - interval '1 day';
      v_subscription_end_date := NULL;
    WHEN 'paid_subscriber' THEN
      v_subscription_status := 'active';
      v_subscription_tier := 'pro';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '1 month';
    WHEN 'canceled_but_active' THEN
      v_subscription_status := 'canceled';
      v_subscription_tier := 'pro';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '7 days';
    WHEN 'canceled_and_inactive' THEN
      v_subscription_status := 'expired';
      v_subscription_tier := NULL;
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() - interval '1 day';
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid status type: ' || p_status_type
      );
  END CASE;

  -- Update user subscription details
  UPDATE public.users 
  SET 
    subscription_status = v_subscription_status,
    subscription_tier = v_subscription_tier::public.subscription_tier,
    trial_end_date = v_trial_end_date,
    subscription_end_date = v_subscription_end_date,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User status updated successfully',
    'status_type', p_status_type,
    'subscription_status', v_subscription_status,
    'trial_end_date', v_trial_end_date,
    'subscription_end_date', v_subscription_end_date
  );
END;
$$;