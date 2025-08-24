
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-LOGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parse request body to get test_mode
    const { test_mode } = await req.json();
    const environment = test_mode ? 'test' : 'live';
    logStep("Request parameters", { test_mode, environment });

    // Get user data and verify account ownership
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      logStep('Failed to fetch user data', userDataError);
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only account owners can access Stripe dashboard
    const accountOwnerId = userData.account_owner_id || user.id;
    if (userData.account_owner_id !== null) {
      logStep('User is not account owner', { userId: user.id, accountOwnerId: userData.account_owner_id });
      throw new Error('Only account owners can access Stripe dashboard');
    }

    // Initialize Stripe with correct secret key based on mode
    const stripeSecretKey = test_mode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST') 
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    
    logStep("Stripe initialized", { testMode: test_mode, keyConfigured: !!stripeSecretKey, platformAccountId });

    // FIXED: Use proper query to find SINGLE account with environment filter and ordering
    // First try to get a completed account
    let { data: accounts, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .eq('onboarding_completed', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (accountError || !accounts || accounts.length === 0) {
      // If no completed account, try any account for this environment/platform
      const fallbackQuery = await supabaseClient
        .from('business_stripe_accounts')
        .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('platform_account_id', platformAccountId)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      accounts = fallbackQuery.data;
      accountError = fallbackQuery.error;
    }

    if (accountError) {
      logStep('Account lookup error', accountError);
      throw new Error('Database error while looking up Stripe account');
    }

    if (!accounts || accounts.length === 0) {
      logStep('No account found', { accountOwnerId, environment, platformAccountId });
      return new Response(
        JSON.stringify({ error: 'No Stripe account found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const account = accounts[0];
    logStep('Found account', { 
      accountId: account.stripe_account_id, 
      onboarding_completed: account.onboarding_completed,
      charges_enabled: account.charges_enabled 
    });

    // Fetch latest account details from Stripe to verify status
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
    
    // Update database with latest status (NO new account creation here!)
    await supabaseClient
      .from('business_stripe_accounts')
      .update({
        onboarding_completed: stripeAccount.details_submitted || false,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        account_status: stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.stripe_account_id);

    // If account is fully onboarded, create login link
    if (stripeAccount.details_submitted && stripeAccount.charges_enabled) {
      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);
      
      logStep('Login link created', { accountId: account.stripe_account_id });
      
      return new Response(
        JSON.stringify({
          url: loginLink.url,
          type: 'login_link'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get base URL with robust resolution
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    const appEnv = Deno.env.get('APP_ENV') || 'development';
    
    let baseUrl: string;
    if (appBaseUrl && appBaseUrl.startsWith('http')) {
      baseUrl = appBaseUrl;
    } else if (appEnv === 'production' || appEnv.includes('bookingsassistant.com')) {
      baseUrl = 'https://bookingsassistant.com';
    } else if (appEnv === 'preview' || appEnv.includes('lovable.app')) {
      baseUrl = 'https://preview--real-bookings-assistant.lovable.app';
    } else {
      baseUrl = 'https://bookingsassistant.com';
    }

    // If onboarding is incomplete, create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.stripe_account_id,
      refresh_url: `${baseUrl}/settings?tab=payments&refresh=true`,
      return_url: `${baseUrl}/settings?tab=payments&connected=true`,
      type: 'account_onboarding',
    });

    logStep('Onboarding link created', { accountId: account.stripe_account_id });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        type: 'account_onboarding'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
