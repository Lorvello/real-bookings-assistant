
-- Helper functie om day_of_week om te zetten naar Nederlandse dag namen
CREATE OR REPLACE FUNCTION public.get_day_name_dutch(day_num integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE day_num
    WHEN 0 THEN RETURN 'Zondag';
    WHEN 1 THEN RETURN 'Maandag';
    WHEN 2 THEN RETURN 'Dinsdag';
    WHEN 3 THEN RETURN 'Woensdag';
    WHEN 4 THEN RETURN 'Donderdag';
    WHEN 5 THEN RETURN 'Vrijdag';
    WHEN 6 THEN RETURN 'Zaterdag';
    ELSE RETURN 'Onbekend';
  END CASE;
END;
$$;

-- Helper functie om geformatteerde openingstijden te genereren
CREATE OR REPLACE FUNCTION public.get_formatted_business_hours(p_calendar_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result text := '';
  v_rule record;
  v_day_name text;
BEGIN
  -- Haal alle availability rules op voor de standaard schedule
  FOR v_rule IN 
    SELECT ar.day_of_week, ar.start_time, ar.end_time, ar.is_available
    FROM public.availability_rules ar
    JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
    WHERE sch.calendar_id = p_calendar_id
      AND sch.is_default = true
    ORDER BY ar.day_of_week
  LOOP
    v_day_name := public.get_day_name_dutch(v_rule.day_of_week);
    
    IF v_rule.is_available THEN
      v_result := v_result || v_day_name || ': ' || 
                  v_rule.start_time::text || ' - ' || 
                  v_rule.end_time::text || E'\n';
    ELSE
      v_result := v_result || v_day_name || ': Gesloten' || E'\n';
    END IF;
  END LOOP;
  
  RETURN TRIM(v_result);
END;
$$;

-- Verwijder de oude materialized view
DROP MATERIALIZED VIEW IF EXISTS public.business_availability_overview;

-- Hermaak de materialized view met formatted_opening_hours
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
  
  -- Geformatteerde openingstijden (NIEUW)
  public.get_formatted_business_hours(c.id) as formatted_opening_hours,
  
  -- Availability rules aggregated as JSON
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'day_of_week', ar.day_of_week,
        'day_name_dutch', public.get_day_name_dutch(ar.day_of_week),
        'start_time', ar.start_time,
        'end_time', ar.end_time,
        'is_available', ar.is_available
      ) ORDER BY ar.day_of_week
    )
    FROM public.availability_rules ar 
    WHERE ar.schedule_id = avs.id
  ) as availability_rules,
  
  -- Bestaande kolommen blijven hetzelfde
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

-- Hermaak de indexes
CREATE UNIQUE INDEX idx_business_availability_overview_unique 
ON public.business_availability_overview(user_id, calendar_id, COALESCE(service_type_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(schedule_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX idx_business_availability_overview_calendar_id ON public.business_availability_overview(calendar_id);
CREATE INDEX idx_business_availability_overview_service_type_id ON public.business_availability_overview(service_type_id);
CREATE INDEX idx_business_availability_overview_business_name ON public.business_availability_overview(business_name);
CREATE INDEX idx_business_availability_overview_calendar_slug ON public.business_availability_overview(calendar_slug);

-- N8N Helper functie voor duidelijke dag mapping
CREATE OR REPLACE FUNCTION public.get_n8n_day_mapping()
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'day_mapping', jsonb_build_object(
      '0', 'Zondag',
      '1', 'Maandag', 
      '2', 'Dinsdag',
      '3', 'Woensdag',
      '4', 'Donderdag',
      '5', 'Vrijdag',
      '6', 'Zaterdag'
    ),
    'instructions', 'day_of_week in availability_rules uses 0=Sunday, 1=Monday format. Use formatted_opening_hours for display or day_name_dutch from availability_rules JSON.'
  );
END;
$$;
