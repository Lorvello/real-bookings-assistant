-- Create rate limiting table for payment endpoints
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  first_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint ON public.rate_limits (ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_first_attempt ON public.rate_limits (first_attempt_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow system/service role to manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create subscription tiers table with price IDs if not exists
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  yearly_price_cents INTEGER NOT NULL,
  stripe_test_monthly_price_id TEXT,
  stripe_test_yearly_price_id TEXT,
  stripe_live_monthly_price_id TEXT,
  stripe_live_yearly_price_id TEXT,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default subscription plans with test price IDs
INSERT INTO public.subscription_plans (tier_name, display_name, monthly_price_cents, yearly_price_cents, features, stripe_test_monthly_price_id, stripe_test_yearly_price_id)
VALUES 
  ('starter', 'Starter Plan', 1900, 19000, '["5 calendars", "Basic support", "50 bookings/month"]', 'price_test_starter_monthly', 'price_test_starter_yearly'),
  ('professional', 'Professional Plan', 4900, 49000, '["Unlimited calendars", "Priority support", "Unlimited bookings", "WhatsApp integration"]', 'price_test_pro_monthly', 'price_test_pro_yearly'),
  ('enterprise', 'Enterprise Plan', 9900, 99000, '["Everything in Pro", "Custom integrations", "Dedicated support", "White-label options"]', 'price_test_enterprise_monthly', 'price_test_enterprise_yearly')
ON CONFLICT DO NOTHING;

-- Enable RLS for subscription plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Public read access to active subscription plans
CREATE POLICY "Public can read active subscription plans" 
ON public.subscription_plans 
FOR SELECT 
USING (is_active = true);