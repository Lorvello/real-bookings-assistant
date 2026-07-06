-- SEQP1R3 (Sequenced Roadmap Phase 1, round 3): bounded retry + visible state for
-- WhatsApp-origin (no-email) reminders.
--
-- BUG (P1-6, reproduced live in round 2 with a real phone-only test booking):
-- sendWhatsAppReminder in process-booking-reminders/index.ts fails closed correctly
-- (never falsely marks a gated WhatsApp reminder as sent), but the "release the claim on
-- failure" policy means a phone-only customer's reminder is retried by the cron every
-- 5 minutes FOREVER while the Meta business-initiated template stays unapproved, with the
-- only trace being an unwatched console.warn line. Nobody (owner or Mathew) can see this is
-- happening, and it never converges to any terminal state.
--
-- FIX. Turn booking_reminders_sent from a pure "did this fire" dedup log into a real
-- per-attempt status record:
--   - status: 'sent' (delivered for real, terminal-success), 'pending' (claimed, not yet
--     delivered, still under the retry cap, will be retried), 'pending_template_approval'
--     (retry cap reached, root cause is the outstanding Meta template approval, terminal
--     until a human unblocks it -- NOT silently dropped, NOT falsely marked sent, genuinely
--     DB-queryable so a future dashboard card or a direct SQL check can see it).
--   - attempt_count: how many times a send was attempted for this (booking_id,
--     reminder_number). Starts at 1 on first claim, increments on every subsequent failed
--     attempt. Capped at WHATSAPP_REMINDER_MAX_ATTEMPTS (12, enforced in index.ts) --
--     documented there since the retry loop lives in application code, not SQL.
--
-- Retry cap reasoning (12 attempts at the existing */5 * * * * cron cadence = 1 hour of
-- active retrying): reminders fire on a schedule relative to start_time (hours/minutes
-- before the appointment), so retrying every 5 minutes for hours or days has no value --
-- if a Meta template hasn't been approved within an hour of the first attempt, that is
-- not a transient blip, it is the standing human-gate. Parking it in
-- 'pending_template_approval' after 1 hour stops it consuming cron cycles/DB writes for
-- the rest of the booking's lifetime while keeping it visible and re-activatable the
-- moment the template is approved and the live send path is wired (a future migration or
-- manual UPDATE can simply flip capped rows back to 'pending' to give them a fresh window).
--
-- FAIL-CLOSED GUARANTEE PRESERVED: 'sent' is set ONLY on an actual successful delivery
-- (email accepted by Resend, or a real WhatsApp send once wired). Nothing in this change
-- ever sets 'sent' on a failed/gated attempt. A capped reminder becomes
-- 'pending_template_approval', never 'sent' and never deleted.

-- 1. New columns. status defaults to 'sent' so every EXISTING row (all of which represent
--    actual past successful sends under the old all-or-nothing claim model) is
--    byte-correct with no backfill needed. attempt_count defaults to 1 (existing rows were
--    a single successful attempt).
alter table public.booking_reminders_sent
  add column if not exists status text not null default 'sent',
  add column if not exists attempt_count integer not null default 1;

alter table public.booking_reminders_sent
  drop constraint if exists booking_reminders_sent_status_check;
alter table public.booking_reminders_sent
  add constraint booking_reminders_sent_status_check
  check (status in ('sent', 'pending', 'pending_template_approval'));

alter table public.booking_reminders_sent
  drop constraint if exists booking_reminders_sent_attempt_count_check;
alter table public.booking_reminders_sent
  add constraint booking_reminders_sent_attempt_count_check
  check (attempt_count >= 0);

comment on column public.booking_reminders_sent.status is
  'SEQP1R3: sent = actually delivered (terminal success, fail-closed invariant: only set on a real successful send). pending = claimed, not yet delivered, still under the retry cap, will be retried by the next due cron tick. pending_template_approval = retry cap reached (see index.ts WHATSAPP_REMINDER_MAX_ATTEMPTS), root cause is the outstanding Meta WhatsApp template approval; terminal-until-human-action, genuinely queryable, never silently dropped.';
comment on column public.booking_reminders_sent.attempt_count is
  'SEQP1R3: number of send attempts made so far for this (booking_id, reminder_number). 0 on initial claim (about to make the first attempt), incremented after every failed/gated attempt while status=pending. Capped at WHATSAPP_REMINDER_MAX_ATTEMPTS (index.ts), at which point status flips to pending_template_approval and the row stops being returned as due by get_due_booking_reminders(). A successfully sent row (status=sent) reflects the attempt count at the time of success (typically 1).';

-- 2. Rewrite get_due_booking_reminders(): a reminder is due when there is NO existing row
--    for (booking_id, reminder_number) with status IN ('sent', 'pending_template_approval').
--    A 'pending' row (still under the cap) does NOT block re-selection, so the edge
--    function can retry it and bump attempt_count. This is the only behavioural change to
--    the RPC; the return signature (columns) is unchanged from the E2/E4 migration, so no
--    drop-then-create is needed, create or replace is sufficient and preserves the
--    existing SECURITY DEFINER + search_path + revoked-anon-EXECUTE grants from R46 as-is
--    (those are grants on the function object, unaffected by a body-only replace).
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
    -- SEQP1R3: a 'pending' row (under the retry cap) does NOT block re-selection; only a
    -- terminal 'sent' or capped 'pending_template_approval' row does.
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 1
        and r.status in ('sent', 'pending_template_approval')
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
        and r.status in ('sent', 'pending_template_approval')
    );
$f$;

-- GOTCHA (caught live while applying this migration): `create or replace function` resets
-- a function's grants to the Postgres schema default (EXECUTE to PUBLIC), even when only
-- the body changes. R46 (20260620170000) had explicitly revoked anon/PUBLIC/authenticated
-- EXECUTE on this function (it is a cross-tenant PII read: all tenants' due bookings,
-- names/phones/times) and restricted it to service_role only (group B: cron/edge/internal,
-- no frontend caller). Re-assert that exact posture here so this migration cannot silently
-- reopen R46's fix on replay (fresh DB, `supabase db reset`, etc).
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;

-- 3. Atomic claim RPC (code-review finding, SEQP1R3): the edge function originally did a
--    SELECT (is there already a pending claim?) followed by a separate INSERT-or-UPDATE.
--    That is a classic TOCTOU race: two overlapping cron ticks (the cron fires every 5
--    minutes and a slow prior invocation can still be in flight) can both read the same
--    attempt_count and both write back attempt_count+1, silently losing an increment (or,
--    worse, one tick's cap-triggering write to 'pending_template_approval' can be
--    clobbered by the other tick's stale write back to 'pending', un-parking a row that
--    was meant to stop retrying). Collapse the whole claim-or-retry-read into ONE atomic
--    statement using INSERT ... ON CONFLICT ... DO UPDATE, so Postgres's own row-level
--    locking (not application code) serializes concurrent claims on the same
--    (booking_id, reminder_number). Returns the CURRENT attempt_count after this claim so
--    the caller knows whether this is attempt 1 or a retry, with no separate read step.
create or replace function public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
returns table(attempt_count integer, status text)
language sql security definer set search_path to 'public' as $f$
  insert into booking_reminders_sent (booking_id, reminder_number, status, attempt_count)
  values (p_booking_id, p_reminder_number, 'pending', 0)
  on conflict (booking_id, reminder_number) do update
    -- No-op update (sets the row to its own current values) so the RETURNING clause below
    -- reflects the existing row's real attempt_count/status on a retry, without mutating
    -- anything. The actual attempt_count bump happens later, in
    -- record_booking_reminder_result, atomically, only after the send outcome is known.
    set status = booking_reminders_sent.status
  returning attempt_count, status;
$f$;

comment on function public.claim_booking_reminder(uuid, smallint) is
  'SEQP1R3: atomic claim-or-read-existing-claim for a due reminder. Single INSERT ... ON CONFLICT statement so Postgres row-level locking (not application code) serializes concurrent cron ticks on the same (booking_id, reminder_number). Returns the row''s current attempt_count/status either way (freshly claimed at attempt_count=0, or an existing pending claim at its real count).';

-- 4. Atomic result-recording RPC: the ONLY place attempt_count is ever incremented or
--    status is ever changed after the initial claim. Uses attempt_count = attempt_count +
--    1 (an atomic increment expression evaluated by Postgres against the CURRENT row
--    value at write time, not a value read earlier in application code), so two concurrent
--    calls each increment from whatever the row's true value is at the moment they commit,
--    no lost updates. `p_delivered = true` sets status='sent' unconditionally (fail-closed
--    guarantee: this is the only branch that can ever write 'sent', and it is only called
--    from index.ts after a real successful send). `p_delivered = false` increments
--    attempt_count and flips to 'pending_template_approval' once the NEW count reaches
--    p_max_attempts, otherwise stays 'pending'. Also guards against writing over an
--    already-'sent' row (a delayed/duplicate result arriving after another concurrent
--    invocation already recorded success) by filtering the UPDATE to rows not already
--    'sent'.
create or replace function public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer
)
returns table(attempt_count integer, status text)
language sql security definer set search_path to 'public' as $f$
  update booking_reminders_sent
  set status = case
        when p_delivered then 'sent'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    -- Never overwrite a terminal 'sent' row (fail-closed + idempotency guard): if this
    -- booking/reminder was already recorded as sent by a concurrent invocation, a later
    -- straggling result (success or failure) for the same attempt must not reopen or
    -- reclassify it.
    and status <> 'sent'
  returning attempt_count, status;
$f$;

comment on function public.record_booking_reminder_result(uuid, smallint, boolean, integer) is
  'SEQP1R3: atomic, single-statement write of a reminder send outcome. attempt_count = attempt_count + 1 is evaluated against the live row at commit time (not a value read earlier in application code), so concurrent invocations cannot lose an increment. Filters out already-sent rows so a stale/duplicate result can never revert a terminal sent row. This is the ONLY function that ever sets status=sent (fail-closed: index.ts calls this with p_delivered=true only after a real successful send) or advances a row to pending_template_approval.';

REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer) TO service_role;
