-- SEQP1R45: fix R44-1 (email-channel send exceptions skip retry accounting), reproduced live
-- launch-ready-loop/evidence/SEQ_P1_r44.md and re-reproduced fresh this round,
-- evidence/SEQ_P1_r45.md.
--
-- ROOT CAUSE (process-booking-reminders/index.ts): the email channel's try/catch around
-- resend.emails.send() set `delivered = false` on ANY thrown exception (a genuine network
-- error, a timeout, or resp.error itself converted into a throw a few lines above) but left
-- `releaseClaim` at its initial `false` -- a flag that was only ever set `true` on the
-- WhatsApp gated-send branch. The subsequent `if (!releaseClaim) continue;` then skipped
-- record_booking_reminder_result ENTIRELY for every email exception, so attempt_count (which
-- is ONLY ever incremented inside that RPC) froze at whatever it already was, forever. A
-- persistently-failing email reminder (proven live against a real, currently-exhausted Resend
-- daily quota, three real cron-shaped cycles) retried under the exact same failing conditions
-- indefinitely, with the 12-attempt bounded-retry cap mathematically unable to ever engage.
--
-- FIX SHAPE (this migration is the DB half; the edge-function half lives in index.ts, same
-- commit): add ONE new, honestly-named terminal state, `email_send_failed`, reached via the
-- SAME bounded-retry cap mechanism every other failure class already uses (P1-6's original
-- design, extended by R31's payment_refunded, R38's stripe_check_failed). index.ts now sets
-- p_failure_reason='email_send_failed' for any email-channel exception and no longer skips
-- the RPC call, so attempt_count genuinely increments on every occurrence and the row parks
-- at this distinct state once the cap is reached, mirroring stripe_check_failed's precedent
-- (deliberately NOT reusing pending_template_approval, which specifically means "waiting on
-- WhatsApp Meta template approval" and would be actively misleading for an email failure).
ALTER TABLE public.booking_reminders_sent DROP CONSTRAINT booking_reminders_sent_status_check;
ALTER TABLE public.booking_reminders_sent ADD CONSTRAINT booking_reminders_sent_status_check
  CHECK (status = ANY (ARRAY[
    'sent'::text, 'pending'::text, 'pending_template_approval'::text,
    'invalid_phone_format'::text, 'booking_cancelled'::text, 'payment_refunded'::text,
    'stripe_check_failed'::text, 'email_send_failed'::text
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
        when (select ok from refunded) then 'payment_refunded'
        when p_failure_reason = 'stripe_refund_confirmed' then 'payment_refunded'
        when p_delivered and (select ok from eligible) then 'sent'
        when p_delivered and not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'invalid_phone_format' then 'invalid_phone_format'
        when not (select ok from eligible) then 'booking_cancelled'
        when p_failure_reason = 'stripe_check_failed' and attempt_count + 1 >= p_max_attempts then 'stripe_check_failed'
        -- SEQP1R45 (fix for R44-1): an email-channel send exception that has hit the retry
        -- cap parks here instead of the misleading WhatsApp-specific
        -- pending_template_approval. Below the cap it simply stays 'pending' (the existing
        -- ELSE branch), retried on the next cron tick exactly like every other transient
        -- failure class.
        when p_failure_reason = 'email_send_failed' and attempt_count + 1 >= p_max_attempts then 'email_send_failed'
        when attempt_count + 1 >= p_max_attempts then 'pending_template_approval'
        else 'pending'
      end,
      attempt_count = case when p_delivered then attempt_count else attempt_count + 1 end
  where booking_id = p_booking_id and reminder_number = p_reminder_number
    -- SEQP1R45: email_send_failed added to the terminal idempotency guard, same treatment as
    -- every other terminal state (a delayed/duplicate result must never reopen or reclassify
    -- an already-terminal row).
    and status not in ('sent', 'invalid_phone_format', 'booking_cancelled', 'payment_refunded', 'stripe_check_failed', 'email_send_failed')
  returning attempt_count, status;
$f$;

COMMENT ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R31/SEQP1R38/SEQP1R45: atomic single-statement write of a reminder send outcome. SEQP1R45 (fix for R44-1): p_failure_reason=''email_send_failed'' (an email-channel send exception, now always recorded instead of being silently skipped) bounded-retries via the existing attempt_count/cap mechanism, landing on the distinct terminal ''email_send_failed'' at cap, never conflated with the WhatsApp-specific pending_template_approval. Also still carries SEQP1R38''s stripe_refund_confirmed/stripe_check_failed handling, unchanged.';

REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_booking_reminder_result(uuid, smallint, boolean, integer, text) TO service_role;

-- get_due_booking_reminders(): add 'email_send_failed' to the terminal-exclusion set on both
-- reminder-number arms, mirroring how every other terminal state added since SEQP1R3
-- (invalid_phone_format R9, booking_cancelled R13, payment_refunded R31, stripe_check_failed
-- R38) was folded into the SAME `not exists` predicate. Return shape unchanged, CREATE OR
-- REPLACE is sufficient (matches every prior WHERE-only change to this function).
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed', 'email_send_failed')
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
          r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled', 'stripe_check_failed', 'email_send_failed')
          or (r.status = 'payment_refunded' and coalesce(d.payment_status, '') = 'refunded')
        )
    );
$f$;

COMMENT ON FUNCTION public.get_due_booking_reminders() IS
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25/SEQP1R31/SEQP1R35/SEQP1R38/SEQP1R45: due-reminder detection. SEQP1R45: email_send_failed added to the terminal-status exclusion set (an email-channel failure that hit the retry cap is parked, never re-selected).';

REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;
