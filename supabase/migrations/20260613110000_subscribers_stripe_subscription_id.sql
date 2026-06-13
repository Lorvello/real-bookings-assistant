-- LR-R67 (website-audit critical #2): ontbrekende kolom subscribers.stripe_subscription_id.
-- stripe-webhook leest/schrijft stripe_subscription_id op 5 plekken
-- (handleSubscriptionUpdated/Deleted/CheckoutCompleted: regels 179/207/287/446/474)
-- maar de kolom bestond niet -> elke van die handlers errorde met 42703 ->
-- subscription.updated/deleted/trial_will_end deden niets -> een OPGEZEGD abonnement
-- bleef subscribed=true voor altijd -> get_user_status_type bleef paid_subscriber ->
-- de access-gating (WhatsApp-agent kernvraag 3) dropte de lapsed user NIET.
--
-- Fix: voeg de kolom + unique index toe zodat de webhook-handlers werken en een
-- opgezegd abo correct subscribed=false krijgt.

ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Unique index (NULLs zijn distinct in Postgres, dus bestaande rijen met NULL botsen niet);
-- ondersteunt ook upsert onConflict:'stripe_subscription_id' in de webhook.
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_stripe_subscription_id_key
  ON public.subscribers (stripe_subscription_id);
