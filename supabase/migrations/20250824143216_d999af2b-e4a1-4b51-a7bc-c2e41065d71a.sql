-- After cleaning duplicates, enforce one Stripe account per calendar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.business_stripe_accounts'::regclass
      AND conname = 'business_stripe_accounts_calendar_id_unique'
  ) THEN
    ALTER TABLE public.business_stripe_accounts
      ADD CONSTRAINT business_stripe_accounts_calendar_id_unique
      UNIQUE (calendar_id);
  END IF;
END
$$;
