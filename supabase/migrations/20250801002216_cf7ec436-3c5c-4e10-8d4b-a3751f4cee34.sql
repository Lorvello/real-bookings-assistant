-- Remove the problematic constraint that blocks user status changes
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS check_subscription_consistency;