
-- Drop de bestaande unique constraint die conflicteert
ALTER TABLE public.availability_rules 
DROP CONSTRAINT IF EXISTS availability_rules_schedule_id_day_of_week_key;

-- Voeg een nieuwe unique constraint toe die meerdere tijdblokken per dag toestaat
ALTER TABLE public.availability_rules 
ADD CONSTRAINT availability_rules_schedule_day_time_unique 
UNIQUE (schedule_id, day_of_week, start_time, end_time);

-- Index toevoegen voor betere performance bij queries
CREATE INDEX IF NOT EXISTS idx_availability_rules_schedule_day_available 
ON public.availability_rules(schedule_id, day_of_week, is_available);
