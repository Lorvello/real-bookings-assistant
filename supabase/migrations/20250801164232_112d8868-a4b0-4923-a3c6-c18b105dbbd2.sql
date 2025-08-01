-- Update existing users with 7-day trials to 30-day trials
UPDATE public.users 
SET trial_end_date = trial_start_date + interval '30 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NOT NULL 
  AND trial_start_date IS NOT NULL
  AND trial_end_date < trial_start_date + interval '30 days';

-- For users without trial_start_date, use created_at as basis
UPDATE public.users 
SET trial_end_date = created_at + interval '30 days'
WHERE subscription_status = 'trial' 
  AND trial_end_date IS NOT NULL 
  AND trial_start_date IS NULL
  AND trial_end_date < created_at + interval '30 days';

-- Update default for future users
ALTER TABLE public.users 
ALTER COLUMN trial_end_date SET DEFAULT (now() + interval '30 days');