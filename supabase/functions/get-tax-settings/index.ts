import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TAX-SETTINGS] ${step}${detailsStr}`);
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

    // Only Professional and Enterprise users can access tax settings
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tax compliance features require Professional or Enterprise subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
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
          error: 'No active Stripe account found. Please complete Stripe onboarding first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    logStep('Found Stripe account', { accountId: stripeAccount.stripe_account_id });

    // Fetch Stripe account details for comprehensive tax settings
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);
    
    // Get tax registrations from Stripe Tax
    let taxRegistrations = [];
    try {
      const registrations = await stripe.tax.registrations.list({
        stripeAccount: stripeAccount.stripe_account_id
      });
      taxRegistrations = registrations.data;
    } catch (error) {
      logStep('Tax registrations not available', { error: error.message });
    }

    // Get tax settings from Stripe
    const taxSettings = {
      originAddress: {
        line1: account.company?.address?.line1 || account.individual?.address?.line1 || '',
        line2: account.company?.address?.line2 || account.individual?.address?.line2 || '',
        city: account.company?.address?.city || account.individual?.address?.city || '',
        state: account.company?.address?.state || account.individual?.address?.state || '',
        postal_code: account.company?.address?.postal_code || account.individual?.address?.postal_code || '',
        country: account.company?.address?.country || account.individual?.address?.country || 'NL'
      },
      defaultTaxBehavior: 'exclusive', // Stripe default
      pricesIncludeTax: false,
      presetProductTaxCode: 'txcd_10000000', // General - Tangible Goods
      automaticTax: {
        checkout: {
          enabled: true,
          status: 'active'
        },
        invoices: {
          enabled: true,
          status: 'active'
        }
      }
    };

    // Get threshold monitoring status (simplified - would need Connect embedded component)
    const thresholdMonitoring = {
      enabled: taxRegistrations.length > 0,
      registrations: taxRegistrations.map(reg => ({
        country: reg.country,
        type: reg.type,
        status: reg.status,
        active_from: reg.active_from
      }))
    };

    const settingsData = {
      success: true,
      taxSettings: taxSettings,
      taxRegistrations: taxRegistrations,
      thresholdMonitoring: thresholdMonitoring,
      stripeAccountStatus: {
        accountId: stripeAccount.stripe_account_id,
        country: stripeAccount.country || 'NL',
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        onboardingCompleted: stripeAccount.onboarding_completed
      },
      connectedAccountId: stripeAccount.stripe_account_id,
      lastUpdated: new Date().toISOString()
    };

    logStep('Tax settings retrieved', { 
      accountId: stripeAccount.stripe_account_id,
      registrations: taxRegistrations.length,
      automaticTaxEnabled: true
    });

    return new Response(
      JSON.stringify(settingsData),
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
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});