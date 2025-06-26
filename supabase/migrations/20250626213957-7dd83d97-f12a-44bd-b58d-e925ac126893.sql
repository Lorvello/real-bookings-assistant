
-- First, create the materialized view
CREATE MATERIALIZED VIEW public.business_availability_overview AS
SELECT 
  -- Business information
  u.id as user_id,
  u.business_name,
  u.business_email,
  u.business_phone,
  u.business_whatsapp,
  u.business_type,
  u.business_description,
  u.business_street,
  u.business_number,
  u.business_postal,
  u.business_city,
  u.business_country,
  u.website,
  u.instagram,
  u.facebook,
  u.linkedin,
  
  -- Calendar information
  c.id as calendar_id,
  c.name as calendar_name,
  c.slug as calendar_slug,
  c.timezone,
  c.is_active as calendar_active,
  c.description as calendar_description,
  c.color as calendar_color,
  
  -- Calendar settings
  cs.booking_window_days,
  cs.minimum_notice_hours,
  cs.slot_duration,
  cs.buffer_time,
  cs.max_bookings_per_day,
  cs.allow_waitlist,
  cs.confirmation_required,
  cs.whatsapp_bot_active,
  
  -- Service types information
  st.id as service_type_id,
  st.name as service_name,
  st.description as service_description,
  st.duration as service_duration,
  st.price as service_price,
  st.color as service_color,
  st.is_active as service_active,
  st.max_attendees,
  st.preparation_time,
  st.cleanup_time,
  
  -- Availability schedule information
  avs.id as schedule_id,
  avs.name as schedule_name,
  avs.is_default as is_default_schedule,
  
  -- Availability rules aggregated as JSON
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'day_of_week', ar.day_of_week,
        'start_time', ar.start_time,
        'end_time', ar.end_time,
        'is_available', ar.is_available
      ) ORDER BY ar.day_of_week
    )
    FROM public.availability_rules ar 
    WHERE ar.schedule_id = avs.id
  ) as availability_rules,
  
  -- Recent availability overrides as JSON
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'date', ao.date,
        'is_available', ao.is_available,
        'start_time', ao.start_time,
        'end_time', ao.end_time,
        'reason', ao.reason
      ) ORDER BY ao.date DESC
    )
    FROM public.availability_overrides ao 
    WHERE ao.calendar_id = c.id 
      AND ao.date >= CURRENT_DATE - INTERVAL '7 days'
      AND ao.date <= CURRENT_DATE + INTERVAL '30 days'
  ) as recent_overrides,
  
  -- Booking statistics for current month
  (
    SELECT jsonb_build_object(
      'total_bookings', COUNT(*),
      'confirmed_bookings', COUNT(*) FILTER (WHERE status = 'confirmed'),
      'pending_bookings', COUNT(*) FILTER (WHERE status = 'pending'),
      'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
      'total_revenue', COALESCE(SUM(COALESCE(total_price, st.price, 0)), 0)
    )
    FROM public.bookings b
    WHERE b.calendar_id = c.id
      AND b.start_time >= date_trunc('month', CURRENT_DATE)
      AND b.start_time < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  ) as current_month_stats,
  
  -- Metadata
  NOW() as last_updated,
  c.created_at as calendar_created_at,
  u.created_at as business_created_at

FROM public.users u
JOIN public.calendars c ON u.id = c.user_id
LEFT JOIN public.calendar_settings cs ON c.id = cs.calendar_id
LEFT JOIN public.service_types st ON c.id = st.calendar_id AND st.is_active = true
LEFT JOIN public.availability_schedules avs ON c.id = avs.calendar_id AND avs.is_default = true
WHERE c.is_active = true
ORDER BY u.business_name, c.name, st.name;

-- Create unique index for concurrent refreshes
CREATE UNIQUE INDEX idx_business_availability_overview_unique 
ON public.business_availability_overview(user_id, calendar_id, COALESCE(service_type_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Create other indexes for better performance
CREATE INDEX idx_business_availability_overview_calendar_id ON public.business_availability_overview(calendar_id);
CREATE INDEX idx_business_availability_overview_service_type_id ON public.business_availability_overview(service_type_id);
CREATE INDEX idx_business_availability_overview_business_name ON public.business_availability_overview(business_name);
CREATE INDEX idx_business_availability_overview_calendar_slug ON public.business_availability_overview(calendar_slug);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION public.refresh_business_availability_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try concurrent refresh first, fallback to regular refresh if it fails
  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.business_availability_overview;
  EXCEPTION
    WHEN OTHERS THEN
      -- If concurrent refresh fails, do a regular refresh
      REFRESH MATERIALIZED VIEW public.business_availability_overview;
  END;
END;
$$;

-- Function to get available slots for a specific business/calendar/service
CREATE OR REPLACE FUNCTION public.get_business_available_slots(
  p_calendar_slug text,
  p_service_type_id uuid DEFAULT NULL,
  p_start_date date DEFAULT CURRENT_DATE,
  p_days integer DEFAULT 14
)
RETURNS TABLE(
  business_name text,
  calendar_name text,
  service_name text,
  slot_date date,
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean,
  service_price numeric,
  service_duration integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
BEGIN
  -- Get calendar ID from slug
  SELECT calendar_id INTO v_calendar_id
  FROM public.business_availability_overview
  WHERE calendar_slug = p_calendar_slug
  LIMIT 1;
  
  IF v_calendar_id IS NULL THEN
    RETURN;
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Return available slots with business context
  RETURN QUERY
  SELECT 
    bao.business_name,
    bao.calendar_name,
    bao.service_name,
    slots.slot_date::date,
    slots.slot_start,
    slots.slot_end,
    slots.is_available,
    bao.service_price,
    bao.service_duration
  FROM public.business_availability_overview bao
  CROSS JOIN LATERAL public.get_available_slots_range(
    bao.calendar_id,
    bao.service_type_id,
    p_start_date,
    v_end_date
  ) as slots
  WHERE bao.calendar_slug = p_calendar_slug
    AND bao.service_active = true
    AND (p_service_type_id IS NULL OR bao.service_type_id = p_service_type_id)
  ORDER BY slots.slot_date, slots.slot_start, bao.service_name;
END;
$$;

-- Trigger function to auto-refresh the materialized view when relevant data changes
CREATE OR REPLACE FUNCTION public.trigger_business_overview_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Schedule refresh in background to avoid blocking the transaction
  PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers to auto-refresh when data changes
CREATE TRIGGER trigger_refresh_on_user_update
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_overview_refresh();

CREATE TRIGGER trigger_refresh_on_calendar_update
  AFTER INSERT OR UPDATE OR DELETE ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_overview_refresh();

CREATE TRIGGER trigger_refresh_on_service_type_update
  AFTER INSERT OR UPDATE OR DELETE ON public.service_types
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_overview_refresh();

CREATE TRIGGER trigger_refresh_on_calendar_settings_update
  AFTER INSERT OR UPDATE OR DELETE ON public.calendar_settings
  FOR EACH ROW EXECUTE FUNCTION public.trigger_business_overview_refresh();
