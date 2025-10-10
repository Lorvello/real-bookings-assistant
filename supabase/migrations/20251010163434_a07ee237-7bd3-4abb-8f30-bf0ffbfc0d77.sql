-- =====================================================
-- CRITICAL SECURITY FIX: User Roles System + Admin Protection
-- =====================================================

-- 1. Create app_role enum (skip if exists)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table (skip if exists)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (drop if exists, recreate)
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Create SECURITY DEFINER function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- 5. Fix admin_apply_developer_status to require admin role
CREATE OR REPLACE FUNCTION public.admin_apply_developer_status(
  p_user_id UUID,
  p_status TEXT,
  p_tier TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_trial_end TIMESTAMPTZ;
  v_subscription_end TIMESTAMPTZ;
  v_effective_tier public.subscription_tier;
  v_calendar_result JSONB;
  v_existing_sub_id UUID;
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  -- Normalize tier if provided
  IF p_tier IS NOT NULL AND p_tier <> '' THEN
    v_effective_tier := p_tier::public.subscription_tier;
  ELSE
    v_effective_tier := 'professional'::public.subscription_tier;
  END IF;

  -- Branch on requested developer status
  IF p_status = 'setup_incomplete' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = NULL,
      business_type = NULL,
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

  ELSIF p_status = 'active_trial' THEN
    v_trial_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'trial',
      subscription_tier = 'professional',
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'expired_trial' THEN
    v_trial_end := v_now - interval '1 day';

    UPDATE public.users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = v_trial_end,
      subscription_end_date = NULL,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, NULL, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = NULL,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'missed_payment' THEN
    v_subscription_end := v_now;

    UPDATE public.users SET
      subscription_status = 'missed_payment',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'paid_subscriber' THEN
    v_subscription_end := v_now + interval '30 days';

    UPDATE public.users SET
      subscription_status = 'active',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE public.subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_but_active' THEN
    v_subscription_end := v_now + interval '7 days';

    UPDATE public.users SET
      subscription_status = 'canceled',
      subscription_tier = v_effective_tier,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Professional Business'),
      business_type = COALESCE(business_type, 'clinic'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), true, v_subscription_end, v_effective_tier::text);
    ELSE
      UPDATE public.subscribers
      SET subscribed = true,
          subscription_end = v_subscription_end,
          subscription_tier = v_effective_tier::text,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSIF p_status = 'canceled_and_inactive' THEN
    v_subscription_end := v_now - interval '1 day';

    UPDATE public.users SET
      subscription_status = 'expired',
      subscription_tier = NULL,
      trial_end_date = NULL,
      subscription_end_date = v_subscription_end,
      business_name = COALESCE(business_name, 'Demo Business'),
      business_type = COALESCE(business_type, 'salon'),
      updated_at = v_now
    WHERE id = p_user_id;

    SELECT id INTO v_existing_sub_id FROM public.subscribers WHERE user_id = p_user_id LIMIT 1;
    
    IF v_existing_sub_id IS NULL THEN
      INSERT INTO public.subscribers (user_id, email, subscribed, subscription_end, subscription_tier)
      VALUES (p_user_id, COALESCE((SELECT email FROM public.users WHERE id = p_user_id), ''), false, v_subscription_end, NULL);
    ELSE
      UPDATE public.subscribers
      SET subscribed = false,
          subscription_end = v_subscription_end,
          subscription_tier = NULL,
          updated_at = v_now
      WHERE user_id = p_user_id;
    END IF;

    SELECT public.admin_ensure_user_has_calendar(p_user_id) INTO v_calendar_result;

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown status');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'applied_status', p_status,
    'tier', COALESCE(p_tier, 'professional'),
    'calendar_result', COALESCE(v_calendar_result, jsonb_build_object('message','no_calendar_change')),
    'processed_at', v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;

-- 6. Add admin check to admin_update_user_subscription
CREATE OR REPLACE FUNCTION public.admin_update_user_subscription(
  p_user_id UUID,
  p_subscription_status TEXT DEFAULT NULL,
  p_subscription_tier public.subscription_tier DEFAULT NULL,
  p_trial_end_date TIMESTAMPTZ DEFAULT NULL,
  p_subscription_end_date TIMESTAMPTZ DEFAULT NULL,
  p_business_name TEXT DEFAULT NULL,
  p_business_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  UPDATE public.users
  SET
    subscription_status = COALESCE(p_subscription_status, subscription_status),
    subscription_tier = COALESCE(p_subscription_tier, subscription_tier),
    trial_end_date = COALESCE(p_trial_end_date, trial_end_date),
    subscription_end_date = COALESCE(p_subscription_end_date, subscription_end_date),
    business_name = COALESCE(p_business_name, business_name),
    business_type = COALESCE(p_business_type, business_type),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User subscription updated successfully',
    'user', (SELECT row_to_json(u.*) FROM public.users u WHERE u.id = p_user_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 7. Add admin check to admin_extend_trial
CREATE OR REPLACE FUNCTION public.admin_extend_trial(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_new_trial_end TIMESTAMPTZ;
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  v_new_trial_end := GREATEST(
    COALESCE((SELECT trial_end_date FROM public.users WHERE id = p_user_id), now()),
    now()
  ) + (p_days || ' days')::INTERVAL;

  UPDATE public.users
  SET
    trial_end_date = v_new_trial_end,
    subscription_status = 'trial',
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Trial extended by ' || p_days || ' days',
    'new_trial_end', v_new_trial_end
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 8. Add admin check to admin_setup_mock_incomplete_user
CREATE OR REPLACE FUNCTION public.admin_setup_mock_incomplete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- CRITICAL: Check if caller is admin
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin role required'
    );
  END IF;

  UPDATE public.users
  SET
    business_name = NULL,
    business_type = NULL,
    subscription_status = 'trial',
    trial_end_date = now() + interval '30 days',
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User reset to setup incomplete state'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

-- 9. Fix users table RLS to protect PII from team members
-- Drop existing problematic policy
DROP POLICY IF EXISTS "users_select_own_or_team" ON public.users;

-- Create new restricted policy for team members (only see basic info, not PII)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Admins can see all users
DROP POLICY IF EXISTS "admins_select_all_users" ON public.users;
CREATE POLICY "admins_select_all_users"
  ON public.users
  FOR SELECT
  USING (public.is_admin());