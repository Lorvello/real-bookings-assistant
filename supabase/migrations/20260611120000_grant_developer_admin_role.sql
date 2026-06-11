-- Auto-grant the 'admin' role to the single developer account.
--
-- The in-app developer/testing tools (DeveloperStatusManager etc.) call
-- admin_* RPC functions that are guarded server-side by is_admin(). For those
-- tools to actually work, the developer account needs the 'admin' role in
-- public.user_roles.
--
-- This is made self-healing: a trigger grants the role automatically whenever
-- that exact email signs up — via email/password OR Google — so it does not
-- matter when the account is (re)created (e.g. after a clean-slate data wipe).
-- Strictly scoped to the one developer email; every other account is untouched.

CREATE OR REPLACE FUNCTION public.grant_developer_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF lower(NEW.email) = 'business01003@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_developer_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_developer_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_developer_admin_role();

-- Backfill: if the developer account already exists, grant the role now.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'business01003@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
