import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUB-BY-SESSION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("No session_id provided");
    
    logStep("Session ID received", { session_id });

    // Get Stripe mode and key
    const stripeMode = Deno.env.get("STRIPE_MODE") || 'test';
    const isTestMode = stripeMode === 'test';
    
    const stripeKey = isTestMode 
      ? "sk_test_51RqIg2LcBboIITXgKEm5tW3HPrSXHKn3dz0k689nF8u3USXvIkjO7wLdRJTmlUphZ7KnfiLPOByp4tnlfFaRWxPj00UoWOQ0mq"
      : "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";
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Retrieve checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Retrieved checkout session", { 
      status: checkoutSession.payment_status,
      customer_id: checkoutSession.customer,
      client_reference_id: checkoutSession.client_reference_id 
    });

    if (checkoutSession.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${checkoutSession.payment_status}`);
    }

    const userId = checkoutSession.client_reference_id;
    if (!userId) throw new Error("No user ID found in session");

    const customerId = checkoutSession.customer as string;
    logStep("Payment verified", { userId, customerId });

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      
      // Get tier from metadata first
      subscriptionTier = subscription.metadata?.tier_name || subscription.metadata?.tier;
      
      if (!subscriptionTier || subscriptionTier === 'unknown') {
        // Fallback: determine from price
        const priceId = subscription.items.data[0].price.id;
        const price = await stripe.prices.retrieve(priceId);
        const amount = price.unit_amount || 0;
        
        // Map specific price IDs
        if (priceId === 'price_1RqwecLcBboIITXgsuyzCCcU' || priceId === 'price_1RqwcuLcBboIITXgCew589Ao') {
          subscriptionTier = "professional";
        } else if (priceId === 'price_1RqwcHLcBboIITXgYhJupraj' || priceId === 'price_1RqwdWLcBboIITXgMHKmGtbv') {
          subscriptionTier = "starter";
        } else {
          // Price-based fallback
          const centAmount = amount;
          if (centAmount <= 2000) {
            subscriptionTier = "starter";
          } else if (centAmount <= 5000) {
            subscriptionTier = "professional";
          } else {
            subscriptionTier = "enterprise";
          }
        }
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        tier: subscriptionTier,
        endDate: subscriptionEnd 
      });
    }

    // Update user in database
    const updateResult = await supabaseClient.from("users").update({
      subscription_status: hasActiveSub ? 'active' : 'expired',
      subscription_tier: subscriptionTier,
      subscription_end_date: subscriptionEnd,
      payment_status: hasActiveSub ? 'paid' : 'unpaid',
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    
    logStep("Database update", { 
      error: updateResult.error,
      subscription_status: hasActiveSub ? 'active' : 'expired',
      subscription_tier: subscriptionTier 
    });

    // Also update subscribers table
    await supabaseClient.from("subscribers").upsert({
      user_id: userId,
      email: checkoutSession.customer_details?.email || '',
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    });

    // Generate a new auth session for the user
    let authSession = null;
    try {
      logStep("Generating new auth session for user", { userId });
      
      // Get user data to create session
      const { data: userData } = await supabaseClient.from("users").select("email").eq('id', userId).single();
      
      if (userData?.email) {
        // Create a new auth session using the service role
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
          type: 'magiclink',
          email: userData.email
        });
        
        if (!sessionError && sessionData?.properties?.action_link) {
          // Extract the access_token and refresh_token from the magic link
          const url = new URL(sessionData.properties.action_link);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            authSession = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_in: 3600,
              token_type: 'bearer'
            };
            logStep("Auth session generated successfully");
          }
        }
      }
    } catch (authError) {
      logStep("Warning: Could not generate auth session", { error: authError });
      // Continue without auth session - fallback will handle this
    }

    return new Response(JSON.stringify({
      success: true,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      payment_status: hasActiveSub ? 'paid' : 'unpaid',
      auth_session: authSession
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});