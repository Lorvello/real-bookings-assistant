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

    // Initialize Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request
    const { test_mode = false } = await req.json();
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
      .select('account_owner_id, business_name, business_email, business_phone')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    const accountOwnerId = userDataResult.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Initialize Stripe with correct secret key
    const stripe = new Stripe(
      test_mode 
        ? Deno.env.get("STRIPE_SECRET_KEY_TEST") ?? ""
        : Deno.env.get("STRIPE_SECRET_KEY_LIVE") ?? "",
      { apiVersion: "2023-10-16" }
    );

    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    const environment = test_mode ? 'test' : 'live';

    logStep("Stripe initialized", { 
      test_mode, 
      keyConfigured: !!(test_mode ? Deno.env.get("STRIPE_SECRET_KEY_TEST") : Deno.env.get("STRIPE_SECRET_KEY_LIVE")),
      platformAccountId,
      environment
    });

    // Check for existing account for this platform
    const { data: existingAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .maybeSingle();

    let accountId = existingAccount?.stripe_account_id;

    if (existingAccount) {
      accountId = existingAccount.stripe_account_id;
      logStep("Using existing account", { accountId, platformAccountId });

      // Test account accessibility
      try {
        await stripe.accounts.retrieve(accountId);
        logStep("Account accessible");
      } catch (accessError) {
        if (accessError.statusCode === 403 || accessError.statusCode === 404) {
          logStep("Account not accessible, creating new one", { error: accessError.message });
          
          // Create new Express account
          const stripeAccount = await stripe.accounts.create({
            type: 'express',
            country: 'NL',
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true }
            },
            business_profile: userDataResult.business_phone ? {
              support_phone: userDataResult.business_phone
            } : undefined
          });

          accountId = stripeAccount.id;
          
          // Update existing record
          await supabaseService
            .from('business_stripe_accounts')
            .update({
              stripe_account_id: accountId,
              platform_account_id: platformAccountId,
              environment,
              account_status: 'pending',
              onboarding_completed: false,
              charges_enabled: false,
              payouts_enabled: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAccount.id);

          logStep("Updated existing record with new account", { accountId });
        } else {
          throw accessError;
        }
      }
    } else {
      // Create new Stripe Connect account
      logStep("Creating new Stripe account");
      
      const accountParams: any = {
        type: 'express',
        country: 'NL',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      };

      // Add business profile if phone available
      if (userDataResult.business_phone) {
        accountParams.business_profile = {
          support_phone: userDataResult.business_phone
        };
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      logStep("Stripe account created", { accountId });

      // Store account in database
      const { error: insertError } = await supabaseService
        .from('business_stripe_accounts')
        .insert({
          account_owner_id: accountOwnerId,
          user_id: user.id,
          stripe_account_id: accountId,
          platform_account_id: platformAccountId,
          environment,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
          account_type: 'express',
          country: 'NL',
          currency: 'eur',
        });

      if (insertError) {
        logStep("Error storing account", { error: insertError.message });
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
      logStep("Account stored in database", { accountId, platformAccountId });
    }

    // Create account session for embedded component
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
        balances: { enabled: true },
        documents: { enabled: true },
        payments: { enabled: true },
        payouts: { enabled: true }
      },
    });

    logStep("Account session created", { 
      accountId,
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