-- Fix Setup Incomplete to have Professional tier from the start
CREATE OR REPLACE FUNCTION public.admin_setup_mock_incomplete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_clear_result jsonb;
BEGIN
  -- First clear all existing user data
  SELECT admin_clear_user_data(p_user_id) INTO v_clear_result;
  
  IF NOT (v_clear_result->>'success')::boolean THEN
    RETURN v_clear_result;
  END IF;
  
  -- Reset user to setup incomplete state with PROFESSIONAL tier
  UPDATE public.users 
  SET 
    subscription_status = 'trial',
    subscription_tier = 'professional', -- FIX: Set to professional, not NULL
    trial_start_date = NOW(),
    trial_end_date = NOW() + interval '7 days',
    subscription_end_date = NULL,
    -- Clear all business data for setup incomplete detection
    business_name = NULL,
    business_type = NULL,
    business_phone = NULL,
    business_email = NULL,
    business_whatsapp = NULL,
    business_street = NULL,
    business_number = NULL,
    business_postal = NULL,
    business_city = NULL,
    business_country = NULL,
    business_description = NULL,
    parking_info = NULL,
    public_transport_info = NULL,
    accessibility_info = NULL,
    other_info = NULL,
    opening_hours_note = NULL,
    business_type_other = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User successfully reset to setup incomplete state with professional tier',
    'status_type', 'setup_incomplete'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to reset user to setup incomplete: ' || SQLERRM
    );
END;
$function$;