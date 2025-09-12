-- Add 'missed_payment' to the valid subscription status values
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS valid_subscription_status;

ALTER TABLE public.users 
ADD CONSTRAINT valid_subscription_status 
CHECK (subscription_status IN ('trial', 'active', 'canceled', 'expired', 'past_due', 'incomplete', 'missed_payment'));