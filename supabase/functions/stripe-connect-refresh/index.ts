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

    const { test_mode = false } = await req.json();

    // Get user data and verify account ownership
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('[STRIPE-CONNECT-REFRESH] Failed to fetch user data:', userError);
      throw new Error(`Failed to fetch user data: ${userError.message}`);
    }

    // Get account owner's Stripe account
    const accountOwnerId = userData.account_owner_id || user.id;
    const { data: account, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .maybeSingle();

    if (accountError) {
      console.error('[STRIPE-CONNECT-REFRESH] Account lookup error:', accountError);
      throw new Error('Database error while looking up Stripe account');
    }

    if (!account) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No Stripe account found for this user' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    console.log('[STRIPE-CONNECT-REFRESH] Found account:', { accountId: account.stripe_account_id, userId: user.id });

    // Initialize Stripe with appropriate key based on mode
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_TEST_SECRET_KEY") 
      : Deno.env.get("STRIPE_LIVE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error(`Stripe ${test_mode ? 'test' : 'live'} secret key not configured`);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Fetch current account status from Stripe
    console.log('[STRIPE-CONNECT-REFRESH] Fetching account from Stripe...');
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
    
    console.log('[STRIPE-CONNECT-REFRESH] Stripe account status:', {
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
    console.error('Error in stripe-connect-refresh:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});