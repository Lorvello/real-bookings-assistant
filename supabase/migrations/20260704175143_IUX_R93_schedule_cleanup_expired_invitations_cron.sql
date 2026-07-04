-- IUX R93 / F-R85-2: schedule cleanup_expired_invitations() via pg_cron (every 15 minutes).
--
-- cleanup_expired_invitations() flips team_invitations.status from 'pending' to 'expired' once
-- expires_at has passed, but it was only ever invoked by a client-side setInterval in
-- useTeamInvitations.tsx, i.e. only while some owner had the Settings > Team tab open in a live
-- browser tab. Without that tab open, the stored status column could lag the real expiry
-- indefinitely.
--
-- Primary fix for this class of bug is read-time: every security-relevant consumer
-- (accept_team_invitation_for_user, get_team_invitation_by_token, the accept-team-invitation edge
-- fn) already checks `expires_at > now()` directly and never trusted the stored status column for
-- correctness. The frontend list/display (useTeamInvitations.tsx fetchInvitations) now also derives
-- expiry from expires_at at read time, independent of this cron.
--
-- This cron is defense in depth / coherence only: it keeps the STORED status column itself
-- eventually consistent for any future consumer that might filter on status='expired' directly
-- without also checking expires_at. Mirrors the existing 'update-expired-trials' cron convention
-- (20260628120500_R11_D008_schedule_update_expired_trials_cron.sql). 15-minute cadence chosen
-- (rather than hourly) because invitations live only 48h, so a tighter window is proportionate.
--
-- Idempotent: unschedule any prior job of the same name before re-scheduling.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-invitations') THEN
    PERFORM cron.unschedule('cleanup-expired-invitations');
  END IF;
END $$;

SELECT cron.schedule(
  'cleanup-expired-invitations',
  '*/15 * * * *',                    -- every 15 minutes
  $$select public.cleanup_expired_invitations();$$
);
