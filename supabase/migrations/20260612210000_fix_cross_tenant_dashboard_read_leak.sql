-- SECURITY: close cross-tenant READ leak via SECURITY DEFINER dashboard RPCs.
-- get_todays_schedule/get_dashboard_metrics/etc. are SECURITY DEFINER (bypass RLS),
-- take a caller-supplied calendar_id, and had NO ownership check while EXECUTE was
-- granted to authenticated. Confirmed live: user B read user A's customer PII
-- (name/email/phone) and business metrics by passing A's calendar_id. These RPCs are
-- called by the dashboard hooks with the user's OWN calendar, so we cannot revoke
-- authenticated; instead we add an ownership guard (team-aware via account_owner_id)
-- that lets service_role / internal chains (auth.uid() NULL) through, and revoke anon.

CREATE OR REPLACE FUNCTION public.caller_owns_calendar(p_calendar_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendars c
    JOIN public.users owner ON owner.id = c.user_id
    WHERE c.id = p_calendar_id
      AND COALESCE(owner.account_owner_id, owner.id)
          = COALESCE((SELECT account_owner_id FROM public.users WHERE id = auth.uid()), auth.uid())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.caller_owns_calendar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_owns_calendar(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_booking_trends(p_calendar_id uuid, p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.get_conversation_context(p_phone_number text, p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.get_customer_metrics(p_calendar_ids uuid[], p_month_start timestamp with time zone, p_thirty_days_ago timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb;
  v_unique_customers integer := 0;
  v_returning_customers integer := 0;
  v_total_customers integer := 0;
  v_new_customers_this_month integer := 0;
  v_customer_growth_rate numeric := 0;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own every
  -- requested calendar; service_role / internal (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM unnest(p_calendar_ids) AS cid WHERE NOT public.caller_owns_calendar(cid)
  ) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
  -- Calculate comprehensive customer metrics combining email and WhatsApp data
  WITH all_customers AS (
    -- Email-based customers from bookings
    SELECT 
      customer_email as identifier,
      'email' as source,
      MIN(created_at) as first_contact,
      COUNT(*) as booking_count
    FROM public.bookings
    WHERE calendar_id = ANY(p_calendar_ids)
      AND customer_email IS NOT NULL
      AND status != 'cancelled'
    GROUP BY customer_email
    
    UNION ALL
    
    -- WhatsApp-based customers
    SELECT 
      wc.phone_number as identifier,
      'whatsapp' as source,
      MIN(wc.created_at) as first_contact,
      COUNT(DISTINCT b.id) as booking_count
    FROM public.whatsapp_contacts wc
    JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id
    LEFT JOIN public.bookings b ON (b.customer_phone = wc.phone_number OR b.customer_email = wc.linked_customer_email)
    WHERE conv.calendar_id = ANY(p_calendar_ids)
    GROUP BY wc.phone_number
  ),
  customer_summary AS (
    SELECT 
      identifier,
      source,
      first_contact,
      booking_count,
      CASE 
        WHEN first_contact >= p_thirty_days_ago THEN 'new'
        WHEN booking_count > 1 THEN 'returning'
        ELSE 'unique'
      END as customer_type
    FROM all_customers
  )
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE customer_type = 'new') as new_this_month,
    COUNT(*) FILTER (WHERE customer_type = 'returning') as returning,
    COUNT(*) FILTER (WHERE customer_type = 'unique' OR customer_type = 'new') as unique_customers
  INTO v_total_customers, v_new_customers_this_month, v_returning_customers, v_unique_customers
  FROM customer_summary;
  
  -- Calculate growth rate
  IF v_total_customers > 0 THEN
    v_customer_growth_rate := ROUND((v_new_customers_this_month::numeric / v_total_customers::numeric) * 100, 1);
  END IF;
  
  v_result := jsonb_build_object(
    'unique_customers', v_unique_customers,
    'returning_customers', v_returning_customers,
    'total_customers', v_total_customers,
    'new_customers_this_month', v_new_customers_this_month,
    'customer_growth_rate', v_customer_growth_rate
  );
  
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_result jsonb := '{}';
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_week_start timestamptz;
  v_month_start timestamptz;
  v_thirty_days_ago timestamptz;
  
  -- Booking metrics
  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
  v_total_revenue numeric := 0;
  
  -- WhatsApp metrics
  v_whatsapp_conversations integer := 0;
  v_whatsapp_messages_today integer := 0;
  v_conversion_rate numeric := 0;
  v_avg_response_time numeric := 0;
  
  -- Customer metrics
  v_unique_customers integer := 0;
  v_returning_customers integer := 0;
  v_total_customers integer := 0;
BEGIN
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
  -- Set date boundaries
  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day';
  v_week_start := date_trunc('week', now());
  v_month_start := date_trunc('month', now());
  v_thirty_days_ago := now() - interval '30 days';
  
  -- Get booking metrics
  SELECT 
    COUNT(*) FILTER (WHERE DATE(start_time) = CURRENT_DATE AND status != 'cancelled'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE start_time >= v_week_start AND status != 'cancelled'),
    COUNT(*) FILTER (WHERE start_time >= v_month_start AND status != 'cancelled'),
    COALESCE(SUM(total_price) FILTER (WHERE start_time >= v_month_start AND status = 'confirmed'), 0)
  INTO v_today_bookings, v_pending_bookings, v_week_bookings, v_month_bookings, v_total_revenue
  FROM public.bookings
  WHERE calendar_id = p_calendar_id;
  
  -- Get WhatsApp conversation metrics
  SELECT COUNT(*) INTO v_whatsapp_conversations
  FROM public.whatsapp_conversations
  WHERE calendar_id = p_calendar_id AND status = 'active';
  
  -- Get WhatsApp messages today
  SELECT COUNT(*) INTO v_whatsapp_messages_today
  FROM public.whatsapp_messages wm
  JOIN public.whatsapp_conversations wc ON wc.id = wm.conversation_id
  WHERE wc.calendar_id = p_calendar_id
    AND DATE(wm.created_at) = CURRENT_DATE;
  
  -- Calculate conversion rate (bookings from WhatsApp vs total WhatsApp conversations)
  WITH whatsapp_bookings AS (
    SELECT COUNT(*) as booking_count
    FROM public.bookings b
    WHERE b.calendar_id = p_calendar_id
      AND b.start_time >= v_thirty_days_ago
      AND b.status != 'cancelled'
      AND EXISTS (
        SELECT 1 FROM public.whatsapp_contacts wc
        WHERE wc.phone_number = b.customer_phone
          OR wc.linked_customer_email = b.customer_email
      )
  ),
  total_conversations AS (
    SELECT COUNT(*) as conv_count
    FROM public.whatsapp_conversations
    WHERE calendar_id = p_calendar_id
      AND created_at >= v_thirty_days_ago
  )
  SELECT 
    CASE 
      WHEN tc.conv_count > 0 THEN ROUND((wb.booking_count::numeric / tc.conv_count::numeric) * 100, 1)
      ELSE 0
    END
  INTO v_conversion_rate
  FROM whatsapp_bookings wb, total_conversations tc;
  
  -- Calculate customer metrics (combining email and WhatsApp)
  WITH all_customers AS (
    -- Email-based customers
    SELECT customer_email as identifier, MIN(created_at) as first_booking
    FROM public.bookings
    WHERE calendar_id = p_calendar_id
      AND customer_email IS NOT NULL
      AND status != 'cancelled'
    GROUP BY customer_email
    
    UNION
    
    -- WhatsApp-based customers
    SELECT wc.phone_number as identifier, MIN(wc.created_at) as first_booking
    FROM public.whatsapp_contacts wc
    JOIN public.whatsapp_conversations conv ON conv.contact_id = wc.id
    WHERE conv.calendar_id = p_calendar_id
    GROUP BY wc.phone_number
  )
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE first_booking >= v_thirty_days_ago) as new_customers,
    COUNT(*) FILTER (WHERE first_booking < v_thirty_days_ago) as returning
  INTO v_total_customers, v_unique_customers, v_returning_customers
  FROM all_customers;
  
  -- Calculate average response time (mock for now, will need message analysis)
  v_avg_response_time := 15; -- minutes, placeholder
  
  -- Build result
  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'conversion_rate', v_conversion_rate,
    'avg_response_time', v_avg_response_time,
    'whatsapp_conversations', v_whatsapp_conversations,
    'whatsapp_messages_today', v_whatsapp_messages_today,
    'unique_customers', v_unique_customers,
    'returning_customers', v_returning_customers,
    'total_customers', v_total_customers,
    'last_updated', now()
  );
  
  RETURN v_result;
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
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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
  -- SECURITY: block cross-tenant reads. authenticated callers must own the
  -- calendar; service_role / internal call-chains (auth.uid() IS NULL) bypass.
  IF auth.uid() IS NOT NULL AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller' USING ERRCODE = '42501';
  END IF;
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

-- No anon caller exists for these owner-data RPCs; remove anon entirely.
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_metrics_safe(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_todays_schedule(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_booking_trends(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_customer_metrics(uuid[], timestamptz, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_context(text, uuid) FROM anon;
