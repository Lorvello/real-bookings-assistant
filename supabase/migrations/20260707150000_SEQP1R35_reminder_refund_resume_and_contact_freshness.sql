-- SEQP1R35: fix findings R34-1 (payment reversal one-way ratchet) and R34-2 (contact info
-- edited mid-send uses stale data), reproduced live launch-ready-loop/evidence/SEQ_P1_r34.md
-- and re-reproduced fresh this round, evidence/SEQ_P1_r35.md. Two disjoint concerns fixed
-- at the same claim-time choke point in one migration (R19 precedent: 2 unrelated sev-3s,
-- disjoint code, one round).
--
-- ============================================================================
-- R34-1: payment_refunded is currently a PERMANENT terminal exclusion in
-- get_due_booking_reminders()'s terminal-status set. Once a booking_reminders_sent row
-- lands 'payment_refunded', nothing about bookings.payment_status changing back to 'paid'
-- (a genuine re-payment / dispute-resolved / retried-card scenario) can undo that, because
-- due-selection only checks whether a blocking row EXISTS, never re-evaluates why it is
-- there. Mathew's original R30/R31 decision text was "any refund stops reminders", which
-- is ambiguous on "forever" vs "until un-refunded"; per R34's own fix-shape sketch (option
-- (a), the option consistent with this phase's established pattern of live claim-time
-- re-checks rather than reset triggers), this fix makes the SAME choke point that already
-- freshly re-checks payment_status for the exclusion in one direction (due CTE:
-- `coalesce(b.payment_status,'') <> 'refunded'`) also freshly re-check it in the ability-
-- to-RESUME direction: a payment_refunded row is excluded from the terminal-set ONLY WHILE
-- the booking's CURRENT payment_status is still 'refunded'. The moment it flips away (back
-- to 'paid', or anything else), the row is no longer treated as a hard exclusion and the
-- booking becomes selectable again, exactly mirroring how R13's booking_cancelled guard
-- always re-evaluates fresh rather than being a frozen terminal marker.
--
-- Concretely: `not exists (... r.status in ('payment_refunded', ...))` becomes
-- `not exists (... r.status = 'payment_refunded' and current-payment-status-is-still-
-- refunded ...)` folded into the same not-exists subquery via a join back to bookings.
-- The other four terminal states (sent / pending_template_approval / invalid_phone_format /
-- booking_cancelled) are UNCHANGED and remain permanent, per their own established
-- semantics (a sent email cannot be un-sent; a cancelled/cap-hit/bad-phone booking has no
-- "un-happening" analogous to a payment reversal).
--
-- claim_booking_reminder mirrors the same live-conditional logic: its own `refunded` CTE
-- already reads bookings.payment_status fresh at claim time (this was ALREADY correct, per
-- R34 Vector 1's confirmation "the refund gate is architecturally independent of
-- booking_reminders_sent row state ... reads bookings.payment_status fresh via its own
-- CTE"). The residual bug was ONLY in the ON CONFLICT DO UPDATE branch: a row that is
-- ALREADY 'payment_refunded' matched neither WHEN clause (both guarded on
-- `booking_reminders_sent.status = 'pending'`) and fell to the else no-op, so re-claiming an
-- already-terminal payment_refunded row could never resume it even once get_due_booking_
-- reminders() (this migration) makes it selectable again. Fix: add a THIRD conflict branch
-- that flips an existing 'payment_refunded' row back to 'pending' the moment payment_status
-- is no longer 'refunded', so the SAME row can be re-claimed and re-resolved fresh (no new
-- row needed, consistent with how the cancel-guard's own no-op branch already leaves
-- already-terminal rows alone UNLESS the specific condition that matters changes).
--
-- ============================================================================
-- R34-2: claim_booking_reminder's RETURN signature carries attempt_count/status/
-- calendar_timezone only. customer_email/customer_phone/customer_name have no claim-time-
-- fresh mechanism (unlike payment_status R31 and calendar_timezone R28, both already fixed
-- at this exact choke point). The edge function reads r.customer_email/r.customer_phone/
-- r.customer_name from the SINGLE in-memory batch snapshot taken once at the top of the
-- invocation via get_due_booking_reminders(), with no second read of `bookings` anywhere in
-- the send path. An owner edit landing between the batch snapshot and the actual send (a
-- real, reproduced race, evidence/SEQ_P1_r35.md) delivers to the stale pre-edit
-- email/name/phone while the DB already holds the new values, and the row is marked the
-- SUCCESS terminal state 'sent' (no retry, no owner-visible failure signal).
--
-- Fix: fold customer_email, customer_phone, customer_name into claim_booking_reminder's
-- RETURN signature as claim-time-fresh reads, in the SAME fresh_tz-style CTE pattern R28
-- already established (a single extra join to `bookings` alone, since these three fields
-- live directly on the bookings row, not a joined table). The edge function must then
-- source these three fields from the claim result, not the batch-level `r` snapshot, per
-- R34's own precise fix-shape sketch (mirrors `tz` already being sourced from
-- `claim.calendar_timezone`, not `r.calendar_timezone`). business_name is intentionally
-- OUT OF SCOPE for this fix (R34's finding explicitly flagged it as lower-stakes/cosmetic,
-- not a delivery-destination field, "worth including... but not the core of the finding");
-- keeping this migration to the finding's actual scope, not gold-plating.
--
-- Both changes require DROP-then-CREATE (RETURNS TABLE shape changes: 4 new OUT columns),
-- same precedent as R28's own drop-then-create for the same function.
DROP FUNCTION IF EXISTS public.claim_booking_reminder(uuid, smallint);

CREATE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
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
  -- SEQP1R13: a booking is eligible only while confirmed, not soft-deleted, and still in
  -- the future -- otherwise the claim resolves to the terminal 'booking_cancelled' status.
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
    ) as ok
  ),
  -- SEQP1R31 (finding R30-1): a booking whose CURRENT payment_status = 'refunded' is
  -- claim-time-fresh EXCLUDED, independently of the status-based eligibility above.
  refunded as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and coalesce(b.payment_status, '') = 'refunded'
    ) as ok
  ),
  -- SEQP1R28: fresh calendar timezone, read at this exact claim moment.
  fresh_tz as (
    select coalesce(nullif(c.timezone, ''), 'Europe/Amsterdam') as tz
    from bookings b
    left join calendars c on c.id = b.calendar_id
    where b.id = p_booking_id
  ),
  -- SEQP1R35 (finding R34-2): fresh contact fields, read at this exact claim moment, same
  -- freshness point as fresh_tz above. Whatever the caller uses for the actual send MUST
  -- come from here, never from the batch-level get_due_booking_reminders() snapshot.
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
  on conflict (booking_id, reminder_number) do update
    -- On a retry (existing row). A CASE picks its FIRST matching branch and stops (Postgres
    -- does not "fall through" to later branches once one matches), so the resume branch
    -- below (1) resolves its OWN target state directly by re-checking `eligible` inline,
    -- rather than resolving to a bare 'pending' and relying on a later branch to catch a
    -- simultaneously-no-longer-eligible booking (self-review caught this: an earlier draft
    -- of this migration resolved a refund-reversed-but-ALSO-cancelled booking to a stale
    -- 'pending' instead of 'booking_cancelled', live-reproduced then fixed before commit,
    -- see evidence/SEQ_P1_r35.md).
    --  1. SEQP1R35 (finding R34-1): an existing 'payment_refunded' row whose booking's
    --     CURRENT payment_status is NO LONGER 'refunded' (a genuine re-payment / reversal-
    --     resolved) resumes -- to 'pending' if the booking is still status-eligible, or
    --     straight to 'booking_cancelled' if a cancellation/deletion/past-time ALSO landed
    --     while it was refunded, so it never becomes a falsely-retryable 'pending' row that
    --     the cancel-guard would otherwise never get a chance to catch. Never resumes to
    --     'payment_refunded' again here since this branch only matches when refunded=false.
    --  2. A still-open 'pending' row flips to 'payment_refunded' if the booking has since
    --     been refunded (checked before the cancel-guard, since a refund can land on a
    --     booking that is still 'confirmed').
    --  3. Else to 'booking_cancelled' if no longer status-eligible.
    --  4. Else left exactly as-is. sent / pending_template_approval / invalid_phone_format /
    --     booking_cancelled are NEVER touched by any of this (no branch below matches those
    --     starting states), remaining permanent terminal states exactly as before.
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
  returning
    attempt_count,
    status,
    (select tz from fresh_tz),
    (select email from fresh_contact),
    (select phone from fresh_contact),
    (select name from fresh_contact);
$function$;

COMMENT ON FUNCTION public.claim_booking_reminder(uuid, smallint) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R28/SEQP1R31/SEQP1R35: atomic claim-or-resume-retry of a reminder row. SEQP1R35 (R34-1): a payment_refunded row resumes to pending the moment the booking''s CURRENT payment_status is no longer refunded (live conditional, not a permanent ratchet). SEQP1R35 (R34-2): returns claim-time-fresh customer_email/customer_phone/customer_name (same freshness pattern as calendar_timezone, SEQP1R28) so the caller never sends to a batch-stale contact snapshot.';

REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

-- get_due_booking_reminders(): R34-1 fix. Return shape is UNCHANGED (still 11 columns), so
-- CREATE OR REPLACE is sufficient (matches precedent: a WHERE-clause/terminal-set change
-- alone does not require DROP unless the return shape changes, R31's own migration header).
-- The payment_refunded arm of the terminal-exclusion `not exists` is now conditional on the
-- SAME booking's payment_status still being 'refunded' at due-selection time (a join back to
-- bookings via r.booking_id = d.id, d already carries the booking row via the `due` CTE).
-- The other four terminal states are untouched (still an unconditional match on r.status).
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
      -- SEQP1R31 (finding R30-1): a currently-refunded booking never even enters the
      -- due-batch in the first place (defense in depth; claim_booking_reminder remains the
      -- authoritative claim-time-fresh gate for a refund landing mid-tick).
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
          -- SEQP1R35 (finding R34-1): payment_refunded blocks due-selection ONLY while the
          -- booking is STILL refunded right now. `due` already filters payment_status <>
          -- 'refunded' above, so in practice this arm can only match a row whose refund was
          -- reversed in the same instant as this query (a vanishingly narrow window); it is
          -- kept for defense-in-depth symmetry with claim_booking_reminder's own live check,
          -- and because a resumed 'pending' row (see claim fix) must NOT be re-blocked here
          -- by a leftover conflicting read. Once genuinely un-refunded, the row itself will
          -- already have been flipped back to 'pending' by claim_booking_reminder on the
          -- next claim, which is excluded from the exists-check by construction (r.status
          -- would then be 'pending', not 'payment_refunded').
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
          or (r.status = 'payment_refunded' and coalesce(d.payment_status, '') = 'refunded')
        )
    );
$f$;

COMMENT ON FUNCTION public.get_due_booking_reminders() IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25/SEQP1R31/SEQP1R35: due-reminder detection. Returns calendar_timezone (SEQP1R25) sourced from calendars.timezone. Excludes bookings whose CURRENT payment_status=''refunded'' from due-selection (SEQP1R31). SEQP1R35 (R34-1): payment_refunded is a LIVE conditional terminal exclusion, not permanent -- a payment_refunded row only blocks re-selection while the booking is STILL refunded right now, so a genuine re-payment resumes eligibility (the row itself resumes via claim_booking_reminder, this predicate just avoids blocking a stale read in the same instant).';

REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;
