-- SEQP1R6 (Sequenced Roadmap Phase 1, round 6): tenant-scoped RLS for
-- booking_reminders_sent (closes P1-W2).
--
-- BACKGROUND (confirmed live in R4, re-confirmed live in this round):
-- booking_reminders_sent has RLS ENABLED but ZERO policies, so it currently default-denies
-- every role except service_role/SECURITY DEFINER functions. That has been safe so far only
-- by ACCIDENT: the table also carries full CRUD table-level GRANTs to anon/authenticated
-- (a pre-existing Supabase project-level schema default, not introduced by any single
-- migration), so the moment ANY policy is added, those broad grants become live attack
-- surface unless the policy itself is correctly scoped and the unused write grants are
-- tightened at the same time. This round is exactly that moment: P1-7 needs the owner
-- dashboard to read this table for the first time ever, so a real, correctly-scoped policy
-- is required now, not "leave it open-by-emptiness."
--
-- FK chain (confirmed live via information_schema, not assumed):
--   booking_reminders_sent.booking_id -> bookings.id
--   bookings.calendar_id             -> calendars.id
--   calendars.user_id                -> auth.uid() (the tenant owner)
--
-- PATTERN (mirrors the existing, live, working tenant-isolation pattern on the sibling
-- table `bookings` exactly, one hop further through bookings -> calendars):
--   bookings_owner_all:   EXISTS (SELECT 1 FROM calendars WHERE calendars.id =
--                         bookings.calendar_id AND calendars.user_id = auth.uid())
--   bookings_member_view: caller_is_accepted_calendar_member(calendar_id)
-- booking_reminders_sent gets the same two shapes, joined through bookings first.
--
-- SCOPE: SELECT only. The edge function (process-booking-reminders) writes via
-- service_role, which bypasses RLS entirely (confirmed R3/R4) -- no authenticated/anon
-- INSERT/UPDATE/DELETE policy is needed or added. The new P1-7 dashboard card is read-only.
-- This matches the task's own instruction to add only what is actually needed.

-- 1. Owner: full read of their own tenant's reminder rows (join through bookings ->
--    calendars, matching bookings_owner_all's shape one hop further out).
create policy booking_reminders_sent_owner_select
  on public.booking_reminders_sent
  for select
  using (
    exists (
      select 1
      from public.bookings b
      join public.calendars c on c.id = b.calendar_id
      where b.id = booking_reminders_sent.booking_id
        and c.user_id = auth.uid()
    )
  );

-- 2. Accepted team members: same visibility they already have on the underlying booking
--    row via bookings_member_view (caller_is_accepted_calendar_member, any role).
create policy booking_reminders_sent_member_select
  on public.booking_reminders_sent
  for select
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_reminders_sent.booking_id
        and public.caller_is_accepted_calendar_member(b.calendar_id)
    )
  );

comment on policy booking_reminders_sent_owner_select on public.booking_reminders_sent is
  'SEQP1R6: tenant owner can read their own bookings'' reminder-send rows. Mirrors bookings_owner_all one hop further through bookings -> calendars.';
comment on policy booking_reminders_sent_member_select on public.booking_reminders_sent is
  'SEQP1R6: accepted calendar team members can read reminder rows for bookings they can already see, mirroring bookings_member_view.';

-- 3. Defense in depth (R4's explicit recommendation, evidence/SEQ_P1_r4_verify.md section 2):
--    now that a policy exists on this table, revoke the previously-unused write grants from
--    anon/authenticated so a future overly-broad policy (SELECT-only mistake, OR-condition
--    too wide, etc.) cannot silently become a write hole. service_role/postgres are
--    untouched (the edge function and admin tooling still work exactly as before).
revoke insert, update, delete, truncate on public.booking_reminders_sent from anon;
revoke insert, update, delete, truncate on public.booking_reminders_sent from authenticated;
