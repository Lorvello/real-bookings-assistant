
-- 1) Verwijder duplicaten in business_stripe_accounts
--    Bewaar per (account_owner_id, environment, platform_account_id) de meest recente rij
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY account_owner_id, environment, platform_account_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn
  FROM public.business_stripe_accounts
)
DELETE FROM public.business_stripe_accounts b
USING ranked r
WHERE b.id = r.id
  AND r.rn > 1;

-- 2) Maak een unieke index zodat nieuwe duplicaten niet meer kunnen ontstaan
--    We maken 'm PARTIAL waar platform_account_id IS NOT NULL,
--    omdat NULL-waarden in Postgres niet als duplicaat gelden.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bsa_owner_env_platform_not_null
  ON public.business_stripe_accounts (account_owner_id, environment, platform_account_id)
  WHERE platform_account_id IS NOT NULL;
