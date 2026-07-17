-- Update trial_end_date default from 7 days to 30 days
ALTER TABLE public.users ALTER COLUMN trial_end_date SET DEFAULT (now() + '30 days'::interval);