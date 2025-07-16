-- Add trial and subscription fields to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone DEFAULT now();

-- Add constraint to ensure valid subscription statuses
ALTER TABLE public.users 
ADD CONSTRAINT valid_subscription_status 
CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled'));

-- Update existing users to have trial status if they don't have it
UPDATE public.users 
SET subscription_status = 'trial',
    trial_start_date = created_at,
    trial_end_date = created_at + interval '7 days'
WHERE subscription_status IS NULL;