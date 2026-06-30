import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import {
  computeOssBucket,
  OSS_BUCKET_KEY,
  OSS_PAN_EU_THRESHOLD_CENTS,
  type BookingPaymentRowLike,
} from "../_shared/ossThreshold.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-TAX-THRESHOLDS] ${step}${detailsStr}`);
};

// X5 (F-TAX-19): the pre-2021 per-country distance-selling map (DE EUR22k / FR EUR35.7k
// / IT EUR65k / ...) has been REMOVED. Those numbers were abolished by the 2021 EU VAT
// e-commerce package. There is now ONE union-wide EUR10,000 threshold on the SUM of all
// cross-border B2C supplies to other EU member states. The threshold constant +
// bucket arithmetic live in _shared/ossThreshold.ts (a monitoring constant, NOT a VAT
// rate; rates stay Stripe-computed). Surface "OSS registration required" when crossed.

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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      // F-TAX-22 tidy: graceful 200 instead of a non-null-assertion throw.
      return new Response(
        JSON.stringify({ success: false, code: 'NO_AUTH', error: 'Authorization header required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // calendar_id is accepted for backward compatibility with the existing frontend
    // caller but is INTENTIONALLY NOT used to scope the OSS bucket: the EUR10k
    // threshold is a per-MERCHANT (account_owner_id) figure aggregated across ALL the
    // owner's calendars (F-TAX-18 multi-calendar aggregation), never per-calendar.
    await req.json().catch(() => ({}));
    // SECURITY (F-CLOSE-04 mode-bypass class): mode/key/environment is server-derived
    // from STRIPE_MODE, never from the request body. Defaults to test when unset.
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

    // SECURITY / scoping: resolve the OWNER (account_owner_id else self). Every query
    // below is scoped to this owner; a member account resolves to the owner account so
    // there is no per-user leak (no IDOR), mirroring the sibling tax functions.
    const accountOwnerId = userData.account_owner_id || user.id;

    // Initialize Stripe (server-pinned key)
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

    // Get the owner's Stripe (connected) account row. NOTE (X5): we do NOT require
    // charges_enabled here. OSS monitoring must keep working even if charges are later
    // disabled on a merchant who already accrued cross-border B2C sales; the cumulative
    // is computed from historical booking_payments, not from current charge state.
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id, country')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .order('charges_enabled', { ascending: false }) // prefer an enabled account if several
      .limit(1)
      .maybeSingle();

    if (!stripeAccount) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'NO_ACCOUNT',
          error: 'No Stripe account found. Please complete Stripe onboarding first.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep('Found Stripe account', { accountId: stripeAccount.stripe_account_id });

    const merchantCountry = (stripeAccount.country || 'NL').toUpperCase();

    // Current-year window for threshold monitoring (the EUR10k OSS threshold is a
    // calendar-year figure).
    const currentYear = new Date().getFullYear();
    const startDate = new Date(Date.UTC(currentYear, 0, 1)).toISOString();
    const endDate = new Date().toISOString();

    // CUMULATIVE CROSS-BORDER B2C: read the owner's real booking_payments rows for the
    // year. SECURITY: scope by the owner's stripe_account_id (service-role bypasses RLS,
    // so this explicit filter is the tenant boundary; it also aggregates across all the
    // owner's calendars since every row under this account belongs to the owner).
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('booking_payments')
      .select('amount_cents, currency, status, customer_country, reverse_charge, refund_amount_cents, tax_breakdown')
      .eq('stripe_account_id', stripeAccount.stripe_account_id)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (paymentsError) {
      throw new Error(`Failed to read booking payments: ${paymentsError.message}`);
    }

    const rows: BookingPaymentRowLike[] = (payments ?? []).map((p: any) => ({
      amount_cents: p.amount_cents,
      customer_country: p.customer_country,
      reverse_charge: p.reverse_charge,
      refund_amount_cents: p.refund_amount_cents,
      tax_breakdown: p.tax_breakdown,
      status: p.status,
    }));

    const oss = computeOssBucket(rows, merchantCountry);

    logStep('Computed OSS bucket', {
      merchantCountry,
      cumulativeCents: oss.cumulativeCents,
      registrationRequired: oss.registrationRequired,
      contributing: oss.contributingPayments,
    });

    // The OSS threshold is denominated in EUR; the bucket + UI display in EUR.
    const displayCurrency = 'EUR';

    // BACKWARD-COMPATIBLE response: the existing ThresholdMonitoringDashboard reads
    // `thresholds[]` with {country, revenue, threshold, percentage, status, currency}.
    // We surface the single pan-EU OSS bucket as ONE entry (country = EU_OSS) so the UI
    // renders unchanged, and ADD the richer OSS fields alongside (additive, non-breaking).
    const ossThresholdEntry = {
      country: OSS_BUCKET_KEY, // "EU_OSS" (single combined pan-EU bucket, not per-country)
      revenue: oss.cumulativeCents,
      threshold: OSS_PAN_EU_THRESHOLD_CENTS,
      percentage: oss.percentage,
      status: oss.status, // 'under' | 'near' | 'exceeded'
      currency: displayCurrency,
    };

    return new Response(
      JSON.stringify({
        success: true,
        thresholds: [ossThresholdEntry],
        // --- additive OSS detail (X5) ---
        oss: {
          scheme: 'EU_OSS_PAN_EU',
          merchantCountry,
          thresholdCents: OSS_PAN_EU_THRESHOLD_CENTS,
          cumulativeCents: oss.cumulativeCents,
          remainingCents: oss.remainingCents,
          percentage: oss.percentage,
          registrationRequired: oss.registrationRequired,
          status: oss.registrationRequired ? 'OSS registration required' : oss.status,
          contributingPayments: oss.contributingPayments,
          currency: displayCurrency,
          message: oss.registrationRequired
            ? 'OSS registration required: cumulative cross-border B2C sales have reached the EUR10,000 pan-EU threshold. Register for OSS and add the registration to your Stripe Tax settings.'
            : `Cross-border B2C sales are EUR ${(oss.cumulativeCents / 100).toFixed(2)} of the EUR10,000 OSS threshold (EUR ${(oss.remainingCents / 100).toFixed(2)} remaining).`,
        },
        lastUpdated: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message });
    return new Response(
      JSON.stringify({
        success: false,
        code: 'SERVER_ERROR',
        error: message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
