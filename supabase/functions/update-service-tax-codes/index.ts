import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validate the write payload. service_type_id must be a uuid; tax_code must look
// like a real Stripe tax code (txcd_########) so we never write a bogus value to
// the Stripe product or the DB row. zod .object() strips any other body fields.
const UpdateSchema = z.object({
  service_type_id: z.string().uuid({ message: 'service_type_id must be a valid uuid' }),
  tax_code: z.string().regex(/^txcd_[0-9]+$/, { message: 'tax_code must be a valid Stripe tax code (txcd_...)' }),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-SERVICE-TAX-CODES] ${step}${detailsStr}`);
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
    // SECURITY (F-CLOSE-04 mode-bypass class): mode/key/environment/price-field is
    // server-derived from STRIPE_MODE, never from the request body. The body's
    // test_mode (if any) is now INERT. Defaults to test when STRIPE_MODE is unset.
    const test_mode = validateStripeMode().mode === 'test';

    const parsed = UpdateSchema.safeParse(rawBody);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      const firstMsg = parsed.error.issues[0]?.message || 'Invalid input';
      return new Response(
        JSON.stringify({ success: false, code: 'INVALID_INPUT', error: firstMsg, details: flat.fieldErrors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }
    const { service_type_id, tax_code } = parsed.data;

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can update tax codes
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Tax code management requires Professional or Enterprise subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get service type and verify ownership. service_types has NO user_id column
    // (it's linked to a calendar) — the previous .eq('user_id', user.id) errored
    // on every call, so tax-code updates always failed. Verify ownership via the
    // caller's calendars instead (same pattern as manage-installment-settings).
    const { data: userCalendars, error: calError } = await supabaseClient
      .from('calendars')
      .select('id')
      .eq('user_id', user.id);

    if (calError) {
      throw new Error(`Failed to fetch user calendars: ${calError.message}`);
    }
    const userCalendarIds = (userCalendars || []).map((c: { id: string }) => c.id);

    const { data: serviceType, error: serviceError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('id', service_type_id)
      .in('calendar_id', userCalendarIds)
      .single();

    if (serviceError || !serviceType) {
      throw new Error('Service type not found or access denied');
    }

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // The service's product/price live on the CONNECTED account, scoped by
    // account_owner_id (matches the sibling tax fns). Resolve it once so BOTH the
    // create-new-price branch and the update-existing-price branch pass
    // { stripeAccount } on every Stripe call. The previous existing-price branch
    // called stripe.prices.retrieve / products.update WITHOUT stripeAccount, which
    // hit the PLATFORM account and failed with "No such price".
    const accountOwnerId = userData.account_owner_id || user.id;
    const environment = test_mode ? 'test' : 'live';
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
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
    const connectedAccount = stripeAccount.stripe_account_id;

    // Get the appropriate price ID
    const priceId = test_mode ? serviceType.stripe_test_price_id : serviceType.stripe_live_price_id;

    if (!priceId) {
      // Create product first
      const product = await stripe.products.create({
        name: serviceType.name,
        description: serviceType.description || undefined,
        tax_code: tax_code
      }, {
        stripeAccount: connectedAccount
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round((serviceType.price || 0) * 100), // Convert to cents
        currency: 'eur',
        tax_behavior: 'exclusive'
      }, {
        stripeAccount: connectedAccount
      });

      // Update service type with new price ID. Persist tax_enabled so the service
      // is not flagged as "tax not enabled" by validate-tax-compliance.
      const updateData = test_mode
        ? { stripe_test_price_id: price.id, tax_code, tax_enabled: true }
        : { stripe_live_price_id: price.id, tax_code, tax_enabled: true };

      await supabaseClient
        .from('service_types')
        .update(updateData)
        .eq('id', service_type_id);

      logStep('Created new price with tax code', { 
        serviceTypeId: service_type_id, 
        priceId: price.id, 
        taxCode: tax_code 
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Tax code updated and new Stripe price created',
          priceId: price.id,
          productId: product.id
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      // Update existing price's product with tax code. These objects live on the
      // CONNECTED account, so every call must pass { stripeAccount }.
      try {
        const price = await stripe.prices.retrieve(priceId, {
          stripeAccount: connectedAccount
        });

        await stripe.products.update(price.product as string, {
          tax_code: tax_code
        }, {
          stripeAccount: connectedAccount
        });

        // Update service type in database. Persist tax_enabled so the service is
        // not flagged as "tax not enabled" by validate-tax-compliance.
        await supabaseClient
          .from('service_types')
          .update({ tax_code, tax_enabled: true })
          .eq('id', service_type_id);

        logStep('Updated existing product tax code', { 
          serviceTypeId: service_type_id, 
          priceId: priceId, 
          taxCode: tax_code 
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Tax code updated successfully',
            priceId: priceId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (error) {
        logStep('Failed to update product', { error: error.message });
        throw new Error(`Failed to update tax code in Stripe: ${error.message}`);
      }
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