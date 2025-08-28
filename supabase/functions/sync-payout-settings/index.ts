import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-PAYOUT-SETTINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const stripeTestKey = Deno.env.get("STRIPE_SECRET_KEY_TEST");
    const stripeLiveKey = Deno.env.get("STRIPE_SECRET_KEY_LIVE");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    if (!stripeTestKey || !stripeLiveKey) {
      throw new Error("Missing Stripe secret keys");
    }

    logStep("Environment variables validated");

    // Parse request body
    const body = await req.json();
    const { calendarId, payoutOption, testMode = true } = body;

    if (!calendarId || !payoutOption) {
      throw new Error("Missing calendarId or payoutOption");
    }

    logStep("Request parsed", { calendarId, payoutOption, testMode });

    // Create Supabase client with auth header
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error(`Authentication error: ${userError?.message || 'User not found'}`);
    }

    logStep("User authenticated", { userId: userData.user.id });

    // Get account owner ID
    const { data: accountOwnerData, error: accountOwnerError } = await supabaseClient
      .rpc('get_account_owner_id', { p_user_id: userData.user.id });

    if (accountOwnerError) {
      throw new Error(`Failed to get account owner: ${accountOwnerError.message}`);
    }

    const accountOwnerId = accountOwnerData;
    logStep("Account owner determined", { accountOwnerId });

    // Initialize Stripe
    const stripeKey = testMode ? stripeTestKey : stripeLiveKey;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    logStep("Stripe initialized", { testMode });

    // Get platform account ID
    const platformAccountResponse = await stripe.accounts.retrieve();
    const platformAccountId = platformAccountResponse.id;
    logStep("Platform account retrieved", { platformAccountId });

    // Get Stripe account for this calendar/user
    const environment = testMode ? 'test' : 'live';
    const { data: stripeAccount, error: stripeAccountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id, account_status')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .eq('onboarding_completed', true)
      .eq('charges_enabled', true)
      .single();

    if (stripeAccountError || !stripeAccount) {
      throw new Error("No active Stripe account found. Please complete Stripe onboarding first.");
    }

    logStep("Stripe account found", { stripeAccountId: stripeAccount.stripe_account_id });

    // Update Stripe account payout settings
    const payoutSchedule = payoutOption === 'instant' ? 'daily' : 'weekly';
    
    await stripe.accounts.update(stripeAccount.stripe_account_id, {
      settings: {
        payouts: {
          schedule: {
            interval: payoutSchedule,
            ...(payoutSchedule === 'weekly' && { weekly_anchor: 'monday' })
          }
        }
      }
    });

    logStep("Stripe payout settings updated", { 
      stripeAccountId: stripeAccount.stripe_account_id, 
      schedule: payoutSchedule 
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Payout settings updated to ${payoutOption}`,
        stripeAccountId: stripeAccount.stripe_account_id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});