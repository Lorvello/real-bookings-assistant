-- SEQP1R10 (fixes P1-9-PHONE2, sev-3 reopened twice: first for a UK number, then again for
-- FR/BE numbers, because every after-the-fact "guess the country from a bare local-format
-- number" heuristic at the Meta send boundary is inherently ambiguous -- a French "06..." or
-- Belgian "04..." mobile number is byte-identical in shape to a Dutch "06" number).
--
-- ROOT CAUSE (per R9 verify's own digest): the web/dashboard booking form
-- (BookingBasicFields.tsx's handlePhoneChange) already computed a correct, disambiguated
-- E.164 value via libphonenumber-js, then discarded it and stored the raw typed text instead.
-- That code bug is fixed in this same round (src/components/booking/BookingBasicFields.tsx).
--
-- This migration adds the DATABASE-LEVEL backstop: a CHECK constraint on
-- bookings.customer_phone that only allows either
--   (a) NULL / empty (phone is optional), or
--   (b) a plausible international MSISDN: optional leading "+", then 10-15 digits, first
--       digit 1-9 (no leading 0). This accepts BOTH shapes this codebase's write paths
--       legitimately produce:
--         - "+31612345678"  (web/dashboard form via validatePhoneNumber's E.164 result, now
--            actually stored after the BookingBasicFields.tsx fix)
--         - "31612345678"   (WhatsApp-origin booking via whatsapp-agent/tools.ts, which writes
--            Meta's own already-bare-digits wa_id verbatim -- this is NOT ambiguous, it is
--            Meta's own confirmed international contact id, never a locally-typed local-format
--            number, so it is deliberately accepted, not just tolerated)
-- and REJECTS the exact ambiguous shape that caused this bug class: a bare local-format number
-- with a leading "0" (e.g. "0612345678" NL, "0687654321" FR, "0470123456" BE, "07911123456"
-- UK) can never satisfy this constraint, because a leading "0" is a national trunk prefix, not
-- part of a real country-code-qualified MSISDN. A row can no longer be silently mis-tagged as
-- Dutch after this point: the ambiguous shape simply cannot be written at all, by ANY client
-- (browser, direct PostgREST call, a compromised session), regardless of what the UI does.
--
-- This is the actual trust boundary for two of the three write paths from the P1-9-PHONE(2)
-- findings: the dashboard "New Appointment" modal (useOptimisticBookings.tsx) is an
-- AUTHENTICATED direct-to-PostgREST insert with NO edge function in front of it at all (RLS
-- policy bookings_owner_all has with_check=null today, confirmed via a live pg_policies query),
-- so a constraint here is the only server-side gate available for that path regardless of any
-- edge-function-side validation added elsewhere. create-booking (the public unauthenticated
-- path) and create-installment-payment get their OWN server-side libphonenumber-js validation
-- in this same round (see their index.ts changes); this constraint is the final backstop behind
-- all of them, and behind any future write path that forgets to validate.
--
-- 0 production rows exist today (confirmed live, matches every prior round's baseline), so
-- there is no backfill concern and no risk of this constraint rejecting real historical data.

alter table public.bookings
  drop constraint if exists bookings_customer_phone_format;

alter table public.bookings
  add constraint bookings_customer_phone_format
  check (
    customer_phone is null
    or customer_phone = ''
    or customer_phone ~ '^\+?[1-9]\d{9,14}$'
  );

comment on constraint bookings_customer_phone_format on public.bookings is
  'SEQP1R10 (P1-9-PHONE2): customer_phone must be NULL/empty or a plausible international MSISDN (optional leading "+", 10-15 digits, no leading 0). Rejects every bare local-format shape (e.g. "0612345678") that caused the NL/UK/FR/BE mis-normalization bug class at the WhatsApp send boundary (_shared/whatsappSend.ts normalizePhoneForMeta) -- that ambiguity can no longer reach this column at all, from any client, regardless of app-layer validation.';
