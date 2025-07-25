-- Fix subscription tier team member limits
-- Starter: 1 team member (only yourself, can't add others)
-- Professional: 10 team members (this is correct)
-- Enterprise: unlimited team members (NULL = unlimited)

UPDATE public.subscription_tiers 
SET max_team_members = 1 
WHERE tier_name = 'starter';

UPDATE public.subscription_tiers 
SET max_team_members = NULL 
WHERE tier_name = 'enterprise';