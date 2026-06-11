import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Try test mode first
    if (webhookSecretTest) {
      try {
        const stripeTest = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST")!, { apiVersion: "2023-10-16" });
        event = stripeTest.webhooks.constructEvent(body, signature, webhookSecretTest);
        isTestMode = true;
        console.log("✅ Webhook verified (TEST mode)");
      } catch (err) {
        // Try live mode
        if (webhookSecretLive) {
          try {
            const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, { apiVersion: "2023-10-16" });
            event = stripeLive.webhooks.constructEvent(body, signature, webhookSecretLive);
            isTestMode = false;
            console.log("✅ Webhook verified (LIVE mode)");
          } catch (liveErr) {
            console.error("❌ Webhook signature verification failed (both modes)", liveErr);
            await logSecurityEvent(supabase, "stripe_verification_failed", null, {
              error: liveErr.message,
              test_error: err.message
            });
            return new Response(`Webhook Error: ${liveErr.message}`, { status: 400 });
          }
        } else {
          console.error("❌ Webhook signature verification failed", err);
          await logSecurityEvent(supabase, "stripe_verification_failed", null, { error: err.message });
          return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }
      }
    } else if (webhookSecretLive) {
      try {
        const stripeLive = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_LIVE")!, { apiVersion: "2023-10-16" });
        event = stripeLive.webhooks.constructEvent(body, signature, webhookSecretLive);
        isTestMode = false;
        console.log("✅ Webhook verified (LIVE mode)");
      } catch (err) {
        console.error("❌ Webhook signature verification failed", err);
        await logSecurityEvent(supabase, "stripe_verification_failed", null, { error: err.message });
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      console.error("❌ No webhook secrets configured");
      return new Response("Webhook secrets not configured", { status: 500 });
    }

    console.log(`📨 Processing webhook: ${event.type}`, { mode: isTestMode ? 'test' : 'live' });

    // Process event based on type
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
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
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
  
  const endDate = new Date(subscription.current_period_end * 1000);

  // Update users table
  const { error: userError } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_tier: tier,
      subscription_end_date: endDate.toISOString(),
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
      subscription_end: endDate.toISOString(),
      stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString()
    });

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
  const endDate = new Date(subscription.current_period_end * 1000);

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
      subscription_end_date: endDate.toISOString(),
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
      subscription_end: endDate.toISOString(),
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

  console.warn(`⚠️ Unknown price ID: ${priceId}, defaulting to 'professional'`);
  return 'professional';
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
