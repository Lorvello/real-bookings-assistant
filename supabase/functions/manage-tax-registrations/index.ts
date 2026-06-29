import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";
import { validateStripeMode } from "../_shared/stripeValidation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-TAX-REGISTRATIONS] ${step}${detailsStr}`);
};

// International tax registration support. US and CA are intentionally NOT in this
// list for the create path: their Stripe Tax registrations are subdivision-scoped
// (US needs country_options[us][state] + per-state election; CA needs
// province_standard with a province that levies sales tax), so a single country-level
// create call is rejected by Stripe. Modelling per-state/province registration is a
// future feature; until then a US/CA create request is rejected up front with a clear
// "Unsupported country code" instead of a confusing downstream Stripe error.
const SUPPORTED_COUNTRIES = [
  'NL', 'DE', 'FR', 'GB', 'BE', 'ES', 'IT', 'AT', 'DK', 'SE', 'FI', 'PT', 'IE',
  'LU', 'CY', 'MT', 'SI', 'SK', 'CZ', 'HU', 'PL', 'EE', 'LV', 'LT', 'BG', 'RO', 'HR',
  'AU'
] as const;

// Validate the write payload (zod). action gates which other fields are required.
// country must be a supported ISO-3166 alpha-2 code; registration_id is mandatory
// for delete. Server cannot tamper the account (resolved from the caller's own bsa).
// NOTE: vat_id is intentionally NOT in this schema. The previous create path stored
// it as country_options[cc].value under the old (invalid) 'vat' shape; the current
// Stripe Tax API registers VAT under the standard scheme without a free-text value,
// so a caller-supplied vat_id has nowhere valid to go. zod .object() strips it
// silently (it does not reject), so existing callers that still send vat_id keep
// working; the field is simply not advertised or acted on. A real VAT-number capture
// is a separate future feature.
const RequestSchema = z.object({
  action: z.enum(['list', 'create', 'delete']),
  country: z.string().trim().length(2).toUpperCase()
    .refine((c) => (SUPPORTED_COUNTRIES as readonly string[]).includes(c), {
      message: 'Unsupported country code'
    })
    .optional(),
  registration_id: z.string().trim().min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.action === 'delete' && !data.registration_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['registration_id'],
      message: 'registration_id is required for delete' });
  }
});

const detectBusinessCountry = (stripeAccount: any): string => {
  if (stripeAccount?.country) {
    return stripeAccount.country.toUpperCase();
  }
  return 'NL'; // Default fallback
};

// Build a Stripe Tax-API-valid country_options block. The previous code sent
// { [cc]: { type: 'vat', value } } which the current Tax API rejects. The verified
// shape for every country in SUPPORTED_COUNTRIES (EU members + GB + AU) is the
// standard registration with place_of_supply_scheme='standard' (confirmed live
// against the Stripe TEST Tax API for NL, GB and AU). US/CA are excluded from
// SUPPORTED_COUNTRIES because they need subdivision-scoped payloads.
const buildCountryOptions = (country: string): Record<string, any> => {
  const cc = country.toLowerCase();
  return { [cc]: { type: 'standard', standard: { place_of_supply_scheme: 'standard' } } };
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

    const rawBody = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      // Return the validation error as HTTP 200 with success:false, matching this
      // fn's existing error convention (NO_ACCOUNT / UPGRADE_REQUIRED / SERVER_ERROR
      // all return 200). supabase-js functions.invoke only populates `error` (and
      // leaves `data` undefined) on a non-2xx status, so a 400 here would hide the
      // structured message from the call sites that read `data.success`/`data.error`.
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstMsg = Object.values(fieldErrors).flat()[0] || 'Invalid tax registration request';
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_INPUT',
          error: firstMsg,
          details: fieldErrors
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const { action, country, registration_id } = parsed.data;
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

    // Only Professional and Enterprise users can manage tax registrations
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'International tax registration management requires Professional or Enterprise subscription' 
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

    // Detect business country if not specified
    const businessCountry = country || detectBusinessCountry(stripeAccount);
    logStep('Business country determined', { country: businessCountry });

    // Handle different actions
    switch (action) {
      case 'list':
        try {
          const registrations = await stripe.tax.registrations.list({
            stripeAccount: stripeAccount.stripe_account_id
          });

          // Enhance registrations with country info
          const enhancedRegistrations = registrations.data.map(reg => ({
            id: reg.id,
            country: reg.country,
            status: reg.status,
            active_from: reg.active_from,
            expires_at: reg.expires_at,
            livemode: reg.livemode,
            type: reg.type,
            country_options: reg.country_options,
            is_supported: SUPPORTED_COUNTRIES.includes(reg.country),
            business_country: businessCountry
          }));

          return new Response(
            JSON.stringify({
              success: true,
              registrations: enhancedRegistrations,
              businessCountry,
              supportedCountries: SUPPORTED_COUNTRIES,
              lastUpdated: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Tax registrations not available', { error: error.message });
          return new Response(
            JSON.stringify({
              success: true,
              registrations: [],
              businessCountry,
              supportedCountries: SUPPORTED_COUNTRIES,
              lastUpdated: new Date().toISOString(),
              note: 'Tax registrations may not be available for Express accounts'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }

      case 'create':
        const targetCountry = country || businessCountry;

        if (!targetCountry) {
          throw new Error('Country is required for creating tax registration');
        }

        if (!(SUPPORTED_COUNTRIES as readonly string[]).includes(targetCountry)) {
          throw new Error(`Tax registration not yet supported for country: ${targetCountry}`);
        }

        try {
          // Build a Tax-API-valid payload: standard scheme + place_of_supply for EU,
          // active immediately. (The old { type: 'vat' } shape was rejected by Stripe.)
          const registrationData: any = {
            country: targetCountry,
            country_options: buildCountryOptions(targetCountry),
            active_from: 'now',
          };

          const registration = await stripe.tax.registrations.create(registrationData, {
            stripeAccount: stripeAccount.stripe_account_id
          });

          logStep('Created international tax registration', { 
            country: targetCountry, 
            registrationId: registration.id,
            businessCountry 
          });

          // Update business stripe account with new tax collection country
          // (de-duplicated: re-creating a registration for the same country must not
          // append a duplicate entry to the array).
          const existingCountries: string[] = stripeAccount.tax_collection_countries || [];
          const nextCountries = existingCountries.includes(targetCountry)
            ? existingCountries
            : [...existingCountries, targetCountry];
          await supabaseClient
            .from('business_stripe_accounts')
            .update({ tax_collection_countries: nextCountries })
            .eq('id', stripeAccount.id);

          return new Response(
            JSON.stringify({
              success: true,
              registration: {
                id: registration.id,
                country: registration.country,
                status: registration.status,
                active_from: registration.active_from,
                expires_at: registration.expires_at,
                livemode: registration.livemode,
                type: registration.type,
                country_options: registration.country_options,
                business_country: businessCountry
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Failed to create international tax registration', { 
            error: error.message, 
            country: targetCountry 
          });
          throw new Error(`Failed to create tax registration for ${targetCountry}: ${error.message}`);
        }

      case 'delete':
        if (!registration_id) {
          throw new Error('Registration ID is required for deleting tax registration');
        }

        try {
          await stripe.tax.registrations.update(registration_id, {
            expires_at: Math.floor(Date.now() / 1000) // Set to expire immediately
          }, {
            stripeAccount: stripeAccount.stripe_account_id
          });

          logStep('Deleted international tax registration', { 
            registrationId: registration_id,
            businessCountry 
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Tax registration deleted successfully',
              businessCountry
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        } catch (error) {
          logStep('Failed to delete tax registration', { error: error.message });
          throw new Error(`Failed to delete tax registration: ${error.message}`);
        }

      default:
        throw new Error('Invalid action. Supported actions: list, create, delete');
    }

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