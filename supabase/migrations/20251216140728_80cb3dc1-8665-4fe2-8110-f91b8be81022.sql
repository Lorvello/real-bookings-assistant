-- Drop and recreate service_types_overview with business_name
DROP VIEW IF EXISTS public.service_types_overview;

CREATE VIEW public.service_types_overview 
WITH (security_invoker = on) AS
SELECT 
    st.id,
    st.name AS service_name,
    st.description,
    st.duration,
    st.price,
    st.color,
    st.is_active,
    st.calendar_id,
    c.name AS calendar_name,
    c.slug AS calendar_slug,
    c.timezone,
    c.is_active AS calendar_active,
    u.business_name,
    COALESCE(cs.buffer_time, 0) AS buffer_time,
    COALESCE(cs.slot_duration, 30) AS slot_duration,
    COALESCE(cs.minimum_notice_hours, 1) AS minimum_notice_hours,
    COALESCE(cs.booking_window_days, 60) AS booking_window_days,
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'day_of_week', ar.day_of_week,
                'start_time', ar.start_time,
                'end_time', ar.end_time,
                'is_available', ar.is_available
            ) ORDER BY ar.day_of_week
        )
        FROM availability_schedules asc_inner
        JOIN availability_rules ar ON ar.schedule_id = asc_inner.id
        WHERE asc_inner.calendar_id = c.id
        AND asc_inner.is_default = true
    ) AS opening_hours,
    st.created_at
FROM service_types st
LEFT JOIN calendars c ON c.id = st.calendar_id
LEFT JOIN calendar_settings cs ON cs.calendar_id = c.id
LEFT JOIN users u ON u.id = c.user_id
WHERE COALESCE(st.is_deleted, false) = false;