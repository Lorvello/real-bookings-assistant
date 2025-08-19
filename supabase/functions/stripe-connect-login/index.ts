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

    const { calendar_id } = await req.json();

    // Get existing account
    const { data: account, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
      .eq('calendar_id', calendar_id)
      .single();

    if (accountError || !account) {
      throw new Error('Stripe account not found');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
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
      .eq('calendar_id', calendar_id);

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

    // If onboarding is incomplete, create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.stripe_account_id,
      refresh_url: `${req.headers.get('origin') || 'http://localhost:3000'}/settings?tab=payments&refresh=true`,
      return_url: `${req.headers.get('origin') || 'http://localhost:3000'}/settings?tab=payments&connected=true`,
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