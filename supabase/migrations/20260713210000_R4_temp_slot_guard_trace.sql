-- R4 TEMPORARY DIAGNOSTIC (Full-Journey Agent Simulation V3, see
-- ../../../Bookings Assistant/launch-ready-loop/_FULL_JOURNEY_AGENT_SIMULATION_V3_STATE.md R3/R4).
--
-- R3 confirmed a real, intermittent (~33%) bug on "[stylist] + [service] + [day]?" availability
-- phrasing: either ownerEscalationGuard's regex/classifier OR businessDataGuard's grounding
-- classifier occasionally rewrites a correct availability answer into a wrong deflection reply.
-- R3 could not determine whether get_available_slots was actually called on failing turns (would
-- prove guard-side false-positive amplification) or skipped (would prove upstream tool-selection
-- failure) because this project's Logflare/analytics log pipeline returns zero rows for EVERY
-- table (edge_logs, function_edge_logs, function_logs, even postgres_logs), confirmed R4,
-- Management API log access is a dead end for this project, not a query-parameter mistake.
--
-- This table is a narrow, STRICTLY TEMPORARY DB-backed trace, gated in application code
-- (whatsapp-agent/index.ts) to only ever write a row when the business/calendar owner is the
-- fixture owner f744eddc-7731-40a0-8c18-6f152b6a1796, so it can never fire for a real paying
-- customer. Intended to be dropped (and its index.ts call site removed) at the end of the R4
-- investigation, in the same commit as whatever fix the evidence supports. If ever left in place
-- longer than that, it is still harmless: no real-owner traffic reaches it, no email/alert
-- dispatch reads from it (unlike monitoring_alerts, deliberately NOT reused here to avoid
-- spamming business01003@gmail.com with diagnostic noise via monitoring-alert-dispatcher), and it
-- carries a negligible single-row insert per fixture turn.
CREATE TABLE public.r4_temp_slot_guard_trace (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  conversation_id       uuid,
  turn_had_slot_query   boolean NOT NULL,
  owner_regex_fired     boolean NOT NULL,
  owner_clf_fired       boolean NOT NULL,
  grounding_clf_fired   boolean NOT NULL,
  grounding_clf_reason  text,
  reply_before_guards   text,
  reply_after_guards    text
);

ALTER TABLE public.r4_temp_slot_guard_trace ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.r4_temp_slot_guard_trace FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.r4_temp_slot_guard_trace TO service_role;

COMMENT ON TABLE public.r4_temp_slot_guard_trace IS
  'TEMPORARY R4 diagnostic trace, fixture-owner-gated (f744eddc-7731-40a0-8c18-6f152b6a1796 only). Drop after the R4 investigation closes (see _FULL_JOURNEY_AGENT_SIMULATION_V3_STATE.md).';
