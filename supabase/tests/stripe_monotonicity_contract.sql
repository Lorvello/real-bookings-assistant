\set ON_ERROR_STOP on

BEGIN;

INSERT INTO auth.users (
  id, email, aud, role, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '38000000-0000-0000-0000-000000000001',
    'stripe-monotonic-owner@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Monotonic Owner"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000101',
    'stripe-global-order@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Global Order"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000102',
    'stripe-failure-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Failure First"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000103',
    'stripe-success-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Success First"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000104',
    'stripe-mode-order@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Mode Order"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000105',
    'stripe-created-update-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Created Then Updated"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000106',
    'stripe-update-created-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Updated Then Created"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000107',
    'stripe-replacement-delete-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Replacement Delete First"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000108',
    'stripe-replacement-active-first@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Replacement Active First"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000109',
    'stripe-older-superseded@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Older Superseded"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000110',
    'stripe-grace-once@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Grace Once"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000111',
    'stripe-scheduled-cancel-active@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Scheduled Cancel Active"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-0000-0000-000000000112',
    'stripe-scheduled-cancel-trialing@example.invalid',
    'authenticated', 'authenticated', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Stripe Scheduled Cancel Trialing"}'::jsonb,
    now(), now()
  );

INSERT INTO public.calendars (id, user_id, name, slug, is_active)
VALUES (
  '38000000-0000-0000-0000-000000000002',
  '38000000-0000-0000-0000-000000000001',
  'Stripe Monotonic Calendar',
  'stripe-monotonic-calendar',
  true
);

INSERT INTO public.service_types (id, calendar_id, name, duration, price, is_active)
VALUES (
  '38000000-0000-0000-0000-000000000003',
  '38000000-0000-0000-0000-000000000002',
  'Stripe Monotonic Service', 60, 100, true
);

INSERT INTO public.bookings (
  id, calendar_id, service_type_id, customer_name, customer_email,
  start_time, end_time, status, payment_required, payment_status
) VALUES
  (
    '38000000-0000-0000-0000-000000000010',
    '38000000-0000-0000-0000-000000000002',
    '38000000-0000-0000-0000-000000000003',
    'Captured Customer', 'captured@example.invalid',
    now() + interval '7 days', now() + interval '7 days 1 hour',
    'confirmed', true, 'paid'
  ),
  (
    '38000000-0000-0000-0000-000000000011',
    '38000000-0000-0000-0000-000000000002',
    '38000000-0000-0000-0000-000000000003',
    'Pending Customer', 'pending@example.invalid',
    now() + interval '8 days', now() + interval '8 days 1 hour',
    'pending', true, 'pending'
  );

INSERT INTO public.booking_payments (
  booking_id, stripe_payment_intent_id, stripe_account_id, amount_cents,
  currency, platform_fee_cents, status, refund_amount_cents, stripe_mode
) VALUES
  (
    '38000000-0000-0000-0000-000000000010', 'pi_r38_captured',
    'acct_r38_contract', 10000, 'eur', 190, 'succeeded', 0, 'test'
  ),
  (
    '38000000-0000-0000-0000-000000000011', 'pi_r38_pending',
    'acct_r38_contract', 10000, 'eur', 190, 'pending', 0, 'test'
  );

INSERT INTO public.whatsapp_payment_sessions (
  id, service_type_id, calendar_id, booking_id, amount_cents, currency,
  payment_type, stripe_payment_intent_id, stripe_session_id,
  payment_status, stripe_mode
) VALUES
  (
    '38000000-0000-0000-0000-000000000020',
    '38000000-0000-0000-0000-000000000003',
    '38000000-0000-0000-0000-000000000002',
    '38000000-0000-0000-0000-000000000010',
    10000, 'eur', 'full', 'pi_r38_captured', 'cs_r38_captured', 'paid', 'test'
  ),
  (
    '38000000-0000-0000-0000-000000000021',
    '38000000-0000-0000-0000-000000000003',
    '38000000-0000-0000-0000-000000000002',
    '38000000-0000-0000-0000-000000000011',
    10000, 'eur', 'full', 'pi_r38_pending', 'cs_r38_pending', 'pending', 'test'
  );

INSERT INTO public.installment_payments (
  id, booking_id, whatsapp_session_id, installment_number,
  total_installments, amount_cents, currency, payment_timing,
  payment_method, status, stripe_payment_intent_id
) VALUES (
  '38000000-0000-0000-0000-000000000022',
  '38000000-0000-0000-0000-000000000011',
  '38000000-0000-0000-0000-000000000021',
  1, 1, 10000, 'eur', 'now', 'online', 'pending', 'pi_r38_pending'
);

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.record_booking_payment_failure(
    '38000000-0000-0000-0000-000000000010',
    'pi_r38_captured', 'test', now()
  );
  IF v_result->>'action' <> 'terminal_money_preserved' THEN
    RAISE EXCEPTION 'delayed failure downgraded captured money: %', v_result;
  END IF;

  v_result := public.record_booking_checkout_failure(
    '38000000-0000-0000-0000-000000000010',
    'cs_r38_captured', 'test', now()
  );
  IF v_result->>'action' <> 'terminal_session_preserved' THEN
    RAISE EXCEPTION 'delayed checkout failure downgraded paid session: %', v_result;
  END IF;

  v_result := public.record_booking_payment_failure(
    '38000000-0000-0000-0000-000000000011',
    'pi_r38_pending', 'test', now()
  );
  IF v_result->>'action' <> 'unsettled_marked_failed' THEN
    RAISE EXCEPTION 'real unsettled failure was not applied: %', v_result;
  END IF;

  BEGIN
    PERFORM public.record_booking_payment_failure(
      '38000000-0000-0000-0000-000000000010',
      'pi_r38_captured', 'live', now()
    );
    RAISE EXCEPTION 'LIVE failure mutated a TEST ledger';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$test$;

-- cancel_at_period_end is cancellation truth, not immediate entitlement loss.
-- Active and trialing Stripe states retain their paid mirrors until the recorded
-- period end; a delayed active snapshot after that end must fail closed.
DO $test$
DECLARE
  v_active_result jsonb;
  v_trial_result jsonb;
  v_expired_result jsonb;
BEGIN
  v_active_result := public.apply_stripe_subscription_event(
    'evt_r43_scheduled_active', 100, 'test', 'updated',
    'sub_r43_scheduled_active', 'cus_r43_scheduled_active',
    '38000000-0000-0000-0000-000000000111',
    'stripe-scheduled-cancel-active@example.invalid',
    'active', 'professional', now() + interval '30 days', true
  );
  v_trial_result := public.apply_stripe_subscription_event(
    'evt_r43_scheduled_trialing', 100, 'test', 'updated',
    'sub_r43_scheduled_trialing', 'cus_r43_scheduled_trialing',
    '38000000-0000-0000-0000-000000000112',
    'stripe-scheduled-cancel-trialing@example.invalid',
    'trialing', 'starter', now() + interval '7 days', true
  );

  IF v_active_result->>'subscriptionStatus' <> 'canceled'
     OR v_active_result->>'subscribed' <> 'true'
     OR v_active_result->>'effectiveTier' <> 'professional'
     OR v_trial_result->>'subscriptionStatus' <> 'canceled'
     OR v_trial_result->>'subscribed' <> 'true'
     OR v_trial_result->>'effectiveTier' <> 'starter'
     OR NOT EXISTS (
       SELECT 1
       FROM public.users AS user_row
       JOIN public.subscribers AS subscriber
         ON subscriber.user_id = user_row.id
       WHERE user_row.id = '38000000-0000-0000-0000-000000000111'
         AND user_row.subscription_status = 'canceled'
         AND user_row.cancel_at_period_end = true
         AND user_row.payment_status = 'paid'
         AND user_row.subscription_tier = 'professional'
         AND user_row.subscription_end_date > now()
         AND subscriber.subscribed = true
         AND subscriber.subscription_tier = 'professional'
         AND subscriber.subscription_end > now()
     )
     OR NOT EXISTS (
       SELECT 1
       FROM public.users AS user_row
       JOIN public.subscribers AS subscriber
         ON subscriber.user_id = user_row.id
       WHERE user_row.id = '38000000-0000-0000-0000-000000000112'
         AND user_row.subscription_status = 'canceled'
         AND user_row.cancel_at_period_end = true
         AND user_row.payment_status = 'paid'
         AND user_row.subscription_tier = 'starter'
         AND user_row.subscription_end_date > now()
         AND subscriber.subscribed = true
         AND subscriber.subscription_tier = 'starter'
         AND subscriber.subscription_end > now()
     ) THEN
    RAISE EXCEPTION
      'scheduled cancellation dropped paid entitlement before period end: active %, trialing %',
      v_active_result, v_trial_result;
  END IF;

  v_expired_result := public.apply_stripe_subscription_event(
    'evt_r43_scheduled_active_expired', 200, 'test', 'updated',
    'sub_r43_scheduled_active', 'cus_r43_scheduled_active',
    '38000000-0000-0000-0000-000000000111', NULL,
    'active', 'professional', now() - interval '1 second', true
  );

  IF v_expired_result->>'subscribed' <> 'false'
     OR v_expired_result->'effectiveTier' <> 'null'::jsonb
     OR NOT EXISTS (
       SELECT 1
       FROM public.users AS user_row
       JOIN public.subscribers AS subscriber
         ON subscriber.user_id = user_row.id
       WHERE user_row.id = '38000000-0000-0000-0000-000000000111'
         AND user_row.subscription_status = 'canceled'
         AND user_row.cancel_at_period_end = true
         AND user_row.subscription_tier IS NULL
         AND user_row.payment_status = 'unpaid'
         AND subscriber.subscribed = false
         AND subscriber.subscription_tier IS NULL
     ) THEN
    RAISE EXCEPTION
      'scheduled cancellation retained entitlement after period end: %',
      v_expired_result;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r38_captured'
      AND status = 'succeeded' AND stripe_mode = 'test'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.whatsapp_payment_sessions
    WHERE stripe_session_id = 'cs_r38_captured'
      AND payment_status = 'paid'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '38000000-0000-0000-0000-000000000010'
      AND payment_status = 'paid'
  ) THEN
    RAISE EXCEPTION 'captured truth changed after delayed failure';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.booking_payments
    WHERE stripe_payment_intent_id = 'pi_r38_pending' AND status = 'failed'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.whatsapp_payment_sessions
    WHERE stripe_session_id = 'cs_r38_pending' AND payment_status = 'failed'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.installment_payments
    WHERE id = '38000000-0000-0000-0000-000000000022' AND status = 'failed'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.bookings
    WHERE id = '38000000-0000-0000-0000-000000000011'
      AND payment_status = 'failed'
  ) THEN
    RAISE EXCEPTION 'unsettled failure ledgers did not converge';
  END IF;
END;
$test$;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"38000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

DO $test$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    UPDATE public.bookings SET is_deleted = true
    WHERE id = '38000000-0000-0000-0000-000000000010';
  EXCEPTION WHEN insufficient_privilege THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'browser soft-deleted a booking with retained money';
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
DECLARE
  v_denied boolean := false;
BEGIN
  BEGIN
    DELETE FROM public.bookings
    WHERE id = '38000000-0000-0000-0000-000000000010';
  EXCEPTION WHEN foreign_key_violation THEN
    v_denied := true;
  END;
  IF NOT v_denied THEN
    RAISE EXCEPTION 'hard delete erased a canonical payment ledger';
  END IF;
END;
$test$;

-- R43 regression: ordering must be global to one user and Stripe mode, not only
-- local to a subscription id. Equal-second invoice outcomes use semantic order,
-- so paid success wins in either delivery order and deletion remains terminal.
SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_a_created_200', 200, 'test', 'created',
    'sub_r43_global_a', 'cus_r43_global_a',
    '38000000-0000-0000-0000-000000000101',
    'stripe-global-order@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_b_created_300', 300, 'test', 'created',
    'sub_r43_global_b', 'cus_r43_global_b',
    '38000000-0000-0000-0000-000000000101', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_r43_a_delayed_200', 200, 'test', 'updated',
    'sub_r43_global_a', 'cus_r43_global_a',
    '38000000-0000-0000-0000-000000000101', NULL,
    'active', 'starter', now() + interval '30 days', false
  );
  IF v_result->>'action' <> 'stale_user_mode_event_ignored' THEN
    RAISE EXCEPTION 'old subscription A replaced newer B: %', v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_ff_created', 400, 'test', 'created',
    'sub_r43_failure_first', 'cus_r43_failure_first',
    '38000000-0000-0000-0000-000000000102',
    'stripe-failure-first@example.invalid',
    'active', 'professional', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_invoice_event(
    'evt_r43_ff_failed', 500, 'test', 'sub_r43_failure_first', 'failed'
  );
  v_result := public.apply_stripe_subscription_invoice_event(
    'evt_r43_ff_succeeded', 500, 'test',
    'sub_r43_failure_first', 'succeeded'
  );
  IF v_result->>'subscriptionStatus' <> 'active'
     OR v_result->>'subscribed' <> 'true' THEN
    RAISE EXCEPTION 'equal-second success did not beat prior failure: %', v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_sf_created', 400, 'test', 'created',
    'sub_r43_success_first', 'cus_r43_success_first',
    '38000000-0000-0000-0000-000000000103',
    'stripe-success-first@example.invalid',
    'active', 'enterprise', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_invoice_event(
    'evt_r43_sf_succeeded', 500, 'test',
    'sub_r43_success_first', 'succeeded'
  );
  v_result := public.apply_stripe_subscription_invoice_event(
    'evt_r43_sf_failed', 500, 'test', 'sub_r43_success_first', 'failed'
  );
  IF v_result->>'applied' <> 'false' THEN
    RAISE EXCEPTION 'equal-second failure overrode prior success: %', v_result;
  END IF;

  v_result := public.apply_stripe_subscription_event(
    'evt_r43_ff_deleted', 500, 'test', 'deleted',
    'sub_r43_failure_first', 'cus_r43_failure_first',
    '38000000-0000-0000-0000-000000000102', NULL,
    'canceled', 'professional', now() + interval '30 days', true
  );
  IF v_result->>'subscriptionStatus' <> 'canceled'
     OR v_result->>'subscribed' <> 'false' THEN
    RAISE EXCEPTION 'equal-second deletion was not terminal: %', v_result;
  END IF;
  v_result := public.apply_stripe_subscription_invoice_event(
    'evt_r43_ff_after_delete_success', 600, 'test',
    'sub_r43_failure_first', 'succeeded'
  );
  IF v_result->>'action' <> 'terminal_or_stale_ignored' THEN
    RAISE EXCEPTION 'invoice success resurrected a deleted subscription: %', v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_mode_test', 900, 'test', 'created',
    'sub_r43_mode_test', 'cus_r43_mode_test',
    '38000000-0000-0000-0000-000000000104',
    'stripe-mode-order@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_mode_live', 100, 'live', 'created',
    'sub_r43_mode_live', 'cus_r43_mode_live',
    '38000000-0000-0000-0000-000000000104', NULL,
    'active', 'starter', now() + interval '30 days', false
  );

  -- Same-second active updates outrank created snapshots even when their event id
  -- sorts lower. Prove both arrival orders.
  PERFORM public.apply_stripe_subscription_event(
    'evt_z_r43_cu_created', 700, 'test', 'created',
    'sub_r43_created_updated', 'cus_r43_created_updated',
    '38000000-0000-0000-0000-000000000105',
    'stripe-created-update-first@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_a_r43_cu_updated', 700, 'test', 'updated',
    'sub_r43_created_updated', 'cus_r43_created_updated',
    '38000000-0000-0000-0000-000000000105', NULL,
    'active', 'starter', now() + interval '30 days', true
  );
  IF v_result->>'applied' <> 'true'
     OR v_result->>'subscriptionStatus' <> 'canceled' THEN
    RAISE EXCEPTION 'active update lost after created snapshot: %', v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_a_r43_uc_updated', 700, 'test', 'updated',
    'sub_r43_updated_created', 'cus_r43_updated_created',
    '38000000-0000-0000-0000-000000000106',
    'stripe-update-created-first@example.invalid',
    'active', 'starter', now() + interval '30 days', true
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_z_r43_uc_created', 700, 'test', 'created',
    'sub_r43_updated_created', 'cus_r43_updated_created',
    '38000000-0000-0000-0000-000000000106', NULL,
    'active', 'starter', now() + interval '30 days', false
  );
  IF v_result->>'action' <> 'stale_event_ignored' THEN
    RAISE EXCEPTION 'created snapshot overrode same-second active update: %',
      v_result;
  END IF;

  -- Deleting subscription A and activating replacement B in one Stripe second
  -- must converge on B regardless of provider delivery order.
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_df_a_created', 800, 'test', 'created',
    'sub_r43_df_a', 'cus_r43_df_a',
    '38000000-0000-0000-0000-000000000107',
    'stripe-replacement-delete-first@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_df_a_deleted', 900, 'test', 'deleted',
    'sub_r43_df_a', 'cus_r43_df_a',
    '38000000-0000-0000-0000-000000000107', NULL,
    'canceled', 'starter', now() + interval '30 days', true
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_r43_df_b_created', 900, 'test', 'created',
    'sub_r43_df_b', 'cus_r43_df_b',
    '38000000-0000-0000-0000-000000000107', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  IF v_result->>'authoritativeSubscriptionId' <> 'sub_r43_df_b'
     OR v_result->>'subscribed' <> 'true' THEN
    RAISE EXCEPTION 'delete-first replacement B was suppressed: %', v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_af_a_created', 800, 'test', 'created',
    'sub_r43_af_a', 'cus_r43_af_a',
    '38000000-0000-0000-0000-000000000108',
    'stripe-replacement-active-first@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_af_b_created', 900, 'test', 'created',
    'sub_r43_af_b', 'cus_r43_af_b',
    '38000000-0000-0000-0000-000000000108', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_r43_af_a_deleted', 900, 'test', 'deleted',
    'sub_r43_af_a', 'cus_r43_af_a',
    '38000000-0000-0000-0000-000000000108', NULL,
    'canceled', 'starter', now() + interval '30 days', true
  );
  IF v_result->>'action' <> 'stale_user_mode_event_ignored'
     OR v_result->>'authoritativeSubscriptionId' <> 'sub_r43_af_b' THEN
    RAISE EXCEPTION 'active-first replacement B was displaced: %', v_result;
  END IF;

  -- Once newer B has become authoritative and is deleted, a delayed event for
  -- older superseded A must not restore the prior paid entitlement.
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_old_a_created', 100, 'test', 'created',
    'sub_r43_old_a', 'cus_r43_old_a',
    '38000000-0000-0000-0000-000000000109',
    'stripe-older-superseded@example.invalid',
    'active', 'starter', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_new_b_created', 300, 'test', 'created',
    'sub_r43_new_b', 'cus_r43_new_b',
    '38000000-0000-0000-0000-000000000109', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_new_b_deleted', 500, 'test', 'deleted',
    'sub_r43_new_b', 'cus_r43_new_b',
    '38000000-0000-0000-0000-000000000109', NULL,
    'canceled', 'professional', now() + interval '30 days', true
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_r43_old_a_delayed_active', 400, 'test', 'updated',
    'sub_r43_old_a', 'cus_r43_old_a',
    '38000000-0000-0000-0000-000000000109', NULL,
    'active', 'starter', now() + interval '30 days', false
  );
  IF v_result->>'action' <> 'stale_user_mode_event_ignored'
     OR v_result->>'authoritativeSubscriptionId' <> 'sub_r43_new_b' THEN
    RAISE EXCEPTION 'older superseded A restored after B tombstone: %', v_result;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_event_high_water_marks
    WHERE user_id = '38000000-0000-0000-0000-000000000101'
      AND stripe_mode = 'test'
      AND last_event_created = 300
      AND authoritative_subscription_id = 'sub_r43_global_b'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000101'
      AND stripe_mode = 'test'
      AND stripe_subscription_id = 'sub_r43_global_b'
      AND subscription_tier = 'professional'
      AND subscribed = true
  ) THEN
    RAISE EXCEPTION 'user+mode high-water mark did not preserve newer subscription B';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_failure_first'
      AND tombstoned = true
      AND stripe_status = 'canceled'
      AND last_event_precedence = 300
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_success_first'
      AND tombstoned = false
      AND stripe_status = 'active'
      AND last_event_precedence = 200
  ) THEN
    RAISE EXCEPTION 'equal-second semantic ordering was not deterministic';
  END IF;

  IF (SELECT count(*) FROM public.subscription_event_high_water_marks
      WHERE user_id = '38000000-0000-0000-0000-000000000104') <> 2
     OR NOT EXISTS (
       SELECT 1 FROM public.subscription_event_high_water_marks
       WHERE user_id = '38000000-0000-0000-0000-000000000104'
         AND stripe_mode = 'test' AND last_event_created = 900
     ) OR NOT EXISTS (
       SELECT 1 FROM public.subscription_event_high_water_marks
       WHERE user_id = '38000000-0000-0000-0000-000000000104'
         AND stripe_mode = 'live' AND last_event_created = 100
  ) THEN
    RAISE EXCEPTION 'TEST and LIVE subscription high-water marks were not isolated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_created_updated'
      AND last_event_kind = 'updated'
      AND last_event_kind_precedence = 200
      AND last_event_id = 'evt_a_r43_cu_updated'
      AND cancel_at_period_end = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_updated_created'
      AND last_event_kind = 'updated'
      AND last_event_kind_precedence = 200
      AND last_event_id = 'evt_a_r43_uc_updated'
      AND cancel_at_period_end = true
  ) THEN
    RAISE EXCEPTION 'same-second updated snapshot did not win both arrival orders';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_event_high_water_marks
    WHERE user_id = '38000000-0000-0000-0000-000000000107'
      AND stripe_mode = 'test'
      AND last_event_created = 900
      AND last_event_precedence = 200
      AND last_event_kind_precedence = 100
      AND last_event_id = 'evt_r43_df_b_created'
      AND authoritative_subscription_id = 'sub_r43_df_b'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscription_event_high_water_marks
    WHERE user_id = '38000000-0000-0000-0000-000000000108'
      AND stripe_mode = 'test'
      AND last_event_created = 900
      AND last_event_precedence = 200
      AND last_event_kind_precedence = 100
      AND last_event_id = 'evt_r43_af_b_created'
      AND authoritative_subscription_id = 'sub_r43_af_b'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000107'
      AND stripe_subscription_id = 'sub_r43_df_b'
      AND subscription_tier = 'professional'
      AND subscribed = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000108'
      AND stripe_subscription_id = 'sub_r43_af_b'
      AND subscription_tier = 'professional'
      AND subscribed = true
  ) THEN
    RAISE EXCEPTION 'same-second replacement authority was arrival-order dependent';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_df_a'
      AND tombstoned = true AND superseded = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_df_b'
      AND stripe_status = 'active' AND superseded = false
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_af_a'
      AND tombstoned = true AND superseded = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_af_b'
      AND stripe_status = 'active' AND superseded = false
  ) THEN
    RAISE EXCEPTION 'replacement subscription state flags did not converge';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscription_event_high_water_marks
    WHERE user_id = '38000000-0000-0000-0000-000000000109'
      AND stripe_mode = 'test'
      AND last_event_created = 500
      AND authoritative_subscription_id = 'sub_r43_new_b'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_old_a'
      AND superseded = true AND tombstoned = false
      AND last_event_created = 100
  ) OR NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r43_new_b'
      AND superseded = false AND tombstoned = true
      AND last_event_created = 500
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000109'
      AND stripe_subscription_id = 'sub_r43_new_b'
      AND subscribed = false AND subscription_tier IS NULL
  ) THEN
    RAISE EXCEPTION 'older superseded state was not fenced by the global tombstone';
  END IF;
END;
$test$;

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.apply_stripe_subscription_event(
    'evt_r38_sub_created', 100, 'test', 'created',
    'sub_r38_monotonic', 'cus_r38_monotonic',
    '38000000-0000-0000-0000-000000000001',
    'stripe-monotonic-owner@example.invalid',
    'incomplete', 'professional', now() + interval '30 days', false
  );
  IF v_result->>'subscriptionStatus' <> 'missed_payment'
     OR v_result->>'subscribed' <> 'false' THEN
    RAISE EXCEPTION 'incomplete subscription granted access: %', v_result;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = '38000000-0000-0000-0000-000000000001'
      AND (grace_period_end IS NOT NULL OR subscription_tier IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000001'
      AND subscription_tier IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'first incomplete checkout manufactured grace or a paid tier';
  END IF;

  v_result := public.apply_stripe_subscription_event(
    'evt_r38_sub_active', 200, 'test', 'updated',
    'sub_r38_monotonic', 'cus_r38_monotonic',
    '38000000-0000-0000-0000-000000000001', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  IF v_result->>'subscriptionStatus' <> 'active'
     OR v_result->>'subscribed' <> 'true' THEN
    RAISE EXCEPTION 'active subscription did not grant access: %', v_result;
  END IF;

  v_result := public.apply_stripe_subscription_event(
    'evt_r38_sub_deleted', 300, 'test', 'deleted',
    'sub_r38_monotonic', 'cus_r38_monotonic',
    '38000000-0000-0000-0000-000000000001', NULL,
    'canceled', 'professional', now() + interval '30 days', true
  );
  IF v_result->>'subscriptionStatus' <> 'canceled'
     OR v_result->>'subscribed' <> 'false' THEN
    RAISE EXCEPTION 'deleted subscription did not remove access: %', v_result;
  END IF;

  v_result := public.apply_stripe_subscription_event(
    'evt_r38_sub_old_active', 250, 'test', 'updated',
    'sub_r38_monotonic', 'cus_r38_monotonic',
    '38000000-0000-0000-0000-000000000001', NULL,
    'active', 'professional', now() + interval '30 days', false
  );
  IF v_result->>'action' <> 'tombstone_preserved' THEN
    RAISE EXCEPTION 'older active event bypassed deletion tombstone: %', v_result;
  END IF;

  v_result := public.apply_stripe_subscription_invoice_event(
    'evt_r38_old_invoice_success', 350, 'test',
    'sub_r38_monotonic', 'succeeded'
  );
  IF v_result->>'action' <> 'terminal_or_stale_ignored' THEN
    RAISE EXCEPTION 'invoice resurrected a deleted subscription: %', v_result;
  END IF;

  BEGIN
    PERFORM public.apply_stripe_subscription_event(
      'evt_r38_live_conflict', 400, 'live', 'updated',
      'sub_r38_monotonic', 'cus_r38_monotonic',
      '38000000-0000-0000-0000-000000000001', NULL,
      'active', 'professional', now() + interval '30 days', false
    );
    RAISE EXCEPTION 'LIVE event reused a TEST subscription ledger';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    NULL;
  END;
END;
$test$;

DO $test$
DECLARE
  v_result jsonb;
  v_first_grace timestamptz;
  v_second_grace timestamptz;
BEGIN
  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_grace_active', 100, 'test', 'created',
    'sub_r43_grace_once', 'cus_r43_grace_once',
    '38000000-0000-0000-0000-000000000110',
    'stripe-grace-once@example.invalid',
    'active', 'professional', now() + interval '30 days', false
  );
  v_result := public.apply_stripe_subscription_event(
    'evt_r43_grace_failed_once', 200, 'test', 'updated',
    'sub_r43_grace_once', 'cus_r43_grace_once',
    '38000000-0000-0000-0000-000000000110', NULL,
    'past_due', 'professional', now() + interval '30 days', false
  );
  SELECT grace_period_end INTO v_first_grace
  FROM public.users
  WHERE id = '38000000-0000-0000-0000-000000000110';
  IF v_result->>'subscriptionStatus' <> 'missed_payment'
     OR v_first_grace IS NULL OR v_first_grace <= now()
     OR NOT EXISTS (
       SELECT 1 FROM public.users
       WHERE id = '38000000-0000-0000-0000-000000000110'
         AND subscription_tier = 'professional'
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.subscribers
       WHERE user_id = '38000000-0000-0000-0000-000000000110'
         AND subscribed = false AND subscription_tier = 'professional'
     ) THEN
    RAISE EXCEPTION 'paid entitlement was not preserved during first grace: %',
      v_result;
  END IF;

  PERFORM public.apply_stripe_subscription_event(
    'evt_r43_grace_failed_again', 300, 'test', 'updated',
    'sub_r43_grace_once', 'cus_r43_grace_once',
    '38000000-0000-0000-0000-000000000110', NULL,
    'unpaid', 'professional', now() + interval '30 days', false
  );
  SELECT grace_period_end INTO v_second_grace
  FROM public.users
  WHERE id = '38000000-0000-0000-0000-000000000110';
  IF v_second_grace IS DISTINCT FROM v_first_grace THEN
    RAISE EXCEPTION 'newer failure restarted grace: first %, second %',
      v_first_grace, v_second_grace;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.stripe_subscription_states
    WHERE stripe_subscription_id = 'sub_r38_monotonic'
      AND stripe_mode = 'test' AND tombstoned = true
      AND stripe_status = 'canceled' AND last_event_created = 300
  ) OR NOT EXISTS (
    SELECT 1 FROM public.subscribers
    WHERE user_id = '38000000-0000-0000-0000-000000000001'
      AND subscribed = false AND stripe_mode = 'test'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = '38000000-0000-0000-0000-000000000001'
      AND subscription_status = 'canceled'
  ) THEN
    RAISE EXCEPTION 'subscription tombstone did not remain authoritative';
  END IF;
END;
$test$;

SET LOCAL ROLE service_role;

DO $test$
DECLARE
  v_claim jsonb;
  v_second jsonb;
  v_replay jsonb;
  v_conflict jsonb;
  v_completed boolean;
BEGIN
  v_claim := public.claim_subscription_checkout(
    '38000000-0000-0000-0000-000000000001',
    'test', 'professional', 'month', 120
  );
  v_second := public.claim_subscription_checkout(
    '38000000-0000-0000-0000-000000000001',
    'test', 'professional', 'month', 120
  );
  IF v_claim->>'claimed' <> 'true'
     OR v_second->>'reason' <> 'in_progress' THEN
    RAISE EXCEPTION 'parallel subscription checkout was not fenced: %, %',
      v_claim, v_second;
  END IF;

  v_completed := public.complete_subscription_checkout(
    '38000000-0000-0000-0000-000000000001',
    'test', (v_claim->>'claim_token')::uuid,
    'cs_r38_subscription',
    'https://checkout.stripe.com/c/pay/cs_r38_subscription',
    now() + interval '1 hour'
  );
  IF v_completed IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'subscription checkout claim did not complete';
  END IF;

  v_replay := public.claim_subscription_checkout(
    '38000000-0000-0000-0000-000000000001',
    'test', 'professional', 'month', 120
  );
  v_conflict := public.claim_subscription_checkout(
    '38000000-0000-0000-0000-000000000001',
    'test', 'enterprise', 'year', 120
  );
  IF v_replay->>'replay' <> 'true'
     OR v_replay->>'session_id' <> 'cs_r38_subscription'
     OR v_conflict->>'reason' <> 'existing_session' THEN
    RAISE EXCEPTION 'durable checkout replay/conflict was unsafe: %, %',
      v_replay, v_conflict;
  END IF;
END;
$test$;

RESET ROLE;

DO $test$
BEGIN
  IF has_function_privilege(
    'service_role',
    'public.finalize_booking_payment_success(uuid,text,text,timestamptz)',
    'EXECUTE'
  ) OR has_function_privilege(
    'service_role',
    'public.reconcile_booking_refund(uuid,text,integer,timestamptz)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.record_booking_payment_failure(uuid,text,text,timestamptz)',
    'EXECUTE'
  ) OR has_table_privilege(
    'authenticated', 'public.stripe_subscription_states', 'SELECT'
  ) OR has_table_privilege(
    'anon', 'public.subscription_event_high_water_marks', 'SELECT'
  ) OR has_table_privilege(
    'authenticated', 'public.subscription_event_high_water_marks', 'SELECT'
  ) OR NOT has_table_privilege(
    'service_role', 'public.subscription_event_high_water_marks', 'SELECT'
  ) OR has_table_privilege(
    'authenticated', 'public.bookings', 'DELETE'
  ) THEN
    RAISE EXCEPTION 'R38 grants did not fail closed';
  END IF;
END;
$test$;

ROLLBACK;

SELECT 'STRIPE_MONOTONICITY_CONTRACT_PASS' AS result;
