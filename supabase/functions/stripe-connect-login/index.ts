import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('[STRIPE-CONNECT-LOGIN] Request parameters:', { test_mode });

    // Get user data and verify account ownership
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('[STRIPE-CONNECT-LOGIN] Failed to fetch user data:', userDataError);
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only account owners can access Stripe dashboard
    if (userData.account_owner_id !== null) {
      console.log('[STRIPE-CONNECT-LOGIN] User is not account owner:', { userId: user.id, accountOwnerId: userData.account_owner_id });
      throw new Error('Only account owners can access Stripe dashboard');
    }

    // Get account owner's Stripe account
    const { data: account, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
      .eq('account_owner_id', user.id)
      .maybeSingle();

    if (accountError) {
      console.error('[STRIPE-CONNECT-LOGIN] Account lookup error:', accountError);
      throw new Error('Database error while looking up Stripe account');
    }

    if (!account) {
      return new Response(
        JSON.stringify({ error: 'No Stripe account found for this user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Initialize Stripe with correct secret key based on mode
    const stripeSecretKey = test_mode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST') 
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    console.log('[STRIPE-CONNECT-LOGIN] Stripe initialized:', { testMode: test_mode, keyConfigured: !!stripeSecretKey });

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Fetch latest account details from Stripe to verify status
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
    
    // Update database with latest status
    await supabaseClient
      .from('business_stripe_accounts')
      .update({
        onboarding_completed: stripeAccount.details_submitted || false,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        account_status: stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('account_owner_id', user.id);

    // If account is fully onboarded, create login link
    if (stripeAccount.details_submitted && stripeAccount.charges_enabled) {
      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);
      
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
    console.log('[STRIPE-CONNECT-LOGIN] Environment:', { 
      ENV: appEnv, 
      baseUrl: appBaseUrl 
    });
    
    let baseUrl: string;
    if (appBaseUrl && appBaseUrl.startsWith('http')) {
      // Use explicit base URL if provided
      baseUrl = appBaseUrl;
    } else if (appEnv === 'production' || appEnv.includes('bookingsassistant.com')) {
      baseUrl = 'https://bookingsassistant.com';
    } else if (appEnv === 'preview' || appEnv.includes('lovable.app')) {
      baseUrl = 'https://preview--real-bookings-assistant.lovable.app';
    } else {
      // Always default to production for safety
      baseUrl = 'https://bookingsassistant.com';
    }

    // If onboarding is incomplete, create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.stripe_account_id,
      refresh_url: `${baseUrl}/settings?tab=payments&refresh=true`,
      return_url: `${baseUrl}/settings?tab=payments&connected=true`,
      type: 'account_onboarding',
    });

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
    console.error('Error in stripe-connect-login:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});