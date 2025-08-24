-- Add account_owner_id to users table to support team hierarchy
ALTER TABLE public.users 
ADD COLUMN account_owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Add index for efficient queries
CREATE INDEX idx_users_account_owner_id ON public.users(account_owner_id);

-- Update business_stripe_accounts to reference account owner instead of individual users
ALTER TABLE public.business_stripe_accounts 
DROP CONSTRAINT IF EXISTS business_stripe_accounts_user_id_fkey,
ADD COLUMN account_owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

-- Migrate existing data: current users become account owners
UPDATE public.business_stripe_accounts 
SET account_owner_id = user_id 
WHERE account_owner_id IS NULL;

-- Function to get account owner for a user
CREATE OR REPLACE FUNCTION public.get_account_owner_id(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- If user has no account_owner_id, they are the account owner
  -- Otherwise, return their account_owner_id
  RETURN (
    SELECT COALESCE(account_owner_id, id) 
    FROM public.users 
    WHERE id = p_user_id
  );
END;
$$;

-- Function to check if user is account owner
CREATE OR REPLACE FUNCTION public.is_account_owner(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN (
    SELECT account_owner_id IS NULL 
    FROM public.users 
    WHERE id = p_user_id
  );
END;
$$;

-- Update RLS policies for business_stripe_accounts
DROP POLICY IF EXISTS "business_stripe_accounts_user_all" ON public.business_stripe_accounts;

CREATE POLICY "business_stripe_accounts_account_owner_all" ON public.business_stripe_accounts
FOR ALL
USING (
  account_owner_id = auth.uid() OR 
  public.get_account_owner_id(auth.uid()) = account_owner_id
);

-- Update users RLS policy to allow account owners to manage their team members
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;

CREATE POLICY "users_select_own_or_team" ON public.users
FOR SELECT
USING (
  auth.uid() = id OR 
  auth.uid() = account_owner_id OR
  public.get_account_owner_id(auth.uid()) = id
);

CREATE POLICY "users_update_own_or_team" ON public.users
FOR UPDATE
USING (
  auth.uid() = id OR 
  public.get_account_owner_id(auth.uid()) = id OR
  (public.is_account_owner(auth.uid()) AND account_owner_id = auth.uid())
);