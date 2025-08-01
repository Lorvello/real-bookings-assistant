-- Fix Setup Incomplete to be completely self-contained
CREATE OR REPLACE FUNCTION public.admin_setup_mock_incomplete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Clear all user-related data in correct order to avoid foreign key violations
  DELETE FROM public.bookings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  -- Delete waitlist entries BEFORE service_types (foreign key constraint)
  DELETE FROM public.waitlist 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_overrides 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.availability_rules 
  WHERE schedule_id IN (
    SELECT id FROM public.availability_schedules 
    WHERE calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = p_user_id
    )
  );
  
  DELETE FROM public.availability_schedules 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.service_types 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendar_settings 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.whatsapp_conversations 
  WHERE calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = p_user_id
  );
  
  DELETE FROM public.calendars WHERE user_id = p_user_id;
  
  -- Reset user to setup incomplete state with PROFESSIONAL tier
  UPDATE public.users 
  SET 
    subscription_status = 'trial',
    subscription_tier = 'professional', -- Set to professional for immediate access
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