-- SEQP1R42: fix R41-1 (claim concurrency regression), reproduced live twice at
-- launch-ready-loop/evidence/SEQ_P1_r41.md and re-reproduced fresh this round (both via the
-- real deployed edge function on the email channel and via 5 truly concurrent direct RPC
-- calls to claim_booking_reminder itself), evidence/SEQ_P1_r42.md.
--
-- ROOT CAUSE (confirmed by reading the LIVE function body via pg_get_functiondef before
-- writing this fix, not by trusting the migration history alone): claim_booking_reminder is
-- an `INSERT ... ON CONFLICT (booking_id, reminder_number) DO UPDATE ... RETURNING`. This is
-- intentionally RE-CLAIMABLE (required by the existing bounded-retry design: a row that
-- failed and rolled back to 'pending' must be claimable again on a LATER cron tick). But the
-- DO UPDATE's status CASE has no branch that treats "current status is already 'pending'" as
-- anything other than `else booking_reminders_sent.status` -- a no-op write that still
-- satisfies RETURNING. So if invocation A claims a row (status -> 'pending') and, before A
-- calls record_booking_reminder_result, a genuinely concurrent invocation B also calls
-- claim_booking_reminder for the SAME row, B's ON CONFLICT DO UPDATE re-evaluates against the
-- still-'pending' row, matches the same ELSE branch, and B ALSO gets back a valid-looking
-- 'pending' claim. Both A and B then pass index.ts's `if (claim.status !== "pending") skip`
-- check and both attempt REAL delivery -- a genuine duplicate customer-facing send, even
-- though the DB bookkeeping ends up looking perfectly clean (exactly one row, one sent_at),
-- which is exactly why this survived nine prior adversarial-close attempts: every earlier
-- concurrency proof (P1-4/R2, R3, R18, R23, R40) tested N DIFFERENT bookings processed
-- concurrently, never 2+ genuinely simultaneous claims racing the SAME
-- (booking_id, reminder_number) row while it sits non-terminal.
--
-- FIX SHAPE: add a `claimed_at` lease timestamp and gate the ON CONFLICT DO UPDATE with a
-- WHERE clause that excludes ONLY the new problematic case (row already 'pending' AND
-- recently claimed, i.e. genuinely in-flight right now), leaving every other existing
-- transition (payment-refunded resume/downgrade from R31/R34, the fresh-offset decline from
-- R37-2, terminal-state no-ops) reachable exactly as before. This is still a SINGLE atomic
-- statement: Postgres serializes concurrent INSERTs on the same conflicting key (one blocks
-- until the other's transaction resolves) and concurrent ON CONFLICT DO UPDATEs on the same
-- row (each re-evaluates its WHERE against the CURRENT, just-committed row data after
-- acquiring the row lock) -- so whichever caller is first in the true commit order sees
-- claimed_at NULL/stale and wins; every other concurrent caller, once it re-checks after the
-- winner commits, sees a freshly-set claimed_at and its WHERE clause fails, yielding ZERO
-- rows (the exact "not a duplicate claim, not an error, just correctly excluded" outcome
-- required). No edge-function code changes are needed: index.ts already treats a zero-row
-- claim result as a clean skip (`if (!claimRows || claimRows.length === 0) { skipped++; }`).
--
-- LEASE WINDOW = 3 minutes: comfortably shorter than the 5-minute cron cadence (so a claim
-- whose invocation genuinely crashed before ever calling record_booking_reminder_result
-- self-heals and becomes reclaimable on the very next real tick, never stranding a reminder
-- forever) and comfortably longer than any realistic single-item send duration (R38's own
-- measurements: ~277-306ms/item including a live Stripe check with a 4000ms timeout; even a
-- large multi-item batch stays well under a minute). record_booking_reminder_result is NOT
-- touched by this migration: on a genuine retryable failure it already sets status back to
-- 'pending' without knowing about claimed_at, and the stale claimed_at from the earlier
-- attempt is, by construction, always well past the 3-minute lease by the time the NEXT cron
-- tick (5 minutes later) runs, so no reset is needed for the existing retry path to keep
-- working.
ALTER TABLE public.booking_reminders_sent ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

COMMENT ON COLUMN public.booking_reminders_sent.claimed_at IS
  'SEQP1R42: lease timestamp set by claim_booking_reminder whenever a claim resolves to (or resumes to) ''pending''. Used purely as a short in-flight mutual-exclusion window (3 minutes) so a genuinely concurrent second claim on the same (booking_id, reminder_number) row is correctly excluded instead of also receiving a valid-looking ''pending'' result. Not read anywhere else; a stale value is harmless and self-heals across cron ticks.';

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
  -- (not whatever was live at the original batch snapshot). Unchanged by this migration.
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
  insert into booking_reminders_sent (booking_id, reminder_number, status, attempt_count, claimed_at)
  select p_booking_id, p_reminder_number,
         case
           when (select ok from refunded) then 'payment_refunded'
           when e.ok then 'pending'
           else 'booking_cancelled'
         end, 0,
         -- SEQP1R42: a brand-new row landing on 'pending' is claimed immediately (this IS the
         -- winning claim for a genuinely fresh row); any other outcome leaves claimed_at null
         -- (harmless -- it only matters for rows sitting at 'pending').
         case when not (select ok from refunded) and e.ok then now() else null end
  from eligible e
  -- SEQP1R38 (R37-2): unchanged, a fresh INSERT is only made when the booking is CURRENTLY
  -- due under today's offset settings.
  where coalesce((select ok from fresh_offset), false) = true
  on conflict (booking_id, reminder_number) do update
    set status = case
          -- Every branch below is UNCHANGED from SEQP1R38: the same payment-refunded
          -- resume/downgrade (R34-1) and refund/ineligible downgrade (R31/R13) transitions,
          -- reachable under the exact same conditions as before this migration.
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
        end,
        -- SEQP1R42: set the lease the moment a row resolves to (or stays/resumes at)
        -- 'pending' -- i.e. exactly the outcomes from which index.ts will attempt a real
        -- send. Every other outcome (a downgrade to booking_cancelled, or any terminal state
        -- left untouched by the ELSE above) leaves claimed_at exactly as it was.
        claimed_at = case
          when (select ok from refunded) = false
               and (select ok from eligible) = true
               and booking_reminders_sent.status in ('pending', 'payment_refunded')
            then now()
          else booking_reminders_sent.claimed_at
        end
    where coalesce((select ok from fresh_offset), false) = true
      -- SEQP1R42 (fix for R41-1): this is the ONLY new exclusion. Every other pre-existing
      -- transition above remains reachable under the exact same conditions as before; this
      -- clause blocks precisely the case that caused the double-claim -- a row that is
      -- ALREADY 'pending' AND was claimed within the last 3 minutes (genuinely in-flight
      -- right now, not a legitimate later-tick retry). A concurrent caller hitting this
      -- excluded case gets zero rows back from the whole statement (RETURNING yields
      -- nothing for this row), which index.ts's existing zero-row handling already treats as
      -- a clean skip.
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
    (select name from fresh_contact);
$function$;

COMMENT ON FUNCTION public.claim_booking_reminder(uuid, smallint) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R28/SEQP1R31/SEQP1R35/SEQP1R38/SEQP1R42: atomic claim-or-resume-retry of a reminder row. SEQP1R42 (fix for R41-1): adds a claimed_at lease (3 minutes) so 2+ genuinely concurrent claims on the SAME (booking_id, reminder_number) row correctly yield exactly one winning ''pending'' claim and zero rows for every other concurrent caller, instead of every concurrent caller previously receiving an equally-valid-looking ''pending'' result (a real duplicate-send risk). Also still carries SEQP1R38''s claim-time offset freshness, SEQP1R35''s contact freshness, SEQP1R31''s refund gate, and SEQP1R28''s timezone freshness, all unchanged.';

-- CREATE OR REPLACE FUNCTION silently resets grants to Postgres defaults (a real regression
-- this exact function family has hit before, see SEQP1R3's build-round note and every
-- migration since). Re-assert explicitly, unchanged from every prior migration in this
-- series.
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;
