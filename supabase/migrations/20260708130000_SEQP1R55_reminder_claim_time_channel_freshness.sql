-- SEQP1R55: fix finding R54-1 (reopened), reproduced live launch-ready-loop/evidence/SEQ_P1_r54.md
-- and re-reproduced fresh this round, evidence/SEQ_P1_r55.md. Extends the SAME claim-time-fresh
-- pattern R28 (calendar_timezone), R31 (payment_status), R35 (contact fields), and R38 (offsets)
-- already established at this exact choke point to a fifth field: the CHANNEL a reminder is
-- actually routed through (email vs whatsapp).
--
-- ============================================================================
-- Main finding (R54-1): claim_booking_reminder's RETURN signature has no channel column at
-- all. process-booking-reminders/index.ts decides email-vs-whatsapp purely from
-- `r.channel`, the once-per-invocation get_due_booking_reminders() batch snapshot, never
-- re-derived at claim time. A booking that flips its reachable contact channel (email
-- removed, phone added, or vice versa) between the batch snapshot and its own claim still
-- gets routed through the STALE channel at send time, via the existing R35 fallback logic
-- that surfaces the old snapshot value whenever the corresponding fresh field happens to be
-- empty. Fix: fold a `channel` column into claim_booking_reminder's RETURN signature, derived
-- claim-time-fresh from the SAME bookings row the existing fresh_contact CTE already reads
-- (a booking with a non-empty customer_email is 'email', else a non-empty customer_phone is
-- 'whatsapp', else null -- exactly get_due_booking_reminders()'s own channel derivation,
-- kept in lockstep so both functions agree on what "the channel" means for a given contact
-- state). process-booking-reminders/index.ts must source the channel decision from this
-- claim result, not from the batch snapshot, mirroring how `tz`/`customerEmail`/
-- `customerPhone`/`customerName` were already re-pointed at `claim.*` in R28/R35.
--
-- ============================================================================
-- Sibling finding (display-only, same root cause, logged in R54's "vectors checked" section
-- rather than reopened separately): the dashboard's useReminderActivity hook derives its
-- channel icon from the booking's CURRENT contact state on every render
-- (`row.bookings?.customer_email ? 'email' : 'whatsapp'`), not from the channel that was
-- actually used at send time, so a contact edit made AFTER a real send retroactively
-- mislabels that past send in the owner-facing UI. Fix: add a `channel` column directly on
-- booking_reminders_sent so the channel actually attempted for a given reminder attempt is
-- persisted once and never re-derived from current, mutable state. Populated at claim time
-- (the intended channel for this attempt) and re-affirmed by record_booking_reminder_result
-- at outcome time (the channel actually attempted for the delivery that just happened),
-- exactly mirroring how attempt_count/status are both touched at claim and at result-write.
--
-- DROP-then-CREATE for claim_booking_reminder: RETURNS TABLE shape changes (1 new OUT
-- column), same precedent as R28's and R35's own drop-then-create for the same function.

-- New column: nullable (older, pre-fix rows have none), constrained to the two real
-- channel values only when present, same ARRAY-CHECK style as the existing status/
-- reminder_number constraints on this table.
ALTER TABLE public.booking_reminders_sent
  ADD COLUMN IF NOT EXISTS channel text;

ALTER TABLE public.booking_reminders_sent
  ADD CONSTRAINT booking_reminders_sent_channel_check
  CHECK (channel IS NULL OR channel = ANY (ARRAY['email'::text, 'whatsapp'::text]));

DROP FUNCTION IF EXISTS public.claim_booking_reminder(uuid, smallint);

CREATE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
 RETURNS TABLE(
   attempt_count integer,
   status text,
   calendar_timezone text,
   customer_email text,
   customer_phone text,
   customer_name text,
   channel text
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
  no_contact as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and coalesce(b.customer_email, '') = ''
        and coalesce(b.customer_phone, '') = ''
    ) as ok
  ),
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
  ),
  -- SEQP1R55 (finding R54-1): the fifth claim-time-fresh field. Reads the SAME bookings row
  -- fresh_contact already reads, so this can never disagree with the fresh email/phone this
  -- same claim just returned. Mirrors get_due_booking_reminders()'s own channel derivation
  -- exactly (email takes priority when both are present, matching that function's `case`).
  fresh_channel as (
    select case
      when b.customer_email is not null and b.customer_email <> '' then 'email'
      when b.customer_phone is not null and b.customer_phone <> '' then 'whatsapp'
      else null
    end as ch
    from bookings b
    where b.id = p_booking_id
  )
  insert into booking_reminders_sent (booking_id, reminder_number, status, attempt_count, claimed_at, channel)
  select p_booking_id, p_reminder_number,
         case
           when (select ok from refunded) then 'payment_refunded'
           when not (select ok from eligible) then 'booking_cancelled'
           when (select ok from no_contact) then 'no_contact_info'
           else 'pending'
         end, 0,
         case when not (select ok from refunded) and (select ok from eligible) and not (select ok from no_contact) then now() else null end,
         (select ch from fresh_channel)
  from eligible e
  where coalesce((select ok from fresh_offset), false) = true
  on conflict (booking_id, reminder_number) do update
    set status = case
          when booking_reminders_sent.status = 'payment_refunded'
               and (select ok from refunded) = false
               and (select ok from eligible) = true
               and (select ok from no_contact) = false
            then 'pending'
          when booking_reminders_sent.status = 'payment_refunded'
               and (select ok from refunded) = false
               and (select ok from eligible) = true
               and (select ok from no_contact) = true
            then 'no_contact_info'
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
          when (select ok from no_contact) = true
               and (select ok from refunded) = false
               and (select ok from eligible) = true
               and booking_reminders_sent.status = 'pending'
            then 'no_contact_info'
          else booking_reminders_sent.status
        end,
        claimed_at = case
          when (select ok from refunded) = false
               and (select ok from eligible) = true
               and booking_reminders_sent.status in ('pending', 'payment_refunded')
            then now()
          else booking_reminders_sent.claimed_at
        end,
        -- SEQP1R55: the intended channel is always re-affirmed on every claim, regardless of
        -- which status branch fires above, so a row never carries a stale channel value from
        -- an earlier claim once a fresher one is available. record_booking_reminder_result
        -- (called next, after the actual send attempt) has the final say on the channel that
        -- was truly attempted for THIS outcome; this claim-time value is the best-known intent
        -- going into that attempt, and is also all a row gets if the claim itself resolves to
        -- a terminal, unsendable status (e.g. booking_cancelled) where no send is ever attempted.
        channel = (select ch from fresh_channel)
    where coalesce((select ok from fresh_offset), false) = true
      and not (
        booking_reminders_sent.status = 'pending'
        and booking_reminders_sent.claimed_at is not null
        and booking_reminders_sent.claimed_at > now() - interval '3 minutes'
      )
  returning
    attempt_count,
    status,
    (select tz from fresh_tz),
    (select email from fresh_contact),
    (select phone from fresh_contact),
    (select name from fresh_contact),
    (select ch from fresh_channel);
$function$;

-- record_booking_reminder_result: add an optional p_channel parameter so the edge function
-- can re-affirm, at outcome time, the channel that was ACTUALLY attempted for this specific
-- delivery (the value the app code resolved from claim.channel with its defensive fallback).
-- Backward-compatible default of NULL: a call that omits it (there should be none after the
-- edge-function update, but this keeps the RPC signature non-breaking) leaves the existing
-- channel value untouched rather than clobbering it with NULL.
DROP FUNCTION IF EXISTS public.record_booking_reminder_result(uuid, smallint, boolean, integer, text);

CREATE FUNCTION public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer,
  p_failure_reason text DEFAULT NULL::text,
  p_channel text DEFAULT NULL::text
)
 RETURNS TABLE(attempt_count integer, status text)
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
  )
  update booking_reminders_sent
  set status = case
        when (select ok from refunded) then 'payment_refunded'
        when p_failure_reason = 'stripe_refund_confirmed' then 'payment_refunded'
        when p_delivered and (select ok from eligible) then 'sent'
        when p_delivered and not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'invalid_phone_format' then 'invalid_phone_format'
        when not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'stripe_check_failed' and attempt_count + 1 >= p_max_attempts then 'stripe_check_failed'
        when p_failure_reason = 'email_send_failed' and attempt_count + 1 >= p_max_attempts then 'email_send_failed'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end,
      -- SEQP1R55: re-affirm the channel actually attempted for THIS outcome. coalesce guards
      -- a call that omits p_channel (kept non-breaking), never overwriting a real, already-
      -- persisted channel value with NULL.
      channel = coalesce(p_channel, channel)
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    and status not in ('sent', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded', 'stripe_check_failed', 'email_send_failed')
  returning attempt_count, status;
$function$;
