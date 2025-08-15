-- Update Starter Plan live-mode price IDs
UPDATE public.subscription_tiers 
SET 
  stripe_live_monthly_price_id = 'price_1RwSf6LcBboIITXgSSLCsReF',
  stripe_live_yearly_price_id = 'price_1RwSq2LcBboIITXghlenBD6m'
WHERE tier_name = 'starter';

-- Update Professional Plan live-mode price IDs  
UPDATE public.subscription_tiers 
SET 
  stripe_live_monthly_price_id = 'price_1RwSOTLcBboIITXgerPBzJoG',
  stripe_live_yearly_price_id = 'price_1RwSeULcBboIITXgIITBwyGM'
WHERE tier_name = 'professional';