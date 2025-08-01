-- Update trial period from 7 days to 30 days across all functions

-- Update handle_new_user function to use 30 days
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    full_name,
    phone,
    subscription_status,
    subscription_tier,
    trial_start_date,
    trial_end_date,
    business_name,
    business_type,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'phone',
    'trial',
    'professional',
    NOW(),
    NOW() + interval '30 days',  -- Changed from 7 to 30 days
    NULL,
    NULL,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;

-- Update admin_setup_mock_incomplete_user function to use 30 days
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
    subscription_tier = 'professional',
    trial_start_date = NOW(),
    trial_end_date = NOW() + interval '30 days',  -- Changed from 7 to 30 days
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
    'message', 'User successfully reset to setup incomplete state with professional tier (30-day trial)',
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

-- Update admin_set_user_status function to use 30 days for trials
CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id uuid, p_status_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      v_subscription_end_date := NULL;
    WHEN 'active_trial' THEN
      v_subscription_status := 'trial';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
      v_subscription_end_date := NULL;
    WHEN 'expired_trial' THEN
      v_subscription_status := 'expired';
      v_subscription_tier := NULL;
      v_trial_end_date := NOW() - interval '1 day';
      v_subscription_end_date := NULL;
    WHEN 'paid_subscriber' THEN
      v_subscription_status := 'active';
      v_subscription_tier := 'professional';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '1 month';
    WHEN 'canceled_but_active' THEN
      v_subscription_status := 'canceled';
      v_subscription_tier := 'professional';
      v_trial_end_date := NULL;
      v_subscription_end_date := NOW() + interval '30 days';  -- Changed from 7 to 30 days
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
$function$;