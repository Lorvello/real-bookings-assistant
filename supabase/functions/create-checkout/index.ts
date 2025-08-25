import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting helper
const checkRateLimit = async (supabase: any, ipAddress: string, endpoint: string): Promise<boolean> => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  
  // Clean up old attempts
  await supabase
    .from('rate_limits')
    .delete()
    .lt('first_attempt_at', tenMinutesAgo.toISOString());
  
  // Check current attempts
  const { data: existingAttempts } = await supabase
    .from('rate_limits')
    .select('attempt_count')
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .gte('first_attempt_at', tenMinutesAgo.toISOString())
    .maybeSingle();
  
  if (existingAttempts && existingAttempts.attempt_count >= 3) {
    return false; // Rate limited
  }
  
  // Update or create attempt record
  if (existingAttempts) {
    await supabase
      .from('rate_limits')
      .update({
        attempt_count: existingAttempts.attempt_count + 1,
        last_attempt_at: new Date().toISOString()
      })
      .eq('ip_address', ipAddress)
      .eq('endpoint', endpoint);
  } else {
    await supabase
      .from('rate_limits')
      .insert({
        ip_address: ipAddress,
        endpoint: endpoint,
        attempt_count: 1,
        first_attempt_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString()
      });
  }
  
  return true; // Not rate limited
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get IP address for rate limiting
    const ipAddress = req.headers.get("x-forwarded-for") || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    // Create Supabase service client for rate limiting check
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check rate limiting (3 attempts per 10 minutes per IP)
    const rateLimitOk = await checkRateLimit(supabaseService, ipAddress, "create-checkout");
    if (!rateLimitOk) {
      logStep("Rate limit exceeded", { ipAddress });
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please try again in 10 minutes." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    // Parse request body
    const { tier_name, is_annual, success_url, cancel_url } = await req.json();
    
    // SECURITY: Always enforce test mode only
    const stripeMode = 'test';
    const isTestMode = true;
    
    const stripeKey = Deno.env.get("STRIPE_TEST_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_TEST_SECRET_KEY is not set");
    }
    
    logStep("Stripe configuration", { mode: stripeMode, isTestMode, hasKey: !!stripeKey });

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get origin from request headers for URL construction
    const origin = req.headers.get("origin") || "https://3461320d-933f-4e55-89c4-11076909a36e.lovableproject.com";
    const finalSuccessUrl = success_url || `${origin}/success`;
    const finalCancelUrl = cancel_url || `${origin}/dashboard`;
    
    logStep("Request data parsed", { 
      priceId, tier_name, price, is_annual, 
      provided_success_url: success_url,
      provided_cancel_url: cancel_url,
      origin,
      final_success_url: finalSuccessUrl,
      final_cancel_url: finalCancelUrl,
      mode: stripeMode 
    });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer found, will create new one in checkout");
    }

    // Get server-side pricing from subscription_plans table
    const { data: planData, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('tier_name', tier_name)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      throw new Error(`Invalid subscription plan: ${tier_name}`);
    }

    const priceId = is_annual 
      ? planData.stripe_test_yearly_price_id 
      : planData.stripe_test_monthly_price_id;
    
    if (!priceId) {
      throw new Error(`Price ID not configured for ${tier_name} ${is_annual ? 'yearly' : 'monthly'}`);
    }
    
    logStep("Creating checkout session", { 
      tier_name,
      priceId,
      interval: is_annual ? 'year' : 'month',
      customerId 
    });

    // Create checkout session using server-side pricing only
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      mode: "subscription",
      success_url: `${finalSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: finalCancelUrl,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        user_id: user.id,
        tier_name: tier_name,
        is_annual: is_annual ? 'true' : 'false'
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier_name: tier_name,
          is_annual: is_annual ? 'true' : 'false'
        }
      }
    };
    
    logStep("Using server-side Price ID", { priceId, tier_name });

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created successfully", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});