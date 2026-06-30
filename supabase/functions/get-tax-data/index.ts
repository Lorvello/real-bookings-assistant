import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import { computeReportPeriod } from "../_shared/taxReport.ts";

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

    const requestBody = await req.json();
    const { calendar_id, start_date, end_date, quarter, year } = requestBody;
    // SECURITY (F-CLOSE-04 mode-bypass class): mode/key/environment is server-derived
    // from STRIPE_MODE, never from the request body. The body's test_mode (if any) is
    // now INERT for key/env selection. Defaults to test when STRIPE_MODE is unset.
    const test_mode = validateStripeMode().mode === 'test';

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

    // F-TAX-04 FIX: tax-behavior MUST come from the Stripe Tax Settings API, not
    // from unrelated account fields. The old code read defaultTaxBehavior from
    // `settings.payments.statement_descriptor_suffix_kana` (a JP statement-descriptor
    // field, empirically null -> it always fell back to a hard-coded 'exclusive')
    // and automaticTax from `settings.dashboard.display_name` (the dashboard label).
    // The correct source is stripe.tax.settings.retrieve(): defaults.tax_behavior,
    // defaults.tax_code and status. (Same retrieve get-tax-settings proved in T2.)
    // F-TAX-09: the previous taxCalculation:{automaticTax} sub-object was built here but
    // never read into the response; the automatic-tax signal is surfaced via
    // stripeAccountStatus.automaticTaxEnabled (taxSettingsStatus === 'active'). Removed
    // the dead state so it cannot drift out of sync with the real signal.
    let taxSettings: {
      originAddress: any;
      defaultTaxBehavior: string;
      presetProductTaxCode: string | null;
    } = {
      originAddress: null,
      defaultTaxBehavior: 'unknown',
      presetProductTaxCode: null
    };
    let taxSettingsStatus = 'unknown';
    try {
      const settings = await stripe.tax.settings.retrieve({
        stripeAccount: stripeAccount.stripe_account_id
      });
      taxSettingsStatus = settings.status || 'unknown';
      taxSettings = {
        originAddress: settings.head_office?.address || null,
        defaultTaxBehavior: settings.defaults?.tax_behavior || 'unknown',
        presetProductTaxCode: settings.defaults?.tax_code || null
      };
    } catch (settingsError) {
      logStep('Tax settings not available', { error: settingsError.message });
    }

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

    // Get current quarter data or use provided quarter/year
    const now = new Date();
    const currentQuarter = quarter || Math.floor(now.getMonth() / 3) + 1;
    const currentYear = year || now.getFullYear();

    // CB-F-11: half-open quarter window [start, nextQuarterStart) in UTC via the shared
    // helper, so the in-memory quarterly slice below INCLUDES the entire last day of the
    // quarter (the old `new Date(y, q*3, 0)` + `paymentDate <= quarterEnd` silently
    // dropped the last day). Same boundary as generate/export-tax-report.
    const quarterPeriod = computeReportPeriod('quarterly', currentYear, currentQuarter);
    const quarterStart = new Date(quarterPeriod.startIso);
    const quarterEndExclusive = new Date(quarterPeriod.endExclusiveIso);

    // Calculate service breakdown with revenue per service
    const serviceBreakdown = new Map();
    let quarterlyRevenue = 0;
    let quarterlyTaxCollected = 0;
    let quarterlyTransactionCount = 0;

    for (const payment of payments || []) {
      try {
        const paymentDate = new Date(payment.created_at);
        // CB-F-11: half-open [start, nextQuarterStart) so the last day is included.
        if (paymentDate >= quarterStart && paymentDate < quarterEndExclusive) {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            payment.stripe_payment_intent_id,
            { stripeAccount: stripeAccount.stripe_account_id }
          );

          const amount = paymentIntent.amount / 100;
          quarterlyRevenue += amount;
          quarterlyTransactionCount++;

          if (paymentIntent.automatic_tax?.enabled && paymentIntent.automatic_tax?.status === 'complete') {
            const taxAmount = (paymentIntent.amount_details?.tax?.amount || 0) / 100;
            quarterlyTaxCollected += taxAmount;
          }

          const serviceName = payment.bookings?.service_types?.name || 'Unknown Service';
          const existingService = serviceBreakdown.get(serviceName) || { revenue: 0, bookingCount: 0 };
          serviceBreakdown.set(serviceName, {
            revenue: existingService.revenue + amount,
            bookingCount: existingService.bookingCount + 1
          });
        }
      } catch (stripeError) {
        logStep('Error fetching payment intent for quarterly data', { paymentId: payment.stripe_payment_intent_id, error: stripeError.message });
      }
    }

    // Convert service breakdown to array
    const servicesArray = Array.from(serviceBreakdown.entries())
      .map(([name, data]) => ({
        name,
        revenue: Math.round(data.revenue * 100) / 100,
        bookingCount: data.bookingCount,
        percentage: quarterlyRevenue > 0 ? Math.round((data.revenue / quarterlyRevenue) * 100) : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const taxData = {
      success: true,
      quarterlyOverview: {
        quarter: currentQuarter,
        year: currentYear,
        grossRevenue: Math.round(quarterlyRevenue * 100) / 100,
        vatCollected: Math.round(quarterlyTaxCollected * 100) / 100,
        netRevenue: Math.round((quarterlyRevenue - quarterlyTaxCollected) * 100) / 100,
        averageBooking: quarterlyTransactionCount > 0 ? Math.round((quarterlyRevenue / quarterlyTransactionCount) * 100) / 100 : 0,
        totalBookings: quarterlyTransactionCount,
        vatRate: 21.0,
        period: {
          start: quarterStart.toISOString(),
          // CB-F-11: last INCLUSIVE instant for display (endExclusive - 1ms); the slice
          // above uses the half-open [start, endExclusive) window.
          end: new Date(quarterEndExclusive.getTime() - 1).toISOString()
        }
      },
      serviceBreakdown: servicesArray,
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
      // F-TAX-04: surface the REAL tax-behavior + tax settings from the right source.
      taxSettings: {
        defaultTaxBehavior: taxSettings.defaultTaxBehavior,
        presetProductTaxCode: taxSettings.presetProductTaxCode,
        originAddress: taxSettings.originAddress,
        settingsStatus: taxSettingsStatus
      },
      stripeAccountStatus: {
        accountId: stripeAccount.stripe_account_id,
        country: stripeAccount.country || 'NL',
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        // Real automatic-tax status from the Tax Settings API, not a hard-coded true.
        automaticTaxEnabled: taxSettingsStatus === 'active',
        connectionStatus: 'active'
      },
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