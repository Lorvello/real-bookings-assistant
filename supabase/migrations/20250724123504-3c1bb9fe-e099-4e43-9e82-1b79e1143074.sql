-- Update Professional plan to have 10 max team members instead of 5
UPDATE subscription_tiers 
SET max_team_members = 10
WHERE tier_name = 'professional';