-- Fix security issue: recreate view with security_invoker = true
DROP VIEW IF EXISTS service_types_overview;

CREATE VIEW service_types_overview 
WITH (security_invoker = true)
AS
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
  (
    SELECT jsonb_object_agg(
      CASE ar.day_of_week
        WHEN 0 THEN 'sunday'
        WHEN 1 THEN 'monday'
        WHEN 2 THEN 'tuesday'
        WHEN 3 THEN 'wednesday'
        WHEN 4 THEN 'thursday'
        WHEN 5 THEN 'friday'
        WHEN 6 THEN 'saturday'
      END,
      jsonb_build_object(
        'start_time', ar.start_time::text,
        'end_time', ar.end_time::text,
        'is_available', ar.is_available
      )
    )
    FROM availability_schedules asch
    JOIN availability_rules ar ON ar.schedule_id = asch.id
    WHERE asch.calendar_id = c.id
    AND asch.is_default = true
  ) AS opening_hours,
  st.created_at
FROM service_types st
LEFT JOIN calendars c ON c.id = st.calendar_id
WHERE COALESCE(st.is_deleted, false) = false;

COMMENT ON VIEW service_types_overview IS 'Service types with calendar name and opening hours for easy viewing in Supabase';