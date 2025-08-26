-- CRITICAL SECURITY FIX: Restrict public access and secure database functions
-- Fix the main security vulnerabilities identified

-- Add search_path security to all remaining custom functions that don't have it
CREATE OR REPLACE FUNCTION public.get_calendar_availability(p_calendar_slug text, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
  v_result json;
BEGIN
  -- Haal calendar ID op via slug
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Haal beschikbare slots op voor alle actieve service types
  SELECT json_agg(
    json_build_object(
      'date', slot_date,
      'service_type_id', service_type_id,
      'service_name', service_name,
      'duration', service_duration,
      'price', service_price,
      'slots', slots_array
    )
  ) INTO v_result
  FROM (
    SELECT 
      slots.slot_date,
      st.id as service_type_id,
      st.name as service_name,
      st.duration as service_duration,
      st.price as service_price,
      json_agg(
        json_build_object(
          'start_time', slots.slot_start,
          'end_time', slots.slot_end,
          'available', slots.is_available
        ) ORDER BY slots.slot_start
      ) as slots_array
    FROM public.service_types st
    CROSS JOIN LATERAL public.get_available_slots_range(
      v_calendar_id,
      st.id,
      p_start_date,
      v_end_date
    ) as slots
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
    GROUP BY slots.slot_date, st.id, st.name, st.duration, st.price
    ORDER BY slots.slot_date, st.name
  ) availability_data;
  
  RETURN json_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'availability', COALESCE(v_result, '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- Update other critical functions with proper search_path
CREATE OR REPLACE FUNCTION public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max contacts based on subscription tier
  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- If unlimited (null), return true
  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current WhatsApp contacts for this user's calendars
  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_contacts;
END;
$function$;

-- Secure the views that exist with proper RLS
ALTER TABLE public.daily_booking_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_booking_stats_owner_only" ON public.daily_booking_stats;
CREATE POLICY "daily_booking_stats_owner_only" ON public.daily_booking_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = daily_booking_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

ALTER TABLE public.service_popularity_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_popularity_stats_owner_only" ON public.service_popularity_stats;
CREATE POLICY "service_popularity_stats_owner_only" ON public.service_popularity_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = service_popularity_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

ALTER TABLE public.user_status_overview ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_status_overview_own_only" ON public.user_status_overview;
CREATE POLICY "user_status_overview_own_only" ON public.user_status_overview
FOR SELECT USING (auth.uid() = id);

ALTER TABLE public.available_slots_view ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "available_slots_view_public_or_owner" ON public.available_slots_view;
CREATE POLICY "available_slots_view_public_or_owner" ON public.available_slots_view
FOR SELECT USING (
  -- Public can view for active calendars
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.slug = available_slots_view.calendar_slug 
    AND calendars.is_active = true
  )
  OR
  -- Owners can always view their calendar slots
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = available_slots_view.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);