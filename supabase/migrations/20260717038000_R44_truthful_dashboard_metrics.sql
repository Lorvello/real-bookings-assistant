-- R44: truthful tenant-scoped dashboard metrics. Money is retained captured
-- payment-ledger value, never booking list price. Contact matching is named as
-- correlation rather than WhatsApp causality. Day/week/month boundaries are
-- evaluated in the calendar's own timezone.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.dashboard_period_bounds(
  p_timezone text,
  p_instant timestamptz
)
RETURNS TABLE (
  today_start timestamptz,
  today_end timestamptz,
  week_start timestamptz,
  week_end timestamptz,
  month_start timestamptz,
  month_end timestamptz
)
LANGUAGE sql
STABLE
STRICT
SET search_path = ''
AS $function$
  WITH local_clock AS (
    SELECT p_instant AT TIME ZONE p_timezone AS local_now
  )
  SELECT
    date_trunc('day', local_now) AT TIME ZONE p_timezone,
    (date_trunc('day', local_now) + interval '1 day')
      AT TIME ZONE p_timezone,
    date_trunc('week', local_now) AT TIME ZONE p_timezone,
    (date_trunc('week', local_now) + interval '1 week')
      AT TIME ZONE p_timezone,
    date_trunc('month', local_now) AT TIME ZONE p_timezone,
    (date_trunc('month', local_now) + interval '1 month')
      AT TIME ZONE p_timezone
  FROM local_clock;
$function$;

REVOKE ALL ON FUNCTION private.dashboard_period_bounds(text, timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_calendar_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_timezone text;
  v_now timestamptz := now();
  v_today_start timestamptz;
  v_today_end timestamptz;
  v_week_start timestamptz;
  v_week_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_thirty_days_ago timestamptz;

  v_today_bookings integer := 0;
  v_pending_bookings integer := 0;
  v_week_bookings integer := 0;
  v_month_bookings integer := 0;
  v_total_revenue numeric := NULL;
  v_total_revenue_currency text := NULL;
  v_total_revenue_currency_count integer := 0;
  v_total_revenue_status text := 'no_retained_revenue';
  v_retained_revenue_cents bigint := 0;

  v_whatsapp_conversations integer := 0;
  v_whatsapp_messages_today integer := 0;
  v_contacts_later_booked integer := 0;
  v_contacts_later_booked_sample_count integer := 0;
  v_avg_response_time numeric := NULL;
  v_avg_response_time_sample_count integer := 0;

  v_unique_customers integer := 0;
  v_returning_customers integer := 0;
  v_total_customers integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.caller_owns_calendar(p_calendar_id) THEN
    RAISE EXCEPTION 'Access denied: calendar not owned by caller'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(NULLIF(calendar.timezone, ''), 'Europe/Amsterdam')
  INTO v_timezone
  FROM public.calendars AS calendar
  WHERE calendar.id = p_calendar_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'DASHBOARD_CALENDAR_NOT_FOUND'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    bounds.today_start,
    bounds.today_end,
    bounds.week_start,
    bounds.week_end,
    bounds.month_start,
    bounds.month_end
  INTO
    v_today_start,
    v_today_end,
    v_week_start,
    v_week_end,
    v_month_start,
    v_month_end
  FROM private.dashboard_period_bounds(v_timezone, v_now) AS bounds;
  v_thirty_days_ago := v_now - interval '30 days';

  SELECT
    count(*) FILTER (
      WHERE booking.start_time >= v_today_start
        AND booking.start_time < v_today_end
        AND booking.status <> 'cancelled'
    ),
    count(*) FILTER (
      WHERE booking.start_time >= v_today_start
        AND booking.start_time < v_today_end
        AND booking.status = 'pending'
    ),
    count(*) FILTER (
      WHERE booking.start_time >= v_week_start
        AND booking.start_time < v_week_end
        AND booking.status = 'confirmed'
    ),
    count(*) FILTER (
      WHERE booking.start_time >= v_month_start
        AND booking.start_time < v_month_end
        AND booking.status <> 'cancelled'
    )
  INTO
    v_today_bookings,
    v_pending_bookings,
    v_week_bookings,
    v_month_bookings
  FROM public.bookings AS booking
  WHERE booking.calendar_id = p_calendar_id
    AND COALESCE(booking.is_deleted, false) IS NOT TRUE;

  -- Revenue window: appointments whose start_time is in the calendar-local
  -- current month. Financial amount comes only from captured payment rows and
  -- remains visible when a booking is soft-deleted because retained money does
  -- not disappear with its operational booking card.
  WITH retained_payments AS (
    SELECT
      lower(btrim(payment.currency)) AS currency,
      GREATEST(
        payment.amount_cents - COALESCE(payment.refund_amount_cents, 0),
        0
      )::bigint AS retained_cents
    FROM public.booking_payments AS payment
    JOIN public.bookings AS booking
      ON booking.id = payment.booking_id
    WHERE booking.calendar_id = p_calendar_id
      AND booking.start_time >= v_month_start
      AND booking.start_time < v_month_end
      AND payment.status IN (
        'successful', 'succeeded', 'completed',
        'partially_refunded', 'refunded'
      )
  ), positive_retained_payments AS (
    -- A fully refunded payment contributes neither money nor a currency to the
    -- scalar. Otherwise a zero-retained USD row could make positive EUR revenue
    -- look like an unsafe mixed-currency total.
    SELECT payment.currency, payment.retained_cents
    FROM retained_payments AS payment
    WHERE payment.retained_cents > 0
  )
  SELECT
    count(DISTINCT payment.currency)::integer,
    CASE
      WHEN count(DISTINCT payment.currency) = 1
        THEN min(payment.currency)
      ELSE NULL
    END,
    COALESCE(sum(payment.retained_cents), 0)::bigint
  INTO
    v_total_revenue_currency_count,
    v_total_revenue_currency,
    v_retained_revenue_cents
  FROM positive_retained_payments AS payment;

  IF v_total_revenue_currency_count = 0 THEN
    v_total_revenue := 0;
    v_total_revenue_status := 'no_retained_revenue';
  ELSIF v_total_revenue_currency_count = 1 THEN
    v_total_revenue := round(v_retained_revenue_cents::numeric / 100.0, 2);
    v_total_revenue_status := 'single_currency';
  ELSE
    v_total_revenue := NULL;
    v_total_revenue_currency := NULL;
    v_total_revenue_status := 'mixed_currencies';
  END IF;

  SELECT count(*)
  INTO v_whatsapp_conversations
  FROM public.whatsapp_conversations AS conversation
  WHERE conversation.calendar_id = p_calendar_id
    AND conversation.status = 'active';

  SELECT count(*)
  INTO v_whatsapp_messages_today
  FROM public.whatsapp_messages AS message
  JOIN public.whatsapp_conversations AS conversation
    ON conversation.id = message.conversation_id
  WHERE conversation.calendar_id = p_calendar_id
    AND message.created_at >= v_today_start
    AND message.created_at < v_today_end
    AND message.created_at <= v_now;

  WITH recent_contacts AS (
    SELECT
      contact.id AS contact_id,
      min(conversation.created_at) AS first_conversation_at,
      contact.phone_number,
      contact.linked_customer_email
    FROM public.whatsapp_conversations AS conversation
    JOIN public.whatsapp_contacts AS contact
      ON contact.id = conversation.contact_id
    WHERE conversation.calendar_id = p_calendar_id
      AND conversation.created_at >= v_thirty_days_ago
      AND conversation.created_at <= v_now
    GROUP BY
      contact.id,
      contact.phone_number,
      contact.linked_customer_email
  ), contacts_later_booked AS (
    SELECT contact.contact_id
    FROM recent_contacts AS contact
    WHERE EXISTS (
      SELECT 1
      FROM public.bookings AS booking
      WHERE booking.calendar_id = p_calendar_id
        AND booking.created_at >= v_thirty_days_ago
        AND booking.created_at >= contact.first_conversation_at
        AND booking.created_at <= v_now
        AND booking.status <> 'cancelled'
        AND COALESCE(booking.is_deleted, false) IS NOT TRUE
        AND (
          (
            contact.phone_number IS NOT NULL
            AND booking.customer_phone = contact.phone_number
          )
          OR (
            contact.linked_customer_email IS NOT NULL
            AND booking.customer_email IS NOT NULL
            AND lower(booking.customer_email) =
              lower(contact.linked_customer_email)
          )
        )
    )
  )
  SELECT
    (SELECT count(*)::integer FROM contacts_later_booked),
    (SELECT count(*)::integer FROM recent_contacts)
  INTO
    v_contacts_later_booked,
    v_contacts_later_booked_sample_count;

  WITH inbound_messages AS (
    SELECT
      message.conversation_id,
      message.created_at
    FROM public.whatsapp_messages AS message
    JOIN public.whatsapp_conversations AS conversation
      ON conversation.id = message.conversation_id
    WHERE conversation.calendar_id = p_calendar_id
      AND message.direction = 'inbound'
      AND message.created_at >= v_thirty_days_ago
      AND message.created_at <= v_now
  ), response_samples AS (
    SELECT
      inbound.created_at AS inbound_at,
      response.created_at AS response_at
    FROM inbound_messages AS inbound
    CROSS JOIN LATERAL (
      SELECT outbound.created_at
      FROM public.whatsapp_messages AS outbound
      WHERE outbound.conversation_id = inbound.conversation_id
        AND outbound.direction = 'outbound'
        AND outbound.status IN ('sent', 'delivered', 'read')
        AND outbound.created_at >= inbound.created_at
        AND outbound.created_at <= v_now
      ORDER BY outbound.created_at, outbound.id
      LIMIT 1
    ) AS response
  )
  SELECT
    round(avg(
      extract(epoch FROM (response_at - inbound_at)) / 60.0
    )::numeric, 1),
    count(*)::integer
  INTO v_avg_response_time, v_avg_response_time_sample_count
  FROM response_samples;

  WITH all_customers AS (
    SELECT
      lower(booking.customer_email) AS identifier,
      min(booking.created_at) AS first_booking
    FROM public.bookings AS booking
    WHERE booking.calendar_id = p_calendar_id
      AND booking.customer_email IS NOT NULL
      AND booking.status <> 'cancelled'
      AND COALESCE(booking.is_deleted, false) IS NOT TRUE
    GROUP BY lower(booking.customer_email)

    UNION

    SELECT
      contact.phone_number AS identifier,
      min(contact.created_at) AS first_booking
    FROM public.whatsapp_contacts AS contact
    JOIN public.whatsapp_conversations AS conversation
      ON conversation.contact_id = contact.id
    WHERE conversation.calendar_id = p_calendar_id
    GROUP BY contact.phone_number
  )
  SELECT
    count(*),
    count(*) FILTER (WHERE first_booking >= v_thirty_days_ago),
    count(*) FILTER (WHERE first_booking < v_thirty_days_ago)
  INTO v_total_customers, v_unique_customers, v_returning_customers
  FROM all_customers;

  v_result := jsonb_build_object(
    'today_bookings', v_today_bookings,
    'pending_bookings', v_pending_bookings,
    'week_bookings', v_week_bookings,
    'month_bookings', v_month_bookings,
    'total_revenue', v_total_revenue,
    'total_revenue_currency', v_total_revenue_currency,
    'total_revenue_status', v_total_revenue_status,
    'total_revenue_window_start', v_month_start,
    'total_revenue_window_end', v_month_end,
    'total_revenue_window_basis', 'booking_start_time',
    'contacts_later_booked', v_contacts_later_booked,
    'contacts_later_booked_sample_count',
      v_contacts_later_booked_sample_count,
    'contacts_later_booked_source', 'phone_or_email_correlation',
    'avg_response_time', v_avg_response_time,
    'avg_response_time_sample_count', v_avg_response_time_sample_count,
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

REVOKE ALL ON FUNCTION public.get_dashboard_metrics(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_metrics(uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_dashboard_metrics(uuid) IS
  'R44 returns tenant-scoped calendar-local booking periods, retained captured revenue with explicit currency/window metadata, non-causal contacts-later-booked correlation, and delivered-response samples.';
