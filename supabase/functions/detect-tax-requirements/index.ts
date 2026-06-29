import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import { computeRegistrationStatus } from "../_shared/taxReport.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DETECT-TAX-REQUIREMENTS] ${step}${detailsStr}`);
};

// Country-specific tax system names and requirements
const COUNTRY_TAX_SYSTEMS = {
  'NL': { name: 'VAT', rate: 21, currency: 'EUR', flag: '🇳🇱' },
  'DE': { name: 'VAT', rate: 19, currency: 'EUR', flag: '🇩🇪' },
  'FR': { name: 'VAT', rate: 20, currency: 'EUR', flag: '🇫🇷' },
  'GB': { name: 'VAT', rate: 20, currency: 'GBP', flag: '🇬🇧' },
  'US': { name: 'Sales Tax', rate: 8.5, currency: 'USD', flag: '🇺🇸' },
  'CA': { name: 'GST/HST', rate: 13, currency: 'CAD', flag: '🇨🇦' },
  'AU': { name: 'GST', rate: 10, currency: 'AUD', flag: '🇦🇺' },
  'ES': { name: 'VAT', rate: 21, currency: 'EUR', flag: '🇪🇸' },
  'IT': { name: 'VAT', rate: 22, currency: 'EUR', flag: '🇮🇹' },
  'BE': { name: 'VAT', rate: 21, currency: 'EUR', flag: '🇧🇪' },
};

const detectBusinessCountry = (stripeAccount: any): string => {
  if (stripeAccount?.country) {
    return stripeAccount.country.toUpperCase();
  }
  return 'NL'; // Default fallback
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

    // F-TAX-13: align this tax fn with the gated siblings (get-tax-settings:56,
    // manage-tax-registrations:132, auto-setup-tax:135). It detects + persists tax
    // requirements (revenue vs threshold), a paid tax-compliance feature. Trial users
    // have subscription_tier='professional' (active_trial -> 'professional'), so this
    // does not block onboarding; only expired/cancelled (NULL) + free/starter are gated.
    const { data: tierData, error: tierError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    if (tierError) {
      throw new Error(`Failed to fetch user data: ${tierError.message}`);
    }
    if (!tierData?.subscription_tier || !['professional', 'enterprise'].includes(tierData.subscription_tier)) {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'UPGRADE_REQUIRED',
          error: 'Tax compliance features require Professional or Enterprise subscription'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { calendar_id } = await req.json();
    // SECURITY (F-CLOSE-04 mode-bypass class): mode/key/environment is server-derived
    // from STRIPE_MODE, never from the request body. The body's test_mode (if any) is
    // now INERT for key/env selection. Defaults to test when STRIPE_MODE is unset.
    const test_mode = validateStripeMode().mode === 'test';
    logStep('Function started', { userId: user.id, testMode: test_mode, calendarId: calendar_id });

    // SECURITY: service-role client bypasses RLS, so verify the caller owns this
    // calendar before reading its bookings — otherwise any authenticated user
    // could pass another tenant's calendar_id and learn whether their revenue
    // crosses the tax-registration threshold (same class as validate-tax-compliance).
    if (calendar_id) {
      const { data: ownedCal } = await supabaseClient
        .from('calendars')
        .select('id')
        .eq('id', calendar_id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!ownedCal) {
        return new Response(
          JSON.stringify({ success: false, error: 'Calendar not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // F-TAX-06 FIX: scope the Stripe account by account_owner_id to match the sibling
    // tax fns (get-tax-data, update-service-tax-codes). The old `.eq('user_id', user.id)`
    // diverged from the siblings: for a sub-account (where the caller's user_id differs
    // from the business owner's account_owner_id) it resolved the wrong/empty account.
    // account_owner_id resolves to the caller's own id for a top-level account, so no
    // IDOR is introduced (still strictly the caller's own business).
    const { data: ownerData, error: ownerError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (ownerError) {
      throw new Error(`Failed to fetch user data: ${ownerError.message}`);
    }

    const accountOwnerId = ownerData?.account_owner_id || user.id;

    // Get user's Stripe account
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', test_mode ? 'test' : 'live')
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

    // Detect business country
    const businessCountry = detectBusinessCountry(stripeAccount);
    const taxSystem = COUNTRY_TAX_SYSTEMS[businessCountry] || COUNTRY_TAX_SYSTEMS['NL'];
    logStep('Detected business country', { country: businessCountry, taxSystem });

    // Get tax threshold for this country
    const { data: threshold } = await supabaseClient
      .from('tax_thresholds')
      .select('*')
      .eq('country_code', businessCountry)
      .single();

    // Calculate current revenue to check threshold.
    // F-TAX-18 FIX (sev-3): the registration threshold is a MERCHANT-level
    // obligation, not a per-calendar one. business_countries is UNIQUE(user_id,
    // country_code), so each calendar's detect would otherwise overwrite the same
    // row with only that calendar's revenue, and the last call would win, hiding a
    // registration obligation when revenue is split across same-country calendars.
    // Aggregate the country's revenue across ALL of the owner's calendars (resolved
    // by account_owner_id) before computing registration_required, so the per-country
    // row reflects the merchant aggregate regardless of which calendar triggered it.
    let currentRevenue = 0;
    let registrationRequired = false;
    let registrationRecommended = false;

    if (threshold) {
      // All calendars belonging to the account owner (top-level account or a member
      // resolving to the same owner). Stays strictly within the caller's own business.
      const { data: ownerCalendars } = await supabaseClient
        .from('calendars')
        .select('id')
        .eq('user_id', accountOwnerId);

      const ownerCalendarIds = (ownerCalendars || []).map((c) => c.id);

      if (ownerCalendarIds.length > 0) {
        // Get completed bookings from the last 12 months across ALL owner calendars.
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: bookings } = await supabaseClient
          .from('bookings')
          .select('total_price')
          .in('calendar_id', ownerCalendarIds)
          .eq('status', 'completed')
          .gte('created_at', oneYearAgo.toISOString());

        if (bookings && bookings.length > 0) {
          currentRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
          const thresholdAmount = threshold.threshold_amount_cents / 100;
          const status = computeRegistrationStatus(currentRevenue, thresholdAmount);
          registrationRequired = status.registrationRequired;
          registrationRecommended = status.registrationRecommended;
        }
      }
    }

    // Check existing tax registrations
    let hasExistingRegistration = false;
    try {
      const registrations = await stripe.tax.registrations.list({
        stripeAccount: stripeAccount.stripe_account_id
      });
      
      hasExistingRegistration = registrations.data.some(
        reg => reg.country === businessCountry && reg.status === 'active'
      );
    } catch (error) {
      logStep('Could not check existing registrations', { error: error.message });
    }

    // Create or update business country record.
    // F-TAX-14 (sev-3): business_countries has UNIQUE(user_id, country_code) (migration
    // 20250901184015...sql:18). Without onConflict the upsert defaults to the primary
    // key, so a re-detect of the same (user_id, country_code) violates the unique index
    // and throws 23505. Pin onConflict to the real constraint columns so a re-detect is
    // idempotent (updates the existing row instead of inserting a duplicate).
    // F-TAX-18: the row is keyed UNIQUE(user_id, country_code) and now reflects the
    // merchant AGGREGATE across all the owner's calendars, so it does NOT belong to a
    // single calendar. calendar_id is set null on the per-country row (it is read by
    // no consumer; only the per-country registration_required/status is used
    // downstream) to avoid a misleading last-calendar-wins value.
    await supabaseClient
      .from('business_countries')
      .upsert({
        user_id: user.id,
        calendar_id: null,
        country_code: businessCountry,
        is_primary: true,
        registration_threshold_amount: threshold?.threshold_amount_cents ? threshold.threshold_amount_cents / 100 : null,
        threshold_currency: threshold?.currency || taxSystem.currency.toLowerCase(),
        registration_required: registrationRequired,
        registration_status: hasExistingRegistration ? 'active' : (registrationRequired ? 'required' : 'not_required'),
        tax_collection_enabled: hasExistingRegistration
      }, { onConflict: 'user_id,country_code' });

    logStep('Tax requirements detected', {
      businessCountry,
      currentRevenue,
      registrationRequired,
      registrationRecommended,
      hasExistingRegistration
    });

    return new Response(
      JSON.stringify({
        success: true,
        business_country: businessCountry,
        tax_system: taxSystem,
        threshold: threshold ? {
          amount: threshold.threshold_amount_cents / 100,
          currency: threshold.currency,
          period: threshold.period,
          description: threshold.description
        } : null,
        current_revenue: currentRevenue,
        registration_required: registrationRequired,
        registration_recommended: registrationRecommended,
        has_existing_registration: hasExistingRegistration,
        next_steps: registrationRequired && !hasExistingRegistration 
          ? [`Register for ${taxSystem.name} in ${businessCountry}`, 'Configure tax codes for services', 'Enable tax collection']
          : registrationRecommended && !hasExistingRegistration
          ? [`Consider registering for ${taxSystem.name} (approaching threshold)`, 'Review tax configuration']
          : ['Tax setup is complete']
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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