-- SECURITY: close a critical privilege-escalation hole.
--
-- Confirmed exploit: any authenticated user could, via direct PostgREST calls,
--   PATCH /rest/v1/users?id=eq.<self>  {subscription_status:'active', subscription_tier:'enterprise'}
--   POST  /rest/v1/subscribers          {subscribed:true, subscription_tier:'enterprise'}
-- and get_user_status_type() would then return 'paid_subscriber' -> free paid/
-- enterprise access. The subscribers UPDATE policy was `USING true` and the
-- users_prevent_subscription_escalation WITH CHECK still permitted setting
-- status='active'/tier='enterprise'. The frontend never writes these columns as
-- the user (verified) — only edge functions (service_role) do — so locking down
-- client write access breaks no legitimate flow.

-- 1. subscribers: only the system (service_role) may write it. Clients keep
--    SELECT (read own subscription) but lose INSERT/UPDATE.
REVOKE INSERT, UPDATE ON public.subscribers FROM authenticated, anon;
DROP POLICY IF EXISTS update_own_subscription ON public.subscribers;
DROP POLICY IF EXISTS insert_subscription ON public.subscribers;

-- 2. users: block authenticated/anon from changing subscription-state columns,
--    while still allowing them to update their own profile / WhatsApp settings.
--    A trigger (not column REVOKE) is used so legit updates to other columns keep
--    working without having to enumerate every allowed column. service_role
--    (edge functions) and postgres (migrations) pass through unaffected.
CREATE OR REPLACE FUNCTION public.guard_users_subscription_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.subscription_status   IS DISTINCT FROM OLD.subscription_status
       OR NEW.subscription_tier  IS DISTINCT FROM OLD.subscription_tier
       OR NEW.trial_end_date     IS DISTINCT FROM OLD.trial_end_date
       OR NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date
       OR NEW.grace_period_end   IS DISTINCT FROM OLD.grace_period_end
       OR NEW.payment_status     IS DISTINCT FROM OLD.payment_status THEN
      RAISE EXCEPTION 'Subscription state is system-managed and cannot be changed directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_users_subscription_columns ON public.users;
CREATE TRIGGER guard_users_subscription_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_subscription_columns();
