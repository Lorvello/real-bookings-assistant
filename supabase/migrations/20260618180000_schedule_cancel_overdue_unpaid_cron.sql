-- F2 (launch-ready loop, Ronde 9): SCHEDULE the auto-cancel-unpaid cron.
-- The function public.cancel_overdue_unpaid_bookings() was defined in
-- 20260613190000_cancel_overdue_unpaid.sql but was NEVER scheduled — cron.job was
-- empty, so overdue unpaid bookings were never auto-cancelled and kept holding slots.
-- pg_cron 1.6 is enabled on this project. The function is idempotent and only touches
-- FUTURE, unpaid, payment-required bookings whose calendar has
-- auto_cancel_unpaid_bookings = true and that are older than payment_deadline_hours;
-- already-cancelled/completed/no-show/deleted rows are skipped.

create extension if not exists pg_cron;

-- cron.schedule upserts by jobname (pg_cron >= 1.4), so this is safe to re-run.
-- Every 15 minutes: deadline is hours-grained, so 15-min responsiveness frees held
-- slots promptly at trivial cost.
select cron.schedule(
  'cancel-overdue-unpaid-bookings',
  '*/15 * * * *',
  $$select public.cancel_overdue_unpaid_bookings();$$
);
