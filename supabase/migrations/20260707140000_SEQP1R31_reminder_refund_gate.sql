-- SEQP1R31: fix finding R30-1 (Stripe refunds never checked by the reminder pipeline).
--
-- MATHEW'S DECISION (2026-07-07, "any refund stops reminders"): any Stripe refund on a
-- booking (full or partial, no distinction) immediately stops that booking's reminders.
-- The booking record's own `bookings.status` is NOT auto-changed (stays exactly as an
-- owner-initiated cancel would leave it untouched) -- only the reminder is skipped. This is
-- deliberately NOT the same mechanism as SEQP1R13's `booking_cancelled` guard (which reads
-- `bookings.status`): a refund must gate on `payment_status` alone, independent of status,
-- per Mathew's explicit rejection of an auto-cancel-on-refund approach.
--
-- ROOT CAUSE (R30-1, evidence launch-ready-loop/evidence/SEQ_P1_r30.md): `stripe-webhook`'s
-- event switch has no case for `charge.refunded`, so a real refund event reaches
-- `processed_stripe_events` (passes signature verification + idempotency-claim) and then
-- falls through `default`, zero booking mutation. Separately, `claim_booking_reminder`'s
-- `eligible` CTE only ever reads `bookings.status`/`is_deleted`/`start_time`, never
-- `payment_status`, so even if a refund WERE recorded, the reminder pipeline would still
-- treat the booking as fully eligible.
--
-- FIX (this migration handles half of it -- the DB gate; the webhook code change is a
-- separate file in this same commit):
-- 1. Add a `payment_status` predicate to `claim_booking_reminder`'s existing `eligible` CTE,
--    the SAME choke point SEQP1R13 (booking_cancelled) and SEQP1R28 (calendar_timezone)
--    already use for claim-time-fresh reads. A `payment_status = 'refunded'` booking now
--    resolves the claim to a NEW distinct terminal status, `payment_refunded`, so the owner-
--    facing ReminderActivityCard can show a meaningful, specific reason instead of the
--    reminder silently vanishing (mirrors how `booking_cancelled` and
--    `invalid_phone_format` are already distinct terminal states, SEQP1R9/SEQP1R13).
-- 2. Also add `payment_refunded` to `get_due_booking_reminders()`'s terminal-status
--    exclusion set (the `not exists (... r.status in (...))` list), so a reminder already
--    parked `payment_refunded` is never re-selected into a future due-batch (mirrors
--    `booking_cancelled`'s treatment there).
-- 3. `payment_status` gets a new value, 'refunded' -- confirmed via a live schema read that
--    `bookings.payment_status` is a free-text column with NO CHECK constraint at all (unlike
--    `status`, which has `bookings_status_check`/`valid_booking_status`), and that the only
--    existing non-null/non-'paid' value ever written is 'refund_required' (a DIFFERENT
--    meaning: a late payment landing on an already-terminal booking, flagged for the OWNER
--    to manually refund -- see E-6b in stripe-webhook/index.ts). 'refunded' is a genuinely
--    new, distinct value: it means Stripe has ALREADY returned the money, not that a manual
--    refund is still owed. No existing value could be reused without conflating two
--    different real-world states.
--
-- Both eligible/due-selecting functions require DROP-then-CREATE for the eligible CTE
-- predicate change (claim_booking_reminder's OUT signature is unchanged, but the function
-- body predicate changes materially; get_due_booking_reminders' signature is also unchanged,
-- so `create or replace` is sufficient there, matching precedent that a mere WHERE-clause/
-- terminal-set change does not require a DROP unless the return shape changes).

CREATE OR REPLACE FUNCTION public.get_due_booking_reminders()
RETURNS TABLE(
  booking_id uuid,
  reminder_number smallint,
  channel text,
  customer_email text,
  customer_phone text,
  customer_name text,
  customer_locale text,
  start_time timestamptz,
  business_name text,
  calendar_id uuid,
  calendar_timezone text
)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $f$
  with due as (
    select b.id, b.customer_email, b.customer_phone, b.customer_name, b.customer_locale,
           b.start_time, b.calendar_id,
           cs.first_reminder_enabled, cs.first_reminder_timing_hours,
           cs.second_reminder_enabled, cs.second_reminder_timing_minutes,
           coalesce(bo.business_name, 'het bedrijf') as business_name,
           coalesce(nullif(c.timezone, ''), 'Europe/Amsterdam') as calendar_timezone,
           case
             when b.customer_email is not null and b.customer_email <> '' then 'email'
             when b.customer_phone is not null and b.customer_phone <> '' then 'whatsapp'
             else null
           end as channel,
           case when lower(coalesce(b.customer_locale, 'nl')) = 'en' then 'en' else 'nl' end as locale_norm
    from bookings b
    join calendar_settings cs on cs.calendar_id = b.calendar_id
    left join business_overview bo on bo.calendar_id = b.calendar_id
    left join calendars c on c.id = b.calendar_id
    where b.status = 'confirmed' and coalesce(b.is_deleted, false) = false
      and b.start_time > now()
      -- SEQP1R31 (finding R30-1): a refunded booking's payment_status is never eligible for
      -- a NEW due-selection either -- same rationale as claim_booking_reminder's eligible
      -- CTE (see below), applied here so a refunded booking's reminder never even enters
      -- the due-batch in the first place, not just gets rejected at claim time (defense in
      -- depth; claim_booking_reminder remains the authoritative claim-time-fresh gate for a
      -- refund landing AFTER a booking is already in a due-batch mid-tick).
      and coalesce(b.payment_status, '') <> 'refunded'
      and (
        (b.customer_email is not null and b.customer_email <> '')
        or (b.customer_phone is not null and b.customer_phone <> '')
      )
  )
  select d.id, 1::smallint, d.channel, d.customer_email, d.customer_phone, d.customer_name,
         d.locale_norm, d.start_time, d.business_name, d.calendar_id, d.calendar_timezone
  from due d
  where d.channel is not null
    and d.first_reminder_enabled
    and d.start_time <= now() + make_interval(hours => d.first_reminder_timing_hours)
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 1
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded')
    )
  union all
  select d.id, 2::smallint, d.channel, d.customer_email, d.customer_phone, d.customer_name,
         d.locale_norm, d.start_time, d.business_name, d.calendar_id, d.calendar_timezone
  from due d
  where d.channel is not null
    and d.second_reminder_enabled
    and d.start_time <= now() + make_interval(mins => d.second_reminder_timing_minutes)
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 2
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded')
    );
$f$;

COMMENT ON FUNCTION public.get_due_booking_reminders() IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25/SEQP1R31: due-reminder detection. Returns calendar_timezone (SEQP1R25) sourced from calendars.timezone. SEQP1R31 (finding R30-1): excludes bookings whose payment_status=''refunded'' from due-selection, and adds payment_refunded to the terminal-status exclusion set alongside booking_cancelled/sent/pending_template_approval/invalid_phone_format.';

-- R46-class grant re-assertion (CREATE OR REPLACE resets grants to Postgres defaults).
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;

-- claim_booking_reminder: fold a payment_status gate into the SAME atomic eligible CTE
-- SEQP1R13 already uses for the active-booking guard. Signature (OUT columns) is unchanged
-- from SEQP1R28, so CREATE OR REPLACE is sufficient (no DROP needed).
CREATE OR REPLACE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
 RETURNS TABLE(attempt_count integer, status text, calendar_timezone text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- SEQP1R13: a booking is eligible only while confirmed, not soft-deleted, and still in
  -- the future -- otherwise the claim resolves to the terminal 'booking_cancelled' status.
  --
  -- SEQP1R31 (finding R30-1, Mathew's decision "any refund stops reminders"): a booking
  -- whose payment_status = 'refunded' is claim-time-fresh EXCLUDED here too, independently
  -- of the status-based eligibility above (a refund does NOT touch bookings.status, so a
  -- refunded-but-still-'confirmed' booking must be caught by this SEPARATE predicate, not
  -- folded into the same boolean as the cancel guard, since the two are deliberately
  -- distinct terminal reasons for the owner-facing card). refunded resolves to its OWN
  -- terminal status, 'payment_refunded' (never conflated with 'booking_cancelled'), so a
  -- refund-during-send race (a refund landing between get_due's snapshot and this claim)
  -- is caught at the same claim-time choke point SEQP1R13/SEQP1R28 already established.
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
    ) as ok
  ),
  refunded as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and coalesce(b.payment_status, '') = 'refunded'
    ) as ok
  ),
  fresh_tz as (
    select coalesce(nullif(c.timezone, ''), 'Europe/Amsterdam') as tz
    from bookings b
    left join calendars c on c.id = b.calendar_id
    where b.id = p_booking_id
  )
  insert into booking_reminders_sent (booking_id, reminder_number, status, attempt_count)
  select p_booking_id, p_reminder_number,
         case
           when (select ok from refunded) then 'payment_refunded'
           when e.ok then 'pending'
           else 'booking_cancelled'
         end, 0
  from eligible e
  on conflict (booking_id, reminder_number) do update
    -- On a retry (existing row): a still-open 'pending' row flips to 'payment_refunded' if
    -- the booking has since been refunded (checked FIRST, since a refund can land on a
    -- booking that is still 'confirmed', so the cancel-guard branch below would otherwise
    -- never fire for it), else to 'booking_cancelled' if no longer status-eligible, else
    -- left exactly as-is. An already-terminal row (sent / pending_template_approval /
    -- invalid_phone_format / booking_cancelled / payment_refunded) is never touched.
    set status = case
          when (select ok from refunded) = true
               and booking_reminders_sent.status = 'pending'
            then 'payment_refunded'
          when (select ok from eligible) = false
               and booking_reminders_sent.status = 'pending'
            then 'booking_cancelled'
          else booking_reminders_sent.status
        end
  returning attempt_count, status, (select tz from fresh_tz);
$function$;

REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

-- record_booking_reminder_result: mirror the SAME refund re-check at the SECOND (and final)
-- choke point, matching SEQP1R13's own two-layer pattern (claim guards claim-time, record
-- guards commit-time, right before the row would be written 'sent'). Without this, a refund
-- landing in the narrow window between a successful claim and the record write (the send
-- itself already happened by then, an accepted ms-wide residual per R13's own documented
-- reasoning) would still correctly avoid writing a false 'sent' -- same accepted residual,
-- not a new gap, just applying the existing precedent to the new predicate. Signature
-- unchanged (still the 5-arg SEQP1R9 form), so CREATE OR REPLACE is sufficient.
CREATE OR REPLACE FUNCTION public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer,
  p_failure_reason text DEFAULT NULL::text
)
RETURNS TABLE(attempt_count integer, status text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $f$
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
    ) as ok
  ),
  refunded as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and coalesce(b.payment_status, '') = 'refunded'
    ) as ok
  )
  update booking_reminders_sent
  set status = case
        -- SEQP1R31: refunded checked FIRST (same ordering rationale as claim_booking_reminder
        -- above) so a delivered=true outcome on a refunded-but-still-'confirmed' booking is
        -- never mis-recorded 'sent' or masked by the unrelated eligible check.
        when (select ok from refunded) then 'payment_refunded'
        when p_delivered and (select ok from eligible) then 'sent'
        when p_delivered and not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'invalid_phone_format' then 'invalid_phone_format'
        when not (select ok from eligible) then 'booking_cancelled'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    -- Never overwrite a terminal row (fail-closed + idempotency): a delayed/duplicate result
    -- must not reopen or reclassify sent / invalid_phone_format / booking_cancelled / payment_refunded.
    and status not in ('sent', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded')
  returning attempt_count, status;
$f$;

COMMENT ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R31: atomic single-statement write of a reminder send outcome, with a live active-booking re-check (P1-5-CANCEL) AND a live payment_status re-check (SEQP1R31, finding R30-1). A refunded booking always lands ''payment_refunded'' regardless of p_delivered. Otherwise a p_delivered=true outcome is recorded ''sent'' ONLY if the booking is still active (confirmed / not deleted / future) at commit time, otherwise ''booking_cancelled''. Filters out already-terminal rows (sent / invalid_phone_format / booking_cancelled / payment_refunded) so a stale/duplicate result can never revert them.';

REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) TO service_role;

-- booking_reminders_sent.status CHECK constraint: add the new terminal value alongside the
-- existing five (sent, pending, pending_template_approval, invalid_phone_format,
-- booking_cancelled). Drop-then-add is the standard Postgres pattern for widening a CHECK.
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'public.booking_reminders_sent'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.booking_reminders_sent DROP CONSTRAINT %I', con_name);
  END IF;

  ALTER TABLE public.booking_reminders_sent
    ADD CONSTRAINT booking_reminders_sent_status_check
    CHECK (status IN ('sent', 'pending', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded'));
END $$;
