-- LR-R95: reminder-engine fundering. Dedup-tabel + due-detectie-RPC.
create table if not exists public.booking_reminders_sent (id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reminder_number smallint not null check (reminder_number in (1,2)),
  sent_at timestamptz not null default now(), unique (booking_id, reminder_number));
alter table public.booking_reminders_sent enable row level security;

create or replace function public.get_due_booking_reminders()
returns table(booking_id uuid, reminder_number smallint, customer_email text, customer_name text, start_time timestamptz, business_name text, calendar_id uuid)
language sql security definer set search_path to 'public' as $f$
  with due as (
    select b.id, b.customer_email, b.customer_name, b.start_time, b.calendar_id,
           cs.first_reminder_enabled, cs.first_reminder_timing_hours,
           cs.second_reminder_enabled, cs.second_reminder_timing_minutes,
           coalesce(bo.business_name, 'het bedrijf') as business_name
    from bookings b
    join calendar_settings cs on cs.calendar_id = b.calendar_id
    left join business_overview bo on bo.calendar_id = b.calendar_id
    where b.status = 'confirmed' and coalesce(b.is_deleted,false)=false
      and b.start_time > now() and b.customer_email is not null and b.customer_email <> ''
  )
  select d.id, 1::smallint, d.customer_email, d.customer_name, d.start_time, d.business_name, d.calendar_id from due d
  where d.first_reminder_enabled and d.start_time <= now() + make_interval(hours => d.first_reminder_timing_hours)
    and not exists (select 1 from booking_reminders_sent r where r.booking_id=d.id and r.reminder_number=1)
  union all
  select d.id, 2::smallint, d.customer_email, d.customer_name, d.start_time, d.business_name, d.calendar_id from due d
  where d.second_reminder_enabled and d.start_time <= now() + make_interval(mins => d.second_reminder_timing_minutes)
    and not exists (select 1 from booking_reminders_sent r where r.booking_id=d.id and r.reminder_number=2);
$f$;
