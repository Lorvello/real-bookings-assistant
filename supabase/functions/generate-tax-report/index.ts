import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-TAX-REPORT] ${step}${detailsStr}`);
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

    const { 
      calendar_id, 
      test_mode = true, 
      report_type = 'quarterly', 
      year = new Date().getFullYear(),
      quarter = Math.floor(new Date().getMonth() / 3) + 1,
      month
    } = await req.json();

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id, business_name')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can generate tax reports
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Tax reporting features require Professional or Enterprise subscription' 
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
          error: 'No active Stripe account found. Please complete Stripe onboarding first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    logStep('Generating tax report', { reportType: report_type, year, quarter, month });

    // Calculate date range based on report type
    let startDate, endDate;
    
    if (report_type === 'quarterly') {
      startDate = new Date(year, (quarter - 1) * 3, 1);
      endDate = new Date(year, quarter * 3, 0);
    } else if (report_type === 'monthly') {
      if (!month) throw new Error('Month is required for monthly reports');
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else if (report_type === 'annual') {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    } else {
      throw new Error('Invalid report type. Must be quarterly, monthly, or annual');
    }

    // Get payment data from database
    let bookingQuery = supabaseClient
      .from('booking_payments')
      .select(`
        *,
        bookings!inner(
          calendar_id,
          customer_name,
          customer_email,
          start_time,
          service_types(name, price)
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

    // Process payments and generate detailed report data
    const reportDetails = [];
    let totalRevenue = 0;
    let totalTax = 0;
    let totalNet = 0;

    for (const payment of payments || []) {
      try {
        // Fetch payment intent from Stripe to get detailed tax data
        const paymentIntent = await stripe.paymentIntents.retrieve(
          payment.stripe_payment_intent_id,
          { stripeAccount: stripeAccount.stripe_account_id }
        );

        const grossAmount = paymentIntent.amount / 100;
        const taxAmount = (paymentIntent.amount_details?.tax?.amount || 0) / 100;
        const netAmount = grossAmount - taxAmount;

        totalRevenue += grossAmount;
        totalTax += taxAmount;
        totalNet += netAmount;

        reportDetails.push({
          date: payment.created_at,
          transactionId: payment.stripe_payment_intent_id,
          customerName: payment.bookings?.customer_name || 'Unknown',
          customerEmail: payment.bookings?.customer_email || '',
          serviceName: payment.bookings?.service_types?.name || 'Unknown Service',
          grossAmount,
          taxAmount,
          netAmount,
          taxRate: taxAmount > 0 ? (taxAmount / netAmount) * 100 : 0,
          currency: payment.currency.toUpperCase(),
          paymentMethod: payment.payment_method_type || 'card'
        });

      } catch (stripeError) {
        logStep('Error fetching payment intent for report', { 
          paymentId: payment.stripe_payment_intent_id, 
          error: stripeError.message 
        });
      }
    }

    // Sort by date
    reportDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Generate report summary
    const reportData = {
      success: true,
      reportMetadata: {
        type: report_type,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          year,
          quarter: report_type === 'quarterly' ? quarter : undefined,
          month: report_type === 'monthly' ? month : undefined
        },
        generatedAt: new Date().toISOString(),
        businessName: userData.business_name || 'Business',
        stripeAccountId: stripeAccount.stripe_account_id,
        environment,
        transactionCount: reportDetails.length
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        averageTransactionValue: reportDetails.length > 0 ? Math.round((totalRevenue / reportDetails.length) * 100) / 100 : 0,
        taxableTransactions: reportDetails.filter(d => d.taxAmount > 0).length,
        taxRate: totalNet > 0 ? Math.round((totalTax / totalNet) * 100 * 100) / 100 : 0,
        currency: 'EUR'
      },
      transactions: reportDetails,
      taxBreakdown: {
        standardRate: {
          rate: 21.0,
          netAmount: totalNet,
          taxAmount: totalTax,
          grossAmount: totalRevenue
        }
      },
      complianceInfo: {
        automaticTaxEnabled: true,
        jurisdiction: stripeAccount.country || 'NL',
        taxSystem: 'VAT',
        reportingCurrency: 'EUR',
        complianceStatus: reportDetails.length > 0 ? 'compliant' : 'no_transactions'
      }
    };

    logStep('Tax report generated', { 
      transactionCount: reportDetails.length,
      totalRevenue,
      totalTax,
      period: `${startDate.toISOString()} - ${endDate.toISOString()}`
    });

    return new Response(
      JSON.stringify(reportData),
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