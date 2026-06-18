-- F1 (launch-ready loop): tighten the subscribers SELECT policy.
--
-- Before: USING ((user_id = auth.uid()) OR (email = auth.email()))
-- The email branch is a latent confidentiality leak on a BILLING table: an
-- authenticated client could read any subscribers row whose `email` matches its own
-- auth email (e.g. a webhook-created, pre-signup row, or an email collision), even
-- when user_id != auth.uid().
--
-- Safe to drop the email branch:
--   * user_id is the canonical link and is UNIQUE (subscribers_user_id_key, enforced
--     since 20260613210000); 0 rows have a null user_id.
--   * The frontend never reads `subscribers` directly — subscription status is served
--     by service-role edge functions (check-subscription etc.), which bypass RLS.
-- Verified (RLS simulation): owner sees own row; a different uid with the owner's
-- email now sees 0 rows (leak closed).
drop policy if exists select_own_subscription on public.subscribers;
create policy select_own_subscription on public.subscribers
  for select
  using (user_id = auth.uid());
