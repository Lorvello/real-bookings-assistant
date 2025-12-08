import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeConfig } from "../_shared/stripeValidation.ts";
import { calculateApplicationFee } from "../_shared/feeCalculator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { 
      priceId, 
      tier_name, 
      price, 
      is_annual, 
      success_url, 
      cancel_url, 
      mode, 
      serviceIds = [], 
      automaticTax = false,
      calendarId,
      bookingId,
      paymentMethod = 'card',
    } = await req.json();
    
    // SECURITY: Server-side validation of Stripe mode
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const stripeConfig = await validateStripeConfig(
      mode as 'test' | 'live' | undefined,
      supabaseUrl,
      supabaseAnonKey
    );
    
    const stripeMode = stripeConfig.mode;
    const stripeKey = stripeConfig.secretKey;
    const isTestMode = stripeMode === 'test';
    
    logStep("Stripe configuration validated", { mode: stripeMode, isTestMode, clientRequested: mode });

    // Create Supabase clients
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

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
    const origin = req.headers.get("origin") || "https://bookingsassistant.com";
    const finalSuccessUrl = success_url || `${origin}/success`;
    const finalCancelUrl = cancel_url || `${origin}/dashboard`;
    
    logStep("Request data parsed", { 
      priceId, tier_name, price, is_annual, 
      calendarId, bookingId,
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

    // Determine if this is a service-based booking checkout (needs destination charge)
    const isServiceBooking = serviceIds.length > 0 || (calendarId && bookingId);
    let stripeAccount = null;
    let paymentSettings = null;
    let feeCalculation = null;

    if (isServiceBooking && calendarId) {
      // Get the calendar owner for Stripe account lookup
      const { data: calendarOwner } = await supabaseAdmin
        .from("calendars")
        .select("user_id")
        .eq("id", calendarId)
        .single();

      if (calendarOwner) {
        // Get account_owner_id from users table (may be null for solo users)
        const { data: ownerData } = await supabaseAdmin
          .from("users")
          .select("account_owner_id")
          .eq("id", calendarOwner.user_id)
          .single();

        const accountOwnerId = ownerData?.account_owner_id || calendarOwner.user_id;
        logStep("Account owner determined", { calendarUserId: calendarOwner.user_id, accountOwnerId });

        // Get Stripe connected account by account_owner_id
        const { data: account } = await supabaseAdmin
          .from("business_stripe_accounts")
          .select("*")
          .eq("account_owner_id", accountOwnerId)
          .eq("environment", isTestMode ? 'test' : 'live')
          .eq("charges_enabled", true)
          .eq("onboarding_completed", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (account) {
          stripeAccount = account;
          logStep("Connected Stripe account found", { accountId: account.stripe_account_id });
        }
      }

      // Get payment settings
      const { data: settings } = await supabaseAdmin
        .from("payment_settings")
        .select("*")
        .eq("calendar_id", calendarId)
        .single();

      if (settings) {
        paymentSettings = settings;
        logStep("Payment settings found", { 
          platformFee: settings.platform_fee_percentage,
          payoutOption: settings.payout_option 
        });
      }
    }

    // Create product name based on tier
    const productNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };

    const productName = productNames[tier_name as keyof typeof productNames] || "Subscription Plan";
    
    // Convert price to cents
    const unitAmount = Math.round(price * 100);

    // Handle service-based bookings with Stripe Price IDs
    let finalLineItems = [];
    let totalAmountCents = 0;
    
    if (serviceIds.length > 0) {
      logStep("Fetching service information for checkout", { serviceIds });
      
      const { data: services, error: serviceError } = await supabaseAdmin
        .from('service_types')
        .select('id, stripe_test_price_id, stripe_live_price_id, name, price, tax_enabled')
        .in('id', serviceIds);

      if (serviceError) {
        throw new Error('Failed to fetch service information: ' + serviceError.message);
      }

      finalLineItems = services.map((service: any) => {
        const stripePriceId = isTestMode ? service.stripe_test_price_id : service.stripe_live_price_id;
        totalAmountCents += Math.round(service.price * 100);
        
        if (!stripePriceId) {
          throw new Error(`No Stripe Price ID found for service: ${service.name}`);
        }
        
        return {
          price: stripePriceId,
          quantity: 1
        };
      });
      
      logStep("Service line items prepared", { finalLineItems, totalAmountCents });
    }

    // Calculate application fee if this is a service booking with connected account
    if (isServiceBooking && stripeAccount && totalAmountCents > 0) {
      feeCalculation = calculateApplicationFee({
        amountCents: totalAmountCents,
        paymentMethod,
        payoutOption: (paymentSettings?.payout_option as 'standard' | 'instant') || 'standard',
        platformFeePercentage: (paymentSettings?.platform_fee_percentage || 1.9) / 100,
      });
      
      logStep("Application fee calculated", {
        amount: totalAmountCents / 100,
        applicationFee: feeCalculation.applicationFeeCents / 100,
      });
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      mode: serviceIds.length > 0 ? "payment" : "subscription",
      success_url: `${finalSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: finalCancelUrl,
      metadata: {
        user_id: user.id,
        tier_name: tier_name || 'unknown',
        is_annual: is_annual ? 'true' : 'false',
        service_ids: serviceIds.join(','),
        calendar_id: calendarId || '',
        booking_id: bookingId || '',
      }
    };

    // Enable automatic tax if requested or if services have tax enabled
    if (automaticTax || serviceIds.length > 0) {
      sessionConfig.automatic_tax = { enabled: true };
      sessionConfig.billing_address_collection = 'required';
      logStep("Automatic tax enabled for checkout");
    }

    // Add payment intent data for destination charges (service bookings)
    if (isServiceBooking && stripeAccount && feeCalculation) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: feeCalculation.applicationFeeCents,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
        metadata: {
          calendar_id: calendarId,
          booking_id: bookingId || '',
          platform_fee_percentage: (paymentSettings?.platform_fee_percentage || 1.9).toString(),
          payout_option: paymentSettings?.payout_option || 'standard',
        },
      };
      logStep("Destination charge configured", { 
        destination: stripeAccount.stripe_account_id,
        applicationFee: feeCalculation.applicationFeeCents 
      });
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

    // Configure line items
    if (finalLineItems.length > 0) {
      sessionConfig.line_items = finalLineItems;
      logStep("Using service-based line items", { count: finalLineItems.length });
    } else if (priceId) {
      sessionConfig.line_items = [
        {
          price: priceId,
          quantity: 1,
        },
      ];
      logStep("Using predefined Price ID", { priceId });
    } else {
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

    logStep("Checkout session created successfully", { 
      sessionId: session.id, 
      url: session.url,
      applicationFee: feeCalculation?.applicationFeeCents 
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      session_id: session.id,
      application_fee: feeCalculation?.applicationFeeCents,
      fee_breakdown: feeCalculation,
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
