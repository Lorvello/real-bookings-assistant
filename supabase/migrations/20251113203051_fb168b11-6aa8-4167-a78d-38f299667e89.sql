-- ====================================
-- ADMIN ROLE SYSTEM FINAL FIX
-- ====================================

-- STEP 1: Extend app_role enum with admin
DO $$ 
BEGIN
  BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
  EXCEPTION 
    WHEN duplicate_object THEN NULL;
  END;
END$$;

-- STEP 2: Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.user_roles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END$$;

-- STEP 3: Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- STEP 4: Create security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- STEP 5: Create RLS policies
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- STEP 6: Update trigger
CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_roles_timestamp ON public.user_roles;
CREATE TRIGGER update_user_roles_timestamp
BEFORE UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.update_user_roles_updated_at();

-- STEP 7: Grant admin - check if exists first, then insert or update
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = '640593ad-279a-477c-89d7-a88bc4c6f805') THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = '640593ad-279a-477c-89d7-a88bc4c6f805';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES ('640593ad-279a-477c-89d7-a88bc4c6f805', 'admin');
  END IF;
END$$;

-- STEP 8: Create indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);