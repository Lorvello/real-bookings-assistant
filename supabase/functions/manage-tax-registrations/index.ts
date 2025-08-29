import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-TAX-REGISTRATIONS] ${step}${detailsStr}`);
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

    const { test_mode = true, action, country, vat_id, registration_id } = await req.json();

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can manage tax registrations
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Tax registration management requires Professional or Enterprise subscription' 
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

    // Get user's Stripe account
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

    // Handle different actions
    switch (action) {
      case 'list':
        try {
          const registrations = await stripe.tax.registrations.list({
            stripeAccount: stripeAccount.stripe_account_id
          });

          return new Response(
            JSON.stringify({
              success: true,
              registrations: registrations.data.map(reg => ({
                id: reg.id,
                country: reg.country,
                status: reg.status,
                active_from: reg.active_from,
                expires_at: reg.expires_at,
                livemode: reg.livemode,
                type: reg.type,
                country_options: reg.country_options
              })),
              lastUpdated: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Tax registrations not available', { error: error.message });
          return new Response(
            JSON.stringify({
              success: true,
              registrations: [],
              lastUpdated: new Date().toISOString(),
              note: 'Tax registrations may not be available for Express accounts'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

      case 'create':
        if (!country) {
          throw new Error('Country is required for creating tax registration');
        }

        try {
          const registration = await stripe.tax.registrations.create({
            country,
            country_options: vat_id ? {
              [country.toLowerCase()]: {
                type: 'vat',
                value: vat_id
              }
            } : undefined
          }, {
            stripeAccount: stripeAccount.stripe_account_id
          });

          logStep('Created tax registration', { country, registrationId: registration.id });

          return new Response(
            JSON.stringify({
              success: true,
              registration: {
                id: registration.id,
                country: registration.country,
                status: registration.status,
                active_from: registration.active_from,
                expires_at: registration.expires_at,
                livemode: registration.livemode,
                type: registration.type,
                country_options: registration.country_options
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Failed to create tax registration', { error: error.message });
          throw new Error(`Failed to create tax registration: ${error.message}`);
        }

      case 'delete':
        if (!registration_id) {
          throw new Error('Registration ID is required for deleting tax registration');
        }

        try {
          await stripe.tax.registrations.update(registration_id, {
            expires_at: Math.floor(Date.now() / 1000) // Set to expire immediately
          }, {
            stripeAccount: stripeAccount.stripe_account_id
          });

          logStep('Deleted tax registration', { registrationId: registration_id });

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Tax registration deleted successfully'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Failed to delete tax registration', { error: error.message });
          throw new Error(`Failed to delete tax registration: ${error.message}`);
        }

      default:
        throw new Error('Invalid action. Supported actions: list, create, delete');
    }

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