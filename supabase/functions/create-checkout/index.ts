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
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body first to get mode
    const { priceId, tier_name, price, is_annual, success_url, cancel_url, mode } = await req.json();
    
    // Determine Stripe mode - use frontend mode if provided, otherwise fall back to environment
    const stripeMode = mode || Deno.env.get("STRIPE_MODE") || 'test'; // Default to test for safety
    const isTestMode = stripeMode === 'test';
    
    const stripeKey = isTestMode 
      ? Deno.env.get("STRIPE_TEST_SECRET_KEY") 
      : Deno.env.get("STRIPE_SECRET_KEY");
    
    if (!stripeKey) {
      throw new Error(`${isTestMode ? 'STRIPE_TEST_SECRET_KEY' : 'STRIPE_SECRET_KEY'} is not set`);
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

    // Request data already parsed above for mode detection
    logStep("Request data parsed", { priceId, tier_name, price, is_annual, success_url, cancel_url, mode: stripeMode });

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

    // Create product name based on tier
    const productNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };

    const productName = productNames[tier_name as keyof typeof productNames] || "Subscription Plan";
    
    // Convert price to cents (Stripe uses smallest currency unit)
    const unitAmount = Math.round(price * 100);
    
    logStep("Creating checkout session", { 
      productName, 
      unitAmount, 
      interval: is_annual ? 'year' : 'month',
      customerId 
    });

    // Create checkout session - use Price ID if provided, otherwise use dynamic pricing
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: "subscription",
      success_url: success_url || `${req.headers.get("origin")}/dashboard?checkout=success`,
      cancel_url: cancel_url || `${req.headers.get("origin")}/dashboard?checkout=cancel`,
      metadata: {
        user_id: user.id,
        tier_name: tier_name || 'unknown',
        is_annual: is_annual ? 'true' : 'false'
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier_name: tier_name || 'unknown',
          is_annual: is_annual ? 'true' : 'false'
        }
      }
    };

    if (priceId) {
      // Use predefined Stripe Price ID
      sessionConfig.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
      logStep("Using predefined Price ID", { priceId });
    } else {
      // Legacy dynamic pricing
      sessionConfig.line_items = [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: productName,
              description: `${tier_name.charAt(0).toUpperCase() + tier_name.slice(1)} subscription plan`
            },
            unit_amount: unitAmount,
            recurring: { interval: is_annual ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ];
      logStep("Using dynamic pricing", { productName, unitAmount, interval: is_annual ? 'year' : 'month' });
    }

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