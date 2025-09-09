-- Fix all remaining database functions with search path security warnings
-- This ensures complete security compliance for all database functions

-- Create missing function that seems to be called in get_available_slots_range
CREATE OR REPLACE FUNCTION public.check_booking_conflicts(
  p_calendar_id uuid,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_exclude_booking_id uuid DEFAULT NULL,
  p_allow_double_bookings boolean DEFAULT false
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- If double bookings are allowed, no conflicts
  IF p_allow_double_bookings THEN
    RETURN false;
  END IF;
  
  -- Check for overlapping bookings
  RETURN EXISTS (
    SELECT 1 
    FROM public.bookings 
    WHERE calendar_id = p_calendar_id
      AND status NOT IN ('cancelled', 'no-show')
      AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  );
END;
$function$;

-- Get available slots range function
CREATE OR REPLACE FUNCTION public.get_available_slots_range(
  p_calendar_id uuid,
  p_service_type_id uuid,
  p_start_date date,
  p_end_date date
) RETURNS TABLE(
  slot_date date,
  slot_start timestamp with time zone,
  slot_end timestamp with time zone,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_service record;
  v_settings record;
  v_current_date date;
  v_rule record;
  v_current_slot timestamp with time zone;
  v_slot_end timestamp with time zone;
BEGIN
  -- Get service type info
  SELECT * INTO v_service
  FROM public.service_types
  WHERE id = p_service_type_id;
  
  IF v_service IS NULL THEN
    RETURN;
  END IF;
  
  -- Get calendar settings
  SELECT * INTO v_settings
  FROM public.calendar_settings
  WHERE calendar_id = p_calendar_id;
  
  IF v_settings IS NULL THEN
    v_settings := ROW(null, p_calendar_id, 30, 1, 60, 0, null, false, true, null, null, null, null, null, null, null, null, null);
  END IF;
  
  -- Loop through dates
  v_current_date := p_start_date;
  WHILE v_current_date <= p_end_date LOOP
    
    -- Get availability rules for this day
    FOR v_rule IN
      SELECT ar.start_time, ar.end_time, ar.is_available
      FROM public.availability_rules ar
      JOIN public.availability_schedules sch ON sch.id = ar.schedule_id
      WHERE sch.calendar_id = p_calendar_id
        AND sch.is_default = true
        AND ar.day_of_week = CASE 
          WHEN EXTRACT(DOW FROM v_current_date) = 0 THEN 7 
          ELSE EXTRACT(DOW FROM v_current_date)::integer 
        END
        AND ar.is_available = true
    LOOP
      -- Generate time slots for this availability window
      v_current_slot := (v_current_date || ' ' || v_rule.start_time)::timestamp with time zone;
      
      WHILE v_current_slot + (v_service.duration || ' minutes')::interval <= 
            (v_current_date || ' ' || v_rule.end_time)::timestamp with time zone LOOP
        
        v_slot_end := v_current_slot + (v_service.duration || ' minutes')::interval;
        
        RETURN QUERY SELECT 
          v_current_date,
          v_current_slot,
          v_slot_end,
          NOT public.check_booking_conflicts(
            p_calendar_id,
            v_current_slot,
            v_slot_end,
            NULL,
            false
          );
        
        -- Move to next slot
        v_current_slot := v_current_slot + (v_settings.slot_duration || ' minutes')::interval;
      END LOOP;
    END LOOP;
    
    v_current_date := v_current_date + 1;
  END LOOP;
END;
$function$;

-- Update existing customer metrics function
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

-- Update account owner and role check functions
CREATE OR REPLACE FUNCTION public.get_account_owner_id(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- If user has no account_owner_id, they are the account owner
  -- Otherwise, return their account_owner_id
  RETURN (
    SELECT COALESCE(account_owner_id, id) 
    FROM public.users 
    WHERE id = p_user_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_account_owner(p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN (
    SELECT account_owner_id IS NULL 
    FROM public.users 
    WHERE id = p_user_id
  );
END;
$function$;