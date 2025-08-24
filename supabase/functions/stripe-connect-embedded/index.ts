
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

// Validate required environment variables
const validateEnvironment = () => {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'STRIPE_SECRET_KEY_TEST'];
  const missing = required.filter(key => !Deno.env.get(key));
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Validate environment variables first
    validateEnvironment();

    // Parse request
    const { test_mode = true } = await req.json();
    const environment = test_mode ? 'test' : 'live';
    logStep("Request parsed", { test_mode, environment });

    // Initialize Supabase clients - use service role for auth to avoid token issues
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Authenticate user using JWT from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No authorization header provided" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    if (userError || !user) {
      logStep("Authentication failed", userError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Authentication failed" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user data to determine account owner using service role
    const { data: userDataResult, error: userDataError } = await supabaseService
      .from('users')
      .select('account_owner_id, business_name, business_email, business_phone')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      logStep("User data fetch failed", userDataError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to fetch user data: ${userDataError.message}` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const accountOwnerId = userDataResult.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Initialize Stripe with correct secret key
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST") 
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      logStep("Missing Stripe secret key", { test_mode });
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Stripe configuration missing" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;

    logStep("Stripe initialized", { 
      test_mode, 
      keyConfigured: !!(test_mode ? Deno.env.get("STRIPE_SECRET_KEY_TEST") : Deno.env.get("STRIPE_SECRET_KEY_LIVE")),
      platformAccountId,
      environment
    });

    // FIXED: Use proper query to find existing account without creating duplicates
    // First try to find a completed account, then fall back to any account
    let { data: accounts, error: accountError } = await supabaseService
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .eq('onboarding_completed', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    // If no completed account found, check for any account but prefer the most recent
    if (!accounts || accounts.length === 0) {
      const { data: anyAccounts } = await supabaseService
        .from('business_stripe_accounts')
        .select('*')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('platform_account_id', platformAccountId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      accounts = anyAccounts;
    }

    let accountId: string;
    const existingAccount = accounts && accounts.length > 0 ? accounts[0] : null;

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
      // ONLY create new account if absolutely NO account exists
      logStep("No existing account found - creating new Stripe account");
      
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
      const { data: insertData, error: insertError } = await supabaseService
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
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        logStep("Error storing account", { error: insertError.message });
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
    logStep("Account stored in database", { accountId, platformAccountId, recordId: insertData?.id });
    
    // Store account ID in calendar_settings for faster access
    const { data: calendarData } = await supabaseService
      .from('calendars')
      .select('id')
      .eq('user_id', accountOwnerId)
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (calendarData) {
      await supabaseService
        .from('calendar_settings')
        .upsert({
          calendar_id: calendarData.id,
          stripe_connect_account_id: accountId
        }, { onConflict: 'calendar_id' });
      logStep("Account ID cached in calendar_settings", { calendarId: calendarData.id, accountId });
    }
    }

    // Check if account has completed onboarding to determine which components to enable
    let isOnboardingCompleted = false;
    try {
      const stripeAccountDetails = await stripe.accounts.retrieve(accountId);
      isOnboardingCompleted = stripeAccountDetails.details_submitted || false;
      logStep("Account onboarding status checked", { 
        accountId, 
        details_submitted: stripeAccountDetails.details_submitted,
        charges_enabled: stripeAccountDetails.charges_enabled 
      });
    } catch (err) {
      logStep("Could not check account status, assuming incomplete", { error: err.message });
    }

    // Create account session with appropriate components based on onboarding status
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        // Only enable onboarding if account is NOT completed
        account_onboarding: { enabled: !isOnboardingCompleted },
        // Always enable account management for dashboard view
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
