-- Drop and recreate service_types_overview view to include buffer_time and other settings
DROP VIEW IF EXISTS public.service_types_overview;

CREATE VIEW public.service_types_overview AS
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
    COALESCE(cs.buffer_time, 0) AS buffer_time,
    COALESCE(cs.slot_duration, 30) AS slot_duration,
    COALESCE(cs.minimum_notice_hours, 1) AS minimum_notice_hours,
    COALESCE(cs.booking_window_days, 60) AS booking_window_days,
    ( SELECT jsonb_object_agg(
                CASE ar.day_of_week
                    WHEN 1 THEN 'monday'::text
                    WHEN 2 THEN 'tuesday'::text
                    WHEN 3 THEN 'wednesday'::text
                    WHEN 4 THEN 'thursday'::text
                    WHEN 5 THEN 'friday'::text
                    WHEN 6 THEN 'saturday'::text
                    WHEN 7 THEN 'sunday'::text
                    ELSE NULL::text
                END, jsonb_build_object('start_time', ar.start_time::text, 'end_time', ar.end_time::text, 'is_available', ar.is_available)) AS jsonb_object_agg
           FROM availability_schedules asch
             JOIN availability_rules ar ON ar.schedule_id = asch.id
          WHERE asch.calendar_id = c.id AND asch.is_default = true) AS opening_hours,
    st.created_at
FROM service_types st
LEFT JOIN calendars c ON c.id = st.calendar_id
LEFT JOIN calendar_settings cs ON cs.calendar_id = c.id
WHERE COALESCE(st.is_deleted, false) = false;