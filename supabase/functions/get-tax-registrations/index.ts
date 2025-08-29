import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TAX-REGISTRATIONS] ${step}${detailsStr}`);
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

    const { test_mode = true } = await req.json();

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can access tax data
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Tax compliance features require Professional or Enterprise subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const accountOwnerId = userData.account_owner_id || user.id;

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get platform account
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    const environment = test_mode ? 'test' : 'live';

    // Get user's Stripe account with proper tenant isolation
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .eq('charges_enabled', true)
      .single();

    if (!stripeAccount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'NO_ACCOUNT',
          error: 'No active Stripe account found. Please complete Stripe onboarding first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep('Found Stripe account', { accountId: stripeAccount.stripe_account_id });

    // Get tax registrations from Stripe Tax
    let taxRegistrations = [];
    try {
      const registrations = await stripe.tax.registrations.list({
        stripeAccount: stripeAccount.stripe_account_id
      });
      taxRegistrations = registrations.data.map(reg => ({
        id: reg.id,
        country: reg.country,
        country_options: reg.country_options,
        active_from: reg.active_from,
        expires_at: reg.expires_at,
        livemode: reg.livemode,
        status: reg.status,
        type: reg.type
      }));
    } catch (error) {
      logStep('Tax registrations not available', { error: error.message });
      // For Express accounts, tax registrations might not be directly accessible
      // Return empty array instead of error
    }

    const registrationsData = {
      success: true,
      registrations: taxRegistrations,
      connectedAccountId: stripeAccount.stripe_account_id,
      lastUpdated: new Date().toISOString()
    };

    logStep('Tax registrations retrieved', { 
      accountId: stripeAccount.stripe_account_id,
      count: taxRegistrations.length
    });

    return new Response(
      JSON.stringify(registrationsData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ 
        success: false, 
        code: 'SERVER_ERROR',
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});