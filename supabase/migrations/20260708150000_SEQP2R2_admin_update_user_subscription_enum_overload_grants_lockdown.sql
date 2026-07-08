-- SEQP2R2: close a genuine grants gap found by the new grants_check.sh standing check
-- (Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r1.md), spun off there as an
-- out-of-scope finding and fixed here, evidence/SEQ_P2_r2.md.
--
-- FINDING: of the three overloads of public.admin_update_user_subscription, one (the
-- (uuid, text, subscription_tier, timestamptz, timestamptz, text, text) overload, oid 151262)
-- had anon_exec=true, authenticated_exec=true live, while its two sibling overloads
-- ((uuid, text, text, timestamptz, timestamptz) and (uuid, text, text, text, text, text, text))
-- were already correctly locked to service_role-only EXECUTE by
-- 20260628121000_R11_F006_harden_admin_update_user_subscription_overloads.sql. R11's own
-- comment explains why: this third overload was deliberately left as "the client-granted one"
-- because it already carries an internal `IF NOT public.is_admin()` gate, and R11 reasoned the
-- gate was sufficient. R11 never issued an explicit REVOKE for it, so it was left sitting on
-- Postgres's own default (EXECUTE granted to PUBLIC on function creation, which anon and
-- authenticated both inherit unless explicitly revoked) -- exactly the open state grants_check.sh
-- caught live.
--
-- EXPLOITABILITY, investigated live before this fix (full detail in evidence/SEQ_P2_r2.md):
--   1. pg_get_functiondef confirms this overload DOES carry the same
--      `IF NOT public.is_admin() THEN RETURN ...'Unauthorized'... END IF;` internal gate as its
--      two siblings, not a bare ungated SECURITY DEFINER function. is_admin() resolves via
--      has_role(auth.uid(), 'admin'), which is false for both an anonymous caller (auth.uid()
--      is null) and an authenticated non-admin caller.
--   2. Live-attempted the actual escalation over the public REST API with only the anon key
--      (no JWT) against a disposable throwaway test user (never a real customer), both via the
--      standard JSON RPC POST and via an explicit ::subscription_tier cast on a GET request:
--      PostgREST itself refused to resolve the call at all (PGRST203, "Could not choose the
--      best candidate function"), because this overload shares 7 identical argument names
--      with the sibling all-text overload (68052), differing only in the Postgres type of
--      p_subscription_tier/p_trial_end_date/p_subscription_end_date, which PostgREST's JSON
--      body cannot disambiguate. This is the exact "fragile accident of overload ambiguity, not
--      an intentional control" R11's own comment already flagged for the other two overloads;
--      it turns out to also gate this third one today, for every caller, admin or not.
--   3. Net result: no live mutation of the test user's subscription tier occurred through either
--      grants gap. This is a real defense-in-depth gap (grants should never have been the only
--      thing standing between an anon caller and an admin RPC, and the PostgREST ambiguity is
--      not something to rely on either), NOT a live-exploitable sev-2. Severity: sev-4.
--
-- FIX: lock this overload's grants down to match its two siblings and
-- admin_developer_update_user_subscription (already service_role-only per
-- grants_baseline.json), the established pattern for every admin-subscription-mutating RPC in
-- this codebase. No function body change (zero CREATE/DROP FUNCTION statements), the
-- is_admin() gate is left exactly as-is, this is grants-only, additive, matching the SEQP1R57
-- pattern.
--
-- NOTE (separate, out-of-scope finding, flagged via spawn_task, not fixed here): the frontend
-- admin UI (src/hooks/useAdminControls.tsx) calls this exact overload directly via
-- `supabase.rpc('admin_update_user_subscription', {...7 named args...})` as the signed-in
-- admin's own authenticated session, not via a service-role-gated edge function. Given the
-- PostgREST overload-ambiguity above already blocks resolution of this call shape for EVERY
-- caller today, that admin-subscription-update UI flow appears to already be broken in
-- production, independent of this grants fix (this migration does not touch or worsen that;
-- revoking `authenticated` here removes no functionality that currently works).

REVOKE ALL ON FUNCTION public.admin_update_user_subscription(
  uuid, text, subscription_tier, timestamp with time zone, timestamp with time zone, text, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_update_user_subscription(
  uuid, text, subscription_tier, timestamp with time zone, timestamp with time zone, text, text
) FROM anon;
REVOKE ALL ON FUNCTION public.admin_update_user_subscription(
  uuid, text, subscription_tier, timestamp with time zone, timestamp with time zone, text, text
) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_subscription(
  uuid, text, subscription_tier, timestamp with time zone, timestamp with time zone, text, text
) TO service_role;

COMMENT ON FUNCTION public.admin_update_user_subscription(
  uuid, text, subscription_tier, timestamp with time zone, timestamp with time zone, text, text
) IS
  'R11/F-006: internal IF NOT is_admin() gate. SEQP2R2: closes a live grants gap (this overload
  alone, of its three, was left anon/authenticated-executable by omission in R11); now locked to
  service_role-only EXECUTE, matching its two sibling overloads and
  admin_developer_update_user_subscription. Investigated live and found NOT exploitable pre-fix
  (is_admin() gate + a PostgREST overload-ambiguity both independently blocked the anon-key
  escalation attempt against a disposable test user), sev-4 defense-in-depth, not sev-2. No
  function-body change. See Bookings Assistant/launch-ready-loop/evidence/SEQ_P2_r2.md.';
