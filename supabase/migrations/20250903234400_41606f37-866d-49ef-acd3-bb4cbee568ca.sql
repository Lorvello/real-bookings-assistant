-- Create customer metrics function with WhatsApp integration
CREATE OR REPLACE FUNCTION public.get_customer_metrics(
  p_calendar_ids uuid[],
  p_month_start timestamptz,
  p_thirty_days_ago timestamptz
)
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