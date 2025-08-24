import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-REFRESH] ${step}${detailsStr}`);
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

    const { test_mode = false } = await req.json();

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

    // Get account owner's Stripe account
    const accountOwnerId = userData.account_owner_id || user.id;

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
    
    logStep("Stripe initialized", { test_mode, platformAccountId, environment });

    // Get Stripe account from database for this platform
    const { data: account, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .maybeSingle();

    if (accountError) {
      logStep('Account lookup error', accountError);
      throw new Error('Database error while looking up Stripe account');
    }

    if (!account) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No Stripe account found for this platform/environment' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    logStep('Found account', { accountId: account.stripe_account_id, userId: user.id, platformAccountId });

    // Fetch current account status from Stripe
    logStep('Fetching account from Stripe...');
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
    
    logStep('Stripe account status', {
      details_submitted: stripeAccount.details_submitted,
      charges_enabled: stripeAccount.charges_enabled,
      payouts_enabled: stripeAccount.payouts_enabled,
    });

    // Update account in database
    const { data: updatedAccount, error: updateError } = await supabaseClient
      .from('business_stripe_accounts')
      .update({
        account_status: stripeAccount.details_submitted ? 'active' : 'pending',
        details_submitted: stripeAccount.details_submitted,
        onboarding_completed: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        country: stripeAccount.country,
        updated_at: new Date().toISOString(),
      })
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify(updatedAccount),
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