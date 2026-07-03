-- IUX R59: closes 2 residual gaps in the R58 confirm-burst idempotency claim
-- (`claim_whatsapp_confirm`, migration 20260703140000).
--
-- Gap 1 (AFFIRM-CONFIRM-BURST-WORDLIST-GAP, R58-verify): R58 only ever takes the book-path claim
-- when `confirmBook` is true, which itself requires `AFFIRM_RE.test(msgLower)` (a small keyword
-- allow-list). A burst using affirmation wording OUTSIDE that list ("correct", "that's right",
-- "sounds good") skipped the claim block entirely, reproducing the original duplicate-reply bug
-- unprotected. Fix (index.ts): take the claim on ANY inbound message while a fresh
-- `pending_booking` exists (gate = `pendingBookFresh` alone, no wording classification), and
-- RELEASE it immediately via the new `release_whatsapp_confirm_claim` function below if the
-- message turns out not to be a clean confirm (`!confirmBook`) -- so a genuine non-confirm message
-- (a question, an unrelated topic) is never delayed or blocked, it just claims-and-releases in the
-- same request.
--
-- Gap 2 (WHATSAPP-CANCEL-DUPLICATE-BURST, R58-verify): `confirmCancel` is structurally identical
-- to `confirmBook` (same freshness-window gate, same AFFIRM_RE/NEGATE_RE/ambiguousConfirm shape)
-- but had NO claim protection anywhere. Fix (index.ts): apply the SAME `claim_whatsapp_confirm`
-- function (reused, not a twin table -- the claim_key already namespaces by
-- phone|calendar_id|proposal_epoch, and a customer's pending_booking.at and pending_cancel.at are
-- independent clocks that can never collide on the same key) to the cancel path, scoped to
-- (phone, calendar_id, pending_cancel.at), same take-on-any-message / release-if-not-a-clean-
-- confirm shape as the book-path fix above.
--
-- `claim_whatsapp_confirm` itself (the atomic claim primitive) is reused as-is for both gaps --
-- its atomicity was independently stress-tested twice already (R58's own 20-way/15-way burst,
-- R58-verify's own 20-way/15-way burst), no reason to touch that logic. It is changed ONLY to
-- additionally return the winning claim's row id (needed so release can target the EXACT row a
-- caller created, see below), via CREATE OR REPLACE with a new return type -- Postgres requires
-- DROP+CREATE (not REPLACE) when the return type changes, so the function is dropped and
-- recreated with identical body logic, byte-identical atomicity semantics.
DROP FUNCTION IF EXISTS public.claim_whatsapp_confirm(text, uuid, timestamptz, integer);

CREATE FUNCTION public.claim_whatsapp_confirm(
  p_phone text,
  p_calendar_id uuid,
  p_proposal_at timestamptz,
  p_ttl_seconds integer DEFAULT 20
)
RETURNS TABLE(won boolean, claim_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
  v_rowcount integer := 0;
  v_id uuid;
BEGIN
  v_key := p_phone || '|' || p_calendar_id::text || '|' || extract(epoch FROM p_proposal_at)::text;

  -- Self-heal: drop this key's row if it has already expired, so a stale/crashed claim never
  -- blocks a later legitimate attempt forever.
  DELETE FROM public.whatsapp_confirm_claims
  WHERE claim_key = v_key AND expires_at < now();

  INSERT INTO public.whatsapp_confirm_claims (claim_key, phone, calendar_id, proposal_at, expires_at)
  VALUES (v_key, p_phone, p_calendar_id, p_proposal_at, now() + make_interval(secs => p_ttl_seconds))
  ON CONFLICT (claim_key) DO NOTHING
  RETURNING id INTO v_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  IF v_rowcount > 0 THEN
    RETURN QUERY SELECT true, v_id;
  ELSE
    RETURN QUERY SELECT false, NULL::uuid;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.claim_whatsapp_confirm IS
  'IUX R58 (+R59 return-shape change): atomic cross-request idempotency claim for the WhatsApp confirm-burst race. Returns (won, claim_id): won=true means the caller WON the claim (proceed), with claim_id identifying the exact row so a subsequent release_whatsapp_confirm_claim call can target only this specific claim generation. won=false means a sibling request already claimed this exact (phone, calendar_id, proposal_at) and is/was processing it (claim_id is null).';

-- Release a claim this caller holds but no longer needs (the message it claimed for turned out
-- not to be a clean confirm). Deletes ONLY by the exact row id the caller's OWN claim_whatsapp_confirm
-- call returned -- never by (phone, calendar_id, proposal_at) alone, so a caller whose own claim
-- has since expired and been superseded by a DIFFERENT concurrent claimant's fresh claim (same key,
-- new row, new id) can never accidentally delete that newer, unrelated claim generation. A release
-- call for an id that no longer exists (already expired + self-healed, or already released) is a
-- harmless no-op (0 rows affected).
CREATE OR REPLACE FUNCTION public.release_whatsapp_confirm_claim(
  p_claim_id uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  DELETE FROM public.whatsapp_confirm_claims WHERE id = p_claim_id;
$function$;

COMMENT ON FUNCTION public.release_whatsapp_confirm_claim IS
  'IUX R59: releases a live claim_whatsapp_confirm claim early by its exact row id (the claiming message turned out not to be a clean confirm), so a message that merely arrived while a pending_booking/pending_cancel was open never blocks a later genuine confirm attempt for its own claim TTL window. Scoped by row id (not by key) so it can never delete a different, newer claim generation for the same key.';
