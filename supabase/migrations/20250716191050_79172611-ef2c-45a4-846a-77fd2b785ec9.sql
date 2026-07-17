-- Remove automatic service type creation from setup_calendar_defaults function
DROP FUNCTION IF EXISTS public.setup_calendar_defaults(uuid, text);

-- Create new version that doesn't create service types
CREATE OR REPLACE FUNCTION public.setup_calendar_defaults(
  p_calendar_id uuid, 
  p_business_type text DEFAULT NULL::text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Controleer of kalender bestaat en gebruiker eigenaar is
  IF NOT EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE id = p_calendar_id 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Calendar not found or access denied';
  END IF;
  
  -- Only update calendar settings based on business type, NO service types creation
  UPDATE public.calendar_settings
  SET
    slot_duration = CASE 
      WHEN p_business_type = 'salon' THEN 45
      WHEN p_business_type = 'clinic' THEN 30
      WHEN p_business_type = 'consultant' THEN 60
      WHEN p_business_type = 'trainer' THEN 60
      ELSE 30
    END,
    minimum_notice_hours = CASE 
      WHEN p_business_type IN ('clinic', 'consultant') THEN 48
      ELSE 24
    END,
    booking_window_days = CASE
      WHEN p_business_type = 'consultant' THEN 90
      ELSE 60
    END,
    confirmation_required = CASE
      WHEN p_business_type IN ('clinic', 'consultant') THEN true
      ELSE false
    END
  WHERE calendar_id = p_calendar_id;
END;
$$;

-- Remove or update the ensure_default_service_types function to do nothing
DROP FUNCTION IF EXISTS public.ensure_default_service_types();

CREATE OR REPLACE FUNCTION public.ensure_default_service_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- This function now does nothing - manual service creation required
  RETURN;
END;
$$;