-- Add columns for test and live Stripe price IDs to subscription_tiers table
ALTER TABLE public.subscription_tiers 
ADD COLUMN stripe_live_monthly_price_id TEXT,
ADD COLUMN stripe_live_yearly_price_id TEXT,
ADD COLUMN stripe_test_monthly_price_id TEXT,
ADD COLUMN stripe_test_yearly_price_id TEXT;

-- Update existing tiers with the current live price IDs and new test price IDs
UPDATE public.subscription_tiers 
SET 
  stripe_live_monthly_price_id = 'price_1RqKWeLcBboIITXgFo7fVtzc',
  stripe_live_yearly_price_id = 'price_1RqKgWLcBboIITXgJ3uN8MV7',
  stripe_test_monthly_price_id = 'price_1RqwcHLcBboIITXgYhJupraj',
  stripe_test_yearly_price_id = 'price_1RqwcuLcBboIITXgCew589Ao'
WHERE tier_name = 'starter';

UPDATE public.subscription_tiers 
SET 
  stripe_live_monthly_price_id = 'price_1RqKnNLcBboIITXgRReX9NU8',
  stripe_live_yearly_price_id = 'price_1RqL0HLcBboIITXgCSumvOZZ',
  stripe_test_monthly_price_id = 'price_1RqwdWLcBboIITXgMHKmGtbv',
  stripe_test_yearly_price_id = 'price_1RqwecLcBboIITXgsuyzCCcU'
WHERE tier_name = 'professional';