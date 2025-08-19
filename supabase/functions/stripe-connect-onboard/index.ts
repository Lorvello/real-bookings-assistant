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

    // Verify user owns the calendar
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('calendars')
      .select('id, name')
      .eq('id', calendar_id)
      .eq('user_id', user.id)
      .single();

    if (calendarError || !calendar) {
      throw new Error('Calendar not found or access denied');
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    });

    // Check if account already exists
    let { data: existingAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id')
      .eq('calendar_id', calendar_id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;
    } else {
      // Create new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NL', // Netherlands
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          calendar_id: calendar_id,
          business_name: calendar.name,
        },
      });

      stripeAccountId = account.id;

      // Store account in database
      await supabaseClient
        .from('business_stripe_accounts')
        .insert({
          calendar_id: calendar_id,
          stripe_account_id: stripeAccountId,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
          account_type: 'express',
          country: 'NL',
          currency: 'eur',
        });
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${req.headers.get('origin')}/dashboard/settings?tab=payments&refresh=true`,
      return_url: `${req.headers.get('origin')}/dashboard/settings?tab=payments&success=true`,
      type: 'account_onboarding',
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
    console.error('Error in stripe-connect-onboard:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});