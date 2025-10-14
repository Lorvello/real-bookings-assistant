-- PHASE 1: Authentication Security Database Schema

-- User sessions table for tracking active sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_token text UNIQUE NOT NULL,
  device_fingerprint text,
  device_name text,
  device_type text, -- 'desktop', 'mobile', 'tablet'
  browser text,
  os text,
  ip_address inet,
  location_country text,
  location_city text,
  last_activity_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Login history for detecting suspicious activity
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text,
  device_fingerprint text,
  location_country text,
  location_city text,
  success boolean NOT NULL,
  failure_reason text,
  risk_score integer DEFAULT 0, -- 0-100 scale
  flagged_as_suspicious boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- User security settings
CREATE TABLE public.user_security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  password_changed_at timestamptz DEFAULT now(),
  password_expiry_days integer DEFAULT 90,
  force_password_change boolean DEFAULT false,
  mfa_enabled boolean DEFAULT false,
  mfa_method text, -- 'totp', 'sms', 'email'
  mfa_secret text,
  trusted_devices jsonb DEFAULT '[]'::jsonb,
  security_questions jsonb,
  last_security_review_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active, expires_at);
CREATE INDEX idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX idx_login_history_suspicious ON public.login_history(flagged_as_suspicious, login_time);

-- RLS Policies
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_settings ENABLE ROW LEVEL SECURITY;

-- Users can only view/manage their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- System can manage sessions
CREATE POLICY "System can manage sessions" ON public.user_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Users can view own login history
CREATE POLICY "Users can view own login history" ON public.login_history
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert login history
CREATE POLICY "System can insert login history" ON public.login_history
  FOR INSERT WITH CHECK (true);

-- Users can view/update own security settings
CREATE POLICY "Users can view own security settings" ON public.user_security_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own security settings" ON public.user_security_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- System can manage security settings
CREATE POLICY "System can manage security settings" ON public.user_security_settings
  FOR INSERT WITH CHECK (true);

-- Auto-create security settings on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_security_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_security_settings (user_id, password_changed_at)
  VALUES (NEW.id, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_security
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_security_settings();