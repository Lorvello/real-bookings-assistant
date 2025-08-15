-- Update subscription tier pricing
UPDATE subscription_tiers 
SET 
  price_monthly = 30.00,
  price_yearly = 288.00
WHERE tier_name = 'starter';

UPDATE subscription_tiers 
SET 
  price_monthly = 60.00,
  price_yearly = 576.00
WHERE tier_name = 'professional';

UPDATE subscription_tiers 
SET 
  price_monthly = 299.00,
  price_yearly = 3588.00
WHERE tier_name = 'enterprise';

-- Add VAT tracking feature to starter plan
UPDATE subscription_tiers 
SET features = features || '["VAT tracking & compliance"]'::jsonb
WHERE tier_name = 'starter' AND NOT (features @> '["VAT tracking & compliance"]'::jsonb);