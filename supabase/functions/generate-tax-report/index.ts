import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import { computePerJurisdictionReport, computeRefundAdjustedRow, type JurisdictionRowInput, resolvePaymentTaxCents, resolveRefundedCents, retrieveBookingPaymentIntent } from "../_shared/taxReport.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-TAX-REPORT] ${step}${detailsStr}`);
};

// Server-pinned request schema. test_mode is intentionally NOT consumed here
// (mode is derived from STRIPE_MODE; see the F-CLOSE-04 invariant); zod .strip()
// drops any extra body fields (including a stale test_mode) without erroring.
const reportRequestSchema = z.object({
  calendar_id: z.string().uuid().optional(),
  report_type: z.enum(['quarterly', 'monthly', 'annual']).default('quarterly'),
  year: z.number().int().min(2000).max(2100).optional(),
  quarter: z.number().int().min(1).max(4).optional(),
  month: z.number().int().min(1).max(12).optional(),
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
    const parsed = reportRequestSchema.safeParse(rawBody ?? {});
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_INPUT',
          error: parsed.error.errors[0]?.message || 'Invalid report request',
          details: parsed.error.flatten().fieldErrors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const {
      calendar_id,
      report_type,
      year = new Date().getFullYear(),
      quarter = Math.floor(new Date().getMonth() / 3) + 1,
      month,
    } = parsed.data;
    // SECURITY (F-CLOSE-04 mode-bypass class): mode/key/environment is server-derived
    // from STRIPE_MODE, never from the request body. The body's test_mode (if any) is
    // now INERT for key/env selection. Defaults to test when STRIPE_MODE is unset.
    const test_mode = validateStripeMode().mode === 'test';

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
    // X6: per-row inputs for the per-jurisdiction VAT summary + reverse-charge markers
    // + OSS bucket. Built from the AUTHORITATIVE persisted columns (customer_country,
    // tax_breakdown, reverse_charge) on booking_payments + the refund-adjusted money
    // figures below, never from the stale PI metadata.tax_rate (CB-F-04).
    const jurisdictionRows: JurisdictionRowInput[] = [];
    let totalRevenue = 0;
    let totalTax = 0;
    let totalNet = 0;
    let totalRefunded = 0;
    let droppedTransactions = 0;

    for (const payment of payments || []) {
      try {
        // F-TAX-21: retrieve the PI in the CORRECT account context. Real booking-flow
        // charges are DESTINATION charges that live on the PLATFORM account; installment
        // charges are DIRECT charges on the CONNECTED account. The shared helper tries
        // platform first then connected and re-throws if both miss, so a real PI is no
        // longer silently dropped (which made filing reports show EUR0 VAT). Expand
        // latest_charge so we can read the AUTHORITATIVE refunded amount (F-TAX-17).
        const paymentIntent = await retrieveBookingPaymentIntent(
          stripe,
          payment.stripe_payment_intent_id,
          stripeAccount.stripe_account_id,
          ['latest_charge'],
        );

        // F-TAX-02: gross = the charged total; tax from the authoritative source
        // (Stripe automatic_tax amount_details.tax, else BA metadata.tax_amount).
        // F-TAX-17: subtract the authoritative refund read from Stripe
        // (latest_charge.amount_refunded) and prorate the tax to the kept net, so
        // a refunded booking is never reported at full gross+VAT. The row stays
        // internally consistent (gross == net + tax) and rows sum to the TOTAL.
        const grossOrigCents = paymentIntent.amount;
        const taxOrigCents = resolvePaymentTaxCents(paymentIntent);
        const refundedCents = resolveRefundedCents(paymentIntent);
        const row = computeRefundAdjustedRow(grossOrigCents, taxOrigCents, refundedCents);

        const grossAmount = row.grossCents / 100;
        const taxAmount = row.taxCents / 100;
        const netAmount = row.netCents / 100;
        const refundedAmount = row.refundedCents / 100;

        totalRevenue += grossAmount;
        totalTax += taxAmount;
        totalNet += netAmount;
        totalRefunded += refundedAmount;

        // X6: collect this row's per-jurisdiction input from the AUTHORITATIVE persisted
        // columns + the refund-adjusted figures (so per-country VAT nets refunds exactly).
        jurisdictionRows.push({
          customerCountry: typeof payment.customer_country === 'string' ? payment.customer_country : null,
          taxBreakdown: payment.tax_breakdown ?? null,
          reverseCharge: payment.reverse_charge === true,
          grossCents: row.grossCents,
          taxCents: row.taxCents,
          netCents: row.netCents,
        });

        reportDetails.push({
          date: payment.created_at,
          transactionId: payment.stripe_payment_intent_id,
          customerName: payment.bookings?.customer_name || 'Unknown',
          customerEmail: payment.bookings?.customer_email || '',
          serviceName: payment.bookings?.service_types?.name || 'Unknown Service',
          grossAmount,
          taxAmount,
          netAmount,
          refundedAmount,
          fullyRefunded: row.fullyRefunded,
          taxRate: taxAmount > 0 && netAmount > 0 ? Math.round((taxAmount / netAmount) * 100 * 100) / 100 : 0,
          // X6: per-row destination country + reverse-charge marker, so a transaction
          // line is auditable per-jurisdiction (read from the authoritative X1 columns).
          customerCountry: typeof payment.customer_country === 'string' ? payment.customer_country : null,
          reverseCharge: payment.reverse_charge === true,
          currency: payment.currency.toUpperCase(),
          paymentMethod: payment.payment_method_type || 'card'
        });

      } catch (stripeError) {
        // F-TAX-21: surface (do NOT silently swallow) a PI that could not be retrieved
        // in either account context. Count it so the report can report data quality,
        // but keep generating the rest of the report (one bad PI must not 500 the whole
        // filing report).
        droppedTransactions += 1;
        logStep('DROPPED transaction: payment intent unreadable in any account context', {
          paymentId: payment.stripe_payment_intent_id,
          error: stripeError.message
        });
      }
    }

    // Sort by date
    reportDetails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // X6: per-jurisdiction VAT summary + reverse-charge markers + OSS-eligible bucket.
    // merchantCountry = the merchant's home country (the OSS cross-border boundary,
    // matching the X5 isCrossBorderB2C definition); same source as complianceInfo
    // jurisdiction below. PURE resolver over the authoritative persisted columns.
    const merchantCountry = stripeAccount.country || 'NL';
    const perJurisdiction = computePerJurisdictionReport(jurisdictionRows, merchantCountry);

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
        transactionCount: reportDetails.length,
        // F-TAX-21: number of payments that could not be read from Stripe in any
        // account context (surfaced, not silently swallowed). 0 in a healthy report.
        droppedTransactions
      },
      summary: {
        // F-TAX-17: totalRevenue/totalTax/totalNet are NET OF REFUNDS (each row
        // already had its refund subtracted + tax prorated), so the filing figures
        // never overstate VAT. totalRefunded surfaces the removed amount.
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        totalRefunded: Math.round(totalRefunded * 100) / 100,
        averageTransactionValue: reportDetails.length > 0 ? Math.round((totalRevenue / reportDetails.length) * 100) / 100 : 0,
        taxableTransactions: reportDetails.filter(d => d.taxAmount > 0).length,
        taxRate: totalNet > 0 ? Math.round((totalTax / totalNet) * 100 * 100) / 100 : 0,
        currency: 'EUR'
      },
      transactions: reportDetails,
      taxBreakdown: {
        standardRate: {
          // Effective rate = total tax / total net (the taxable base), rounded to 2 dp.
          // BACK-COMPAT (X6): the blended single-figure behavior is unchanged so any
          // existing consumer keeps working; the per-jurisdiction detail is ADDITIVE below.
          rate: totalNet > 0 ? Math.round((totalTax / totalNet) * 100 * 100) / 100 : 0,
          netAmount: Math.round(totalNet * 100) / 100,
          taxAmount: Math.round(totalTax * 100) / 100,
          grossAmount: Math.round(totalRevenue * 100) / 100
        }
      },
      // X6: per-jurisdiction VAT summary (one line per destination country + line type),
      // reverse-charge 0% lines marked DISTINCTLY from not_collecting 0%, and the
      // OSS-eligible cross-border B2C bucket (ties to get-tax-thresholds' EUR10k). All
      // figures in EUR, refund-adjusted, read from the authoritative persisted columns
      // (customer_country / tax_breakdown / reverse_charge), never the stale PI metadata.
      perJurisdiction: {
        merchantCountry,
        countryCount: perJurisdiction.countryCount,
        reverseChargeTransactionCount: perJurisdiction.reverseChargeTransactionCount,
        crossBorderGuardTransactionCount: perJurisdiction.crossBorderGuardTransactionCount,
        totalCollectedTax: Math.round(perJurisdiction.totalCollectedTaxCents) / 100,
        lines: perJurisdiction.lines.map((l) => ({
          country: l.country,
          lineType: l.lineType,
          reverseCharge: l.reverseCharge,
          transactionCount: l.transactionCount,
          grossAmount: Math.round(l.grossCents) / 100,
          taxAmount: Math.round(l.taxCents) / 100,
          netAmount: Math.round(l.netCents) / 100,
          taxRate: l.effectiveRatePct,
        })),
        ossEligible: {
          transactionCount: perJurisdiction.ossEligible.transactionCount,
          grossAmount: Math.round(perJurisdiction.ossEligible.grossCents) / 100,
          // The TAXABLE value the OSS EUR10k threshold is measured on (net-of-VAT,
          // net-of-refund); reconciles with get-tax-thresholds' cumulative.
          taxableAmount: Math.round(perJurisdiction.ossEligible.taxableCents) / 100,
          countries: perJurisdiction.ossEligible.countries,
        },
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