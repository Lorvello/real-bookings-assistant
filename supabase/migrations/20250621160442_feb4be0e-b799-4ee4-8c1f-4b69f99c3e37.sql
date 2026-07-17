
-- Verwijder de huidige constraint die problemen veroorzaakt
ALTER TABLE public.availability_rules 
DROP CONSTRAINT IF EXISTS availability_rules_schedule_day_time_unique;

-- Voeg een betere constraint toe die alleen schedule_id en day_of_week als uniek beschouwt
-- Dit staat meerdere tijdblokken per dag toe, maar voorkomt echte duplicaten
ALTER TABLE public.availability_rules 
ADD CONSTRAINT availability_rules_schedule_day_unique 
UNIQUE (schedule_id, day_of_week, start_time, end_time);

-- Voeg een index toe voor betere performance
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_day 
ON public.availability_rules(schedule_id, day_of_week);

-- Voeg een functie toe om duplicaten op te ruimen voordat we nieuwe regels toevoegen
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_availability_rules(
  p_schedule_id uuid,
  p_day_of_week integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verwijder duplicaten, behoud alleen de nieuwste
  DELETE FROM public.availability_rules 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (
               PARTITION BY schedule_id, day_of_week, start_time, end_time 
               ORDER BY created_at DESC
             ) as rn
      FROM public.availability_rules
      WHERE schedule_id = p_schedule_id 
        AND day_of_week = p_day_of_week
    ) t
    WHERE t.rn > 1
  );
END;
$$;
