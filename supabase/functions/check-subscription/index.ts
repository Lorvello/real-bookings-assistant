import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

    // Get environment variables and determine mode
    const stripeMode = Deno.env.get("STRIPE_MODE") || 'test'; // Default to test for safety
    const isTestMode = stripeMode === 'test';
    
    const stripeKey = isTestMode 
      ? Deno.env.get("STRIPE_TEST_SECRET_KEY") 
      : Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      throw new Error(`${isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY'} is not set`);
    }
    
    logStep("Stripe configuration", { mode: stripeMode, isTestMode, hasKey: !!stripeKey });

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
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      return new Response(JSON.stringify({ 
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        payment_status: 'unpaid'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;
    let paymentStatus = 'unpaid';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      paymentStatus = 'paid';
      
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier from metadata or price
      subscriptionTier = subscription.metadata?.tier_name || subscription.metadata?.tier;
      
      if (!subscriptionTier) {
        // Fallback: determine from price if metadata not available
        const priceId = subscription.items.data[0].price.id;
        logStep("Determining tier from price", { priceId });
        
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        
        logStep("Price details", { amount, currency: price.currency });
        
        // Convert from cents and determine tier based on price ranges
        const centAmount = amount;
        if (centAmount <= 2000) { // €20 or less
          subscriptionTier = "starter";
        } else if (centAmount <= 5000) { // €50 or less  
          subscriptionTier = "professional";
        } else {
          subscriptionTier = "enterprise";
        }
        
        logStep("Tier determined from price", { centAmount, tier: subscriptionTier });
      } else {
        logStep("Tier found in metadata", { tier: subscriptionTier });
      }
      
      logStep("Determined subscription tier", { subscriptionTier, paymentStatus });
    } else {
      logStep("No active subscription found");
    }

    // Update user record in database
    await supabaseClient.from("users").update({
      subscription_status: hasActiveSub ? 'active' : 'expired',
      subscription_tier: subscriptionTier,
      subscription_end_date: subscriptionEnd,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    logStep("Updated database with subscription info", { 
      subscribed: hasActiveSub, 
      subscriptionTier, 
      paymentStatus 
    });

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      payment_status: paymentStatus
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