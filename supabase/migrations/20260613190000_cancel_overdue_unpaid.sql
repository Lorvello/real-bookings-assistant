-- LR-R97: auto-cancel-unpaid. Maakt auto_cancel_unpaid_bookings + payment_deadline_hours
-- echt werkend: cancelt toekomstige onbetaalde verplichte-betaling-boekingen die langer
-- dan de deadline geleden zijn aangemaakt. Door pg_cron aangeroepen (zie DEVICE_CHECK).

create or replace function public.cancel_overdue_unpaid_bookings()
returns integer language plpgsql security definer set search_path to 'public' as $f$
declare v_count integer;
begin
  with overdue as (
    select b.id from bookings b
    join payment_settings ps on ps.calendar_id = b.calendar_id
    where b.payment_required = true
      and coalesce(b.payment_status,'') <> 'paid'
      and b.status not in ('cancelled','completed','no-show')
      and coalesce(b.is_deleted,false) = false
      and ps.auto_cancel_unpaid_bookings = true
      and b.start_time > now()
      and b.created_at < now() - make_interval(hours => ps.payment_deadline_hours)
  )
  update bookings set status='cancelled', updated_at=now() where id in (select id from overdue);
  get diagnostics v_count = row_count;
  return v_count;
end; $f$;
