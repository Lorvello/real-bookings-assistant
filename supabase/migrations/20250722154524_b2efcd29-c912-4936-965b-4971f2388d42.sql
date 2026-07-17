
-- Add max_whatsapp_contacts column to subscription_tiers table
ALTER TABLE public.subscription_tiers 
ADD COLUMN IF NOT EXISTS max_whatsapp_contacts INTEGER;

-- Update Starter Plan with correct limits
UPDATE public.subscription_tiers 
SET 
  max_calendars = 2,
  max_bookings_per_month = NULL, -- unlimited
  max_team_members = 2,
  max_whatsapp_contacts = 500
WHERE tier_name = 'starter';

-- Update Professional Plan with correct limits  
UPDATE public.subscription_tiers 
SET 
  max_calendars = NULL, -- unlimited
  max_bookings_per_month = NULL, -- unlimited
  max_team_members = 5, -- keep as is
  max_whatsapp_contacts = 2500
WHERE tier_name = 'professional';

-- Update Enterprise Plan with correct limits
UPDATE public.subscription_tiers 
SET 
  max_calendars = NULL, -- unlimited
  max_bookings_per_month = NULL, -- unlimited
  max_team_members = 50, -- keep as is
  max_whatsapp_contacts = NULL -- unlimited
WHERE tier_name = 'enterprise';
