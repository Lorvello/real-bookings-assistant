import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TAX-DATA] ${step}${detailsStr}`);
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

    const { calendar_id, test_mode = true, start_date, end_date } = await req.json();

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

    // Fetch Stripe account settings for tax configuration
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);
    
    // Get tax settings from Stripe
    const taxSettings = {
      originAddress: account.company?.address || account.individual?.address || null,
      defaultTaxBehavior: account.settings?.payments?.statement_descriptor_suffix_kana || 'exclusive',
      taxCalculation: {
        automaticTax: account.settings?.dashboard?.display_name || 'disabled'
      }
    };

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


    // Calculate date range (default to last 90 days)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    // Get payment data from our database (filtered by calendar if provided)
    let bookingQuery = supabaseClient
      .from('booking_payments')
      .select(`
        *,
        bookings!inner(
          calendar_id,
          customer_name,
          service_types(name)
        )
      `)
      .eq('stripe_account_id', stripeAccount.stripe_account_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .in('status', ['succeeded', 'completed']);

    if (calendar_id) {
      bookingQuery = bookingQuery.eq('bookings.calendar_id', calendar_id);
    }

    const { data: payments, error: paymentsError } = await bookingQuery;

    if (paymentsError) {
      logStep('Error fetching payments', paymentsError);
      throw new Error('Failed to fetch payment data');
    }

    // Get Stripe payment intents with tax data
    let totalRevenue = 0;
    let totalTaxCollected = 0;
    let transactionCount = 0;
    let taxableTransactions = 0;
    let averageTransactionValue = 0;
    let topServices = new Map();

    for (const payment of payments || []) {
      try {
        // Fetch payment intent from Stripe to get tax data
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
          { stripeAccount: stripeAccount.stripe_account_id }
        );

        const amount = paymentIntent.amount / 100; // Convert from cents
        totalRevenue += amount;
        transactionCount++;

        // Check if automatic tax was applied
        if (paymentIntent.automatic_tax?.enabled && paymentIntent.automatic_tax?.status === 'complete') {
          const taxAmount = (paymentIntent.amount_details?.tax?.amount || 0) / 100;
          totalTaxCollected += taxAmount;
          if (taxAmount > 0) {
            taxableTransactions++;
          }
        }

        // Track service popularity
        const serviceName = payment.bookings?.service_types?.name || 'Unknown Service';
        topServices.set(serviceName, (topServices.get(serviceName) || 0) + 1);

      } catch (stripeError) {
        logStep('Error fetching payment intent', { paymentId: payment.stripe_payment_intent_id, error: stripeError.message });
        // Continue with other payments even if one fails
      }
    }

    averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

    // Convert top services to array and sort
    const topServicesArray = Array.from(topServices.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate compliance status
    const taxComplianceRate = transactionCount > 0 ? (taxableTransactions / transactionCount) * 100 : 0;
    const complianceStatus = taxComplianceRate >= 95 ? 'compliant' : 
                           taxComplianceRate >= 80 ? 'warning' : 'non_compliant';

    // Get current quarter data
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const quarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);

    const taxData = {
      success: true,
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
        transactionCount,
        taxableTransactions,
        averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
        taxComplianceRate: Math.round(taxComplianceRate * 100) / 100,
        complianceStatus,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      quarterlyData: {
        currentQuarter,
        quarterStart: quarterStart.toISOString(),
        quarterEnd: quarterEnd.toISOString(),
        revenue: totalRevenue,
        taxCollected: totalTaxCollected,
        vatRate: 21.0,
        complianceStatus
      },
      topServices: topServicesArray,
      stripeAccountStatus: {
        accountId: stripeAccount.stripe_account_id,
        country: stripeAccount.country || 'NL',
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        automaticTaxEnabled: true
      },
      taxSettings: taxSettings,
      taxRegistrations: taxRegistrations,
      connectedAccountId: stripeAccount.stripe_account_id,
      lastUpdated: new Date().toISOString()
    };

    logStep('Tax data calculated', { 
      totalRevenue, 
      totalTaxCollected, 
      transactionCount, 
      complianceStatus 
    });

    return new Response(
      JSON.stringify(taxData),
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