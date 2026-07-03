-- IUX R58: WHATSAPP-DUPLICATE-CONFIRM-BURST fix.
--
-- Root cause (R56 / R56-verify): near-simultaneous/rapid-fire confirmation messages from the
-- SAME phone against the SAME pending_booking proposal always keep DB integrity intact (the
-- bookings_no_overlap exclusion constraint holds, exactly 1 row) but every LOSING concurrent
-- request still runs its own full LLM turn and composes its own customer-facing reply from
-- stale/racy state: the common shape is a false-positive "Gelukt!"/"Done!" success reply; the
-- rarer shape (varied non-identical wording) is a silent WRONG-TIME reschedule. The only
-- existing cross-request guards (raceLostPreCheck's validate_booking_security pre-check RPC and
-- the bookings_no_overlap exclusion constraint at insert) are both TOCTOU-vulnerable: they check
-- "is the slot free," never "did I, this specific pending_booking proposal, already get claimed
-- by a sibling request." bookedThisTurn in tools.ts is per-HTTP-request-local and cannot see a
-- sibling request at all.
--
-- Fix: a genuine cross-request idempotency CLAIM, scoped to (phone, calendar_id, proposal
-- timestamp), taken atomically BEFORE the LLM turn starts (in whatsapp-agent/index.ts, right
-- next to the existing raceLostPreCheck). Only the FIRST concurrent request for a given
-- phone+calendar+proposal wins the claim and proceeds into a normal LLM turn (which may commit,
-- reschedule, or fail honestly). Every OTHER concurrent request for the SAME proposal within the
-- claim's short TTL gets an immediate, deterministic "already processing / already booked" reply
-- without running its own LLM turn or attempting its own commit/reschedule at all -- this closes
-- BOTH the false-positive-reply shape and the wrong-time-reschedule shape in one fix, since both
-- stem from letting more than one concurrent request past the pending_booking read.
--
-- Design: a short-lived claim ROW (not an advisory lock) because the race window spans the
-- WHOLE Deno LLM turn (multiple seconds, multiple Postgres round-trips), not a single SQL
-- statement/transaction -- a pg_advisory_xact_lock would release the instant the claiming RPC
-- call returns, long before the turn that needs protecting even starts, so it would not actually
-- cover the window. A row + a TTL is self-healing (a crashed/never-released claim just expires)
-- and gives a clean atomic "first writer wins" via INSERT ... ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS public.whatsapp_confirm_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_key text NOT NULL,
  phone text NOT NULL,
  calendar_id uuid NOT NULL,
  proposal_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- One live (non-expired) claim per claim_key at a time. A plain unique index (not a partial
-- index on a volatile now()-based predicate) so ON CONFLICT DO NOTHING has a stable target;
-- expiry is enforced by the claim function's own cleanup + the TTL check on read, not by the
-- index. A caller that wants to re-claim after expiry deletes the stale row first (see function).
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_confirm_claims_key_idx
  ON public.whatsapp_confirm_claims (claim_key);

CREATE INDEX IF NOT EXISTS whatsapp_confirm_claims_expires_idx
  ON public.whatsapp_confirm_claims (expires_at);

ALTER TABLE public.whatsapp_confirm_claims ENABLE ROW LEVEL SECURITY;
-- Service-role only (the edge function uses the service-role client everywhere else in this
-- path, same as bookings/whatsapp_conversations); no anon/authenticated policy needed, mirrors
-- the existing whatsapp_conversations RLS posture for internal-only tables.
COMMENT ON TABLE public.whatsapp_confirm_claims IS
  'IUX R58: short-lived cross-request idempotency claims for the WhatsApp confirm-burst race. Service-role only.';

-- Atomic claim function: try to insert a claim for (phone, calendar_id, proposal_at). Returns
-- true = this caller WON the claim (proceed into a normal agent turn). Returns false = a live
-- claim already exists for this exact proposal (this caller is a sibling/duplicate; return the
-- deterministic "already processing" reply without running an LLM turn or any commit attempt).
-- Self-heals expired claims inline (deletes any expired row for this key before attempting the
-- insert), so a genuinely NEW booking attempt by the same phone later (a different proposal_at,
-- or the same proposal_at after the TTL has passed, e.g. a retried preview) is never blocked
-- forever by a stale row. p_ttl_seconds defaults to 20s: comfortably longer than the slowest
-- observed single agent turn (~5s per the <3s-warm-p50 gate's own worst-case measurements) while
-- staying short enough that a genuinely new confirm attempt minutes later is never gated by it.
CREATE OR REPLACE FUNCTION public.claim_whatsapp_confirm(
  p_phone text,
  p_calendar_id uuid,
  p_proposal_at timestamptz,
  p_ttl_seconds integer DEFAULT 20
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_rowcount integer := 0;
BEGIN
  v_key := p_phone || '|' || p_calendar_id::text || '|' || extract(epoch FROM p_proposal_at)::text;

  -- Self-heal: drop this key's row if it has already expired, so a stale/crashed claim never
  -- blocks a later legitimate attempt forever.
  DELETE FROM public.whatsapp_confirm_claims
  WHERE claim_key = v_key AND expires_at < now();

  INSERT INTO public.whatsapp_confirm_claims (claim_key, phone, calendar_id, proposal_at, expires_at)
  VALUES (v_key, p_phone, p_calendar_id, p_proposal_at, now() + make_interval(secs => p_ttl_seconds))
  ON CONFLICT (claim_key) DO NOTHING;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount > 0;
END;
$function$;

COMMENT ON FUNCTION public.claim_whatsapp_confirm IS
  'IUX R58: atomic cross-request idempotency claim for the WhatsApp confirm-burst race. true = caller won (proceed); false = a sibling request already claimed this exact (phone, calendar_id, proposal_at) and is/was processing it.';

-- Housekeeping: periodic sweep of long-expired claim rows so the table never grows unbounded.
-- Mirrors the existing pg_cron pattern used for cancel_overdue_unpaid_bookings /
-- update_expired_trials in this codebase. Keeps a 1-hour grace window past expiry (cheap, purely
-- cosmetic -- expired rows are already inert to claim_whatsapp_confirm's own self-heal).
CREATE OR REPLACE FUNCTION public.cleanup_expired_whatsapp_confirm_claims()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.whatsapp_confirm_claims WHERE expires_at < now() - interval '1 hour';
END;
$function$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-expired-whatsapp-confirm-claims')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-whatsapp-confirm-claims');
    PERFORM cron.schedule(
      'cleanup-expired-whatsapp-confirm-claims',
      '*/30 * * * *',
      $cron$SELECT public.cleanup_expired_whatsapp_confirm_claims();$cron$
    );
  END IF;
END;
$$;
