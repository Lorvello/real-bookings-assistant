-- SEQP1R25 (Sequenced Roadmap Phase 1, round 25): thread the booking's own calendar
-- timezone through the reminder pipeline instead of hardcoding Europe/Amsterdam (finding
-- R24-1, evidence launch-ready-loop/evidence/SEQ_P1_r24.md).
--
-- ROOT CAUSE. calendars.timezone is a real, owner-writable column (set via the live
-- Availability page, src/components/availability/AvailabilityContent.tsx ->
-- `.update({ timezone: newTimezone })`) that get_due_booking_reminders() never selected
-- into its return set at all -- structurally invisible to the whole reminder pipeline.
-- Both formatDate call sites in process-booking-reminders/index.ts therefore called
-- formatDate(r.start_time, locale) with no third argument, so reminderBody.ts's
-- formatDate(iso, locale, tz = "Europe/Amsterdam") default silently applied to every
-- reminder for every calendar, regardless of that calendar's own configured timezone.
-- Reproduced live in R24 and again in R25: a Pacific/Auckland-configured calendar's
-- reminder rendered "dinsdag 7 juli 2026, 14:58" (Amsterdam) instead of the correct
-- "woensdag 8 juli 2026, 00:58" (Auckland) -- wrong day AND wrong time in a real
-- delivered email.
--
-- FIX. Add calendars.timezone to get_due_booking_reminders()'s SELECT list (LEFT JOIN
-- calendars, so a booking whose calendar row is somehow missing still returns a row rather
-- than being silently dropped) and coalesce to 'Europe/Amsterdam' at the SQL layer when the
-- column is null/empty -- confirmed via a real information_schema query that
-- calendars.timezone IS nullable with column_default 'Europe/Amsterdam'::text, so most rows
-- carry the literal default already, but a defensive coalesce covers any row where it was
-- explicitly nulled. index.ts then passes this value as formatDate's third argument at
-- both call sites (the gated Meta-template path and the email path) instead of relying on
-- formatDate's own default. formatDate's Intl.DateTimeFormat mechanism itself (R16/R15-1)
-- is completely untouched; only the tz VALUE it receives is now dynamic per-calendar.
--
-- Signature changes (new output column), so drop-then-create, matching the E2/E4
-- (20260630190000) precedent.
drop function if exists public.get_due_booking_reminders();

create function public.get_due_booking_reminders()
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
  calendar_id uuid,
  calendar_timezone text
)
language sql security definer set search_path to 'public' as $f$
  with due as (
    select b.id, b.customer_email, b.customer_phone, b.customer_name, b.customer_locale,
           b.start_time, b.calendar_id,
           cs.first_reminder_enabled, cs.first_reminder_timing_hours,
           cs.second_reminder_enabled, cs.second_reminder_timing_minutes,
           coalesce(bo.business_name, 'het bedrijf') as business_name,
           -- SEQP1R25: the calendar's own owner-configured timezone (Availability page),
           -- defaulted to Europe/Amsterdam only when genuinely null/empty (nullable
           -- column; most rows already carry the literal default). LEFT JOIN so a booking
           -- whose calendar row is missing/deleted still surfaces (falls back via coalesce)
           -- rather than being silently dropped from the due-set.
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
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
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
        and r.status in ('sent', 'pending_template_approval', 'invalid_phone_format', 'booking_cancelled')
    );
$f$;

comment on function public.get_due_booking_reminders() is
  'SEQP1R3/SEQP1R9/SEQP1R13/SEQP1R25: due-reminder detection. Returns calendar_timezone (SEQP1R25, finding R24-1) sourced from calendars.timezone (owner-writable via the Availability page), defaulted to Europe/Amsterdam only when null/empty, so process-booking-reminders/index.ts can render each reminder in the BOOKING''S OWN calendar timezone instead of a hardcoded literal. booking_cancelled/sent/pending_template_approval/invalid_phone_format all remain terminal statuses that block re-selection (SEQP1R13/SEQP1R9).';

-- R46-class grant re-assertion: create function resets grants to the Postgres default
-- (EXECUTE to PUBLIC). Re-assert the locked posture (cross-tenant PII read, service-role
-- only) so this migration cannot silently reopen R46 on replay.
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_due_booking_reminders() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_due_booking_reminders() TO service_role;
