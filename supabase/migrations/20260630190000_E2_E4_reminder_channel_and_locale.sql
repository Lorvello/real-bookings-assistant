-- E-2 + E-4 (E2E launch-ready loop): repair the reminder due-set so WhatsApp-origin
-- bookings are no longer SILENTLY DROPPED, and carry a locale so the reminder body
-- can be NL or EN.
--
-- E-2 BUG. get_due_booking_reminders (20260613180000) filtered
--   customer_email is not null and customer_email <> ''
-- so WhatsApp-origin bookings (which store customer_phone and NO email — see
-- whatsapp-agent/tools.ts insertRow) were excluded from the due-set entirely. That is
-- exactly the cohort the product is sold on (WhatsApp no-show reduction), so the
-- headline value-prop was dead for them. Fix: keep a booking in the due-set when it has
-- EITHER a usable email OR a usable phone, and return an explicit channel so the edge fn
-- routes deterministically (email -> Resend, else whatsapp -> Meta template). A booking
-- with neither contact field is still excluded (nothing to deliver to).
--
-- E-4 LOCALE. The reminder body was NL-hardcoded with no EN branch. The bookings row had
-- no locale, so there was no signal to pick a language. Add bookings.customer_locale
-- (nullable text, 'nl'/'en', default null => treated as 'nl'), captured by the public
-- web booking flow (create-booking) from the visitor's i18n language. WhatsApp bookings
-- leave it null (the agent converses in NL today) => NL, unchanged behaviour. The RPC now
-- returns the normalised locale so the fn picks NL vs EN.

-- 1. Locale column. Idempotent; nullable so every existing row + every WhatsApp insert is
--    byte-identical to before (null => NL downstream).
alter table public.bookings
  add column if not exists customer_locale text;

comment on column public.bookings.customer_locale is
  'E-4: visitor UI language at booking time (''nl'' | ''en''), captured by the public web booking flow. Null (WhatsApp / legacy) is treated as ''nl'' downstream (reminder + future localized mail).';

-- 2. Rewrite the due-detection RPC: add customer_phone + customer_locale + an explicit
--    channel, and stop dropping email-less bookings. SECURITY DEFINER + search_path are
--    preserved exactly; anon EXECUTE stays revoked (20260620170000) because we only
--    change the body, not the signature's privileges. The signature (return columns)
--    changes, so drop-then-create.
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
  calendar_id uuid
)
language sql security definer set search_path to 'public' as $f$
  with due as (
    select b.id, b.customer_email, b.customer_phone, b.customer_name, b.customer_locale,
           b.start_time, b.calendar_id,
           cs.first_reminder_enabled, cs.first_reminder_timing_hours,
           cs.second_reminder_enabled, cs.second_reminder_timing_minutes,
           coalesce(bo.business_name, 'het bedrijf') as business_name,
           -- Explicit channel selection: email if a usable email is present, else WhatsApp
           -- if a usable phone is present, else null. A null-channel booking has no way to
           -- be reached and is excluded below, so it is never marked sent (it stays in the
           -- due-set conceptually but is filtered out -> not lost, just undeliverable).
           case
             when b.customer_email is not null and b.customer_email <> '' then 'email'
             when b.customer_phone is not null and b.customer_phone <> '' then 'whatsapp'
             else null
           end as channel,
           -- E-4: normalise to 'nl' | 'en'; anything else (incl. null) => 'nl'.
           case when lower(coalesce(b.customer_locale, 'nl')) = 'en' then 'en' else 'nl' end as locale_norm
    from bookings b
    join calendar_settings cs on cs.calendar_id = b.calendar_id
    left join business_overview bo on bo.calendar_id = b.calendar_id
    where b.status = 'confirmed' and coalesce(b.is_deleted, false) = false
      and b.start_time > now()
      -- E-2: was "email is not null and <> ''". Now: reachable by EITHER channel.
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
    and not exists (select 1 from booking_reminders_sent r where r.booking_id = d.id and r.reminder_number = 1)
  union all
  select d.id, 2::smallint, d.channel, d.customer_email, d.customer_phone, d.customer_name,
         d.locale_norm, d.start_time, d.business_name, d.calendar_id
  from due d
  where d.channel is not null
    and d.second_reminder_enabled
    and d.start_time <= now() + make_interval(mins => d.second_reminder_timing_minutes)
    and not exists (select 1 from booking_reminders_sent r where r.booking_id = d.id and r.reminder_number = 2);
$f$;
