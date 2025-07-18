-- Add cancellation policy and reminder settings to calendar_settings table
ALTER TABLE public.calendar_settings 
ADD COLUMN IF NOT EXISTS allow_cancellations boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cancellation_deadline_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS first_reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_reminder_timing_minutes integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS second_reminder_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS second_reminder_timing_hours integer DEFAULT 24;