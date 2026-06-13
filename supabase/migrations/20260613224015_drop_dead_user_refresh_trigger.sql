-- Drop the dead user->business_overview refresh trigger.
--
-- `trigger_refresh_on_user_update` (AFTER INSERT/UPDATE/DELETE on public.users)
-- fired `trigger_business_overview_refresh()`, whose entire body was:
--   PERFORM pg_notify('refresh_business_overview', 'refresh_needed');
-- Nothing in the codebase LISTENs on that channel (verified: no edge function or
-- realtime subscription consumes 'refresh_business_overview'; the webhook
-- auto-processor listens on the webhook_events table, not this channel). It was a
-- leftover from an abandoned async-refresh design and ran on every users write as a
-- pure no-op.
--
-- The REAL users -> business_overview projection refresh is done by the separate
-- trigger `trigger_users_refresh_business_overview` -> `users_refresh_business_overview()`
-- (and the V2 sync by `trigger_users_v2_refresh`), both of which remain untouched.
-- Verified after drop: a users.parking_info update still reprojects into
-- business_overview, then reverts cleanly.

DROP TRIGGER IF EXISTS trigger_refresh_on_user_update ON public.users;
DROP FUNCTION IF EXISTS public.trigger_business_overview_refresh();
