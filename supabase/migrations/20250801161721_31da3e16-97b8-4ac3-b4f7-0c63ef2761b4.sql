-- Update subscription tier pricing to correct values

-- Starter Plan: €19/month, €15.20/month when billed annually (€182.40/year)
UPDATE public.subscription_tiers 
SET 
  price_monthly = 19.00,
  price_yearly = 182.40,
  updated_at = NOW()
WHERE tier_name = 'starter';

-- Professional Plan: €49/month, €39.20/month when billed annually (€470.40/year)  
UPDATE public.subscription_tiers 
SET 
  price_monthly = 49.00,
  price_yearly = 470.40,
  updated_at = NOW()
WHERE tier_name = 'professional';

-- Enterprise Plan: €499/month, €399.20/month when billed annually (€4790.40/year)
UPDATE public.subscription_tiers 
SET 
  price_monthly = 499.00,
  price_yearly = 4790.40,
  updated_at = NOW()
WHERE tier_name = 'enterprise';