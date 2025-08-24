import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-EMBEDDED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase clients (anon for auth, service for privileged writes)
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!serviceRoleKey) {
      throw new Error("Service role key not configured");
    }
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey
    );

    // Parse request
    const { test_mode = true } = await req.json();
    logStep("Request parsed", { test_mode });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user data to determine account owner
    const { data: userDataResult, error: userDataError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    const accountOwnerId = userDataResult.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Get user business data
    const { data: userBusinessData, error: businessDataError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (businessDataError) {
      logStep("Warning: Could not fetch user business data", { error: businessDataError.message });
    }
    logStep("User business data fetched", { hasData: !!userBusinessData });

    // Initialize Stripe with appropriate key
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_TEST_SECRET_KEY") 
      : Deno.env.get("STRIPE_LIVE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error(`Stripe ${test_mode ? 'test' : 'live'} secret key not configured`);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });
    logStep("Stripe initialized", { testMode: test_mode });

    // Check for existing account
    const { data: existingAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .maybeSingle();

    let accountId = existingAccount?.stripe_account_id;

    if (!accountId) {
      // Create new Stripe Connect account
      logStep("Creating new Stripe account");
      
      const accountParams: any = {
        type: 'express',
        country: userBusinessData?.business_country || userBusinessData?.address_country || 'NL',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      };

      // Prefill business information if available
      if (userBusinessData) {
        if (userBusinessData.business_name) {
          accountParams.business_profile = {
            name: userBusinessData.business_name,
            ...(userBusinessData.business_description && { product_description: userBusinessData.business_description }),
            ...(userBusinessData.website && { url: userBusinessData.website }),
          };
        }

        // Add individual information
        accountParams.individual = {
          email: user.email,
          ...(userBusinessData.full_name && { 
            first_name: userBusinessData.full_name.split(' ')[0],
            last_name: userBusinessData.full_name.split(' ').slice(1).join(' ') || userBusinessData.full_name.split(' ')[0]
          }),
          ...(userBusinessData.business_phone && { phone: userBusinessData.business_phone }),
          ...(userBusinessData.date_of_birth && { dob: {
            day: new Date(userBusinessData.date_of_birth).getDate(),
            month: new Date(userBusinessData.date_of_birth).getMonth() + 1,
            year: new Date(userBusinessData.date_of_birth).getFullYear(),
          }}),
        };

        // Add business address if available
        if (userBusinessData.business_street && userBusinessData.business_city) {
          accountParams.business_profile.support_address = {
            line1: `${userBusinessData.business_street} ${userBusinessData.business_number || ''}`.trim(),
            city: userBusinessData.business_city,
            postal_code: userBusinessData.business_postal,
            country: userBusinessData.business_country || 'NL',
          };
        }
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      logStep("Stripe account created", { accountId });

      // Store account in database
      const { error: insertError } = await supabaseService
        .from('business_stripe_accounts')
        .insert({
          account_owner_id: accountOwnerId,
          stripe_account_id: accountId,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
          account_type: 'express',
          country: accountParams.country,
          currency: 'eur',
        });

      if (insertError) {
        logStep("Error storing account", { error: insertError.message });
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
      logStep("Account stored in database");
    } else {
      logStep("Using existing account", { accountId });
    }

    // Create account session for embedded component
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    });

    logStep("Account session created", { 
      sessionId: accountSession.id,
      clientSecret: accountSession.client_secret ? "present" : "missing"
    });

    return new Response(JSON.stringify({
      success: true,
      client_secret: accountSession.client_secret,
      account_id: accountId,
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