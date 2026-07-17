-- Rename reminder timing columns to match correct logic
-- First reminder is longer term (hours), second reminder is short term (minutes) 
ALTER TABLE public.calendar_settings 
RENAME COLUMN first_reminder_timing_minutes TO first_reminder_timing_hours;

ALTER TABLE public.calendar_settings 
RENAME COLUMN second_reminder_timing_hours TO second_reminder_timing_minutes;