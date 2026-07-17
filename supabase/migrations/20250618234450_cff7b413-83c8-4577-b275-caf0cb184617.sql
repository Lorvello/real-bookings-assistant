
-- Create waitlist table
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  service_type_id uuid REFERENCES public.service_types(id),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time_start time,
  preferred_time_end time,
  flexibility text DEFAULT 'anytime' CHECK (flexibility IN ('specific', 'morning', 'afternoon', 'anytime')),
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'converted', 'expired')),
  created_at timestamp with time zone DEFAULT now(),
  notified_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Add indexes for performance
CREATE INDEX idx_waitlist_calendar_date ON waitlist(calendar_id, preferred_date);
CREATE INDEX idx_waitlist_status ON waitlist(status);

-- Enable RLS
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their calendar waitlist entries" ON public.waitlist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = waitlist.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their calendar waitlist entries" ON public.waitlist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = waitlist.calendar_id 
      AND calendars.user_id = auth.uid()
    )
  );

-- Public policy for creating waitlist entries
CREATE POLICY "Public can create waitlist entries for active calendars" ON public.waitlist
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.calendars 
      WHERE calendars.id = waitlist.calendar_id 
      AND calendars.is_active = true
    )
  );

-- Function to check and convert waitlist entries to bookings when slots become available
CREATE OR REPLACE FUNCTION public.process_waitlist_for_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  waitlist_entry record;
  service_duration integer;
  booking_start_time timestamp with time zone;
  booking_end_time timestamp with time zone;
BEGIN
  -- Only process when a booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    -- Get service duration
    SELECT duration INTO service_duration
    FROM public.service_types
    WHERE id = NEW.service_type_id;
    
    booking_start_time := NEW.start_time;
    booking_end_time := NEW.end_time;
    
    -- Find matching waitlist entries
    FOR waitlist_entry IN 
      SELECT * FROM public.waitlist
      WHERE calendar_id = NEW.calendar_id
        AND service_type_id = NEW.service_type_id
        AND status = 'waiting'
        AND preferred_date = booking_start_time::date
        AND (
          flexibility = 'anytime' OR
          (flexibility = 'morning' AND EXTRACT(HOUR FROM booking_start_time) < 12) OR
          (flexibility = 'afternoon' AND EXTRACT(HOUR FROM booking_start_time) >= 12) OR
          (flexibility = 'specific' AND 
           booking_start_time::time >= COALESCE(preferred_time_start, '00:00'::time) AND
           booking_start_time::time <= COALESCE(preferred_time_end, '23:59'::time))
        )
      ORDER BY created_at ASC
      LIMIT 1
    LOOP
      -- Create booking for waitlist entry
      INSERT INTO public.bookings (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        start_time,
        end_time,
        status,
        notes
      ) VALUES (
        waitlist_entry.calendar_id,
        waitlist_entry.service_type_id,
        waitlist_entry.customer_name,
        waitlist_entry.customer_email,
        booking_start_time,
        booking_end_time,
        'confirmed',
        'Converted from waitlist'
      );
      
      -- Update waitlist entry status
      UPDATE public.waitlist
      SET status = 'converted',
          notified_at = now()
      WHERE id = waitlist_entry.id;
      
      -- Exit after converting first match
      EXIT;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic waitlist processing
CREATE TRIGGER process_waitlist_on_cancellation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.process_waitlist_for_cancelled_booking();

-- Function to add customer to waitlist for unavailable slots
CREATE OR REPLACE FUNCTION public.add_to_waitlist(
  p_calendar_slug text,
  p_service_type_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_preferred_date date,
  p_preferred_time_start time DEFAULT NULL,
  p_preferred_time_end time DEFAULT NULL,
  p_flexibility text DEFAULT 'anytime'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

-- Function to clean up expired waitlist entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_waitlist()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.waitlist
  SET status = 'expired'
  WHERE status = 'waiting'
    AND preferred_date < CURRENT_DATE;
END;
$$;
