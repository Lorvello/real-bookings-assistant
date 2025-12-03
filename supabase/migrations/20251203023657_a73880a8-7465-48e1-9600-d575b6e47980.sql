-- Create contact_meetings table for booking meetings via contact form
CREATE TABLE public.contact_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  subject TEXT NOT NULL,
  budget TEXT,
  platform TEXT,
  message TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contact_meetings ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for contact form submissions)
CREATE POLICY "Anyone can create contact meetings"
ON public.contact_meetings
FOR INSERT
WITH CHECK (true);

-- Allow admins to read all meetings
CREATE POLICY "Admins can view all contact meetings"
ON public.contact_meetings
FOR SELECT
USING (public.is_admin());

-- Allow public to check if time slot is taken (for availability)
CREATE POLICY "Anyone can check meeting availability"
ON public.contact_meetings
FOR SELECT
USING (true);

-- Create index for availability checking
CREATE INDEX idx_contact_meetings_date_time ON public.contact_meetings(meeting_date, meeting_time);
CREATE INDEX idx_contact_meetings_status ON public.contact_meetings(status);

-- Create function to check if meeting slot is available
CREATE OR REPLACE FUNCTION public.check_meeting_slot_available(
  p_date DATE,
  p_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM contact_meetings
    WHERE meeting_date = p_date
      AND meeting_time = p_time
      AND status != 'cancelled'
  );
END;
$$;

-- Create function to get booked slots for a date range
CREATE OR REPLACE FUNCTION public.get_booked_meeting_slots(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(meeting_date DATE, meeting_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT cm.meeting_date, cm.meeting_time
  FROM contact_meetings cm
  WHERE cm.meeting_date BETWEEN p_start_date AND p_end_date
    AND cm.status != 'cancelled'
  ORDER BY cm.meeting_date, cm.meeting_time;
END;
$$;