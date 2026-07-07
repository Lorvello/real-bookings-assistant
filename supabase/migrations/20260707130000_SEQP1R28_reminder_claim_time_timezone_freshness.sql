-- SEQP1R28: fix finding R27-1 (calendar-timezone batch-snapshot staleness).
--
-- get_due_booking_reminders() (SEQP1R25/R24-1 fix) already reads calendars.timezone fresh
-- and correctly at the moment the due-batch is snapshotted. The residual bug: the edge
-- function (process-booking-reminders/index.ts) reads that ONE snapshot at the top of an
-- invocation and then iterates it, so a batch with 2+ due reminders across different
-- calendars can take multiple real seconds (Resend round-trips). If the owner edits
-- calendars.timezone mid-batch (a real, owner-writable column via the Availability page),
-- every row processed AFTER the edit but sourced from the stale in-memory snapshot still
-- renders with the OLD timezone, even though the DB has already committed the new one.
--
-- Fix at the SAME structural choke point SEQP1R13 used for the analogous "a batch-level
-- read goes stale before the real per-item action" problem (there: bookings.status/
-- is_deleted/start_time; here: calendars.timezone): claim_booking_reminder already
-- atomically re-reads the live bookings row, in its own statement, at the exact moment
-- each individual item is about to be processed (immediately before formatDate/send, one
-- claim per item, never batched). Folding a fresh calendar_timezone lookup into that SAME
-- eligible CTE/statement makes claim-time freshness the single authoritative source for
-- BOTH status and timezone, closing the exact same class of staleness for both.
--
-- record_booking_reminder_result is NOT touched: it runs after the send has already been
-- attempted with whatever tz claim_booking_reminder returned, so there is nothing further
-- for it to refresh; the send already used the freshest value obtainable at send time.
-- Return shape changes (adds calendar_timezone as an OUT column); Postgres requires DROP
-- before CREATE for an OUT-parameter signature change (same precedent as the R25
-- get_due_booking_reminders() drop-then-create).
DROP FUNCTION IF EXISTS public.claim_booking_reminder(uuid, smallint);

CREATE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
 RETURNS TABLE(attempt_count integer, status text, calendar_timezone text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- SEQP1R13: compute the booking's current reminder-eligibility ONCE, atomically, as part
  -- of the same statement that claims/updates the reminder row. A booking is eligible only
  -- while it is confirmed, not soft-deleted, and still in the future. Any other state
  -- (cancelled, deleted, moved to the past) makes the claim resolve to the terminal
  -- 'booking_cancelled' status instead of a retryable 'pending', so the caller aborts the
  -- send. Postgres row-level locking on the ON CONFLICT target still serializes concurrent
  -- cron ticks; the booking read is a consistent snapshot within this statement.
  --
  -- SEQP1R28 (finding R27-1): in the SAME snapshot, also read the booking's calendar's
  -- CURRENT timezone (a fresh join, evaluated at this exact claim moment, not at whatever
  -- earlier instant get_due_booking_reminders() ran). This is the single per-item freshness
  -- point the caller must use for formatDate/send, replacing the batch-level value carried
  -- in the get_due_booking_reminders() snapshot. coalesce/nullif mirrors R25's own
  -- null/empty-safe default so an unset or blank timezone still resolves to
  -- Europe/Amsterdam, exactly as the batch-level RPC already does.
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
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
         case when e.ok then 'pending' else 'booking_cancelled' end, 0
  from eligible e
  on conflict (booking_id, reminder_number) do update
    -- On a retry (existing row): if the booking is no longer eligible, flip a still-open
    -- 'pending' row to the terminal 'booking_cancelled' so it stops being retried; never
    -- touch an already-terminal row (sent / pending_template_approval / invalid_phone_format
    -- / booking_cancelled). If the booking is still eligible, keep the row exactly as it was
    -- (no-op self-assignment, so RETURNING reflects the real current attempt_count/status).
    set status = case
          when (select ok from eligible) = false
               and booking_reminders_sent.status = 'pending'
            then 'booking_cancelled'
          else booking_reminders_sent.status
        end
  returning attempt_count, status, (select tz from fresh_tz);
$function$;

-- Re-assert R46-class grants (recreated via CREATE OR REPLACE, signature/return-shape
-- changed): service_role only, no PUBLIC/anon/authenticated EXECUTE.
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;
