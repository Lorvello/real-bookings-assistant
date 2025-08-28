import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-PAYMENT-METHODS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables not set");
    }

    // Initialize Supabase client with service role for authentication
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }

    const { payment_methods: paymentMethods, calendar_id: calendarId } = await req.json();
    
    if (!paymentMethods || !Array.isArray(paymentMethods)) {
      throw new Error("Invalid payment methods provided");
    }

    if (!calendarId) {
      throw new Error("Calendar ID is required");
    }

    logStep("Request validated", { calendarId, paymentMethods, userId: userData.user.id });

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get Stripe account for this user/calendar
    const { data: stripeAccount, error: stripeError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id')
      .eq('calendar_id', calendarId)
      .eq('account_status', 'active')
      .single();

    if (stripeError || !stripeAccount) {
      logStep("No active Stripe account found", { calendarId });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment methods saved locally. Stripe account not connected yet."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripeAccountId = stripeAccount.stripe_account_id;
    logStep("Found Stripe account", { stripeAccountId });

    // Map payment method names to Stripe payment method types
    const stripeMethodMap: Record<string, string> = {
      'ideal': 'ideal',
      'bancontact': 'bancontact',
      'sofort': 'sofort',
      'eps': 'eps',
      'przelewy24': 'p24',
      'blik': 'blik',
      'twint': 'twint',
      'apple_pay': 'card', // Apple Pay uses card processing
      'google_pay': 'card', // Google Pay uses card processing
      'revolut_pay': 'card', // Revolut Pay uses card processing
      'cards': 'card'
    };

    const enabledMethods = paymentMethods
      .map(method => stripeMethodMap[method])
      .filter(Boolean);

    // Always include card as it's the base for Apple Pay, Google Pay, etc.
    if (!enabledMethods.includes('card') && 
        (paymentMethods.includes('apple_pay') || 
         paymentMethods.includes('google_pay') || 
         paymentMethods.includes('revolut_pay') ||
         paymentMethods.includes('cards'))) {
      enabledMethods.push('card');
    }

    logStep("Mapped payment methods", { enabledMethods });

    try {
      // Update Stripe account capabilities
      await stripe.accounts.update(stripeAccountId, {
        capabilities: enabledMethods.reduce((acc, method) => {
          acc[`${method}_payments`] = { requested: true };
          return acc;
        }, {} as Record<string, { requested: boolean }>)
      });

      logStep("Successfully updated Stripe account capabilities", { stripeAccountId, enabledMethods });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment methods synced with Stripe successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeErr: any) {
      logStep("Stripe API error", { error: stripeErr.message });
      
      // Still return success since the methods are saved locally
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Payment methods saved locally. Stripe sync will be retried later.",
        warning: stripeErr.message
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});