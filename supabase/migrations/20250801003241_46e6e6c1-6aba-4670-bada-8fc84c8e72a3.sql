-- Update admin_update_user_subscription to support business data updates
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_user_id uuid,
  p_subscription_status text DEFAULT NULL,
  p_subscription_tier text DEFAULT NULL,
  p_trial_end_date text DEFAULT NULL,
  p_subscription_end_date text DEFAULT NULL,
  p_business_name text DEFAULT NULL,
  p_business_type text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_result jsonb;
  v_current_user record;
BEGIN
  -- Get current user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Update user subscription and business data
  UPDATE public.users 
  SET 
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_tier = CASE 
      WHEN p_subscription_tier IS NULL THEN NULL
      WHEN p_subscription_tier = '' THEN NULL
      ELSE p_subscription_tier::public.subscription_tier
    END,
    trial_end_date = CASE 
      WHEN p_trial_end_date IS NULL THEN trial_end_date
      WHEN p_trial_end_date = '' THEN NULL
      ELSE p_trial_end_date::timestamp with time zone
    END,
    subscription_end_date = CASE 
      WHEN p_subscription_end_date IS NULL THEN subscription_end_date
      WHEN p_subscription_end_date = '' THEN NULL
      ELSE p_subscription_end_date::timestamp with time zone
    END,
    business_name = CASE 
      WHEN p_business_name IS NULL THEN business_name
      WHEN p_business_name = '' THEN NULL
      ELSE p_business_name
    END,
    business_type = CASE 
      WHEN p_business_type IS NULL THEN business_type
      WHEN p_business_type = '' THEN NULL
      ELSE p_business_type
    END,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Get updated user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User subscription and business data updated successfully',
    'user', row_to_json(v_current_user)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update user: ' || SQLERRM
    );
END;
$$;