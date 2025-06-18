
-- Create recurring availability patterns table
CREATE TABLE public.recurring_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid REFERENCES public.calendars(id) ON DELETE CASCADE,
  pattern_type text CHECK (pattern_type IN ('weekly', 'biweekly', 'monthly', 'seasonal')),
  pattern_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  schedule_data jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for recurring availability
ALTER TABLE public.recurring_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring patterns" 
  ON public.recurring_availability 
  FOR SELECT 
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create recurring patterns for their calendars" 
  ON public.recurring_availability 
  FOR INSERT 
  WITH CHECK (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own recurring patterns" 
  ON public.recurring_availability 
  FOR UPDATE 
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own recurring patterns" 
  ON public.recurring_availability 
  FOR DELETE 
  USING (
    calendar_id IN (
      SELECT id FROM public.calendars WHERE user_id = auth.uid()
    )
  );

-- Create function to resolve recurring patterns for a date range
CREATE OR REPLACE FUNCTION public.resolve_recurring_availability(
  p_calendar_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE(
  resolved_date date,
  pattern_id uuid,
  availability_rules jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pattern_record record;
  processing_date date;
  week_offset integer;
  day_of_month integer;
  week_of_month integer;
BEGIN
  -- Loop through all active recurring patterns for this calendar
  FOR pattern_record IN 
    SELECT * FROM public.recurring_availability 
    WHERE calendar_id = p_calendar_id 
      AND is_active = true 
      AND start_date <= p_end_date 
      AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    processing_date := GREATEST(pattern_record.start_date, p_start_date);
    
    WHILE processing_date <= p_end_date AND 
          (pattern_record.end_date IS NULL OR processing_date <= pattern_record.end_date) 
    LOOP
      CASE pattern_record.pattern_type
        WHEN 'weekly' THEN
          -- Weekly pattern: check if current day matches
          IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'biweekly' THEN
          -- Biweekly pattern: alternate weeks
          week_offset := FLOOR(EXTRACT(EPOCH FROM (processing_date - pattern_record.start_date)) / (7 * 24 * 3600))::integer;
          IF week_offset % 2 = 0 AND 
             (pattern_record.schedule_data->>'week1_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week1_availability';
          ELSIF week_offset % 2 = 1 AND 
                (pattern_record.schedule_data->>'week2_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week2_availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'monthly' THEN
          -- Monthly pattern: specific weeks of month
          week_of_month := CEIL(EXTRACT(DAY FROM processing_date) / 7.0)::integer;
          day_of_month := EXTRACT(DAY FROM processing_date)::integer;
          
          -- Check for "first/last" patterns
          IF (pattern_record.schedule_data->>'occurrence' = 'first' AND week_of_month = 1) OR
             (pattern_record.schedule_data->>'occurrence' = 'last' AND 
              processing_date + 7 > (date_trunc('month', processing_date) + interval '1 month - 1 day')::date) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'seasonal' THEN
          -- Seasonal pattern: date ranges within year
          IF (EXTRACT(MONTH FROM processing_date) >= (pattern_record.schedule_data->>'start_month')::integer AND
              EXTRACT(MONTH FROM processing_date) <= (pattern_record.schedule_data->>'end_month')::integer) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        ELSE
          processing_date := processing_date + 1;
      END CASE;
    END LOOP;
  END LOOP;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER handle_updated_at_recurring_availability
  BEFORE UPDATE ON public.recurring_availability
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
