-- Function to completely clear user's setup data for fresh account simulation
CREATE OR REPLACE FUNCTION public.admin_clear_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_ids uuid[];
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get all calendar IDs for this user
  SELECT ARRAY_AGG(id) INTO v_calendar_ids
  FROM public.calendars 
  WHERE user_id = p_user_id;
  
  -- Clear all setup data in correct order (due to foreign key constraints)
  
  -- Clear bookings first (depends on calendars and service_types)
  DELETE FROM public.bookings 
  WHERE calendar_id = ANY(v_calendar_ids);
  
  -- Clear availability rules and schedules
  DELETE FROM public.availability_rules 
  WHERE schedule_id IN (
    SELECT id FROM public.availability_schedules 
    WHERE calendar_id = ANY(v_calendar_ids)
  );
  
  DELETE FROM public.availability_schedules 
  WHERE calendar_id = ANY(v_calendar_ids);
  
  -- Clear service types
  DELETE FROM public.service_types 
  WHERE calendar_id = ANY(v_calendar_ids);
  
  -- Clear calendar settings
  DELETE FROM public.calendar_settings 
  WHERE calendar_id = ANY(v_calendar_ids);
  
  -- Clear calendar members
  DELETE FROM public.calendar_members 
  WHERE calendar_id = ANY(v_calendar_ids);
  
  -- Clear calendars
  DELETE FROM public.calendars 
  WHERE user_id = p_user_id;
  
  -- Reset user's business information but keep auth info
  UPDATE public.users 
  SET 
    business_name = NULL,
    business_type = NULL,
    business_type_other = NULL,
    business_description = NULL,
    business_phone = NULL,
    business_email = NULL,
    business_whatsapp = NULL,
    business_street = NULL,
    business_number = NULL,
    business_postal = NULL,
    business_city = NULL,
    business_country = 'Nederland',
    website = NULL,
    facebook = NULL,
    instagram = NULL,
    linkedin = NULL,
    tiktok = NULL,
    parking_info = NULL,
    public_transport_info = NULL,
    accessibility_info = NULL,
    other_info = NULL,
    opening_hours_note = NULL,
    team_size = '1',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User data cleared successfully',
    'calendars_cleared', COALESCE(array_length(v_calendar_ids, 1), 0)
  );
END;
$$;

-- Function to generate mock data based on user status level
CREATE OR REPLACE FUNCTION public.admin_generate_mock_data(p_user_id uuid, p_status_level text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_id uuid;
  v_schedule_id uuid;
  v_service_id uuid;
  v_user_name text;
BEGIN
  -- Check if user exists
  SELECT full_name INTO v_user_name
  FROM public.users 
  WHERE id = p_user_id;
  
  IF v_user_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Generate data based on status level
  CASE p_status_level
    WHEN 'setup_incomplete' THEN
      -- For setup incomplete, we already cleared data, so just return success
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Setup incomplete status - clean slate maintained'
      );
      
    WHEN 'active_trial' THEN
      -- Generate basic setup data
      
      -- Update user with basic business info
      UPDATE public.users 
      SET 
        business_name = COALESCE(v_user_name || '''s Business', 'Demo Business'),
        business_type = 'consultant',
        business_description = 'Demo business for trial user',
        business_phone = '+31 6 12345678',
        business_email = 'demo@example.com',
        business_city = 'Amsterdam',
        business_country = 'Nederland',
        updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Create one calendar
      INSERT INTO public.calendars (user_id, name, description, slug, is_default, is_active)
      VALUES (p_user_id, 'Demo Calendar', 'Your demo calendar', 'demo-cal-' || substr(p_user_id::text, 1, 8), true, true)
      RETURNING id INTO v_calendar_id;
      
      -- Create default availability schedule
      INSERT INTO public.availability_schedules (calendar_id, name, is_default)
      VALUES (v_calendar_id, 'Default Schedule', true)
      RETURNING id INTO v_schedule_id;
      
      -- Add basic availability (Monday to Friday, 9-17)
      INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available) VALUES
      (v_schedule_id, 1, '09:00', '17:00', true),
      (v_schedule_id, 2, '09:00', '17:00', true),
      (v_schedule_id, 3, '09:00', '17:00', true),
      (v_schedule_id, 4, '09:00', '17:00', true),
      (v_schedule_id, 5, '09:00', '17:00', true),
      (v_schedule_id, 6, '00:00', '00:00', false),
      (v_schedule_id, 0, '00:00', '00:00', false);
      
      -- Create basic service types
      INSERT INTO public.service_types (calendar_id, name, description, duration, price, color) VALUES
      (v_calendar_id, 'Consultation', 'Standard consultation session', 60, 125.00, '#3B82F6'),
      (v_calendar_id, 'Quick Meeting', 'Short meeting or check-in', 30, 75.00, '#10B981');
      
      -- Calendar settings will be created by trigger
      
    WHEN 'paid_subscriber' THEN
      -- Generate comprehensive setup data
      
      -- Update user with full business info
      UPDATE public.users 
      SET 
        business_name = COALESCE(v_user_name || '''s Professional Services', 'Professional Services'),
        business_type = 'consultant',
        business_description = 'Full-service professional consulting business',
        business_phone = '+31 20 1234567',
        business_email = 'contact@professional.com',
        business_whatsapp = '+31 6 12345678',
        business_street = 'Kalverstraat',
        business_number = '123',
        business_postal = '1012 NX',
        business_city = 'Amsterdam',
        business_country = 'Nederland',
        website = 'https://professional.com',
        instagram = '@professional',
        linkedin = 'professional-services',
        parking_info = 'Paid parking available nearby',
        public_transport_info = 'Near Central Station',
        team_size = '5-10',
        updated_at = NOW()
      WHERE id = p_user_id;
      
      -- Create main calendar
      INSERT INTO public.calendars (user_id, name, description, slug, is_default, is_active)
      VALUES (p_user_id, 'Main Calendar', 'Primary business calendar', 'main-cal-' || substr(p_user_id::text, 1, 8), true, true)
      RETURNING id INTO v_calendar_id;
      
      -- Create availability schedule
      INSERT INTO public.availability_schedules (calendar_id, name, is_default)
      VALUES (v_calendar_id, 'Business Hours', true)
      RETURNING id INTO v_schedule_id;
      
      -- Full week availability
      INSERT INTO public.availability_rules (schedule_id, day_of_week, start_time, end_time, is_available) VALUES
      (v_schedule_id, 1, '08:00', '18:00', true),
      (v_schedule_id, 2, '08:00', '18:00', true),
      (v_schedule_id, 3, '08:00', '18:00', true),
      (v_schedule_id, 4, '08:00', '18:00', true),
      (v_schedule_id, 5, '08:00', '17:00', true),
      (v_schedule_id, 6, '10:00', '14:00', true),
      (v_schedule_id, 0, '00:00', '00:00', false);
      
      -- Create comprehensive service types
      INSERT INTO public.service_types (calendar_id, name, description, duration, price, color) VALUES
      (v_calendar_id, 'Strategy Session', 'Deep-dive strategy consultation', 120, 250.00, '#3B82F6'),
      (v_calendar_id, 'Regular Consultation', 'Standard consultation meeting', 60, 150.00, '#10B981'),
      (v_calendar_id, 'Quick Check-in', 'Brief status update meeting', 30, 75.00, '#F59E0B'),
      (v_calendar_id, 'Workshop Session', 'Interactive workshop or training', 180, 400.00, '#8B5CF6'),
      (v_calendar_id, 'Follow-up Call', 'Post-project follow-up', 45, 100.00, '#EF4444');
      
      -- Update calendar settings for professional use
      UPDATE public.calendar_settings 
      SET 
        slot_duration = 30,
        minimum_notice_hours = 24,
        booking_window_days = 90,
        max_bookings_per_day = 8,
        buffer_time = 15,
        confirmation_required = true,
        allow_waitlist = true
      WHERE calendar_id = v_calendar_id;
      
    WHEN 'expired_trial' THEN
      -- Keep existing data unchanged for expired trial
      RETURN jsonb_build_object(
        'success', true,
        'message', 'Expired trial status - existing data preserved'
      );
      
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid status level: ' || p_status_level
      );
  END CASE;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Mock data generated successfully for ' || p_status_level,
    'status_level', p_status_level
  );
END;
$$;

-- Enhanced admin_set_user_status function that also handles data manipulation
CREATE OR REPLACE FUNCTION public.admin_set_user_status(
  p_user_id uuid, 
  p_status text, 
  p_clear_data boolean DEFAULT false,
  p_generate_mock_data boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_clear_result jsonb;
  v_mock_result jsonb;
BEGIN
  -- First, clear existing data if requested
  IF p_clear_data THEN
    SELECT public.admin_clear_user_data(p_user_id) INTO v_clear_result;
    
    IF NOT (v_clear_result->>'success')::boolean THEN
      RETURN v_clear_result;
    END IF;
  END IF;
  
  -- Update user status
  UPDATE public.users 
  SET 
    subscription_status = p_status,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Generate mock data if requested
  IF p_generate_mock_data THEN
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
    'data_cleared', p_clear_data,
    'mock_data_generated', p_generate_mock_data,
    'clear_result', v_clear_result,
    'mock_result', v_mock_result
  );
END;
$$;