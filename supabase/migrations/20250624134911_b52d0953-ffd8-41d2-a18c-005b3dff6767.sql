
-- Update the default value for minimum_notice_hours in calendar_settings table
ALTER TABLE public.calendar_settings 
ALTER COLUMN minimum_notice_hours SET DEFAULT 1;

-- Update existing records that still have the old default of 24 hours to use 1 hour instead
UPDATE public.calendar_settings 
SET minimum_notice_hours = 1 
WHERE minimum_notice_hours = 24;
