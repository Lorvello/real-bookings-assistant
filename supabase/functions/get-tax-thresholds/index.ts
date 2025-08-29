import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TAX-THRESHOLDS] ${step}${detailsStr}`);
};

// Tax thresholds by country (in cents)
const TAX_THRESHOLDS = {
  'US': 0, // No threshold
  'GB': 8500000, // £85,000
  'DE': 2200000, // €22,000
  'FR': 3570000, // €35,700
  'ES': 0, // No threshold for B2B
  'IT': 6500000, // €65,000
  'NL': 0, // No threshold
  'BE': 2500000, // €25,000
  'AT': 3000000, // €30,000
  'SE': 32000000, // 320,000 SEK (~€30,000)
  'DK': 5000000, // 50,000 DKK (~€6,700)
  'FI': 1000000, // €10,000
  'NO': 5000000, // 50,000 NOK (~€4,500)
  'CH': 10000000, // 100,000 CHF (~€95,000)
  'AU': 7500000, // $75,000 AUD
  'CA': 3000000, // $30,000 CAD
  'SG': 100000000, // $1,000,000 SGD
  'MY': 50000000, // 500,000 MYR (~€100,000)
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

    const { test_mode = true, calendar_id } = await req.json();

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can access tax thresholds
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Tax threshold monitoring requires Professional or Enterprise subscription' 
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

    // Calculate start of current year for threshold monitoring
    const currentYear = new Date().getFullYear();
    const yearStart = Math.floor(new Date(currentYear, 0, 1).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);

    // Get tax transactions from Stripe (this might not be available for Express accounts)
    let countryThresholds = [];
    try {
      const transactions = await stripe.tax.transactions.list({
        created: { gte: yearStart, lt: now },
        limit: 100
      }, {
        stripeAccount: stripeAccount.stripe_account_id
      });

      // Aggregate revenue by country
      const revenueByCountry = new Map();
      
      for (const transaction of transactions.data) {
        const country = transaction.customer_details?.tax_exempt || transaction.shipping?.address?.country || 'UNKNOWN';
        const amount = transaction.amount_total || 0;
        
        if (revenueByCountry.has(country)) {
          revenueByCountry.set(country, revenueByCountry.get(country) + amount);
        } else {
          revenueByCountry.set(country, amount);
        }
      }

      // Calculate threshold status for each country
      countryThresholds = Array.from(revenueByCountry.entries()).map(([country, revenue]) => {
        const threshold = TAX_THRESHOLDS[country] || 0;
        const percentage = threshold > 0 ? (revenue / threshold) * 100 : 0;
        
        let status = 'under';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'near';

        return {
          country,
          revenue,
          threshold,
          percentage: Math.min(percentage, 100),
          status,
          currency: 'EUR' // Default to EUR, could be enhanced to detect actual currency
        };
      });

      logStep('Calculated thresholds', { countries: countryThresholds.length });

    } catch (error) {
      logStep('Tax transactions not available', { error: error.message });
      
      // Fallback: Use booking payments from our database
      const startDate = new Date(currentYear, 0, 1).toISOString();
      const endDate = new Date().toISOString();

      const { data: payments } = await supabaseClient
        .from('booking_payments')
        .select(`
          amount_cents,
          currency,
          created_at,
          bookings!inner(
            calendar_id,
            customer_name
          )
        `)
        .eq('status', 'succeeded')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (payments && payments.length > 0) {
        // For fallback, assume domestic transactions only
        const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
        const accountCountry = stripeAccount.country || 'NL'; // Default to NL
        const threshold = TAX_THRESHOLDS[accountCountry] || 0;
        const percentage = threshold > 0 ? (totalRevenue / threshold) * 100 : 0;
        
        let status = 'under';
        if (percentage >= 100) status = 'exceeded';
        else if (percentage >= 80) status = 'near';

        countryThresholds = [{
          country: accountCountry,
          revenue: totalRevenue,
          threshold,
          percentage: Math.min(percentage, 100),
          status,
          currency: payments[0]?.currency?.toUpperCase() || 'EUR'
        }];
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        thresholds: countryThresholds,
        lastUpdated: new Date().toISOString(),
        note: countryThresholds.length === 0 ? 'No tax threshold data available yet' : undefined
      }),
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