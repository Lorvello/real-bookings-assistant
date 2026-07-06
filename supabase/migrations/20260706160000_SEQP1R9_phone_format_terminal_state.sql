-- SEQP1R9 (P1-9-PHONE, sev-3, reopened P1-9 by R8's independent verify: evidence
-- launch-ready-loop/evidence/SEQ_P1_r8_verify.md section 2 / findings ledger P1-9-VERIFY-1).
--
-- BUG: sendWhatsAppTemplate's `to` param received bookings.customer_phone completely
-- unnormalized, and the three real write paths (WhatsApp-origin wa_id, web-booking-form
-- E.164-with-plus, installment-payment verbatim passthrough) produce incompatible shapes. A
-- genuinely malformed/ambiguous phone number would make the Meta send fail (400), exhaust the
-- 12-attempt retry cap (SEQP1R3), and land in 'pending_template_approval' -- a status whose
-- own column comment explicitly means "root cause is the outstanding Meta template approval".
-- That is a real mislabeling: the owner/Mathew would see "waiting on Meta" when the true cause
-- is "this phone number can never be delivered to, code or human must fix the data". R8 verify
-- flagged this exact conflation as the harm, not just the missing normalization itself.
--
-- FIX (paired with the code fix in _shared/whatsappSend.ts's normalizePhoneForMeta, which now
-- fails closed with error "invalid_phone_format" on an unresolvable number): give that failure
-- its OWN terminal status, distinct from pending_template_approval, so the two failure reasons
-- are distinguishable in the data model exactly as R8 verify recommended. This status is
-- reached in ONE attempt (no point retrying an input that will never become parseable without
-- a data fix), unlike pending_template_approval which only appears after the retry cap.

-- 1. Extend the status CHECK constraint with the new terminal value.
alter table public.booking_reminders_sent
  drop constraint if exists booking_reminders_sent_status_check;
alter table public.booking_reminders_sent
  add constraint booking_reminders_sent_status_check
  check (status in ('sent', 'pending', 'pending_template_approval', 'invalid_phone_format'));

comment on column public.booking_reminders_sent.status is
  'SEQP1R3/SEQP1R9: sent = actually delivered (terminal success, fail-closed invariant: only set on a real successful send). pending = claimed, not yet delivered, still under the retry cap, will be retried by the next due cron tick. pending_template_approval = retry cap reached (see index.ts WHATSAPP_REMINDER_MAX_ATTEMPTS), root cause is the outstanding Meta WhatsApp template approval; terminal-until-human-action, genuinely queryable, never silently dropped. invalid_phone_format = the WhatsApp send was refused before ever reaching Meta because customer_phone could not be confidently normalized to a plausible international MSISDN (see _shared/whatsappSend.ts normalizePhoneForMeta); reached in ONE attempt (no retry cap wait, since retrying an unparseable number changes nothing), terminal until the underlying bookings.customer_phone value is corrected by a human/support action. Deliberately distinct from pending_template_approval so the two root causes (Meta approval pending vs bad phone data) are never conflated in the data model, per the P1-9-VERIFY-1 finding.';

-- 2. record_booking_reminder_result: accept a specific p_failure_reason so the caller
--    (process-booking-reminders/index.ts) can route an invalid-phone outcome to its own
--    terminal status in the SAME atomic write that already guards against lost updates /
--    overwriting a terminal 'sent' row, rather than a second follow-up UPDATE. Backward
--    compatible: p_failure_reason defaults to null, which reproduces the exact SEQP1R3
--    behaviour (pending / pending_template_approval-on-cap) for every existing caller.
create or replace function public.record_booking_reminder_result(
  p_booking_id uuid,
  p_reminder_number smallint,
  p_delivered boolean,
  p_max_attempts integer,
  p_failure_reason text default null
)
returns table(attempt_count integer, status text)
language sql security definer set search_path to 'public' as $f$
  update booking_reminders_sent
  set status = case
        when p_delivered then 'sent'
        when p_failure_reason = 'invalid_phone_format' then 'invalid_phone_format'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    -- Never overwrite a terminal 'sent' row (fail-closed + idempotency guard): if this
    -- booking/reminder was already recorded as sent by a concurrent invocation, a later
    -- straggling result (success or failure) for the same attempt must not reopen or
    -- reclassify it. Also never re-process an already-terminal invalid_phone_format row
    -- (nothing about a retry would change a phone-format verdict).
    and status not in ('sent', 'invalid_phone_format')
  returning attempt_count, status;
$f$;

comment on function public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) is
  'SEQP1R3/SEQP1R9: atomic, single-statement write of a reminder send outcome. attempt_count = attempt_count + 1 is evaluated against the live row at commit time (not a value read earlier in application code), so concurrent invocations cannot lose an increment. Filters out already-terminal (sent / invalid_phone_format) rows so a stale/duplicate result can never revert them. This is the ONLY function that ever sets status=sent, advances a row to pending_template_approval, or sets invalid_phone_format (the last only when p_failure_reason=''invalid_phone_format'', i.e. normalizePhoneForMeta in _shared/whatsappSend.ts refused to send, distinct from a Meta-side template-approval delay).';

-- Drop the old 4-arg signature: create-or-replace cannot change a function's parameter list
-- in place, and leaving both signatures around would let an old caller silently keep calling
-- the pre-fix 4-arg version with no p_failure_reason routing.
drop function if exists public.record_booking_reminder_result(uuid, smallint, boolean, integer);

REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) TO service_role;

-- 3. get_due_booking_reminders(): an invalid_phone_format row must also stop being
--    re-selected as due (it is terminal, same treatment as sent / pending_template_approval).
--    Body-only change, same signature, same grants pattern as SEQP1R3's own re-assertion.
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
    -- SEQP1R9: invalid_phone_format joins sent / pending_template_approval as a terminal
    -- status that blocks re-selection (a 'pending' row under the retry cap is still eligible).
    and not exists (
      select 1 from booking_reminders_sent r
      where r.booking_id = d.id and r.reminder_number = 1
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format')
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
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format')
    );
$f$;

REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;
