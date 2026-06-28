import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
        console.log("✅ Webhook verified (TEST mode)");
      } catch (err) {
        // Try live mode
        if (webhookSecretLive) {
          try {
            const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, { apiVersion: "2023-10-16" });
            event = await stripeLive.webhooks.constructEventAsync(body, signature, webhookSecretLive, undefined, cryptoProvider);
            isTestMode = false;
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
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session, isTestMode);
        break;
      
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(supabase, event.data.object as Stripe.Subscription);
        break;

      // Pay & Book: een boeking-PaymentIntent (create-booking-payment) is geslaagd ->
      // bevestig de boeking + stuur de bevestigingsmail die create-booking inhield.
      case 'payment_intent.succeeded':
        await handleBookingPaymentSucceeded(supabase, event.data.object as Stripe.PaymentIntent);
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

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      subscription_end_date: endDateIso,
      payment_status: 'paid',
      grace_period_end: null,
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

  let subscriptionStatus = 'active';
  if (subscription.status === 'canceled') {
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
    tier
  });

  console.log(`✅ Subscription updated for user ${userId}`);
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
  isTestMode: boolean
) {
  console.log(`✅ Checkout completed: ${session.id}`);

  // Pay & Book: een hosted Checkout voor een BOEKING (mode=payment) draagt een
  // booking_id in de metadata en heeft GEEN subscription. Bevestig + mail de boeking.
  const bookingId = session.metadata?.booking_id;
  if (bookingId) {
    await confirmBookingPaid(supabase, bookingId, session.payment_intent as string);
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
  paymentIntent: Stripe.PaymentIntent
) {
  const bookingId = paymentIntent.metadata?.booking_id;
  if (!bookingId) {
    // Niet elke payment_intent.succeeded is een boeking (geen booking_id -> negeren).
    return;
  }
  console.log(`💳 Booking payment succeeded: PI ${paymentIntent.id} -> booking ${bookingId}`);
  await confirmBookingPaid(supabase, bookingId, paymentIntent.id);
}

// Gedeeld door beide betaal-routes (hosted Checkout: checkout.session.completed,
// en Elements/installments: payment_intent.succeeded). Bevestigt de boeking +
// stuurt de in create-booking ingehouden bevestigingsmail. Idempotent: webhook-
// retries én het dubbel-event (beide routes vuren soms) mogen niet dubbel mailen.
async function confirmBookingPaid(
  supabase: any,
  bookingId: string,
  paymentIntentId?: string | null
) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, payment_status')
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    console.error(`❌ Booking ${bookingId} not found`);
    return;
  }
  if (booking.payment_status === 'paid') {
    console.log(`ℹ️ Booking ${bookingId} already paid; skipping (idempotent).`);
    return;
  }

  // Markeer betaald + bevestigd.
  await supabase
    .from('bookings')
    .update({ payment_status: 'paid', status: 'confirmed' })
    .eq('id', bookingId);

  // Werk de payment-rij bij (op PI-id indien bekend, anders op booking_id).
  if (paymentIntentId) {
    await supabase.from('booking_payments')
      .update({ status: 'succeeded' })
      .eq('stripe_payment_intent_id', paymentIntentId);
  } else {
    await supabase.from('booking_payments')
      .update({ status: 'succeeded' })
      .eq('booking_id', bookingId);
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
