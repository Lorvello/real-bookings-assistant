-- Refactor Stripe Connect from calendar-scoped to user-scoped
-- Since this system uses user_id as the organization level, we'll scope Stripe to users

-- 1) Add user_id column to business_stripe_accounts
ALTER TABLE public.business_stripe_accounts
  ADD COLUMN IF NOT EXISTS user_id uuid;

-- 2) Backfill user_id from calendars when calendar_id was used
UPDATE public.business_stripe_accounts b
SET user_id = c.user_id
FROM public.calendars c
WHERE b.user_id IS NULL
  AND b.calendar_id IS NOT NULL
  AND c.id = b.calendar_id;

-- 3) Remove the old calendar_id unique constraint
ALTER TABLE public.business_stripe_accounts
  DROP CONSTRAINT IF EXISTS business_stripe_accounts_calendar_id_unique;

-- 4) Enforce uniqueness by user_id (one Stripe account per user/organization)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_stripe_accounts_user_id_key'
  ) THEN
    ALTER TABLE public.business_stripe_accounts
      ADD CONSTRAINT business_stripe_accounts_user_id_key
      UNIQUE (user_id);
  END IF;
END$$;

-- 5) Make user_id not null after backfill
ALTER TABLE public.business_stripe_accounts
  ALTER COLUMN user_id SET NOT NULL;

-- 6) Keep stripe_account_id unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'business_stripe_accounts_stripe_account_id_key'
  ) THEN
    ALTER TABLE public.business_stripe_accounts
      ADD CONSTRAINT business_stripe_accounts_stripe_account_id_key
      UNIQUE (stripe_account_id);
  END IF;
END$$;

-- 7) Add index for performance
CREATE INDEX IF NOT EXISTS idx_business_stripe_accounts_user_id 
ON public.business_stripe_accounts (user_id);

-- 8) Update RLS policies to be user-scoped instead of calendar-scoped
DROP POLICY IF EXISTS "business_stripe_accounts_owner_all" ON public.business_stripe_accounts;

CREATE POLICY "business_stripe_accounts_user_all" 
ON public.business_stripe_accounts
FOR ALL
USING (user_id = auth.uid());

-- Add details_submitted column if it doesn't exist (mentioned in the requirements)
ALTER TABLE public.business_stripe_accounts
  ADD COLUMN IF NOT EXISTS details_submitted boolean DEFAULT false;