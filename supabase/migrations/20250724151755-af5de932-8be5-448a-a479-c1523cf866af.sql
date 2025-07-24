-- =====================================================
-- CRITICAL SECURITY FIXES - Phase 1c: Final Database Functions
-- =====================================================

-- Complete fixing all remaining database functions by adding SET search_path TO ''

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.team_invitations 
  SET status = 'expired'
  WHERE status = 'pending' 
    AND expires_at <= now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.add_to_waitlist(p_calendar_slug text, p_service_type_id uuid, p_customer_name text, p_customer_email text, p_preferred_date date, p_preferred_time_start time without time zone DEFAULT NULL::time without time zone, p_preferred_time_end time without time zone DEFAULT NULL::time without time zone, p_flexibility text DEFAULT 'anytime'::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_waitlist_id uuid;
BEGIN
  -- Get calendar ID
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
  
  -- Check if service type exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM public.service_types
    WHERE id = p_service_type_id 
      AND calendar_id = v_calendar_id
      AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Service type not found'
    );
  END IF;
  
  -- Add to waitlist
  INSERT INTO public.waitlist (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    preferred_date,
    preferred_time_start,
    preferred_time_end,
    flexibility
  ) VALUES (
    v_calendar_id,
    p_service_type_id,
    p_customer_name,
    p_customer_email,
    p_preferred_date,
    p_preferred_time_start,
    p_preferred_time_end,
    p_flexibility
  ) RETURNING id INTO v_waitlist_id;
  
  RETURN json_build_object(
    'success', true,
    'waitlist_id', v_waitlist_id,
    'message', 'Successfully added to waitlist'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_analytics_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.calendar_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.service_type_stats;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_error(p_calendar_id uuid, p_error_type text, p_error_message text, p_error_context jsonb DEFAULT NULL::jsonb, p_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.error_logs (calendar_id, error_type, error_message, error_context, user_id)
  VALUES (p_calendar_id, p_error_type, p_error_message, p_error_context, p_user_id)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_webhook_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM process_booking_webhook_events();
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_conversation_context(p_phone_number text, p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Haal alle relevante context op voor een gesprek
  SELECT jsonb_build_object(
    'contact', row_to_json(wc.*),
    'conversation', row_to_json(conv.*),
    'recent_messages', (
      SELECT jsonb_agg(row_to_json(m.*) ORDER BY m.created_at DESC)
      FROM public.whatsapp_messages m
      WHERE m.conversation_id = conv.id
      LIMIT 10
    ),
    'active_booking_intent', (
      SELECT row_to_json(bi.*)
      FROM public.booking_intents bi
      WHERE bi.conversation_id = conv.id
      AND bi.status = 'collecting_info'
      ORDER BY bi.created_at DESC
      LIMIT 1
    ),
    'context_history', (
      SELECT jsonb_agg(row_to_json(cc.*) ORDER BY cc.created_at DESC)
      FROM public.conversation_context cc
      WHERE cc.conversation_id = conv.id
      AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
      LIMIT 20
    ),
    'previous_bookings', (
      SELECT jsonb_agg(row_to_json(b.*))
      FROM public.bookings b
      WHERE b.customer_phone = p_phone_number
      AND b.calendar_id = p_calendar_id
      ORDER BY b.created_at DESC
      LIMIT 5
    )
  ) INTO v_result
  FROM public.whatsapp_contacts wc
  LEFT JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id AND conv.calendar_id = p_calendar_id
  WHERE wc.phone_number = p_phone_number;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics_safe(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_total_revenue numeric := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
BEGIN
  -- Veilige queries met COALESCE voor null handling
  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_today_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND DATE(start_time) = CURRENT_DATE
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_today_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_pending_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND status = 'pending';
  EXCEPTION WHEN OTHERS THEN
    v_pending_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_week_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('week', CURRENT_DATE)
      AND start_time < date_trunc('week', CURRENT_DATE) + interval '7 days'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_week_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(COUNT(*), 0) INTO v_month_bookings
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id 
      AND start_time >= date_trunc('month', CURRENT_DATE)
      AND start_time < date_trunc('month', CURRENT_DATE) + interval '1 month'
      AND status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_month_bookings := 0;
  END;

  BEGIN
    SELECT COALESCE(SUM(COALESCE(b.total_price, st.price, 0)), 0) INTO v_total_revenue
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id 
      AND b.start_time >= date_trunc('month', CURRENT_DATE)
      AND b.status != 'cancelled';
  EXCEPTION WHEN OTHERS THEN
    v_total_revenue := 0;
  END;

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', 0,
    'avg_response_time', 0,
    'last_updated', now()
  );

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_todays_schedule(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'customer_name', b.customer_name,
      'service_name', COALESCE(b.service_name, st.name),
      'start_time', b.start_time,
      'end_time', b.end_time,
      'status', b.status,
      'customer_phone', b.customer_phone,
      'customer_email', b.customer_email,
      'notes', b.notes
    ) ORDER BY b.start_time
  ) INTO v_result
  FROM public.bookings b
  LEFT JOIN public.service_types st ON b.service_type_id = st.id
  WHERE b.calendar_id = p_calendar_id
    AND DATE(b.start_time) = CURRENT_DATE
    AND b.status != 'cancelled';

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_booking_trends(p_calendar_id uuid, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', booking_date,
      'bookings', booking_count,
      'revenue', revenue
    ) ORDER BY booking_date
  ) INTO v_result
  FROM (
    SELECT 
      DATE(b.start_time) as booking_date,
      COUNT(*) as booking_count,
      SUM(COALESCE(b.total_price, st.price, 0)) as revenue
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.calendar_id = p_calendar_id
      AND b.start_time >= CURRENT_DATE - (p_days || ' days')::interval
      AND b.status != 'cancelled'
    GROUP BY DATE(b.start_time)
    ORDER BY DATE(b.start_time)
  ) trends;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_whatsapp_contact_overview()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Clear existing data
  DELETE FROM public.whatsapp_contact_overview;
  
  -- Insert fresh data
  INSERT INTO public.whatsapp_contact_overview (
    contact_id, phone_number, display_name, first_name, last_name,
    session_id, calendar_id, calendar_name, business_name,
    booking_id, laatste_booking, laatste_service, booking_status,
    last_seen_at, contact_created_at, conversation_status,
    last_message_at, conversation_created_at
  )
  SELECT 
    wc.id as contact_id,
    wc.phone_number,
    wc.display_name,
    wc.first_name,
    wc.last_name,
    conv.session_id,
    conv.calendar_id,
    cal.name as calendar_name,
    u.business_name,
    latest_booking.booking_id,
    latest_booking.booking_start_time as laatste_booking,
    latest_booking.service_name as laatste_service,
    latest_booking.booking_status,
    wc.last_seen_at,
    wc.created_at as contact_created_at,
    conv.status as conversation_status,
    conv.last_message_at,
    conv.created_at as conversation_created_at
  FROM public.whatsapp_contacts wc
  LEFT JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  LEFT JOIN public.calendars cal ON conv.calendar_id = cal.id
  LEFT JOIN public.users u ON cal.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT 
      b.id as booking_id,
      b.start_time as booking_start_time,
      COALESCE(b.service_name, st.name) as service_name,
      b.status as booking_status
    FROM public.bookings b
    LEFT JOIN public.service_types st ON b.service_type_id = st.id
    WHERE b.customer_phone = wc.phone_number
      AND b.calendar_id = conv.calendar_id
    ORDER BY b.start_time DESC
    LIMIT 1
  ) latest_booking ON true;
END;
$function$;