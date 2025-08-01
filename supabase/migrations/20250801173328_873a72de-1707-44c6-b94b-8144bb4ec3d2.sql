-- Update yearly pricing to rounded values
UPDATE subscription_tiers 
SET price_yearly = 180.00 
WHERE tier_name = 'starter';

UPDATE subscription_tiers 
SET price_yearly = 468.00 
WHERE tier_name = 'professional';

-- Enterprise pricing stays the same (€4790.40)