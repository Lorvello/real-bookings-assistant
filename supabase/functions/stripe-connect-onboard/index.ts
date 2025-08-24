import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARD] ${step}${detailsStr}`);
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

    // Parse request
    const body = await req.json();
    const testMode = body.test_mode || false;
    logStep("Request parsed", { testMode });

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user's business data for prefilling
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select(`
        business_name, business_email, business_phone, business_street, 
        business_number, business_postal, business_city, business_country,
        business_description, full_name, email, phone, website
      `)
      .eq('id', user.id)
      .single();

    logStep("User data for prefilling", userData ? 'Data found' : null);
    
    const prefillData = {
      business_name: userData?.business_name,
      business_email: userData?.business_email,
      business_phone: userData?.business_phone,
      business_address: userData?.business_street && userData?.business_city ? 
        `${userData.business_street} ${userData.business_number || ''}`.trim() : null,
      business_city: userData?.business_city,
      business_postal: userData?.business_postal,
      website: userData?.website,
      description: userData?.business_description
    };
    
    if (userData) {
      logStep("Prefill data available", {
        business_name: !!prefillData.business_name,
        business_email: !!prefillData.business_email,
        business_phone: !!prefillData.business_phone,
        business_address: !!prefillData.business_address,
        website: !!prefillData.website,
        description: !!prefillData.description
      });
    }

    // Initialize Stripe
    const stripeSecretKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${testMode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    
    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    const environment = testMode ? 'test' : 'live';
    
    logStep("Stripe initialized", { 
      testMode, 
      keyConfigured: !!(testMode ? Deno.env.get("STRIPE_SECRET_KEY_TEST") : Deno.env.get("STRIPE_SECRET_KEY_LIVE")),
      platformAccountId,
      environment
    });

    // Check if user is account owner
    const { data: userRoleData, error: userRoleError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userRoleError) {
      throw new Error(`Failed to fetch user data: ${userRoleError.message}`);
    }

    const accountOwnerId = userRoleData.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Only account owners can onboard Stripe
    if (userRoleData.account_owner_id !== null) {
      throw new Error('Only account owners can set up Stripe Connect');
    }

    // Check if Stripe account exists for this platform
    const { data: existingAccount, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .single();

    let stripeAccountId: string;
    
    if (existingAccount) {
      stripeAccountId = existingAccount.stripe_account_id;
      logStep("Using existing account", { stripeAccountId, platformAccountId });
      
      // Test account accessibility
      try {
        await stripe.accounts.retrieve(stripeAccountId);
        logStep("Account accessible");
      } catch (accessError) {
        if (accessError.statusCode === 403 || accessError.statusCode === 404) {
          logStep("Account not accessible, creating new one", { error: accessError.message });
          // Account exists in DB but not accessible via this platform - create new one
          stripeAccountId = await createNewStripeAccount(stripe, user, prefillData);
          
          // Update existing record instead of creating new one
          await supabaseClient
            .from('business_stripe_accounts')
            .update({
              stripe_account_id: stripeAccountId,
              platform_account_id: platformAccountId,
              environment,
              account_status: 'pending',
              onboarding_completed: false,
              charges_enabled: false,
              payouts_enabled: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAccount.id);
          
          logStep("Updated existing record with new account", { stripeAccountId });
        } else {
          throw accessError;
        }
      }
    } else {
      // Create new Stripe account
      stripeAccountId = await createNewStripeAccount(stripe, user, prefillData);
      
      // Store in database
      const { error: insertError } = await supabaseClient
        .from('business_stripe_accounts')
        .insert({
          account_owner_id: accountOwnerId,
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          platform_account_id: platformAccountId,
          environment,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false
        });
      
      if (insertError) {
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
      
      logStep("Account stored in database", { stripeAccountId, platformAccountId });
    }

    // Get base URL with robust resolution
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    const appEnv = Deno.env.get('APP_ENV') || 'development';
    logStep("Environment", { 
      ENV: appEnv, 
      baseUrl: appBaseUrl,
      currentUrl: req.url 
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

    // Create onboarding link with fixed URLs
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/settings?tab=payments&refresh=true`,
      return_url: `${baseUrl}/settings?tab=payments&success=true`,
      type: 'account_onboarding',
    });

    logStep("Onboarding link created", { 
      url: 'generated', 
      expires_at: accountLink.expires_at,
      baseUrl,
      userId: user.id
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        expires_at: accountLink.expires_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function createNewStripeAccount(stripe: any, user: any, prefillData: any): Promise<string> {
  const accountData: any = {
    type: 'express',
    country: 'NL', // Default to Netherlands
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  };
  
  // Only add non-restricted prefill data for new accounts
  if (prefillData.business_phone) {
    accountData.business_profile = {
      support_phone: prefillData.business_phone
    };
  }
  
  if (prefillData.website) {
    accountData.business_profile = accountData.business_profile || {};
    accountData.business_profile.url = prefillData.website;
  }
  
  const stripeAccount = await stripe.accounts.create(accountData);
  console.log(`[STRIPE-CONNECT-ONBOARD] Created new Stripe account: ${stripeAccount.id}`);
  
  return stripeAccount.id;
}