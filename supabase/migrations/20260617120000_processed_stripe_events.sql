-- Stripe webhook idempotency.
--
-- stripe-webhook processed every delivery, so a Stripe retry or a duplicate
-- delivery of the same event could be handled twice — re-opening a grace window,
-- flapping a subscription tier, or re-confirming a booking. Stripe guarantees
-- at-least-once delivery with a stable event.id, so we dedup on that id.
--
-- The webhook claims an event by inserting its id here (unique). A second delivery
-- of the same id hits the primary-key conflict and is skipped. If processing fails,
-- the webhook releases the claim (deletes the row) so Stripe's retry can re-process.

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id     text PRIMARY KEY,
  event_type   text,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Service-role only (the edge function bypasses RLS); never client-readable.
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
