-- SEQP1R13 (Sequenced Roadmap Phase 1, round 13): reminder LIFECYCLE correctness for the
-- two sev-3 races R12's adversarial close reproduced (findings ledger P1-5-CANCEL +
-- P1-5-RESCHED; evidence launch-ready-loop/evidence/SEQ_P1_r12.md vectors 4 + 3c). Both
-- live on the mutation-during-send path that P1-5's original "structural status filter"
-- proof did not cover: the filter in get_due_booking_reminders() only screens a cancel
-- BEFORE the get_due snapshot, never a cancel or a reschedule that lands AFTER it.
--
-- ============================================================================
-- FINDING P1-5-CANCEL (V4): cancel-during-send race
-- ============================================================================
-- process-booking-reminders/index.ts snapshots the due rows (get_due), then per row does
-- claim_booking_reminder -> external send -> record_booking_reminder_result. NOTHING between
-- the get_due snapshot and the actual Resend/Meta send re-checks bookings.status. A booking
-- cancelled in that window (customer cancels via WhatsApp, or the owner cancels in the
-- dashboard) still gets its reminder sent, and the row is marked 'sent'. Reproduced live in
-- R13: claim -> UPDATE bookings SET status='cancelled' -> record(delivered=true) yielded
-- booking_status=cancelled AND reminder_status=sent.
--
-- FIX (fold the guard into the DB choke point, atomic, as close to the send as possible,
-- NOT a scattered application-code patch):
--   1. claim_booking_reminder now JOINs bookings and checks the booking is still
--      reminder-eligible (status='confirmed' AND is_deleted=false AND start_time>now()) at
--      claim time. If not, it writes a DISTINCT terminal status 'booking_cancelled' (never
--      'sent', never left 'pending' to retry forever, never conflated with
--      pending_template_approval or invalid_phone_format -- matching the R9 precedent of a
--      distinct terminal reason) and returns it. The edge fn already does
--      `if (claim.status !== "pending") { skipped++; continue; }`, so it aborts the send.
--   2. record_booking_reminder_result re-checks the same active-status predicate in the SAME
--      atomic statement that would otherwise write 'sent'. If the booking is no longer active
--      at record time (cancelled AFTER a successful claim but before/around the send), it
--      writes 'booking_cancelled' instead of 'sent'. This is the tightest possible guard: the
--      re-check is evaluated by Postgres against the live bookings row at commit time, in the
--      very statement that commits the terminal state.
-- RESIDUAL (accepted sev-4, documented not over-engineered): the millisecond window between
-- record_booking_reminder_result reading bookings.status and an external HTTP send that has
-- ALREADY fired is fundamental to any external send -- once Resend/Meta has accepted the
-- message, no DB write can un-send it. We do not add a two-phase commit for a ms-wide,
-- self-limiting window; we make the DATA truthful (the row lands 'booking_cancelled', never a
-- false 'sent') and abort every send we still can (the claim guard catches the common
-- cancel-before-claim case entirely).
--
-- FAIL-CLOSED PRESERVED: 'booking_cancelled' is a terminal NON-success state. 'sent' is still
-- only ever written when p_delivered=true AND the booking is still active. Nothing here can
-- turn a real cancel into a false 'sent'.
--
-- ============================================================================
-- FINDING P1-5-RESCHED (V3c): reschedule-after-first-reminder-sent
-- ============================================================================
-- Once reminder_number=1 is status='sent', get_due's `not exists (... status in
-- ('sent',...))` clause blocks re-selection permanently. Rescheduling the booking to a new
-- day (or back into the first-reminder window) leaves that stale 'sent' row, so the first
-- reminder NEVER re-fires for the new start_time. Reproduced live in R13: reminder_1 sent,
-- reschedule to 40h out (inside the 60h window) -> get_due stays empty. The second reminder
-- retargets correctly (its own independent dedup row), but a single-reminder tenant, or the
-- first-reminder message itself, is left wrong.
--
-- INTENDED BEHAVIOR: when a booking's start_time changes, its reminders must re-evaluate
-- against the NEW time so the first (and any) reminder re-fires relative to the new
-- start_time. A customer who reschedules to a new day gets a fresh reminder for that new day.
--
-- FIX (single DB choke point that catches EVERY reschedule path -- dashboard edge fns,
-- whatsapp-agent tools, reschedule_booking_atomic, any future API -- rather than patching
-- each write site): an AFTER UPDATE trigger on bookings that, when start_time actually
-- changed AND the booking is in an active status, DELETES that booking's
-- booking_reminders_sent rows. Deleting (not flag-resetting) fully re-qualifies the booking
-- for a fresh reminder at the new time and keeps the dedup key semantics unchanged for the
-- normal (no-reschedule) path.
--
-- FORK (flagged to the orchestrator/council, NOT silently decided): resetting on EVERY
-- reschedule can over-remind a customer who reschedules many times in a row. DEFAULT taken
-- here = accept it: correct-for-the-new-time beats a missed reminder, and the get_due timing
-- window plus the send cadence naturally bound how often a reminder can actually re-fire. The
-- tradeoff is surfaced in the round digest for a human/council call; it is trivially tunable
-- later (e.g. only reset when the new start_time moved by more than the reminder window).
--
-- Trigger hygiene: fires ONLY when start_time is DISTINCT FROM the old value (a status-only
-- change, a customer_name edit, or a no-op UPDATE does NOT reset) AND the new status is
-- active ('confirmed'/'pending'), so cancelling a booking does not reset its reminders (the
-- cancel guard above already handles the cancel case, and a cancelled booking should not be
-- re-armed). reschedule_booking_atomic briefly flips status to 'cancelled' then back to the
-- original inside one transaction; the trigger sees the FINAL committed row (status restored,
-- start_time changed) so it fires exactly once with the correct end state.

-- ---------------------------------------------------------------------------
-- 1. Extend the status CHECK constraint with the new terminal value 'booking_cancelled'.
-- ---------------------------------------------------------------------------
alter table public.booking_reminders_sent
  drop constraint if exists booking_reminders_sent_status_check;
alter table public.booking_reminders_sent
  add constraint booking_reminders_sent_status_check
  check (status in ('sent', 'pending', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled'));

comment on column public.booking_reminders_sent.status is
  'SEQP1R3/SEQP1R9/SEQP1R13: sent = actually delivered (terminal success, fail-closed invariant: only set on a real successful send while the booking is still active). pending = claimed, not yet delivered, still under the retry cap, will be retried by the next due cron tick. pending_template_approval = retry cap reached (see index.ts WHATSAPP_REMINDER_MAX_ATTEMPTS), root cause is the outstanding Meta WhatsApp template approval; terminal-until-human-action. invalid_phone_format = the WhatsApp send was refused before ever reaching Meta because customer_phone could not be confidently normalized (see _shared/whatsappSend.ts normalizePhoneForMeta); reached in ONE attempt, terminal until the phone data is corrected. booking_cancelled = the booking was cancelled/deleted/moved to the past between the get_due snapshot and the send (SEQP1R13, cancel-during-send race P1-5-CANCEL); the reminder was NOT sent (or, in the ms-wide residual after an external send already fired, is recorded truthfully as cancelled rather than a false ''sent''); terminal, distinct from the other three so the cancel case is never conflated with a Meta-approval wait or a phone-format problem.';

-- ---------------------------------------------------------------------------
-- 2. claim_booking_reminder: fold the active-booking guard into the atomic claim.
--    Returns 'booking_cancelled' (terminal) if the booking is no longer reminder-eligible,
--    so the edge fn's existing `claim.status !== "pending"` short-circuit aborts the send.
--    Body-only change; same signature, so create-or-replace preserves nothing about grants
--    on its own -- we re-assert them below (R46 class) regardless.
-- ---------------------------------------------------------------------------
create or replace function public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
returns table(attempt_count integer, status text)
language sql security definer set search_path to 'public' as $f$
  -- SEQP1R13: compute the booking's current reminder-eligibility ONCE, atomically, as part
  -- of the same statement that claims/updates the reminder row. A booking is eligible only
  -- while it is confirmed, not soft-deleted, and still in the future. Any other state
  -- (cancelled, deleted, moved to the past) makes the claim resolve to the terminal
  -- 'booking_cancelled' status instead of a retryable 'pending', so the caller aborts the
  -- send. Postgres row-level locking on the ON CONFLICT target still serializes concurrent
  -- cron ticks; the booking read is a consistent snapshot within this statement.
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
    ) as ok
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
  returning attempt_count, status;
$f$;

comment on function public.claim_booking_reminder(uuid, smallint) is
  'SEQP1R3/SEQP1R13: atomic claim-or-read-existing-claim for a due reminder, with an active-booking guard folded in (P1-5-CANCEL). Single INSERT ... ON CONFLICT statement so Postgres row-level locking serializes concurrent cron ticks on the same (booking_id, reminder_number). If the booking is no longer reminder-eligible (not confirmed / soft-deleted / start_time in the past) at claim time, the row resolves to the terminal ''booking_cancelled'' status (fresh, or by flipping an open ''pending'' row) so the caller aborts the send; otherwise returns the row''s current attempt_count/status (freshly claimed at 0, or an existing pending claim at its real count).';

-- ---------------------------------------------------------------------------
-- 3. record_booking_reminder_result: re-check the SAME active-booking predicate in the SAME
--    atomic write, so a cancel that lands after a successful claim but around the send does
--    not produce a false 'sent'. Signature unchanged (still the 5-arg SEQP1R9 form).
-- ---------------------------------------------------------------------------
create or replace function public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer,
  p_failure_reason text default null
)
returns table(attempt_count integer, status text)
language sql security definer set search_path to 'public' as $f$
  -- SEQP1R13: recompute reminder-eligibility against the LIVE bookings row at commit time.
  -- If the booking is no longer active, a p_delivered=true outcome is recorded as the
  -- terminal 'booking_cancelled' rather than a false 'sent' (cancel-during-send residual,
  -- P1-5-CANCEL). This is evaluated by Postgres in this statement, the tightest guard the
  -- data model allows; the only remaining window is the ms between this read and an external
  -- send that already fired, which is accepted and documented (no two-phase commit).
  with eligible as (
    select exists (
      select 1 from bookings b
      where b.id = p_booking_id
        and b.status = 'confirmed'
        and coalesce(b.is_deleted, false) = false
        and b.start_time > now()
    ) as ok
  )
  update booking_reminders_sent
  set status = case
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
    -- must not reopen or reclassify sent / invalid_phone_format / booking_cancelled.
    and status not in ('sent', 'invalid_phone_format', 'booking_cancelled')
  returning attempt_count, status;
$f$;

comment on function public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) is
  'SEQP1R3/SEQP1R9/SEQP1R13: atomic single-statement write of a reminder send outcome, with a live active-booking re-check (P1-5-CANCEL). attempt_count = attempt_count + 1 is evaluated against the live row at commit time so concurrent invocations cannot lose an increment. A p_delivered=true outcome is recorded ''sent'' ONLY if the booking is still active (confirmed / not deleted / future) at commit time, otherwise ''booking_cancelled'' -- never a false ''sent'' for a cancelled booking. Filters out already-terminal (sent / invalid_phone_format / booking_cancelled) rows so a stale/duplicate result can never revert them. This is the ONLY function that ever sets status=sent, pending_template_approval, invalid_phone_format, or booking_cancelled (the last also settable by claim_booking_reminder''s guard).';

-- ---------------------------------------------------------------------------
-- 4. get_due_booking_reminders(): 'booking_cancelled' joins the other terminal statuses so a
--    cancelled-out reminder row stops being re-selected as due. Body-only change, same
--    signature. (A cancelled booking is already excluded by the status='confirmed' filter in
--    the CTE, so this mainly matters for a booking that was cancelled, its reminder terminal-
--    marked, and then somehow re-confirmed without a reschedule: the terminal row still
--    blocks a duplicate. A reschedule DELETES the rows via the trigger below, so a genuinely
--    re-armed booking gets a clean slate rather than being blocked by an old terminal row.)
-- ---------------------------------------------------------------------------
create or replace function public.get_due_booking_reminders()
returns table(
  booking_id uuid,
  reminder_number smallint,
  channel text,
  customer_email text,
  customer_phone text,
  customer_name text,
  customer_locale text,
  start_time timestamptz,
  business_name text,
  calendar_id uuid
)
language sql security definer set search_path to 'public' as $f$
  with due as (
    select b.id, b.customer_email, b.customer_phone, b.customer_name, b.customer_locale,
           b.start_time, b.calendar_id,
           cs.first_reminder_enabled, cs.first_reminder_timing_hours,
           cs.second_reminder_enabled, cs.second_reminder_timing_minutes,
           coalesce(bo.business_name, 'het bedrijf') as business_name,
           case
             when b.customer_email is not null and b.customer_email <> '' then 'email'
             when b.customer_phone is not null and b.customer_phone <> '' then 'whatsapp'
             else null
           end as channel,
           case when lower(coalesce(b.customer_locale, 'nl')) = 'en' then 'en' else 'nl' end as locale_norm
    from bookings b
    join calendar_settings cs on cs.calendar_id = b.calendar_id
    left join business_overview bo on bo.calendar_id = b.calendar_id
    where b.status = 'confirmed' and coalesce(b.is_deleted, false) = false
      and b.start_time > now()
      and (
        (b.customer_email is not null and b.customer_email <> '')
        or (b.customer_phone is not null and b.customer_phone <> '')
      )
  )
  select d.id, 1::smallint, d.channel, d.customer_email, d.customer_phone, d.customer_name,
         d.locale_norm, d.start_time, d.business_name, d.calendar_id
  from due d
  where d.channel is not null
    and d.first_reminder_enabled
    and d.start_time <= now() + make_interval(hours => d.first_reminder_timing_hours)
    -- SEQP1R13: booking_cancelled joins sent / pending_template_approval / invalid_phone_format
    -- as a terminal status that blocks re-selection (a 'pending' row under the retry cap is
    -- still eligible).
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 1
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
    )
  union all
  select d.id, 2::smallint, d.channel, d.customer_email, d.customer_phone, d.customer_name,
         d.locale_norm, d.start_time, d.business_name, d.calendar_id
  from due d
  where d.channel is not null
    and d.second_reminder_enabled
    and d.start_time <= now() + make_interval(mins => d.second_reminder_timing_minutes)
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 2
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
    );
$f$;

-- ---------------------------------------------------------------------------
-- 5. Reschedule reset: AFTER UPDATE trigger on bookings that clears the booking's reminder
--    rows when start_time actually changed and the booking is still active (P1-5-RESCHED).
-- ---------------------------------------------------------------------------
create or replace function public.reset_reminders_on_reschedule()
returns trigger
language plpgsql security definer set search_path to 'public' as $f$
begin
  -- Only re-arm reminders for a booking that is still in an active status after the move.
  -- A cancel (status not confirmed/pending) is intentionally NOT re-armed here: the cancel
  -- guard in claim/record already prevents a cancelled booking from sending, and re-arming a
  -- cancelled booking would be wrong.
  if new.status in ('confirmed', 'pending') then
    delete from public.booking_reminders_sent where booking_id = new.id;
  end if;
  return null; -- AFTER trigger: return value ignored
end;
$f$;

comment on function public.reset_reminders_on_reschedule() is
  'SEQP1R13 (P1-5-RESCHED): when a booking''s start_time changes (see the WHEN clause on trg_reset_reminders_on_reschedule), delete its booking_reminders_sent rows so every reminder re-evaluates against the NEW start_time. Single choke point for every reschedule path (dashboard, whatsapp-agent, reschedule_booking_atomic, any future API). Only re-arms an active booking (confirmed/pending); does not touch a cancelled booking''s rows.';

-- The WHEN clause is the real gate: fire ONLY when start_time is DISTINCT FROM the old value.
-- `IS DISTINCT FROM` is null-safe and treats an equal value as no change, so a status-only
-- change, a customer_name edit, or a no-op UPDATE (same start_time) does NOT fire the trigger
-- at all -- no wasted DELETE, no accidental reset. Placed as its own trigger (not folded into
-- an existing one) so its intent is explicit and independently auditable.
drop trigger if exists trg_reset_reminders_on_reschedule on public.bookings;
create trigger trg_reset_reminders_on_reschedule
  after update on public.bookings
  for each row
  when (old.start_time is distinct from new.start_time)
  execute function public.reset_reminders_on_reschedule();

-- ---------------------------------------------------------------------------
-- 6. R46-class grant re-assertion. `create or replace function` on the three reminder RPCs
--    resets their grants to the Postgres schema default (EXECUTE to PUBLIC). These are
--    service-role-only functions (get_due is a cross-tenant PII read; claim/record mutate the
--    reminder ledger). Re-assert the exact locked posture so this migration cannot silently
--    reopen the R46 anon-reachable cross-tenant read on replay (fresh DB / db reset).
--    reset_reminders_on_reschedule() is a trigger function (never called directly by a
--    client) but is SECURITY DEFINER, so lock its EXECUTE down too for defense in depth.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.reset_reminders_on_reschedule() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_reminders_on_reschedule() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reset_reminders_on_reschedule() FROM authenticated;
