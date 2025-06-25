
-- Fix Remaining 10 Security Warnings
-- Complete the security hardening by fixing all remaining function search path issues

-- 1. Fix handle_updated_at function (general trigger)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Fix validate_booking_times function
CREATE OR REPLACE FUNCTION public.validate_booking_times()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Controleer of start_time voor end_time ligt
  IF NEW.start_time >= NEW.end_time THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;
  
  -- Controleer of booking niet in het verleden ligt
  IF NEW.start_time < now() THEN
    RAISE EXCEPTION 'Cannot create booking in the past';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Fix generate_confirmation_token function
CREATE OR REPLACE FUNCTION public.generate_confirmation_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Probeer eerst gen_random_bytes, fall back naar random als het niet werkt
  BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback naar een simpelere random string
    RETURN md5(random()::text || clock_timestamp()::text);
  END;
END;
$function$;

-- 4. Fix handle_new_user_calendar function
CREATE OR REPLACE FUNCTION public.handle_new_user_calendar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  calendar_slug text;
  new_calendar_id uuid;
BEGIN
  -- Genereer een unieke slug voor de kalender
  calendar_slug := 'cal-' || substr(new.id::text, 1, 8);
  
  -- Maak automatisch een kalender aan voor de nieuwe user
  INSERT INTO public.calendars (user_id, name, slug, is_default)
  VALUES (
    new.id,
    'Mijn Kalender',
    calendar_slug,
    true
  )
  RETURNING id INTO new_calendar_id;
  
  -- Add the user as owner of their calendar
  INSERT INTO public.calendar_members (calendar_id, user_id, role, accepted_at)
  VALUES (new_calendar_id, new.id, 'owner', now());
  
  RETURN new;
END;
$function$;

-- 5. Fix get_available_slots_range function (complete the missing function)
CREATE OR REPLACE FUNCTION public.get_available_slots_range(p_calendar_id uuid, p_service_type_id uuid, p_start_date date, p_end_date date, p_timezone text DEFAULT 'Europe/Amsterdam'::text)
RETURNS TABLE(slot_date date, slot_start timestamp with time zone, slot_end timestamp with time zone, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_current_date date;
BEGIN
  v_current_date := p_start_date;
  
  WHILE v_current_date <= p_end_date LOOP
    RETURN QUERY
    SELECT 
      v_current_date,
      slots.slot_start,
      slots.slot_end,
      slots.is_available
    FROM public.get_available_slots(
      p_calendar_id,
      p_service_type_id,
      v_current_date,
      p_timezone
    ) as slots;
    
    v_current_date := v_current_date + 1;
  END LOOP;
  
  RETURN;
END;
$function$;

-- 6. Fix create_booking function
CREATE OR REPLACE FUNCTION public.create_booking(p_calendar_slug text, p_service_type_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text, p_start_time timestamp with time zone, p_notes text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_service_duration integer;
  v_end_time timestamp with time zone;
  v_booking_id uuid;
  v_confirmation_token text;
BEGIN
  -- Haal calendar en service info op
  SELECT c.id, st.duration 
  INTO v_calendar_id, v_service_duration
  FROM public.calendars c
  JOIN public.service_types st ON st.calendar_id = c.id
  WHERE c.slug = p_calendar_slug 
    AND c.is_active = true
    AND st.id = p_service_type_id
    AND st.is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar or service type not found'
    );
  END IF;
  
  -- Bereken eind tijd
  v_end_time := p_start_time + (v_service_duration || ' minutes')::interval;
  
  -- Controleer voor conflicten
  IF public.check_booking_conflicts(v_calendar_id, p_start_time, v_end_time) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot is no longer available'
    );
  END IF;
  
  -- Maak booking aan
  INSERT INTO public.bookings (
    calendar_id,
    service_type_id,
    customer_name,
    customer_email,
    customer_phone,
    start_time,
    end_time,
    notes,
    status
  ) VALUES (
    v_calendar_id,
    p_service_type_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    v_end_time,
    p_notes,
    'confirmed'
  ) RETURNING id, confirmation_token INTO v_booking_id, v_confirmation_token;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'confirmation_token', v_confirmation_token,
    'start_time', p_start_time,
    'end_time', v_end_time
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 7. Fix cleanup_expired_waitlist function
CREATE OR REPLACE FUNCTION public.cleanup_expired_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.waitlist
  SET status = 'expired'
  WHERE status = 'waiting'
    AND preferred_date < CURRENT_DATE;
END;
$function$;

-- 8. Fix cleanup_expired_context function
CREATE OR REPLACE FUNCTION public.cleanup_expired_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  DELETE FROM public.conversation_context
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
END;
$function$;

-- 9. Create missing trigger functions if they don't exist
CREATE OR REPLACE FUNCTION public.trigger_booking_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Trigger webhook voor booking events
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    NEW.calendar_id,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'booking.created'
      WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'booking.status_changed'
      ELSE 'booking.updated'
    END,
    jsonb_build_object(
      'booking_id', NEW.id,
      'calendar_id', NEW.calendar_id,
      'customer_email', NEW.customer_email,
      'start_time', NEW.start_time,
      'status', NEW.status
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 10. Create trigger refresh stats function
CREATE OR REPLACE FUNCTION public.trigger_refresh_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Notificeer systeem dat stats moeten worden gerefreshed
  PERFORM pg_notify('refresh_stats', NEW.calendar_id::text);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Additional security: Ensure all views have proper security
-- Fix any remaining views that might bypass RLS
REVOKE ALL ON public.available_slots_view FROM anon, authenticated;

-- Grant specific permissions only where needed
GRANT SELECT ON public.calendars TO authenticated;
GRANT SELECT ON public.service_types TO authenticated;
GRANT SELECT ON public.availability_schedules TO authenticated;
GRANT SELECT ON public.availability_rules TO authenticated;

-- Ensure triggers are properly set up with the new secure functions
DROP TRIGGER IF EXISTS trigger_booking_webhook_on_bookings ON public.bookings;
CREATE TRIGGER trigger_booking_webhook_on_bookings
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_booking_webhook();

DROP TRIGGER IF EXISTS trigger_refresh_stats_on_bookings ON public.bookings;
CREATE TRIGGER trigger_refresh_stats_on_bookings
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_refresh_stats();
