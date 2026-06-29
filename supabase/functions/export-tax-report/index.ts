import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import { computeRefundAdjustedRow, resolvePaymentTaxCents, resolveRefundedCents, retrieveBookingPaymentIntent } from "../_shared/taxReport.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EXPORT-TAX-REPORT] ${step}${detailsStr}`);
};

// Server-pinned export request schema (mode is derived from STRIPE_MODE; any
// stale body test_mode is dropped silently by zod .strip()).
const exportRequestSchema = z.object({
  calendar_id: z.string().uuid().optional(),
  quarter: z.number().int().min(1).max(4).default(1),
  year: z.number().int().min(2000).max(2100).optional(),
  format: z.enum(['csv']).default('csv'),
});

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

    const rawBody = await req.json().catch(() => ({}));
    const parsed = exportRequestSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_INPUT',
          error: parsed.error.errors[0]?.message || 'Invalid export request',
          details: parsed.error.flatten().fieldErrors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    // format is validated (csv only) but not otherwise consumed; the response is
    // always CSV.
    const { calendar_id, quarter } = parsed.data;
    const year = parsed.data.year ?? new Date().getFullYear();
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

    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Tax export features require Professional or Enterprise subscription' 
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
          error: 'No active Stripe account found' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Calculate quarter date range
    const quarterStart = new Date(year, (quarter - 1) * 3, 1);
    const quarterEnd = new Date(year, quarter * 3, 0);

    logStep('Exporting tax report', { quarter, year, accountId: stripeAccount.stripe_account_id });

    // Get payment data for the quarter
    let bookingQuery = supabaseClient
      .from('booking_payments')
      .select(`
        *,
        bookings!inner(
          calendar_id,
          customer_name,
          customer_email,
          start_time,
          service_types(name)
        )
      `)
      .eq('stripe_account_id', stripeAccount.stripe_account_id)
      .gte('created_at', quarterStart.toISOString())
      .lte('created_at', quarterEnd.toISOString())
      .in('status', ['succeeded', 'completed']);

    if (calendar_id) {
      bookingQuery = bookingQuery.eq('bookings.calendar_id', calendar_id);
    }

    const { data: payments, error: paymentsError } = await bookingQuery;

    if (paymentsError) {
      logStep('Error fetching payments', paymentsError);
      throw new Error('Failed to fetch payment data');
    }

    // Prepare CSV data. Refunded (€) is added so the export round-trips the
    // refund-adjusted figures (F-TAX-17); Gross/VAT/Net are already NET OF REFUNDS.
    const csvRows = [
      ['Date', 'Customer Name', 'Customer Email', 'Service', 'Gross Amount (€)', 'VAT Amount (€)', 'Net Amount (€)', 'Refunded (€)', 'Payment ID']
    ];

    let totalGross = 0;
    let totalVat = 0;
    let totalRefunded = 0;

    for (const payment of payments || []) {
      try {
        // F-TAX-21: retrieve in the correct account context (platform for
        // destination charges, connected for installment direct charges) via the
        // shared helper; expand latest_charge to read the authoritative refunded
        // amount (F-TAX-17). Re-throws (not swallowed) if both contexts miss.
        const paymentIntent = await retrieveBookingPaymentIntent(
          stripe,
          payment.stripe_payment_intent_id,
          stripeAccount.stripe_account_id,
          ['latest_charge'],
        );

        // F-TAX-02: identical authoritative tax-source resolution as
        // generate-tax-report. F-TAX-17: subtract the authoritative Stripe refund
        // and prorate VAT to the kept net via the SAME shared resolver, so the CSV
        // VAT/net match the report exactly and rows still sum to the TOTAL.
        const grossOrigCents = paymentIntent.amount;
        const taxOrigCents = resolvePaymentTaxCents(paymentIntent);
        const refundedCents = resolveRefundedCents(paymentIntent);
        const row = computeRefundAdjustedRow(grossOrigCents, taxOrigCents, refundedCents);

        const grossAmount = row.grossCents / 100;
        const vatAmount = row.taxCents / 100;
        const netAmount = row.netCents / 100;
        const refundedAmount = row.refundedCents / 100;

        totalGross += grossAmount;
        totalVat += vatAmount;
        totalRefunded += refundedAmount;

        const date = new Date(payment.created_at).toLocaleDateString('nl-NL');
        const customerName = payment.bookings?.customer_name || 'Unknown';
        const customerEmail = payment.bookings?.customer_email || '';
        const serviceName = payment.bookings?.service_types?.name || 'Unknown Service';

        csvRows.push([
          date,
          customerName,
          customerEmail,
          serviceName,
          grossAmount.toFixed(2),
          vatAmount.toFixed(2),
          netAmount.toFixed(2),
          refundedAmount.toFixed(2),
          payment.stripe_payment_intent_id
        ]);

      } catch (stripeError) {
        // F-TAX-21: surface a PI that could not be read in any account context
        // instead of silently dropping it from the export.
        logStep('DROPPED row: payment intent unreadable in any account context', { paymentId: payment.stripe_payment_intent_id, error: stripeError.message });
      }
    }

    // Add summary row
    csvRows.push([]);
    csvRows.push(['TOTAL', '', '', '', totalGross.toFixed(2), totalVat.toFixed(2), (totalGross - totalVat).toFixed(2), totalRefunded.toFixed(2), '']);

    // Convert to CSV string
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const filename = `tax-report-Q${quarter}-${year}.csv`;

    logStep('Tax report generated', {
      quarter,
      year,
      totalTransactions: payments?.length || 0,
      totalGross: totalGross.toFixed(2),
      totalVat: totalVat.toFixed(2),
      totalRefunded: totalRefunded.toFixed(2)
    });

    return new Response(csvContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      },
      status: 200,
    });

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