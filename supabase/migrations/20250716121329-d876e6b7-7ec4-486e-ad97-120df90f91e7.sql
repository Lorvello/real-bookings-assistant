-- Add subscription tier system to users table
CREATE TYPE public.subscription_tier AS ENUM ('starter', 'professional', 'enterprise');

-- Add subscription_tier column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier;

-- Create subscription_tiers lookup table for tier configuration
CREATE TABLE public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name public.subscription_tier NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  max_calendars INTEGER DEFAULT 1,
  max_bookings_per_month INTEGER DEFAULT 50,
  max_team_members INTEGER DEFAULT 1,
  api_access BOOLEAN DEFAULT FALSE,
  white_label BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default subscription tiers
INSERT INTO public.subscription_tiers (tier_name, display_name, description, max_calendars, max_bookings_per_month, max_team_members, api_access, white_label, priority_support, price_monthly, price_yearly, features) VALUES
('starter', 'Starter', 'Perfect for small businesses just getting started', 1, 50, 1, false, false, false, 19.99, 199.99, '["Basic calendar management", "Email notifications", "Customer booking portal"]'::jsonb),
('professional', 'Professional', 'Ideal for growing businesses with advanced needs', 5, 500, 5, true, false, true, 49.99, 499.99, '["Multiple calendars", "Advanced analytics", "Team collaboration", "API access", "Custom branding"]'::jsonb),
('enterprise', 'Enterprise', 'For large organizations requiring full control', 25, 10000, 50, true, true, true, 199.99, 1999.99, '["Unlimited calendars", "White-label solution", "Advanced integrations", "Dedicated support", "Custom features"]'::jsonb);

-- Enable RLS on subscription_tiers table
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policy for subscription tiers (publicly readable)
CREATE POLICY "subscription_tiers_public_read" ON public.subscription_tiers
FOR SELECT 
USING (is_active = true);

-- Create function to update existing users retroactively
CREATE OR REPLACE FUNCTION public.update_existing_users_retroactively()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update existing users without trial dates
  UPDATE public.users 
  SET 
    trial_start_date = COALESCE(trial_start_date, created_at),
    trial_end_date = COALESCE(trial_end_date, created_at + interval '7 days')
  WHERE trial_start_date IS NULL OR trial_end_date IS NULL;
  
  -- Update subscription status for expired trials
  UPDATE public.users 
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial' 
    AND trial_end_date <= NOW()
    AND subscription_status != 'expired';
  
  -- Set default subscription tier for existing users
  UPDATE public.users 
  SET subscription_tier = 'starter'
  WHERE subscription_tier IS NULL 
    AND subscription_status IN ('active', 'paid');
    
  -- Log the update
  RAISE NOTICE 'Updated existing users retroactively';
END;
$$;

-- Create admin function to manually update user subscription status
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_user_id UUID,
  p_subscription_status TEXT DEFAULT NULL,
  p_subscription_tier TEXT DEFAULT NULL,
  p_trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_user RECORD;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Update user subscription details
  UPDATE public.users 
  SET 
    subscription_status = COALESCE(p_subscription_status::text, subscription_status),
    subscription_tier = COALESCE(p_subscription_tier::public.subscription_tier, subscription_tier),
    trial_end_date = COALESCE(p_trial_end_date, trial_end_date),
    subscription_end_date = COALESCE(p_subscription_end_date, subscription_end_date),
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_updated_user;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_updated_user),
    'message', 'User subscription updated successfully'
  );
END;
$$;

-- Create function to extend trial period for testing
CREATE OR REPLACE FUNCTION public.admin_extend_trial(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.users 
  SET 
    trial_end_date = GREATEST(trial_end_date, NOW()) + (p_days || ' days')::interval,
    subscription_status = 'trial',
    updated_at = NOW()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trial extended by ' || p_days || ' days'
  );
END;
$$;

-- Create function to get user subscription details with tier info
CREATE OR REPLACE FUNCTION public.get_user_subscription_details(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
  v_tier RECORD;
  v_status TEXT;
BEGIN
  -- Get user details
  SELECT * INTO v_user
  FROM public.users 
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  -- Get tier details if user has a tier
  IF v_user.subscription_tier IS NOT NULL THEN
    SELECT * INTO v_tier
    FROM public.subscription_tiers 
    WHERE tier_name = v_user.subscription_tier;
  END IF;
  
  -- Calculate current status
  SELECT 
    CASE 
      WHEN v_user.subscription_status = 'trial' AND v_user.trial_end_date > NOW() THEN 'active_trial'
      WHEN v_user.subscription_status = 'trial' AND v_user.trial_end_date <= NOW() THEN 'expired_trial'  
      WHEN v_user.subscription_status = 'active' THEN 'subscriber'
      WHEN v_user.subscription_status = 'canceled' AND v_user.subscription_end_date > NOW() THEN 'canceled_active'
      ELSE 'expired'
    END INTO v_status;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', row_to_json(v_user),
    'tier', row_to_json(v_tier),
    'current_status', v_status,
    'days_remaining', 
      CASE 
        WHEN v_user.subscription_status = 'trial' THEN 
          GREATEST(0, EXTRACT(DAYS FROM (v_user.trial_end_date - NOW())))
        WHEN v_user.subscription_status = 'canceled' THEN 
          GREATEST(0, EXTRACT(DAYS FROM (v_user.subscription_end_date - NOW())))
        ELSE 0
      END
  );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON public.users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_trial_end_date ON public.users(trial_end_date);
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON public.users(subscription_end_date);

-- Run the retroactive update for existing users
SELECT public.update_existing_users_retroactively();