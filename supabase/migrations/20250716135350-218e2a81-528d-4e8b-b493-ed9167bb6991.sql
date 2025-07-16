-- Add canceled_and_inactive status to admin_set_user_status function
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id uuid, p_status_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now timestamp with time zone := NOW();
BEGIN
  CASE p_status_type
    WHEN 'setup_incomplete' THEN
      UPDATE public.users 
      SET 
        business_name = NULL,
        business_type = NULL,
        subscription_status = 'trial',
        trial_end_date = v_now + interval '7 days',
        subscription_end_date = NULL,
        updated_at = v_now
      WHERE id = p_user_id;
      
    WHEN 'active_trial' THEN
      UPDATE public.users 
      SET 
        business_name = COALESCE(business_name, 'Test Business'),
        business_type = COALESCE(business_type, 'consultant'),
        subscription_status = 'trial',
        trial_end_date = v_now + interval '5 days',
        subscription_end_date = NULL,
        updated_at = v_now
      WHERE id = p_user_id;
      
    WHEN 'expired_trial' THEN
      UPDATE public.users 
      SET 
        business_name = COALESCE(business_name, 'Test Business'),
        business_type = COALESCE(business_type, 'consultant'),
        subscription_status = 'trial',
        trial_end_date = v_now - interval '1 day',
        subscription_end_date = NULL,
        updated_at = v_now
      WHERE id = p_user_id;
      
    WHEN 'paid_subscriber' THEN
      UPDATE public.users 
      SET 
        business_name = COALESCE(business_name, 'Test Business'),
        business_type = COALESCE(business_type, 'consultant'),
        subscription_status = 'active',
        subscription_tier = 'professional',
        trial_end_date = NULL,
        subscription_end_date = v_now + interval '30 days',
        updated_at = v_now
      WHERE id = p_user_id;
      
    WHEN 'canceled_but_active' THEN
      UPDATE public.users 
      SET 
        business_name = COALESCE(business_name, 'Test Business'),
        business_type = COALESCE(business_type, 'consultant'),
        subscription_status = 'canceled',
        subscription_tier = 'professional',
        trial_end_date = NULL,
        subscription_end_date = v_now + interval '10 days',
        updated_at = v_now
      WHERE id = p_user_id;
      
    WHEN 'canceled_and_inactive' THEN
      UPDATE public.users 
      SET 
        business_name = COALESCE(business_name, 'Test Business'),
        business_type = COALESCE(business_type, 'consultant'),
        subscription_status = 'canceled',
        subscription_tier = 'professional',
        trial_end_date = NULL,
        subscription_end_date = v_now - interval '1 day',
        updated_at = v_now
      WHERE id = p_user_id;
      
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid status type'
      );
  END CASE;
  
  -- Ensure user has calendar and service type for non-setup_incomplete statuses
  IF p_status_type != 'setup_incomplete' THEN
    PERFORM public.ensure_user_has_calendar_and_service(p_user_id);
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'status_type', p_status_type,
    'updated_at', v_now
  );
END;
$$;