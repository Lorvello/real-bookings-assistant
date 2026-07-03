import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";
import { getCurrentPeriodEndISO } from "../_shared/subscriptionPeriod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // SECURITY: Server-side validation of Stripe mode (cannot be bypassed by client)
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const stripeConfig = await validateStripeConfig(
      undefined, // No client request here, use server config only
      supabaseUrl,
      supabaseServiceKey
    );
    
    const stripeMode = stripeConfig.mode;
    const stripeKey = stripeConfig.secretKey;
    const isTestMode = stripeMode === 'test';
    
    logStep("Stripe configuration validated", { mode: stripeMode, isTestMode });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, checking for an active trial before downgrading");

      // R43: a brand-new signup has no Stripe customer yet (checkout has never
      // happened) and would previously hit this branch and be unconditionally
      // written as subscription_status='expired' / subscription_tier=null, even
      // while still inside their real 30-day trial window (subscription_status
      // was 'trial' with a future trial_end_date, set correctly by
      // handle_new_user()). That silently destroyed the trial state in the DB
      // and made Settings > Billing show "Starter Plan / No active subscription
      // / Inactive" to an owner who was never asked to pay yet. An active,
      // unexpired trial is genuinely not "no subscription": read the row first
      // and skip the destructive write when the trial is still live.
      const { data: currentUser } = await supabaseClient
        .from("users")
        .select("subscription_status, subscription_tier, trial_end_date")
        .eq("id", user.id)
        .maybeSingle();

      const trialStillActive =
        currentUser?.subscription_status === 'trial' &&
        !!currentUser.trial_end_date &&
        new Date(currentUser.trial_end_date) > new Date();

      if (trialStillActive) {
        logStep("Active trial found, preserving trial state (no downgrade)", {
          trial_end_date: currentUser.trial_end_date,
        });
        return new Response(JSON.stringify({
          subscribed: false,
          subscription_tier: currentUser.subscription_tier,
          subscription_end: null,
          payment_status: 'trialing',
          billing_cycle: null,
          next_billing_date: null,
          last_payment_date: null,
          last_payment_amount: null,
          billing_history: [],
          trial_end_date: currentUser.trial_end_date,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("No active trial, updating unsubscribed state");

      // Update user record in database (no Stripe customer + no active trial =
      // genuinely no subscription, so also clear any stale grace window).
      await supabaseClient.from("users").update({
        subscription_status: 'expired',
        subscription_tier: null,
        subscription_end_date: null,
        payment_status: 'unpaid',
        grace_period_end: null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      // Keep the `subscribers` mirror in sync. Without this, a stale
      // subscribers.subscribed=true row (e.g. an old seed, or a customer whose
      // Stripe customer was deleted) survives this downgrade, and
      // get_user_status_type() (which returns 'paid_subscriber' on
      // subscribers.subscribed=true BEFORE checking users expiry) would keep
      // granting full paid access to a lapsed user = a paywall leak. The
      // customer-found path already upserts subscribers (onConflict 'email');
      // this branch must mirror it for subscribed=false.
      await supabaseClient.from("subscribers").update({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);

      return new Response(JSON.stringify({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        payment_status: 'unpaid',
        billing_cycle: null,
        next_billing_date: null,
        last_payment_date: null,
        last_payment_amount: null,
        billing_history: []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Prefer an ACTIVE subscription. Stripe's default list returns ALL statuses
    // (canceled, incomplete, past_due) created-desc, so limit:1 could return an old
    // canceled sub and miss a newer active one (reactivation / plan-switch) -> the
    // customer would be wrongly treated as expired. Query active first; only fall back
    // to the general list (for past_due/incomplete detection) when there's no active.
    let subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    if (subscriptions.data.length === 0) {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 1,
      });
    }

    const hasActiveSub = subscriptions.data.length > 0 && subscriptions.data[0].status === 'active';
    const hasPastDueSub = subscriptions.data.length > 0 && subscriptions.data[0].status === 'past_due';
    const hasIncompletePayment = subscriptions.data.length > 0 && subscriptions.data[0].status === 'incomplete';
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let paymentStatus = 'unpaid';
    let billingCycle = null;
    let nextBillingDate = null;
    let lastPaymentDate = null;
    let lastPaymentAmount = null;
    let billingHistory: Array<any> = [];
    let subscriptionStatus = 'expired';

    if (hasActiveSub || hasPastDueSub || hasIncompletePayment) {
      const subscription = subscriptions.data[0];
      // Stripe >=2025-03-31 moved current_period_end onto the items; resolve safely
      // (the old top-level read became new Date(NaN).toISOString() and threw).
      subscriptionEnd = getCurrentPeriodEndISO(subscription);
      nextBillingDate = subscriptionEnd; // For active subs, next billing is current period end
      paymentStatus = hasActiveSub ? 'paid' : 'unpaid';
      billingCycle = subscription.items.data[0].price.recurring?.interval || 'month';
      
      // Set correct subscription status
      if (hasActiveSub) {
        subscriptionStatus = 'active';
      } else if (hasPastDueSub) {
        subscriptionStatus = 'missed_payment';
        subscriptionTier = null;
        subscriptionEnd = new Date().toISOString();
        logStep("Payment missed - ending subscription", { status: 'past_due' });
      } else if (hasIncompletePayment) {
        subscriptionStatus = 'missed_payment';
        subscriptionTier = null;
        subscriptionEnd = new Date().toISOString();
        logStep("Payment incomplete - ending subscription", { status: 'incomplete' });
      }
      
      // Get payment history from invoices
      try {
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 10 // Get last 10 invoices
        });
        
        if (invoices.data.length > 0) {
          const lastPaidInvoice = invoices.data.find(inv => inv.status === 'paid');
          if (lastPaidInvoice) {
            lastPaymentDate = new Date(lastPaidInvoice.created * 1000).toISOString();
            lastPaymentAmount = lastPaidInvoice.amount_paid;
          }
          
          // Build billing history
          billingHistory = invoices.data.map(invoice => ({
            id: invoice.id,
            date: new Date(invoice.created * 1000).toISOString(),
            amount: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            invoice_url: invoice.hosted_invoice_url,
            description: `${subscriptionTier || 'Subscription'} Plan`
          }));
        }
      } catch (invoiceError) {
        logStep("Error fetching invoices", { error: invoiceError });
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        billingCycle,
        lastPaymentDate,
        lastPaymentAmount,
        subscriptionStatus
      });
      
      // Determine subscription tier only for active subscriptions
      if (hasActiveSub) {
        // Determine subscription tier from metadata first
        subscriptionTier = subscription.metadata?.tier_name || subscription.metadata?.tier;
        logStep("Checking metadata for tier", { metadata: subscription.metadata, tier: subscriptionTier });

        if (!subscriptionTier || subscriptionTier === 'unknown') {
          // Fallback: query database to map price ID to tier
          const priceId = subscription.items.data[0].price.id;
          logStep("Determining tier from price ID", { priceId });

          // Query subscription_tiers table for price ID mapping
          const { data: tiers, error: tierError } = await supabaseClient
            .from('subscription_tiers')
            .select('tier_name, stripe_test_monthly_price_id, stripe_test_yearly_price_id, stripe_live_monthly_price_id, stripe_live_yearly_price_id');
          
          if (tierError) {
            logStep("Error fetching subscription tiers", { error: tierError });
            subscriptionTier = 'starter'; // Safe fallback
          } else {
            // Find matching tier by price ID (supports test and live modes)
            const matchingTier = tiers.find(t => 
              t.stripe_test_monthly_price_id === priceId ||
              t.stripe_test_yearly_price_id === priceId ||
              t.stripe_live_monthly_price_id === priceId ||
              t.stripe_live_yearly_price_id === priceId
            );
            
            if (matchingTier) {
              subscriptionTier = matchingTier.tier_name;
              logStep("Mapped price ID to tier from database", { priceId, tier: subscriptionTier });
            } else {
              // Final fallback: price-based determination
              const price = await stripe.prices.retrieve(priceId);
              const amount = price.unit_amount || 0;
              logStep("Unknown price ID, using amount-based fallback", { priceId, amount, currency: price.currency });
              
              const centAmount = amount;
              if (centAmount <= 3000) {
                subscriptionTier = 'starter';
              } else if (centAmount <= 6000) {
                subscriptionTier = 'professional';
              } else {
                subscriptionTier = 'enterprise';
              }
              
              logStep("⚠️ Unknown price ID detected", { priceId, tier: subscriptionTier, amount: centAmount });
            }
          }
        } else {
          logStep("Tier found in metadata", { tier: subscriptionTier });
        }
      }

      logStep("Determined subscription tier", { subscriptionTier, paymentStatus });
    } else {
      logStep("No active subscription found");
      
      // Still get invoice history for canceled/expired users
      try {
        const invoices = await stripe.invoices.list({
          customer: customerId,
          limit: 10
        });
        
        if (invoices.data.length > 0) {
          billingHistory = invoices.data.map(invoice => ({
            id: invoice.id,
            date: new Date(invoice.created * 1000).toISOString(),
            amount: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: invoice.status,
            invoice_url: invoice.hosted_invoice_url,
            description: `Previous Subscription`
          }));
        }
      } catch (invoiceError) {
        logStep("Error fetching invoice history for inactive user", { error: invoiceError });
      }
    }

    // Update user record in database with detailed logging
    const userUpdate: Record<string, unknown> = {
      subscription_status: subscriptionStatus,
      subscription_tier: subscriptionTier,
      subscription_end_date: subscriptionEnd,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    };
    // Clear any stale grace window when the subscription is active or
    // expired/canceled (those states never carry a grace period). Mirrors the
    // stripe-webhook handlers. The missed_payment grace window is owned by the
    // webhook (set once on invoice.payment_failed) — do NOT touch it here, or a
    // repeated check-subscription call (e.g. each billing-page visit) would keep
    // resetting the 7-day window so it never expires.
    if (subscriptionStatus !== 'missed_payment') {
      userUpdate.grace_period_end = null;
    }
    const updateResult = await supabaseClient.from("users").update(userUpdate).eq('id', user.id);

    // If missed_payment was detected here BEFORE the invoice.payment_failed webhook
    // set the grace window, grace_period_end would be null -> the frontend folds a
    // null grace into "expired" and access drops to 0 days instead of 7. Open the
    // 7-day window, but ONLY when it's currently null (.is null filter), so repeated
    // checks and the webhook can never reset/extend it.
    if (subscriptionStatus === 'missed_payment') {
      await supabaseClient.from("users")
        .update({ grace_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq('id', user.id)
        .is('grace_period_end', null);
    }
    
    logStep("Database update result", { 
      error: updateResult.error, 
      data: updateResult.data,
      subscription_status: subscriptionStatus,
      subscription_tier: subscriptionTier 
    });
    
    // Also update subscribers table for backup tracking
    const subscriberUpdateResult = await supabaseClient.from("subscribers").upsert({
      user_id: user.id,
      email: user.email,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'email',
      ignoreDuplicates: false 
    });
    
    logStep("Subscribers table update result", { 
      error: subscriberUpdateResult.error, 
      data: subscriberUpdateResult.data 
    });

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier, 
      paymentStatus,
      subscriptionStatus
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      payment_status: paymentStatus,
      billing_cycle: billingCycle,
      next_billing_date: nextBillingDate,
      last_payment_date: lastPaymentDate,
      last_payment_amount: lastPaymentAmount,
      billing_history: billingHistory
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});