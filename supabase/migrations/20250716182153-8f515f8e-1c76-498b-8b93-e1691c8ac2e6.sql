-- Update create_user_with_calendar function to only create calendar without auto-setup
CREATE OR REPLACE FUNCTION public.create_user_with_calendar(
  p_email text, 
  p_full_name text, 
  p_business_name text DEFAULT NULL::text, 
  p_business_type text DEFAULT NULL::text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id uuid;
  v_calendar_id uuid;
  v_calendar_slug text;
BEGIN
  -- Controleer of gebruiker geauthenticeerd is
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;
  
  v_user_id := auth.uid();
  
  -- Update user profile (user record bestaat al via trigger)
  UPDATE public.users 
  SET 
    full_name = COALESCE(p_full_name, full_name),
    business_name = p_business_name,
    business_type = p_business_type,
    updated_at = now()
  WHERE id = v_user_id;
  
  -- Haal calendar op die automatisch is aangemaakt
  SELECT id, slug INTO v_calendar_id, v_calendar_slug
  FROM public.calendars 
  WHERE user_id = v_user_id 
  LIMIT 1;
  
  -- Als geen kalender bestaat, maak er een aan
  IF v_calendar_id IS NULL THEN
    v_calendar_slug := 'cal-' || substr(v_user_id::text, 1, 8);
    
    INSERT INTO public.calendars (user_id, name, slug)
    VALUES (v_user_id, 'Mijn Kalender', v_calendar_slug)
    RETURNING id INTO v_calendar_id;
  END IF;
  
  -- REMOVED: Don't auto-setup defaults
  -- PERFORM public.setup_calendar_defaults(v_calendar_id, p_business_type);
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'calendar_id', v_calendar_id,
    'calendar_slug', v_calendar_slug
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;