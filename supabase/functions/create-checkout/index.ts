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

    // Parse request body first to get mode and service information
    const { priceId, tier_name, price, is_annual, success_url, cancel_url, mode, serviceIds = [], automaticTax = false } = await req.json();
    
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

    // Handle service-based bookings with Stripe Price IDs
    let finalLineItems = [];
    
    if (serviceIds.length > 0) {
      logStep("Fetching service information for checkout", { serviceIds });
      
      // Fetch service types to get their Stripe Price IDs
      const { data: services, error: serviceError } = await supabaseClient
        .from('service_types')
        .select('id, stripe_test_price_id, stripe_live_price_id, name, price, tax_enabled')
        .in('id', serviceIds);

      if (serviceError) {
        throw new Error('Failed to fetch service information: ' + serviceError.message);
      }

      finalLineItems = services.map((service: any) => {
        const priceId = isTestMode ? service.stripe_test_price_id : service.stripe_live_price_id;
        
        if (!priceId) {
          throw new Error(`No Stripe Price ID found for service: ${service.name}`);
        }
        
        return {
          price: priceId,
          quantity: 1
        };
      });
      
      logStep("Service line items prepared", { finalLineItems });
    }

    // Create checkout session - use Price ID if provided, otherwise use dynamic pricing
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id, // Add user ID for session tracking
      mode: serviceIds.length > 0 ? "payment" : "subscription", // Use payment mode for service bookings
      success_url: `${finalSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: finalCancelUrl,
      metadata: {
        user_id: user.id,
        tier_name: tier_name || 'unknown',
        is_annual: is_annual ? 'true' : 'false',
        service_ids: serviceIds.join(',')
      }
    };

    // Enable automatic tax if requested or if services have tax enabled
    if (automaticTax || serviceIds.length > 0) {
      sessionConfig.automatic_tax = { enabled: true };
      sessionConfig.billing_address_collection = 'required';
      logStep("Automatic tax enabled for checkout");
    }

    // Add subscription data only for subscription mode
    if (sessionConfig.mode === "subscription") {
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          tier_name: tier_name || 'unknown',
          is_annual: is_annual ? 'true' : 'false'
        }
      };
    }

    if (finalLineItems.length > 0) {
      // Use service-based line items
      sessionConfig.line_items = finalLineItems;
      logStep("Using service-based line items", { count: finalLineItems.length });
    } else if (priceId) {
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