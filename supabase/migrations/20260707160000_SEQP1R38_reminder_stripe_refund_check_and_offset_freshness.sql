-- SEQP1R38: fix findings R37-1 (refund-during-send race) and R37-2 (reminder offset value
-- edited mid-claim), reproduced live launch-ready-loop/evidence/SEQ_P1_r37.md and
-- re-reproduced fresh this round, evidence/SEQ_P1_r38.md. Two disjoint concerns, same
-- pattern as R19/R35 (one migration, one commit, unrelated fixes at the same choke point).
--
-- ============================================================================
-- R37-1: record_booking_reminder_result's existing refund re-check (SEQP1R31) reads
-- bookings.payment_status fresh at commit time, but "fresh" only reflects whatever the
-- charge.refunded WEBHOOK has already written -- and that webhook has real, observed
-- network latency (~1-2s) after a refund succeeds at Stripe. A reminder send is very often
-- faster than that window, so a refund landing in the gap produces a permanent false 'sent'.
-- This cannot be closed by any local DB re-check, because the local DB genuinely does not
-- know yet -- it requires asking Stripe directly, which only the edge function (not this SQL
-- function) can do (see _shared/stripeRefundCheck.ts + index.ts, called right before the
-- actual send, once claim_booking_reminder has already returned a fresh 'pending' claim).
--
-- This migration's role is narrow: give that new send-time Stripe check a proper landing
-- spot in record_booking_reminder_result, distinct from the two existing failure classes:
--   - Stripe CONFIRMS a refund (p_failure_reason='stripe_refund_confirmed'): route straight
--     to the ALREADY-EXISTING 'payment_refunded' terminal state (same state SEQP1R31 uses;
--     a refund confirmed a few seconds early via a direct Stripe call is still exactly the
--     same outcome as one confirmed via the webhook, no new state needed here).
--   - The Stripe call itself ERRORED or timed out (p_failure_reason='stripe_check_failed'):
--     do NOT silently send (fail toward not-yet-confirmed, this loop's standing fail-closed
--     philosophy), but also do not strand the reminder forever or invent a new unbounded
--     retry loop -- reuse the EXISTING bounded-retry shape (P1-6's attempt_count/cap
--     mechanism, SEQP1R3) that already caps a WhatsApp-gated send at
--     pending_template_approval. Landing an unrelated (non-WhatsApp, e.g. email) failure on
--     'pending_template_approval' would be actively misleading on the owner dashboard (that
--     label specifically means "waiting on Meta template approval", per
--     ReminderActivityCard.tsx) -- so this adds ONE new, honestly-named terminal state,
--     'stripe_check_failed', reached via the exact same cap-out mechanism, never a new
--     unbounded loop. Below the cap, an errored check simply stays 'pending' and is retried
--     on the next cron tick like any other transient failure.
--
-- New CHECK-constraint value + new dashboard status is the minimal correct scope; no other
-- terminal-state semantics change.
ALTER TABLE public.booking_reminders_sent DROP CONSTRAINT booking_reminders_sent_status_check;
ALTER TABLE public.booking_reminders_sent ADD CONSTRAINT booking_reminders_sent_status_check
  CHECK (status = ANY (ARRAY[
    'sent'::text, 'pending'::text, 'pending_template_approval'::text,
    'invalid_phone_format'::text, 'booking_cancelled'::text, 'payment_refunded'::text,
    'stripe_check_failed'::text
  ]));

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
        -- SEQP1R31: local payment_status re-check, unchanged, still checked FIRST (the cheap
        -- common-case filter: if the webhook has already landed, this alone is authoritative
        -- and needs no Stripe call at all).
        when (select ok from refunded) then 'payment_refunded'
        -- SEQP1R38 (R37-1): the edge function's own live Stripe check confirmed a refund that
        -- the local mirror had not caught yet -- same terminal state as the line above, just
        -- reached via the authoritative backstop instead of the cheap local mirror.
        when p_failure_reason = 'stripe_refund_confirmed' then 'payment_refunded'
        when p_delivered and (select ok from eligible) then 'sent'
        when p_delivered and not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'invalid_phone_format' then 'invalid_phone_format'
        when not (select ok from eligible) then 'booking_cancelled'
        -- SEQP1R38 (R37-1): the Stripe check itself errored/timed out. Reuses the EXACT same
        -- bounded-retry cap mechanism as the line below (pending_template_approval), just a
        -- distinct, honestly-labeled terminal state at the cap so an email-channel Stripe-API
        -- hiccup is never displayed to the owner as "waiting on WhatsApp approval".
        when p_failure_reason = 'stripe_check_failed' and attempt_count + 1 >= p_max_attempts then 'stripe_check_failed'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    -- Never overwrite an already-terminal row (fail-closed + idempotency): a delayed/duplicate
    -- result must not reopen or reclassify any of the seven terminal states.
    and status not in ('sent', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded', 'stripe_check_failed')
  returning attempt_count, status;
$f$;

COMMENT ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R31/SEQP1R38: atomic single-statement write of a reminder send outcome. SEQP1R38 (R37-1): p_failure_reason=''stripe_refund_confirmed'' (a live send-time Stripe API check by the caller, closing the webhook-latency race window) routes to the same ''payment_refunded'' state as the local payment_status re-check; p_failure_reason=''stripe_check_failed'' (the live Stripe check itself errored/timed out) does NOT send and bounded-retries via the existing attempt_count/cap mechanism, landing on the distinct terminal ''stripe_check_failed'' at cap (never conflated with the WhatsApp-specific pending_template_approval).';

REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) TO service_role;

-- get_due_booking_reminders(): add 'stripe_check_failed' to the terminal-exclusion set on
-- both reminder-number arms, mirroring how every other terminal state added since SEQP1R3
-- (invalid_phone_format R9, booking_cancelled R13, payment_refunded R31) was folded into the
-- SAME `not exists` predicate. Return shape unchanged, CREATE OR REPLACE is sufficient
-- (matches every prior WHERE-only change to this function).
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
           b.start_time, b.calendar_id, b.payment_status,
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
        and (
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed')
          or (r.status = 'payment_refunded' and coalesce(d.payment_status, '') = 'refunded')
        )
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
        and (
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed')
          or (r.status = 'payment_refunded' and coalesce(d.payment_status, '') = 'refunded')
        )
    );
$f$;

COMMENT ON FUNCTION public.get_due_booking_reminders() IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25/SEQP1R31/SEQP1R35/SEQP1R38: due-reminder detection. SEQP1R38: stripe_check_failed added to the terminal-status exclusion set (a Stripe-check failure that hit the retry cap is parked, never re-selected).';

REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;

-- ============================================================================
-- R37-2: claim_booking_reminder has no knowledge of first_reminder_timing_hours /
-- second_reminder_timing_minutes at all, so a batch-snapshotted booking is claimed
-- unconditionally even if the owner has since edited the offset such that this booking is
-- NO LONGER within the (now-current) due window. Fix: fold a fresh due-window re-check into
-- the SAME claim-time choke point (fresh_tz / fresh_contact / refunded pattern), gated on
-- p_reminder_number so the correct one of the two offset columns is used. If the booking is
-- no longer within the CURRENT offset's window, claim_booking_reminder declines the claim
-- entirely (returns zero rows, exactly like an unmatched/nonexistent booking_id already
-- does) rather than inventing a new terminal status -- the row is simply never written/
-- updated to 'pending', so a future batch correctly re-selects and re-claims it once it
-- genuinely IS due again under the new setting (identical resume semantics to the existing
-- disabled-then-re-enabled reminder lifecycle, R12-proven). index.ts already treats a
-- zero-row claim result as a clean skip (`if (... !claimRows || claimRows.length === 0)
-- { skipped++; continue; }`), so this needs no edge-function change at all for the decline
-- path itself.
--
-- Must be re-checked on EVERY claim (both fresh insert and ON CONFLICT retry), since the
-- offset can change between retries too, not just between the initial snapshot and the
-- first claim. Return shape unchanged (still 6 columns), so CREATE OR REPLACE is sufficient
-- this time (only the body's WHERE/CTE logic changes, not the RETURNS TABLE shape).
CREATE OR REPLACE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
 RETURNS TABLE(
   attempt_count integer,
   status text,
   calendar_timezone text,
   customer_email text,
   customer_phone text,
   customer_name text
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- SEQP1R38 (finding R37-2): re-derive the SAME due-window predicate
  -- get_due_booking_reminders() uses, fresh, at claim time, using CURRENT calendar_settings
  -- (not whatever was live at the original batch snapshot). Gated on p_reminder_number so
  -- reminder 1 checks first_reminder_enabled/first_reminder_timing_hours and reminder 2
  -- checks second_reminder_enabled/second_reminder_timing_minutes, exactly mirroring the two
  -- arms of get_due_booking_reminders()'s own union.
  fresh_offset as (
    select case p_reminder_number
      when 1 then
        cs.first_reminder_enabled
        and b.start_time <= now() + make_interval(hours => cs.first_reminder_timing_hours)
      when 2 then
        cs.second_reminder_enabled
        and b.start_time <= now() + make_interval(mins => cs.second_reminder_timing_minutes)
      else false
    end as ok
    from bookings b
    join calendar_settings cs on cs.calendar_id = b.calendar_id
    where b.id = p_booking_id
  ),
  fresh_tz as (
    select coalesce(nullif(c.timezone, ''), 'Europe/Amsterdam') as tz
    from bookings b
    left join calendars c on c.id = b.calendar_id
    where b.id = p_booking_id
  ),
  fresh_contact as (
    select b.customer_email as email, b.customer_phone as phone, b.customer_name as name
    from bookings b
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
  -- SEQP1R38 (R37-2): a fresh INSERT is only made at all when the booking is CURRENTLY due
  -- under today's offset settings. If the owner has since changed the offset (or disabled
  -- the reminder entirely) such that this booking would not be selected by a fresh
  -- get_due_booking_reminders() call right now, decline the claim outright (zero rows, no
  -- row written) rather than claiming under a stale batch snapshot. coalesce(...,false)
  -- guards a booking whose calendar_settings row is somehow missing (fresh_offset's join
  -- would then yield no row / null, never silently treated as "still due").
  where coalesce((select ok from fresh_offset), false) = true
  on conflict (booking_id, reminder_number) do update
    set status = case
          when booking_reminders_sent.status = 'payment_refunded'
               and (select ok from refunded) = false
               and (select ok from eligible) = true
            then 'pending'
          when booking_reminders_sent.status = 'payment_refunded'
               and (select ok from refunded) = false
               and (select ok from eligible) = false
            then 'booking_cancelled'
          when (select ok from refunded) = true
               and booking_reminders_sent.status = 'pending'
            then 'payment_refunded'
          when (select ok from eligible) = false
               and booking_reminders_sent.status = 'pending'
            then 'booking_cancelled'
          else booking_reminders_sent.status
        end
    -- SEQP1R38 (R37-2): a RETRY (existing row) is only actually updated/returned when the
    -- booking is still fresh-offset-due right now. This matters specifically for the
    -- 'pending' resume path above (a payment-reversal resume, R34-1): if the offset changed
    -- WHILE a row sat 'payment_refunded' such that it would no longer be due today, it must
    -- not resume to a falsely-retryable 'pending' -- it should simply not be touched this
    -- claim (still 'payment_refunded', correctly excluded, and will resume correctly on a
    -- future claim once genuinely due again). The terminal states (sent /
    -- pending_template_approval / invalid_phone_format / booking_cancelled /
    -- stripe_check_failed) are structurally untouched by any WHEN branch above regardless,
    -- so this WHERE only actually changes behavior for the 'pending' and 'payment_refunded'
    -- starting states.
    where coalesce((select ok from fresh_offset), false) = true
  returning
    attempt_count,
    status,
    (select tz from fresh_tz),
    (select email from fresh_contact),
    (select phone from fresh_contact),
    (select name from fresh_contact);
$function$;

COMMENT ON FUNCTION public.claim_booking_reminder(uuid, smallint) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R28/SEQP1R31/SEQP1R35/SEQP1R38: atomic claim-or-resume-retry of a reminder row. SEQP1R38 (R37-2): re-derives the CURRENT first/second reminder offset window fresh at claim time (same predicate as get_due_booking_reminders(), gated on p_reminder_number) and declines the claim entirely (zero rows) if the booking is no longer due under today''s settings, so a stale batch snapshot can never claim/resume a booking whose owner-edited offset would no longer select it right now; it is correctly re-claimed on a future batch once genuinely due again. Also carries SEQP1R35''s payment-resume + contact-freshness and SEQP1R31''s refund gate, unchanged.';

REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;
