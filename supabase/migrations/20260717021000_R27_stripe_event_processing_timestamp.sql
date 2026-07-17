-- R27: R26 reproduced that the legacy NOT NULL processed_at column forces an
-- in-flight claim to look processed before any handler work has completed.
-- Processing rows must carry claimed_at; processed_at is written only when the
-- current lease token successfully completes.

ALTER TABLE public.processed_stripe_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT;

ALTER TABLE public.processed_stripe_events
  DROP CONSTRAINT IF EXISTS processed_stripe_events_lifecycle_check;

ALTER TABLE public.processed_stripe_events
  ADD CONSTRAINT processed_stripe_events_lifecycle_check
  CHECK (
    (status = 'processing' AND claim_token IS NOT NULL AND claimed_at IS NOT NULL
      AND processed_at IS NULL AND completed_at IS NULL)
    OR (status = 'completed' AND claim_token IS NULL AND claimed_at IS NULL
      AND processed_at IS NOT NULL AND completed_at IS NOT NULL)
    OR (status = 'failed' AND claim_token IS NULL AND claimed_at IS NULL
      AND completed_at IS NULL)
  );
