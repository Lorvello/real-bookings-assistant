-- Enhanced user status detection function
CREATE OR REPLACE FUNCTION public.get_user_status_type(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user record;
  v_calendar_count integer;
  v_service_count integer;
  v_now timestamp with time zone := NOW();
BEGIN
  -- Get user data
  SELECT * INTO v_user
  FROM public.users
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 'unknown';
  END IF;
  
  -- Count user's calendars and service types
  SELECT COUNT(*) INTO v_calendar_count
  FROM public.calendars
  WHERE user_id = p_user_id AND is_active = true;
  
  SELECT COUNT(*) INTO v_service_count
  FROM public.service_types st
  JOIN public.calendars c ON st.calendar_id = c.id
  WHERE c.user_id = p_user_id AND st.is_active = true;
  
  -- Check if setup is incomplete
  IF v_user.business_name IS NULL OR v_user.business_type IS NULL OR v_calendar_count = 0 OR v_service_count = 0 THEN
    RETURN 'setup_incomplete';
  END IF;
  
  -- Check if user has active paid subscription
  IF v_user.subscription_status = 'active' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date > v_now THEN
    RETURN 'paid_subscriber';
  END IF;
  
  -- Check if user has canceled subscription but still active
  IF v_user.subscription_status = 'canceled' AND 
     v_user.subscription_end_date IS NOT NULL AND 
     v_user.subscription_end_date > v_now THEN
    RETURN 'canceled_but_active';
  END IF;
  
  -- Check if trial is active
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date > v_now THEN
    RETURN 'active_trial';
  END IF;
  
  -- Check if trial is expired
  IF v_user.subscription_status = 'trial' AND 
     v_user.trial_end_date IS NOT NULL AND 
     v_user.trial_end_date <= v_now THEN
    RETURN 'expired_trial';
  END IF;
  
  -- Default case
  RETURN 'unknown';
END;
$$;

-- Developer admin functions for testing different user states
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

-- Helper function to ensure user has calendar and service type
CREATE OR REPLACE FUNCTION public.ensure_user_has_calendar_and_service(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_calendar_id uuid;
  v_calendar_exists boolean;
  v_service_exists boolean;
BEGIN
  -- Check if user has active calendar
  SELECT EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE user_id = p_user_id AND is_active = true
  ) INTO v_calendar_exists;
  
  -- Create calendar if doesn't exist
  IF NOT v_calendar_exists THEN
    INSERT INTO public.calendars (user_id, name, slug, is_active)
    VALUES (p_user_id, 'Mijn Kalender', 'cal-' || substr(p_user_id::text, 1, 8), true)
    RETURNING id INTO v_calendar_id;
  ELSE
    SELECT id INTO v_calendar_id
    FROM public.calendars
    WHERE user_id = p_user_id AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Check if user has service types
  SELECT EXISTS (
    SELECT 1 FROM public.service_types st
    JOIN public.calendars c ON st.calendar_id = c.id
    WHERE c.user_id = p_user_id AND st.is_active = true
  ) INTO v_service_exists;
  
  -- Create service type if doesn't exist
  IF NOT v_service_exists THEN
    INSERT INTO public.service_types (calendar_id, name, duration, price, description, color, is_active)
    VALUES (v_calendar_id, 'Standaard Afspraak', 30, 50.00, 'Standaard service type', '#3B82F6', true);
  END IF;
END;
$$;