-- Fix admin_set_user_status function to properly map UI statuses to database values
-- and implement comprehensive mock data generation for each status type

CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
  p_clear_data boolean DEFAULT false,
  p_generate_mock_data boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_clear_result jsonb;
  v_mock_result jsonb;
  v_subscription_status text;
  v_subscription_tier text;
  v_trial_end_date timestamp with time zone;
  v_subscription_end_date timestamp with time zone;
  v_business_name text;
  v_business_type text;
BEGIN
  -- Map UI status types to database values and determine business info
  CASE p_status
    WHEN 'setup_incomplete' THEN
      v_subscription_status := 'trial';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() + interval '7 days';
      v_subscription_end_date := NULL;
      v_business_name := NULL;
      v_business_type := NULL;
    WHEN 'active_trial' THEN
      v_subscription_status := 'trial';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() + interval '7 days';
      v_subscription_end_date := NULL;
      v_business_name := 'Demo Business';
      v_business_type := 'salon';
    WHEN 'expired_trial' THEN
      v_subscription_status := 'expired';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() - interval '1 day';
      v_subscription_end_date := NULL;
      v_business_name := 'Demo Business';
      v_business_type := 'salon';
    WHEN 'paid_subscriber' THEN
      v_subscription_status := 'active';
      v_subscription_tier := 'professional';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '1 month';
      v_business_name := 'Professional Business';
      v_business_type := 'clinic';
    WHEN 'canceled_but_active' THEN
      v_subscription_status := 'canceled';
      v_subscription_tier := 'professional';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '7 days';
      v_business_name := 'Professional Business';
      v_business_type := 'clinic';
    WHEN 'canceled_and_inactive' THEN
      v_subscription_status := 'expired';
      v_subscription_tier := NULL;
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() - interval '1 day';
      v_business_name := 'Professional Business';
      v_business_type := 'clinic';
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid status type: ' || p_status
      );
  END CASE;

  -- Clear existing data if requested
  IF p_clear_data THEN
    SELECT public.admin_clear_user_data(p_user_id) INTO v_clear_result;
    
    IF NOT (v_clear_result->>'success')::boolean THEN
      RETURN v_clear_result;
    END IF;
  END IF;

  -- Update user with mapped database values
  UPDATE public.users 
  SET 
    subscription_status = v_subscription_status,
    subscription_tier = v_subscription_tier::public.subscription_tier,
    trial_end_date = v_trial_end_date,
    subscription_end_date = v_subscription_end_date,
    business_name = v_business_name,
    business_type = v_business_type,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Generate mock data if requested (only for non-setup_incomplete statuses)
  IF p_generate_mock_data AND p_status != 'setup_incomplete' THEN
    SELECT public.admin_generate_mock_data(p_user_id, p_status) INTO v_mock_result;
    
    IF NOT (v_mock_result->>'success')::boolean THEN
      RETURN v_mock_result;
    END IF;
  END IF;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User status updated successfully',
    'user_id', p_user_id,
    'new_status', p_status,
    'mapped_subscription_status', v_subscription_status,
    'data_cleared', p_clear_data,
    'mock_data_generated', p_generate_mock_data AND p_status != 'setup_incomplete',
    'clear_result', v_clear_result,
    'mock_result', v_mock_result
  );
END;
$$;