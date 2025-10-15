import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";

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
      logStep("No customer found, updating unsubscribed state");
      
      // Update user record in database
      await supabaseClient.from("users").update({
        subscription_status: 'expired',
        subscription_tier: null,
        subscription_end_date: null,
        payment_status: 'unpaid',
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

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

    // Check all subscription statuses, not just active
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });
    
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
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
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
    const updateResult = await supabaseClient.from("users").update({
      subscription_status: subscriptionStatus,
      subscription_tier: subscriptionTier,
      subscription_end_date: subscriptionEnd,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    
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