-- SEQP1R51: fix R50-1 (contact-info-both-null mid-retry), reproduced live
-- launch-ready-loop/evidence/SEQ_P1_r50.md and re-reproduced fresh this round,
-- evidence/SEQ_P1_r51.md.
--
-- ROOT CAUSE: get_due_booking_reminders()'s `due` CTE requires at least one of
-- customer_email/customer_phone to be non-null/non-empty. That is correct and intentional
-- for a booking that has NEVER been claimed (there is genuinely no channel to try yet, see
-- the existing watch-item W-R44-1). The bug is a DIFFERENT case: a booking already
-- mid-retry (a booking_reminders_sent row sitting at status='pending', attempt_count > 0,
-- claimed at least once before while a contact field was still present) whose booking is
-- then edited (owner edit, or a GDPR-style redaction) so BOTH contact fields become
-- null/empty. That booking's id then falls out of the `due` CTE's own filter entirely on
-- every future tick, so claim_booking_reminder / record_booking_reminder_result are never
-- invoked for it again, and the existing 'pending' row freezes at whatever attempt_count it
-- had, forever: it can never reach 'sent' and can never reach any of the six existing
-- terminal states, because every one of those transitions requires a claim to happen first.
--
-- FIX SHAPE (consistent with the established pattern: P1-6/pending_template_approval,
-- R9/invalid_phone_format, R13/booking_cancelled, R31/payment_refunded,
-- R38/stripe_check_failed, R45/email_send_failed -- each added ONE honestly-named terminal
-- state reached through the SAME bounded-retry/claim mechanism, never a bespoke side path):
--
-- 1. get_due_booking_reminders() gets a THIRD union branch (a small, targeted recovery
--    sweep, independent of the main `due`-selection path per R50's own recommended fix
--    direction (b)): any booking_reminders_sent row still at 'pending' whose parent booking
--    NOW has both contact fields null/empty is re-surfaced with channel=null, so it reaches
--    claim_booking_reminder again instead of being silently excluded forever. The main
--    `due` CTE and its existing two branches are UNCHANGED (a booking that never had a
--    reminder row and has no contact info today is still correctly never claimed for the
--    first time -- that is the pre-existing, intentional behaviour W-R44-1 already
--    confirmed safe).
-- 2. claim_booking_reminder gets its own independent both-contacts-null guard (closing
--    W-R44-1's long-open watch item: "no independent NULL guard on contact fields, relies
--    entirely on the upstream filter"), so a row landing here for ANY reason resolves
--    correctly. When the booking is otherwise eligible (confirmed, not deleted, in the
--    future) and not refunded, but both contacts are null, the row resolves to the new
--    terminal state 'no_contact_info' instead of 'pending'. Refunded/cancelled continue to
--    take priority (matches existing precedent: the most business-relevant reason wins when
--    more than one condition is true at once).
-- 3. index.ts (same commit): the pre-claim "no channel -> skip without claiming" guard is
--    moved to AFTER the claim, so a row with channel=null still gets claimed (letting the
--    new guard above resolve it), and is only skipped-without-a-send-attempt once claim
--    genuinely does not return 'pending'.
-- 4. Dashboard (useReminderActivity.tsx / ReminderActivityCard.tsx, same commit): the new
--    state is folded into the SAME 'failed / needs attention' bucket every other terminal
--    failure state already uses, with its own NL+EN translated label, exactly mirroring
--    every prior addition (R19/R31/R38/R45).
--
-- Single-contact-null (only email OR only phone cleared, not both) is UNCHANGED by this
-- migration: get_due_booking_reminders()'s channel derivation already falls back to the
-- other channel correctly (re-confirmed live this round, boundary case still clean).

ALTER TABLE public.booking_reminders_sent DROP CONSTRAINT booking_reminders_sent_status_check;
ALTER TABLE public.booking_reminders_sent ADD CONSTRAINT booking_reminders_sent_status_check
  CHECK (status = ANY (ARRAY[
    'sent'::text, 'pending'::text, 'pending_template_approval'::text,
    'invalid_phone_format'::text, 'booking_cancelled'::text, 'payment_refunded'::text,
    'stripe_check_failed'::text, 'email_send_failed'::text, 'no_contact_info'::text
  ]));

CREATE OR REPLACE FUNCTION public.claim_booking_reminder(p_booking_id uuid, p_reminder_number smallint)
RETURNS TABLE(attempt_count integer, status text, calendar_timezone text, customer_email text, customer_phone text, customer_name text)
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $function$
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
  -- SEQP1R51 (fix for R50-1, closes watch-item W-R44-1): an INDEPENDENT check, at the exact
  -- same claim-time choke point as `eligible`/`refunded` above, so this RPC never again
  -- relies solely on the upstream get_due_booking_reminders() filter to know a booking has
  -- no reachable contact field. True only when BOTH email and phone are null/empty right now.
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
  )
  insert into booking_reminders_sent (booking_id, reminder_number, status, attempt_count, claimed_at)
  select p_booking_id, p_reminder_number,
         case
           when (select ok from refunded) then 'payment_refunded'
           when not (select ok from eligible) then 'booking_cancelled'
           -- SEQP1R51: a fresh row that is eligible+unrefunded but has no reachable contact
           -- resolves straight to no_contact_info instead of 'pending' (defensive: today
           -- get_due_booking_reminders()'s main `due` CTE already excludes this case from
           -- ever reaching a fresh INSERT, but this RPC must not depend on that alone).
           when (select ok from no_contact) then 'no_contact_info'
           else 'pending'
         end, 0,
         case when not (select ok from refunded) and (select ok from eligible) and not (select ok from no_contact) then now() else null end
  from eligible e
  where coalesce((select ok from fresh_offset), false) = true
  on conflict (booking_id, reminder_number) do update
    set status = case
          when booking_reminders_sent.status = 'payment_refunded'
               and (select ok from refunded) = false
               and (select ok from eligible) = true
               and (select ok from no_contact) = false
            then 'pending'
          -- SEQP1R51: a reversed refund on a booking that ALSO now has no reachable contact
          -- (both cleared while it sat at payment_refunded) resolves to no_contact_info
          -- rather than silently reopening to 'pending' with nothing left to send to.
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
          -- SEQP1R51 (fix for R50-1): the core fix. A row already sitting at 'pending'
          -- (mid-retry, attempt_count possibly > 0) whose booking is CURRENTLY eligible and
          -- unrefunded but has had BOTH contact fields cleared since the last claim now
          -- resolves to the distinct terminal state 'no_contact_info' instead of silently
          -- staying 'pending' forever (the R50-1 bug: previously this row was simply never
          -- reachable again once get_due_booking_reminders() stopped selecting it).
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
        end
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
    (select name from fresh_contact);
$function$;

COMMENT ON FUNCTION public.claim_booking_reminder(uuid, smallint) IS
  'SEQP1R3/SEQP1R13/SEQP1R28/SEQP1R31/SEQP1R34/SEQP1R35/SEQP1R38/SEQP1R42/SEQP1R51: atomic claim-or-resume-retry for one due reminder, with claim-time-fresh timezone/contact/offset fields and a mutual-exclusion lease (SEQP1R42). SEQP1R51 (fix for R50-1): a new independent no_contact check (closing watch-item W-R44-1) resolves a row whose booking currently has BOTH customer_email and customer_phone null/empty to the distinct terminal state no_contact_info, reached the same way every other terminal state here is reached, instead of relying solely on the upstream get_due_booking_reminders() filter.';

REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.claim_booking_reminder(uuid, smallint) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_reminder(uuid, smallint) TO service_role;

-- get_due_booking_reminders(): main `due` CTE and its first two union branches are
-- UNCHANGED. A third union branch is added: a targeted recovery sweep, independent of the
-- main due-selection predicate, that re-surfaces any booking_reminders_sent row still at
-- 'pending' whose parent booking now has both contact fields null/empty, with channel=null
-- (there genuinely is no channel), so it reaches claim_booking_reminder again and the new
-- no_contact guard above can resolve it instead of it being excluded forever.
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed', 'email_send_failed', 'no_contact_info')
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed', 'email_send_failed', 'no_contact_info')
          or (r.status = 'payment_refunded' and coalesce(d.payment_status, '') = 'refunded')
        )
    )
  union all
  -- SEQP1R51 (fix for R50-1): recovery sweep, independent of the `due` CTE above. Any
  -- booking_reminders_sent row still at 'pending' whose booking currently has both contact
  -- fields null/empty is re-surfaced here (channel explicitly null) so claim_booking_reminder
  -- runs again and its own no_contact guard can resolve the row instead of it being frozen
  -- forever. Scoped to status='pending' only: a row already at any terminal state needs no
  -- further processing.
  select r.booking_id, r.reminder_number, null::text as channel,
         b.customer_email, b.customer_phone, b.customer_name,
         case when lower(coalesce(b.customer_locale, 'nl')) = 'en' then 'en' else 'nl' end,
         b.start_time, coalesce(bo.business_name, 'het bedrijf'), b.calendar_id,
         coalesce(nullif(c.timezone, ''), 'Europe/Amsterdam')
  from booking_reminders_sent r
  join bookings b on b.id = r.booking_id
  left join business_overview bo on bo.calendar_id = b.calendar_id
  left join calendars c on c.id = b.calendar_id
  where r.status = 'pending'
    and coalesce(b.customer_email, '') = ''
    and coalesce(b.customer_phone, '') = '';
$f$;

COMMENT ON FUNCTION public.get_due_booking_reminders() IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25/SEQP1R31/SEQP1R35/SEQP1R38/SEQP1R45/SEQP1R51: due-reminder detection. SEQP1R51 (fix for R50-1): no_contact_info added to the terminal-status exclusion set, plus a third union branch (independent recovery sweep) that re-surfaces any still-pending row whose booking now has both contact fields null/empty, channel=null, so claim_booking_reminder can resolve it via the new no_contact guard instead of it being silently excluded forever.';

REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;
