import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";
import { buildWhatsappBookingPaymentRow } from "../_shared/taxReport.ts";
import { createTaxTransaction } from "../_shared/taxCalc.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// E-6 / E-6b: the terminal/dead booking statuses a late payment must NEVER resurrect.
// SINGLE source of truth (exact DB enum spelling, hyphen on no-show). Both call sites that
// need this set derive from THIS array so the JS guard (.includes) and the PostgREST filter
// (.not status in (...)) can never drift apart:
//   - DEAD_BOOKING_STATUSES         -> the JS array (.includes, .in(...))
//   - DEAD_BOOKING_STATUSES_PGLIST  -> the PostgREST in-list string ("a","b","c")
const DEAD_BOOKING_STATUSES = ['cancelled', 'completed', 'no-show'] as const;
const DEAD_BOOKING_STATUSES_PGLIST = `(${DEAD_BOOKING_STATUSES.map((s) => `"${s}"`).join(',')})`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      console.error("❌ No Stripe signature found");
      return new Response("Webhook signature verification failed", { status: 401 });
    }

    // Determine if test or live mode based on signature
    const webhookSecretTest = Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST");
    const webhookSecretLive = Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE");
    
    const body = await req.text();
    let event: Stripe.Event;
    let isTestMode = false;
    // The Stripe client that VERIFIED this event (TEST or LIVE). Captured here so the
    // booking handlers can read back the PaymentIntent in the same mode (used by the
    // F-TAX-23 booking_payments insert on WhatsApp Checkout completion). Mode is NEVER
    // taken from the body: it is the secret that actually verified the signature.
    let stripe: Stripe | null = null;

    // Deno's Stripe SDK only exposes async signature verification: its
    // SubtleCryptoProvider is async-only, so the synchronous constructEvent()
    // throws "Use constructEventAsync(...)" and the fn 400s on every delivery.
    // Verify with constructEventAsync + an explicit SubtleCrypto provider.
    const cryptoProvider = Stripe.createSubtleCryptoProvider();

    // Try test mode first
    if (webhookSecretTest) {
      try {
        const stripeTest = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST")!, { apiVersion: "2023-10-16" });
        event = await stripeTest.webhooks.constructEventAsync(body, signature, webhookSecretTest, undefined, cryptoProvider);
        isTestMode = true;
        stripe = stripeTest;
        console.log("✅ Webhook verified (TEST mode)");
      } catch (err) {
        // Try live mode
        if (webhookSecretLive) {
          try {
            const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, { apiVersion: "2023-10-16" });
            event = await stripeLive.webhooks.constructEventAsync(body, signature, webhookSecretLive, undefined, cryptoProvider);
            isTestMode = false;
            stripe = stripeLive;
            console.log("✅ Webhook verified (LIVE mode)");
          } catch (liveErr) {
            console.error("❌ Webhook signature verification failed (both modes)", liveErr);
            await logSecurityEvent(supabase, "stripe_verification_failed", null, {
              error: (liveErr as Error)?.message,
              test_error: (err as Error)?.message
            });
            return new Response(`Webhook Error: ${(liveErr as Error)?.message}`, { status: 400 });
          }
        } else {
          console.error("❌ Webhook signature verification failed", err);
          await logSecurityEvent(supabase, "stripe_verification_failed", null, { error: (err as Error)?.message });
          return new Response(`Webhook Error: ${(err as Error)?.message}`, { status: 400 });
        }
      }
    } else if (webhookSecretLive) {
      try {
        const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, { apiVersion: "2023-10-16" });
        event = await stripeLive.webhooks.constructEventAsync(body, signature, webhookSecretLive, undefined, cryptoProvider);
        isTestMode = false;
        stripe = stripeLive;
        console.log("✅ Webhook verified (LIVE mode)");
      } catch (err) {
        console.error("❌ Webhook signature verification failed", err);
        await logSecurityEvent(supabase, "stripe_verification_failed", null, { error: (err as Error)?.message });
        return new Response(`Webhook Error: ${(err as Error)?.message}`, { status: 400 });
      }
    } else {
      console.error("❌ No webhook secrets configured");
      return new Response("Webhook secrets not configured", { status: 500 });
    }

    console.log(`📨 Processing webhook: ${event.type}`, { mode: isTestMode ? 'test' : 'live' });

    // Idempotency: claim this event.id (see processed_stripe_events migration). A
    // duplicate delivery of the same id hits the PK conflict and is skipped, so a
    // Stripe retry can't double-process (re-open grace, flap tier, re-confirm).
    let claimedEventId: string | null = null;
    const { error: claimErr } = await supabase
      .from('processed_stripe_events')
      .insert({ event_id: event.id, event_type: event.type });
    if (claimErr) {
      if (claimErr.code === '23505') {
        console.log(`↩️ Duplicate webhook event ${event.id} (${event.type}); already processed, skipping.`);
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      // A non-conflict error must not drop a real event — log and continue.
      console.error("processed_stripe_events claim error (continuing):", claimErr);
    } else {
      claimedEventId = event.id;
    }

    // Process event based on type. Wrapped so a processing failure releases the
    // idempotency claim above and lets Stripe's retry re-process the event.
    try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(supabase, event.data.object as Stripe.Subscription, isTestMode);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription, isTestMode);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabase, event.data.object as Stripe.Invoice);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session, isTestMode, stripe);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;

      // Pay & Book: een boeking-PaymentIntent (create-booking-payment) is geslaagd ->
      // bevestig de boeking + stuur de bevestigingsmail die create-booking inhield.
      case 'payment_intent.succeeded':
        await handleBookingPaymentSucceeded(supabase, event.data.object as Stripe.PaymentIntent, stripe);
        break;

      // SEQP1R31 (finding R30-1): a refund (full or partial, no distinction, Mathew's
      // decision) on a booking-payment charge must stop that booking's reminders. Never
      // handled before this: the switch had no case at all for the refund-event family, so
      // a real refund silently no-op'd (reached processed_stripe_events, i.e. passed
      // signature verification + idempotency-claim, then fell to default). Only
      // 'charge.refunded' is handled (not the sibling 'refund.created'/'refund.updated'/
      // 'charge.refund.updated' events also seen on the account): 'charge.refunded' is the
      // single event that carries the charge's CURRENT authoritative refunded/amount_refunded
      // state (idempotent to re-derive from), while the refund.* family are per-refund-object
      // deltas that would require summing across possibly-multiple partial refunds to reach
      // the same conclusion this one event already gives directly.
      case 'charge.refunded':
        await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        break;

      // Connect: a merchant's account capabilities changed (finished onboarding,
      // charges/payouts enabled, etc.). Sync business_stripe_accounts so Pay & Book
      // un-disables automatically, without the merchant revisiting the settings page.
      // This is the single biggest Connect reliability gap (previously unhandled).
      case 'account.updated':
        await handleAccountUpdated(supabase, event.data.object as Stripe.Account);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    } catch (procErr) {
      // Release the claim so Stripe's retry can re-process this event.
      if (claimedEventId) {
        await supabase.from('processed_stripe_events').delete().eq('event_id', claimedEventId);
      }
      throw procErr;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return new Response(JSON.stringify({ error: (error as Error)?.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleSubscriptionCreated(
  supabase: any,
  subscription: Stripe.Subscription,
  isTestMode: boolean
) {
  console.log(`✅ Subscription created: ${subscription.id}`);
  
  const userId = subscription.metadata.user_id;
  if (!userId) {
    console.error("❌ No user_id in subscription metadata");
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const tier = await getTierFromPriceId(supabase, priceId, isTestMode);

  // Stripe >=2025-03-31 moved current_period_end onto the items; getCurrentPeriodEndISO
  // reads top-level then item-level and never throws (was a RangeError -> 500 -> no sync).
  const endDateIso = getCurrentPeriodEndISO(subscription);

  // Update users table. cancel_at_period_end reset to false: a brand-new subscription
  // (fresh checkout after a prior cancellation fully lapsed) starts clean, never
  // inheriting a stale pending-cancel flag from an earlier subscription lifecycle.
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      subscription_end_date: endDateIso,
      payment_status: 'paid',
      grace_period_end: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (userError) {
    console.error("❌ Error updating users table:", userError);
  }

  // Update subscribers table
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  const { error: subscriberError } = await supabase
    .from('subscribers')
    .upsert({
      user_id: userId,
      email: userData?.email || '',
      subscribed: true,
      subscription_tier: tier,
      subscription_end: endDateIso,
      stripe_subscription_id: subscription.id,
      // Zonder stripe_customer_id vinden handlePaymentFailed/Succeeded de user niet
      // (ze zoeken op stripe_customer_id) -> grace-period werd nooit gezet.
      stripe_customer_id: subscription.customer as string,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });

  if (subscriberError) {
    console.error("❌ Error updating subscribers table:", subscriberError);
  }

  await logSecurityEvent(supabase, "subscription_created", userId, {
    subscription_id: subscription.id,
    tier,
    mode: isTestMode ? 'test' : 'live'
  });

  console.log(`✅ Subscription created for user ${userId}, tier: ${tier}`);
}

async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription,
  isTestMode: boolean
) {
  console.log(`🔄 Subscription updated: ${subscription.id}`);
  
  // Find user by subscription ID
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for subscription:", subscription.id);
    return;
  }

  const userId = subscriber.user_id;
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = await getTierFromPriceId(supabase, priceId, isTestMode);
  // Stripe >=2025-03-31 moved current_period_end onto the items; resolve safely (was
  // a RangeError on the now-undefined top-level field -> 500 -> subscription never synced).
  const endDateIso = getCurrentPeriodEndISO(subscription);

  // R46 (P9-CANCELSTATE-INVISIBLE): a real portal cancel schedules the cancellation
  // for period end WITHOUT changing subscription.status (it stays 'active' until the
  // period genuinely ends and Stripe fires customer.subscription.deleted separately).
  // cancel_at_period_end / cancel_at / canceled_at are already top-level fields on the
  // Subscription object already in scope here -- no extra Stripe API call needed.
  // Treat a pending cancel as subscription_status='canceled' so it reuses the SAME
  // doctrine-correct canceled_but_active/canceled_and_inactive state machine that
  // get_user_status_type() already implements for the eventual full deletion, instead
  // of inventing a parallel status the rest of the app doesn't consult.
  const cancelPending = subscription.cancel_at_period_end === true;

  let subscriptionStatus = 'active';
  if (subscription.status === 'canceled' || cancelPending) {
    subscriptionStatus = 'canceled';
  } else if (subscription.status === 'past_due') {
    subscriptionStatus = 'missed_payment';
  } else if (subscription.status === 'incomplete') {
    subscriptionStatus = 'missed_payment';
  }

  // Keep grace_period_end consistent with the new status. Only missed-payment
  // states carry a 7-day grace window (matches handlePaymentFailed); recovery to
  // active or a cancellation must CLEAR it. The frontend folds gracePeriodActive
  // into hasFullAccess regardless of subscription_status, so a stale grace window
  // would otherwise leak full access into a recovered/canceled account.
  const graceEnd = subscriptionStatus === 'missed_payment'
    ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: subscriptionStatus,
      subscription_tier: subscriptionStatus === 'active' ? tier : null,
      subscription_end_date: endDateIso,
      grace_period_end: graceEnd,
      cancel_at_period_end: cancelPending,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (userError) {
    console.error("❌ Error updating users table:", userError);
  }

  // Update subscribers table. subscribers.subscribed intentionally stays true while a
  // cancel is only PENDING (Stripe's own subscription.status is still 'active', the
  // customer keeps full access until period end); it only flips false at genuine
  // deletion (handleSubscriptionDeleted). get_user_status_type() checks
  // users.subscription_status='canceled' BEFORE this table's short-circuit (R46
  // reorder), so a pending cancel is correctly surfaced without touching this table's
  // existing active-subscriber semantics.
  const { error: subscriberError } = await supabase
    .from('subscribers')
    .update({
      subscribed: subscription.status === 'active',
      subscription_tier: subscription.status === 'active' ? tier : null,
      subscription_end: endDateIso,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (subscriberError) {
    console.error("❌ Error updating subscribers table:", subscriberError);
  }

  await logSecurityEvent(supabase, "subscription_updated", userId, {
    subscription_id: subscription.id,
    status: subscription.status,
    cancel_at_period_end: cancelPending,
    cancel_at: subscription.cancel_at ?? null,
    canceled_at: subscription.canceled_at ?? null,
    tier
  });

  console.log(`✅ Subscription updated for user ${userId}${cancelPending ? ' (cancel scheduled for period end)' : ''}`);
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log(`🗑️ Subscription deleted: ${subscription.id}`);
  
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for subscription:", subscription.id);
    return;
  }

  const userId = subscriber.user_id;

  // Update users table - keep end date if it's in the future (canceled_but_active
  // vs canceled_and_inactive is decided by subscription_end_date in
  // get_user_status_type). Clear any grace window so a customer who failed payment
  // and then cancelled doesn't retain full access via a stale grace_period_end.
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'canceled',
      grace_period_end: null,
      cancel_at_period_end: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (userError) {
    console.error("❌ Error updating users table:", userError);
  }

  // Update subscribers table
  const { error: subscriberError } = await supabase
    .from('subscribers')
    .update({
      subscribed: false,
      subscription_tier: null,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (subscriberError) {
    console.error("❌ Error updating subscribers table:", subscriberError);
  }

  await logSecurityEvent(supabase, "subscription_deleted", userId, {
    subscription_id: subscription.id
  });

  console.log(`✅ Subscription deleted for user ${userId}`);
}

async function handlePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log(`⚠️ Payment failed: ${invoice.id}`);
  
  const customerId = invoice.customer as string;
  
  // Find user by Stripe customer ID
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for customer:", customerId);
    return;
  }

  const userId = subscriber.user_id;
  
  // Set grace period (7 days)
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'missed_payment',
      payment_status: 'unpaid',
      grace_period_end: gracePeriodEnd.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (userError) {
    console.error("❌ Error updating users table:", userError);
  }

  await logSecurityEvent(supabase, "payment_failed", userId, {
    invoice_id: invoice.id,
    grace_period_until: gracePeriodEnd.toISOString()
  });

  console.log(`⚠️ Payment failed for user ${userId}, grace period until ${gracePeriodEnd.toISOString()}`);
}

async function handlePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  console.log(`✅ Payment succeeded: ${invoice.id}`);
  
  const customerId = invoice.customer as string;
  
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for customer:", customerId);
    return;
  }

  const userId = subscriber.user_id;

  // Clear grace period and update status
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      payment_status: 'paid',
      grace_period_end: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (userError) {
    console.error("❌ Error updating users table:", userError);
  }

  await logSecurityEvent(supabase, "payment_succeeded", userId, {
    invoice_id: invoice.id
  });

  console.log(`✅ Payment succeeded for user ${userId}, grace period cleared`);
}

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session,
  isTestMode: boolean,
  stripe: Stripe | null
) {
  console.log(`✅ Checkout completed: ${session.id}`);

  // Pay & Book: een hosted Checkout voor een BOEKING (mode=payment) draagt een
  // booking_id in de metadata en heeft GEEN subscription. Bevestig + mail de boeking.
  const bookingId = session.metadata?.booking_id;
  if (bookingId) {
    await confirmBookingPaid(supabase, bookingId, session.payment_intent as string, stripe);
    return;
  }

  const userId = session.metadata?.user_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("❌ Missing user_id or subscription_id in session");
    return;
  }

  // Link subscription to user
  const { error } = await supabase
    .from('subscribers')
    .update({
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: session.customer as string,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    console.error("❌ Error linking subscription:", error);
  }

  await logSecurityEvent(supabase, "checkout_completed", userId, {
    session_id: session.id,
    subscription_id: subscriptionId,
    mode: isTestMode ? 'test' : 'live'
  });

  console.log(`✅ Checkout completed for user ${userId}`);
}

async function handleTrialWillEnd(
  supabase: any,
  subscription: Stripe.Subscription
) {
  console.log(`⏰ Trial will end: ${subscription.id}`);
  
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!subscriber) {
    console.error("❌ No user found for subscription:", subscription.id);
    return;
  }

  const userId = subscriber.user_id;

  await logSecurityEvent(supabase, "trial_will_end", userId, {
    subscription_id: subscription.id,
    trial_end: subscription.trial_end
  });

  console.log(`⏰ Trial will end notification for user ${userId}`);
}

// Pay & Book: bevestig de boeking + stuur de bevestigingsmail wanneer de boeking-
// PaymentIntent (create-booking-payment) slaagt. booking_id zit in de PI-metadata.
// Idempotent: webhook-retries mogen de boeking niet dubbel bevestigen of mailen.
async function handleBookingPaymentSucceeded(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent,
  stripe: Stripe | null
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) {
    // Niet elke payment_intent.succeeded is een boeking (geen booking_id -> negeren).
    return;
  }
  console.log(`💳 Booking payment succeeded: PI ${paymentIntent.id} -> booking ${bookingId}`);
  // The full PI is already in hand on this path, so pass it through: ensureBookingPaymentRow
  // can record the row with no extra Stripe round-trip (and no transient-retrieve failure mode).
  await confirmBookingPaid(supabase, bookingId, paymentIntent.id, stripe, paymentIntent);
}

// SEQP1R31 (finding R30-1, evidence launch-ready-loop/evidence/SEQ_P1_r30.md): a Stripe
// refund against a booking-payment charge must stop that booking's reminders. Mathew's
// decision (2026-07-07, "any refund stops reminders"): full or partial, no distinction --
// this handler does not branch on charge.amount_refunded vs charge.amount at all, any
// refunded=true charge with a booking_id in its metadata sets payment_status='refunded'.
// The booking's own `status` is DELIBERATELY left untouched (never auto-cancelled): the
// reminder-side gate (claim_booking_reminder / get_due_booking_reminders, SEQP1R31
// migration) is what actually stops the send, independent of status. Idempotent: a
// redelivered charge.refunded (or a second partial refund on the same charge) just
// re-writes the same 'refunded' value; the .neq guard below keeps a no-op write from
// happening at all once already set.
async function handleChargeRefunded(supabase: any, charge: Stripe.Charge) {
  const bookingId = charge.metadata?.booking_id;
  if (!bookingId) {
    // Not every charge.refunded is a booking-payment charge (subscription/other Stripe
    // objects can also be refunded) -- ignore anything without our booking_id metadata,
    // same convention as handleBookingPaymentSucceeded's early-return.
    return;
  }
  console.log(`↩️ Charge refunded: ${charge.id} (amount_refunded=${charge.amount_refunded}/${charge.amount}) -> booking ${bookingId}`);

  // Self-review catch (not in the original build, live-tested and reverted): a
  // .neq('payment_status','refunded') filter is a no-op on a row whose payment_status is SQL
  // NULL (NULL <> 'refunded' evaluates to NULL, not true -- confirmed live against the real
  // REST endpoint). Tried .or('payment_status.neq.refunded,payment_status.is.null') next, but
  // live-testing THAT against the real deployed supabase-js client (not just curl) surfaced a
  // second, worse PostgREST quirk: combining .eq() with .or() DOES perform the write
  // correctly, but the RETURNING/.select() response comes back an empty array regardless --
  // so the idempotency branch below would misreport a genuinely successful first-time write as
  // "already refunded". Simplest ROBUST fix: drop the conditional filter entirely. Setting
  // payment_status='refunded' on an already-'refunded' row is itself harmless and idempotent
  // (identical end state either way); a plain .eq('id', bookingId) with no payment_status
  // filter always matches and always returns the row, so the log branch below is now accurate
  // in every case (fresh write vs redelivery), not just usually accurate.
  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ payment_status: 'refunded' })
    .eq('id', bookingId)
    .select('id, status, payment_status');

  if (error) {
    // A money-adjacent state write failing silently would leave a refunded booking's
    // reminders still firing (the exact bug this round exists to fix) -- throw so the
    // switch-level catch releases the idempotency claim and Stripe retries the delivery.
    console.error(`❌ Failed to mark booking ${bookingId} payment_status='refunded' for charge ${charge.id}:`, error);
    throw new Error(`charge.refunded write failed for booking ${bookingId}: ${error.message ?? error}`);
  }
  if (!updated || updated.length === 0) {
    // No row with this id exists at all (deleted booking, bad metadata) -- not an error, just
    // nothing to gate.
    console.log(`ℹ️ No booking found for id ${bookingId} (charge ${charge.id}); nothing to mark refunded.`);
    return;
  }
  console.log(`✅ Booking ${bookingId} marked payment_status='refunded' (status untouched, stays '${updated[0].status}'). Reminders for this booking will now be gated off at claim time.`);
}

// Gedeeld door beide betaal-routes (hosted Checkout: checkout.session.completed,
// en Elements/installments: payment_intent.succeeded). Bevestigt de boeking +
// stuurt de in create-booking ingehouden bevestigingsmail. Idempotent: webhook-
// retries én het dubbel-event (beide routes vuren soms) mogen niet dubbel mailen.
async function confirmBookingPaid(
  supabase: any,
  bookingId: string,
  paymentIntentId?: string | null,
  stripe?: Stripe | null,
  // Optional: the already-resolved PaymentIntent (payment_intent.succeeded carries it).
  // When supplied, ensureBookingPaymentRow skips the Stripe retrieve.
  prefetchedPi?: Stripe.PaymentIntent | null
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, payment_status, customer_email, customer_name, internal_notes')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    console.error(`❌ Booking ${bookingId} not found`);
    return;
  }

  // F-TAX-23: ensure the booking_payments row exists even for the WhatsApp /
  // hosted-Checkout path BEFORE the already-paid short-circuit. The web path
  // (create-booking-payment) inserts this row up front; the WhatsApp path never did,
  // so a paid WhatsApp VAT charge was invisible to the tax filing reports (they read
  // FROM booking_payments). We run this first so a retry that arrives after the
  // booking is already 'paid' (the dual-event / Stripe-retry case) still backfills a
  // missing row, and the UNIQUE(stripe_payment_intent_id) upsert below never
  // double-inserts. No-op when a row already exists (web path, or a prior delivery).
  await ensureBookingPaymentRow(supabase, bookingId, paymentIntentId, booking, stripe, prefetchedPi);

  // CROSS-BORDER (X2, case (a)): record the Stripe Tax filing transaction for a positive
  // collectible cross-border charge (no-op unless the PI carries tax_transaction_pending;
  // registration-gated, D-CB-REG). Runs before the already-paid short-circuit so a retry
  // still records it; createTaxTransaction is idempotent on the PI id.
  await recordTaxFilingTransactionIfPending(stripe, prefetchedPi);

  // E-6 / E-6b: idempotency for the resurrection path. If we already flagged this booking
  // for manual refund (a prior delivery of this same late payment), do not re-flag or
  // re-write. The booking_payments row + tax filing were already recorded above
  // (ensureBookingPaymentRow / recordTaxFilingTransactionIfPending are idempotent).
  // NOTE: this runs BEFORE the payment_status==='paid' early-return on purpose, so a
  // dead booking that somehow already carries payment_status='paid' is still caught by
  // the dead-status guard below and flagged, instead of silently early-returning (E-6b
  // sev-4 ordering fix).
  if (booking.payment_status === 'refund_required') {
    console.log(`ℹ️ Booking ${bookingId} already flagged refund_required; skipping (idempotent).`);
    return;
  }

  // E-6 (money + double-book break), generalized to all terminal/dead statuses by E-6b.
  // A payment that lands AFTER a booking has reached a TERMINAL state must NEVER flip it
  // to 'confirmed'. The dead-status set (DB enum bookings_status_check):
  //   - 'cancelled': cancel_overdue_unpaid_bookings freed the slot once
  //     payment_deadline_hours passed (the slot may already be re-booked); or an owner /
  //     the agent cancelled it. Resurrecting re-occupies a freed/possibly-rebooked slot.
  //   - 'completed' / 'no-show': the appointment is already over. A late payment must not
  //     re-open it, send a fresh confirmation mail, or silently capture money untraced.
  // For ANY of these: keep the booking in its dead status, flag it for MANUAL refund
  // (router rule #3 forbids auto-running a refund or inventing a money-action here), and
  // record WHY. The booking_payments row stays 'succeeded' on purpose: the charge is REAL
  // captured revenue and a real tax obligation (the filing reports must see it); the owner
  // reconciles it via the refund_required flag.
  if ((DEAD_BOOKING_STATUSES as readonly string[]).includes(booking.status)) {
    const reason = `[E-6b ${new Date().toISOString()}] Late payment (PI ${paymentIntentId ?? 'n/a'}) landed AFTER this booking reached a terminal status (${booking.status}). Money was captured; booking NOT resurrected. MANUAL REFUND REQUIRED.`;
    const mergedNotes = booking.internal_notes
      ? `${booking.internal_notes}\n${reason}`
      : reason;
    // Idempotent + no-clobber: only flag while the row is still in a dead status AND not
    // already flagged refund_required (belt-and-suspenders with the early-return above for
    // a concurrent redelivery). 0 rows updated -> already handled, leave it.
    const { data: flagged, error: flagErr } = await supabase
      .from('bookings')
      .update({ payment_status: 'refund_required', internal_notes: mergedNotes })
      .eq('id', bookingId)
      .in('status', DEAD_BOOKING_STATUSES as readonly string[])
      .neq('payment_status', 'refund_required')
      .select('id');
    if (flagErr) {
      // F-E6-V2 (money error-path): the flag-write FAILED, so this dead booking is NOT yet
      // marked refund_required while money has been captured. We must NOT return 200 (Stripe
      // would treat the event as handled and never retry, leaving the charge un-flagged).
      // THROW: the switch-level catch releases the idempotency claim and the handler 500s, so
      // Stripe RETRIES. The retry re-runs this same branch (booking is still terminal + still
      // not refund_required) and flags it exactly once; the refund_required early-return + the
      // .neq('payment_status','refund_required') guard keep a later success idempotent. The
      // booking_payments / tax rows written above are idempotent, so the retry does not
      // double-process them.
      console.error(`❌ F-E6-V2: failed to flag terminal booking ${bookingId} (${booking.status}) for manual refund; throwing so Stripe retries:`, flagErr);
      throw new Error(`E-6b flag-write failed for booking ${bookingId}: ${flagErr.message ?? flagErr}`);
    }
    if (!flagged || flagged.length === 0) {
      console.log(`ℹ️ E-6b: booking ${bookingId} (${booking.status}) already flagged / no longer terminal; not re-noting (idempotent).`);
      return;
    }
    // Make sure the payment ledger row reflects the captured charge so the owner can find it.
    const { error: payErr } = paymentIntentId
      ? await supabase.from('booking_payments').update({ status: 'succeeded' }).eq('stripe_payment_intent_id', paymentIntentId)
      : await supabase.from('booking_payments').update({ status: 'succeeded' }).eq('booking_id', bookingId);
    if (payErr) {
      console.error(`❌ E-6b: failed to mark booking_payments succeeded for terminal booking ${bookingId}:`, payErr);
    }
    console.warn(`⚠️ E-6b REFUND REQUIRED: terminal booking ${bookingId} (${booking.status}) received a late payment (PI ${paymentIntentId ?? 'n/a'}). NOT resurrected; flagged refund_required. Owner must refund manually.`);
    return; // never send a confirmation mail, never set status='confirmed'
  }

  // Legit already-paid idempotency: a normal confirmed/paid booking whose event is
  // redelivered (or the dual checkout.session.completed + payment_intent.succeeded case).
  // Runs AFTER the dead-status guard so a dead+paid row is flagged, not skipped (E-6b).
  if (booking.payment_status === 'paid') {
    console.log(`ℹ️ Booking ${bookingId} already paid; skipping (idempotent).`);
    return;
  }

  // Markeer betaald + bevestigd. (Normal path: booking is still pending/valid.)
  // .not('status','in', deadset) + the returned-row check below close the TOCTOU window:
  // if the cancel cron (or an owner) cancels/completes/no-shows this booking between the
  // read above and this write, the UPDATE matches 0 rows (Supabase does NOT raise an error
  // on a 0-row update), so we must inspect the returned rows, not just `error`. 0 rows ->
  // do NOT mark the payment succeeded and do NOT send a confirmation mail for a booking
  // that is no longer confirmable. The next delivery of this same event then takes the
  // dead-status branch above (status is now terminal) and flags it for manual refund.
  const { data: confirmed, error: confirmErr } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', bookingId)
    .not('status', 'in', DEAD_BOOKING_STATUSES_PGLIST)
    .select('id');
  if (confirmErr) {
    console.error(`❌ Failed to confirm booking ${bookingId} (payment_status/status update):`, confirmErr);
    return; // do not send a confirmation mail for a write we are not sure landed
  }
  if (!confirmed || confirmed.length === 0) {
    // The booking was cancelled between the read and this write (rare TOCTOU). Do not
    // confirm, do not mail; leave the captured charge for the next delivery to flag.
    console.warn(`⚠️ Booking ${bookingId} was not confirmed (no longer pending; cancelled after read). Skipping mail; a redelivery will flag refund if money landed.`);
    return;
  }

  // Werk de payment-rij bij (op PI-id indien bekend, anders op booking_id).
  // (ensureBookingPaymentRow already wrote 'succeeded' for an inserted WhatsApp row;
  // this keeps the web-path pending->succeeded transition working unchanged.)
  if (paymentIntentId) {
    const { error: bpErr } = await supabase.from('booking_payments')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_intent_id', paymentIntentId);
    if (bpErr) console.error(`booking_payments succeeded update failed (PI ${paymentIntentId}):`, bpErr);
  } else {
    const { error: bpErr } = await supabase.from('booking_payments')
      .update({ status: 'succeeded' })
      .eq('booking_id', bookingId);
    if (bpErr) console.error(`booking_payments succeeded update failed (booking ${bookingId}):`, bpErr);
  }

  // Stuur nu de bevestigingsmail die create-booking inhield tot na betaling.
  try {
    await supabase.functions.invoke('send-booking-confirmation', {
      body: { booking_id: bookingId },
    });
  } catch (mailErr) {
    console.error('Bevestigingsmail na betaling mislukt (niet-fataal):', mailErr);
  }

  console.log(`✅ Booking ${bookingId} confirmed + paid`);
}

// F-TAX-23: idempotently INSERT the booking_payments row for a paid booking when one
// does not already exist, so the WhatsApp / hosted-Checkout pay-and-book path becomes
// visible to the tax filing reports (which read FROM booking_payments). The web path
// (create-booking-payment) already inserts this row up front, so this is a no-op there.
//
// Idempotency (HARD requirement): the insert is an upsert on the UNIQUE
// stripe_payment_intent_id with ignoreDuplicates, so a webhook retry, the dual-event
// case (checkout.session.completed AND payment_intent.succeeded both fire for one
// booking), and an already-existing web-path row can NEVER create a second row or
// double-count in the reports.
//
// Charge economics are NOT touched: this only mirrors the already-charged PI into the
// app's own booking_payments ledger; amount/fee/transfer were fixed at charge time by
// whatsapp-payment-handler. The PI is READ (platform context) to copy its authoritative
// amount/currency/destination; no money action is taken.
// CROSS-BORDER (X3b-1): reconstruct the three X1 persistence values from the markers
// whatsapp-payment-handler stamped onto the PI metadata. tax_breakdown is carried as a
// compact JSON string; we parse it defensively. If it is absent OR unparseable (e.g. a
// 500-char Stripe-metadata truncation on an unusually long breakdown), we DO NOT silently
// drop the tax outcome: we reconstruct a minimal breakdown from the discrete guard /
// reverse-charge markers + customer_country so the report (X6) still surfaces the right
// line (reverse-charge 0% / cross-border-unavailable / domestic-unavailable) instead of a
// fake clean 0%. in_person / domestic charges carry no markers -> null/null/false.
function readCrossBorderMarkers(pi: Stripe.PaymentIntent): {
  customerCountry: string | null;
  taxBreakdown: unknown | null;
  reverseCharge: boolean;
} {
  const meta = (pi.metadata ?? {}) as Record<string, string>;
  const customerCountry = typeof meta.customer_country === 'string' && meta.customer_country.length === 2
    ? meta.customer_country.toUpperCase()
    : null;
  const reverseCharge = meta.reverse_charge === 'true';

  let taxBreakdown: unknown | null = null;
  const rawBreakdown = typeof meta.tax_breakdown === 'string' ? meta.tax_breakdown : '';
  if (rawBreakdown) {
    try {
      const parsed = JSON.parse(rawBreakdown);
      if (Array.isArray(parsed)) taxBreakdown = parsed;
    } catch (_e) {
      // Unparseable (truncated) -> fall through to the marker-based reconstruction below.
      taxBreakdown = null;
    }
  }

  // No usable breakdown but a guard / reverse-charge marker is present -> reconstruct a
  // minimal one so the outcome is never lost (never a silent clean 0%).
  if (!taxBreakdown) {
    const reason = meta.cross_border_status || meta.domestic_status
      || (reverseCharge ? 'reverse_charge' : null);
    if (reason) {
      taxBreakdown = [{
        amountCents: 0,
        inclusive: false,
        taxabilityReason: reason,
        country: customerCountry,
        percentageDecimal: null,
        taxType: null,
      }];
    }
  }

  return { customerCountry, taxBreakdown, reverseCharge };
}

async function ensureBookingPaymentRow(
  supabase: any,
  bookingId: string,
  paymentIntentId: string | null | undefined,
  booking: { customer_email?: string | null; customer_name?: string | null },
  stripe?: Stripe | null,
  prefetchedPi?: Stripe.PaymentIntent | null
) {
  // No PI id (legacy conversation-only flow) -> nothing to key the row on; skip.
  if (!paymentIntentId) return;

  // Already recorded (web path inserted it, or a prior delivery did) -> no-op.
  // (The UNIQUE(stripe_payment_intent_id) upsert below is the actual race guard; this
  // pre-check just avoids the Stripe retrieve + a write attempt on the common case.)
  const { data: existing } = await supabase
    .from('booking_payments')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .maybeSingle();
  if (existing) return;

  // Resolve the PI's authoritative figures (amount, currency, the connected destination
  // account the reports filter by, fee). On payment_intent.succeeded the PI is already in
  // hand (prefetchedPi). Otherwise (checkout.session.completed) retrieve it on the PLATFORM
  // account (destination charges live there, the F-TAX-21 seam) via the verifying client.
  let pi: Stripe.PaymentIntent;
  if (prefetchedPi && prefetchedPi.id === paymentIntentId) {
    pi = prefetchedPi;
  } else {
    if (!stripe) {
      console.error(`F-TAX-23: no Stripe client to read PI ${paymentIntentId}; cannot record booking_payments row.`);
      return;
    }
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] });
    } catch (err) {
      console.error(`F-TAX-23: failed to retrieve PI ${paymentIntentId} on platform; skipping row insert:`, (err as Error)?.message);
      return;
    }
  }

  // Only record a SETTLED charge as 'succeeded'. An async method (SEPA debit, or an iDEAL
  // that resolves to 'processing') can complete the Checkout session before the money
  // clears; recording it 'succeeded' would surface it in the VAT filing report before it
  // settles. The reports filter status IN (succeeded, completed), so a not-yet-succeeded
  // PI is simply not recorded here; the later payment_intent.succeeded event (which carries
  // the PI with status 'succeeded') backfills the row. iDEAL/card (BA's default methods)
  // are synchronous, so the row is created on first delivery.
  if (pi.status !== 'succeeded') {
    console.log(`F-TAX-23: PI ${paymentIntentId} status '${pi.status}' not yet succeeded; deferring booking_payments row to payment_intent.succeeded.`);
    return;
  }

  // The connected account this destination charge transfers to == the value the tax
  // reports filter booking_payments.stripe_account_id by. Read it from the PI itself.
  const connectedAccountId = typeof pi.transfer_data?.destination === 'string'
    ? pi.transfer_data.destination
    : (pi.transfer_data?.destination as { id?: string } | undefined)?.id;

  if (!connectedAccountId) {
    console.error(`F-TAX-23: PI ${paymentIntentId} has no transfer_data.destination; not a destination charge, skipping row insert.`);
    return;
  }

  // payment_method_type is a display/CSV column on the reports (tax math is unaffected).
  // Only record it from the ACTUAL charge; if latest_charge is not expanded/available,
  // leave it null (the reports default to 'card' when null) rather than guessing from the
  // OFFERED payment_method_types list, which would mislabel the method actually used.
  const latestCharge = (pi.latest_charge && typeof pi.latest_charge === 'object')
    ? pi.latest_charge as Stripe.Charge
    : null;
  const paymentMethodType = latestCharge?.payment_method_details?.type ?? null;

  // CROSS-BORDER (X3b-1): read the cross-border markers whatsapp-payment-handler stamped
  // onto the PI metadata and persist the three X1 columns onto the row, so a remote
  // WhatsApp charge is report-visible per-jurisdiction (X6), not just a blended figure.
  // The web path (create-booking-payment) inserts these columns up front; the WhatsApp
  // path's only inserter is THIS function, so the persistence lands here. in_person /
  // domestic charges carry no markers -> null/null/false (byte-identical to before).
  const cb = readCrossBorderMarkers(pi);

  const row = buildWhatsappBookingPaymentRow({
    bookingId,
    paymentIntentId,
    connectedAccountId,
    amountCents: pi.amount,
    currency: pi.currency,
    applicationFeeCents: pi.application_fee_amount ?? 0,
    customerEmail: booking.customer_email ?? null,
    customerName: booking.customer_name ?? null,
    paymentMethodType,
    customerCountry: cb.customerCountry,
    taxBreakdown: cb.taxBreakdown,
    reverseCharge: cb.reverseCharge,
  });

  // Upsert on the UNIQUE PI id; ignoreDuplicates makes a concurrent dual-event / retry
  // a no-op instead of a 23505 or a second row.
  const { error: insertErr } = await supabase
    .from('booking_payments')
    .upsert(row, { onConflict: 'stripe_payment_intent_id', ignoreDuplicates: true });

  if (insertErr) {
    // A duplicate-key race is benign (the row exists); anything else is logged but
    // never throws here (the report-visibility insert must not 500 the webhook).
    if (insertErr.code === '23505') {
      console.log(`F-TAX-23: booking_payments row for PI ${paymentIntentId} already existed (race); no-op.`);
    } else {
      console.error(`F-TAX-23: failed to insert booking_payments row for PI ${paymentIntentId}:`, insertErr.message);
    }
    return;
  }
  console.log(`F-TAX-23: recorded booking_payments row for PI ${paymentIntentId} (booking ${bookingId}, acct ${connectedAccountId}).`);
}

// CROSS-BORDER (X2, case (a)): when a remote/digital service was charged with a POSITIVE
// collectible cross-border VAT, create-booking-payment stamped the PI metadata with
// `tax_calculation` (the Stripe Tax calculation id) and `tax_transaction_pending=true`.
// On payment success we record the filing transaction (transactions/create_from_calculation)
// so the calc becomes a recorded liability for the OSS/VAT return.
//
// Idempotent + best-effort: Stripe dedupes on `reference` (the PI id), and a failure here
// is logged but NEVER throws (a missing filing transaction is a reporting concern, not a
// money/charge concern; booking_payments.tax_breakdown already carries the figures, which
// is what the reports read). This path is REGISTRATION-GATED (D-CB-REG): until the merchant
// activates Stripe Tax + an OSS/destination registration on the connected account, Stripe
// returns not_collecting cross-border and `tax_transaction_pending` is never set, so this
// is a no-op. The code path exists so it works the moment registration clears.
async function recordTaxFilingTransactionIfPending(
  stripe: Stripe | null | undefined,
  pi: Stripe.PaymentIntent | null | undefined,
) {
  if (!stripe || !pi) return;
  const meta = pi.metadata ?? {};
  const calcId = typeof meta.tax_calculation === 'string' ? meta.tax_calculation : null;
  const pending = meta.tax_transaction_pending === 'true';
  if (!calcId || !pending) return;

  const connectedAccountId = typeof pi.transfer_data?.destination === 'string'
    ? pi.transfer_data.destination
    : (pi.transfer_data?.destination as { id?: string } | undefined)?.id;
  if (!connectedAccountId) return;

  const secretKey = Deno.env.get(
    (Deno.env.get('STRIPE_MODE') === 'live') ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY_TEST',
  );
  if (!secretKey) {
    console.error(`X2: no Stripe secret key to record tax transaction for PI ${pi.id}.`);
    return;
  }

  try {
    // The calculation was computed in the platform context today (connectedTaxActive
    // false), so record the transaction in the same context. When Tax is active on the
    // connected account this flips to the connected context with the Stripe-Account header.
    const txId = await createTaxTransaction({
      stripeSecretKey: secretKey,
      calculationId: calcId,
      reference: pi.id,
      connectedAccountId,
      connectedTaxActive: false,
    });
    console.log(`X2: recorded Stripe Tax transaction ${txId} for PI ${pi.id} (calc ${calcId}).`);
  } catch (err) {
    console.error(`X2: failed to record Stripe Tax transaction for PI ${pi.id} (non-fatal):`, (err as Error)?.message);
  }
}

async function getTierFromPriceId(
  supabase: any,
  priceId: string,
  isTestMode: boolean
): Promise<string> {
  const priceColumn = isTestMode 
    ? 'stripe_test_monthly_price_id,stripe_test_yearly_price_id'
    : 'stripe_live_monthly_price_id,stripe_live_yearly_price_id';

  const { data: tiers } = await supabase
    .from('subscription_tiers')
    .select(`tier_name, ${priceColumn}`)
    .or(`stripe_test_monthly_price_id.eq.${priceId},stripe_test_yearly_price_id.eq.${priceId},stripe_live_monthly_price_id.eq.${priceId},stripe_live_yearly_price_id.eq.${priceId}`);

  if (tiers && tiers.length > 0) {
    return tiers[0].tier_name.toLowerCase();
  }

  // Unknown price ID (e.g. a new Stripe price minted after a price change, not yet in
  // subscription_tiers). Fall back CONSERVATIVELY to the lowest paid tier — never the
  // most expensive ('professional') — so a misconfiguration can't silently grant a
  // customer more access than they paid for. Log it so it gets noticed + fixed.
  console.warn(`⚠️ Unknown price ID: ${priceId}, defaulting to the lowest paid tier 'starter'`);
  await logSecurityEvent(supabase, 'unknown_price_id_tier_fallback', null, { priceId, isTestMode });
  return 'starter';
}

async function logSecurityEvent(
  supabase: any,
  eventType: string,
  userId: string | null,
  details: any
) {
  const { error } = await supabase
    .from('webhook_security_logs')
    .insert({
      event_type: `stripe_${eventType}`,
      severity: eventType.includes('failed') || eventType.includes('verification') ? 'high' : 'info',
      user_id: userId,
      event_data: {
        ...details,
        processed_at: new Date().toISOString()
      }
    });

  if (error) {
    console.error("❌ Error logging security event:", error);
  }
}

// Connect: a merchant's account capabilities changed. Mirror them into
// business_stripe_accounts (matched by stripe_account_id) so Pay & Book un-disables
// automatically once Stripe enables charges, instead of waiting for the merchant to
// revisit the settings page and trigger a manual refresh poll.
async function handleAccountUpdated(supabase: any, account: Stripe.Account) {
  const chargesEnabled = account.charges_enabled === true;
  const payoutsEnabled = account.payouts_enabled === true;
  const detailsSubmitted = account.details_submitted === true;
  const accountStatus = chargesEnabled ? 'active' : (detailsSubmitted ? 'pending' : 'incomplete');

  const { data, error } = await supabase
    .from('business_stripe_accounts')
    .update({
      charges_enabled: chargesEnabled,
      payouts_enabled: payoutsEnabled,
      details_submitted: detailsSubmitted,
      onboarding_completed: detailsSubmitted,
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_account_id', account.id)
    .select('id');

  if (error) {
    console.error(`❌ account.updated sync failed for ${account.id}:`, error);
    return;
  }
  if (!data || data.length === 0) {
    // An account we don't track yet (or never inserted) — not an error.
    console.log(`ℹ️ account.updated for untracked account ${account.id}`);
    return;
  }
  console.log(`✅ account.updated synced ${account.id}: charges=${chargesEnabled} payouts=${payoutsEnabled} details=${detailsSubmitted}`);
}
