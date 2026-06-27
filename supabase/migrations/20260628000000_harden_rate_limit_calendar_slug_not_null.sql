-- F-005 part (b): harden public_api_rate_limits.calendar_slug against the latent
-- NULL/empty-string read-vs-write mismatch.
--
-- Root cause: the shared rate limiter (_shared/rateLimit.ts) read on
-- calendar_slug = (identifier || '') (empty string) but wrote
-- calendar_slug = (identifier || null) (NULL). Postgres treats NULLs as DISTINCT
-- in a UNIQUE index, so a null identifier defeated the onConflict upsert and split
-- the rate-limit bucket, silently weakening the limiter for any caller that passes
-- no identifier. The code is now canonicalized to '' on BOTH paths (slugKey).
-- This migration makes the COLUMN enforce that invariant so it can never drift
-- back: default '' and NOT NULL, matching the read/write key.
--
-- Safe: a pre-migration check confirmed 0 existing NULL calendar_slug rows, so the
-- backfill is a no-op and the NOT NULL will not fail. Idempotent on re-run.

-- 1. Backfill any historical NULLs to the canonical empty-string key (no-op today).
UPDATE public.public_api_rate_limits
SET calendar_slug = ''
WHERE calendar_slug IS NULL;

-- 2. Default new rows to the canonical empty-string key.
ALTER TABLE public.public_api_rate_limits
  ALTER COLUMN calendar_slug SET DEFAULT '';

-- 3. Forbid NULL so the read('') vs write(NULL) mismatch can never recur.
ALTER TABLE public.public_api_rate_limits
  ALTER COLUMN calendar_slug SET NOT NULL;
