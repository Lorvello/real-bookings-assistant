-- Function to ensure user has at least one calendar
CREATE OR REPLACE FUNCTION public.admin_ensure_user_has_calendar(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_count integer;
  v_calendar_id uuid;
BEGIN
  -- Check if user has any active calendars
  SELECT COUNT(*) INTO v_calendar_count
  FROM public.calendars
  WHERE user_id = p_user_id AND is_active = true;
  
  -- If no calendars exist, create a default one
  IF v_calendar_count = 0 THEN
    INSERT INTO public.calendars (
      user_id,
      name,
      slug,
      description,
      timezone,
      color,
      is_active,
      is_default
    ) VALUES (
      p_user_id,
      'Personal Calendar',
      'personal-' || substr(p_user_id::text, 1, 8),
      'Your personal appointment calendar',
      'Europe/Amsterdam',
      '#3B82F6',
      true,
      true
    ) RETURNING id INTO v_calendar_id;
    
    -- Create a default service type for the new calendar
    INSERT INTO public.service_types (
      calendar_id,
      user_id,
      name,
      duration,
      price,
      description,
      color,
      is_active
    ) VALUES (
      v_calendar_id,
      p_user_id,
      'Standaard Afspraak',
      30,
      50.00,
      'Standaard service type voor afspraken',
      '#3B82F6',
      true
    );
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Default calendar created',
      'calendar_id', v_calendar_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User already has calendars',
      'calendar_count', v_calendar_count
    );
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to ensure calendar: ' || SQLERRM
    );
END;
$function$;

-- Update existing function to ensure calendar exists for non-setup_incomplete statuses
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(p_user_id uuid, p_subscription_status text DEFAULT NULL::text, p_subscription_tier text DEFAULT NULL::text, p_trial_end_date text DEFAULT NULL::text, p_subscription_end_date text DEFAULT NULL::text, p_business_name text DEFAULT NULL::text, p_business_type text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_current_user record;
  v_calendar_result jsonb;
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
  
  -- For non-setup_incomplete statuses, ensure user has a calendar
  IF p_subscription_status IS NOT NULL AND p_subscription_status != 'setup_incomplete' THEN
    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;
  END IF;
  
  -- Get updated user data
  SELECT * INTO v_current_user
  FROM public.users
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User subscription updated successfully',
    'user', row_to_json(v_current_user),
    'calendar_result', v_calendar_result
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to update user: ' || SQLERRM
    );
END;
$function$;