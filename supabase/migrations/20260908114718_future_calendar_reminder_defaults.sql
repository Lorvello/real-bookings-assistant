-- V13: future calendars get two enabled reminders at 24 hours / 60 minutes.
-- Existing explicit settings and intentional bot pauses are never rewritten.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
ALTER TABLE public.calendar_settings
  ALTER COLUMN first_reminder_enabled SET DEFAULT true,
  ALTER COLUMN second_reminder_enabled SET DEFAULT true,
  ALTER COLUMN first_reminder_timing_hours SET DEFAULT 24,
  ALTER COLUMN second_reminder_timing_minutes SET DEFAULT 60;
COMMIT;
