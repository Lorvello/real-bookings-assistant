import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { validateStripeMode } from '../_shared/stripeValidation.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SERVICE-TYPE-WITH-STRIPE] ${step}${detailsStr}`);
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authorization header required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ success: false, error: "Authentication failed" }, 401);
    }
    logStep("User authenticated", { userId: userData.user.id });

    // Two supported contracts:
    //  A) { serviceData: {...new service...} }   -> create a new service_type + Stripe price
    //  B) { serviceTypeId, name?, price?, currency?, calendarId } -> service row already
    //     exists; create a Stripe price for it and store the price id on the row.
    const body = await req.json().catch(() => ({}));
    const { serviceData, serviceTypeId, name, price, currency, calendarId } = body;
    // SECURITY (F-V05 class): pin the Stripe mode to the server's STRIPE_MODE, never
    // the client body. This fn previously read `testMode` from the request body
    // (defaulting to LIVE), so an authed user could send testMode:false in a TEST
    // deployment and create a LIVE Stripe price + write stripe_live_price_id.
    // validateStripeMode() defaults to test when STRIPE_MODE is unset.
    const testMode = validateStripeMode().mode === 'test';
    const isExisting = !!serviceTypeId && !serviceData;
    logStep("Request parsed", { mode: isExisting ? 'existing' : 'create', hasServiceData: !!serviceData, testMode });

    // Resolve the target calendar + the price inputs for both contracts.
    let calId: string | undefined;
    let svcName: string | undefined;
    let svcPrice: number | undefined;
    let svcDuration: number | string | undefined;
    let existingService: any = null;

    if (isExisting) {
      const { data: svc, error: svcErr } = await supabaseClient
        .from('service_types')
        .select('*')
        .eq('id', serviceTypeId)
        .single();
      if (svcErr || !svc) {
        return json({ success: false, error: 'Service type not found' }, 404);
      }
      existingService = svc;
      calId = svc.calendar_id;
      svcName = name || svc.name;
      svcPrice = (price ?? svc.price) as number;
      svcDuration = svc.duration;
      if (calendarId && calendarId !== calId) {
        return json({ success: false, error: 'calendarId does not match the service type' }, 400);
      }
    } else {
      if (!serviceData || !serviceData.calendar_id) {
        return json({ success: false, error: 'serviceData (with calendar_id) or serviceTypeId is required' }, 400);
      }
      calId = serviceData.calendar_id;
      svcName = serviceData.name;
      svcPrice = serviceData.price;
      svcDuration = serviceData.duration;
    }

    // SECURITY: the service-role client bypasses RLS, so verify the caller owns the
    // target calendar (directly or via the same team account) before creating Stripe
    // prices / service rows on it. Without this, any authenticated user could write
    // services + prices onto another tenant's calendar (cross-tenant write / IDOR).
    const { data: cal, error: calErr } = await supabaseClient
      .from('calendars')
      .select('user_id')
      .eq('id', calId)
      .single();
    if (calErr || !cal) {
      return json({ success: false, error: 'Calendar not found' }, 404);
    }
    if (cal.user_id !== userData.user.id) {
      const { data: owners } = await supabaseClient
        .from('users')
        .select('id, account_owner_id')
        .in('id', [cal.user_id, userData.user.id]);
      const acct = (id: string) => owners?.find((o: any) => o.id === id)?.account_owner_id || id;
      if (acct(cal.user_id) !== acct(userData.user.id)) {
        return json({ success: false, error: 'Access denied: calendar not owned by caller' }, 403);
      }
    }

    // Tax configuration only applies to the create-new contract (the existing row
    // already carries its own tax config).
    if (serviceData && serviceData.tax_enabled) {
      logStep("Tax enabled, checking user tax configuration");
      const { data: userTaxData, error: userTaxError } = await supabaseClient
        .from('users')
        .select('tax_configured, default_tax_behavior')
        .eq('id', userData.user.id)
        .single();
      if (userTaxError) {
        throw new Error('Failed to check tax configuration: ' + userTaxError.message);
      }
      if (!userTaxData.tax_configured) {
        throw new Error('Configure tax first. Please complete your tax settings before enabling tax on services.');
      }
      if (!serviceData.tax_code) {
        throw new Error('Tax code is required when tax is enabled');
      }
      if (!serviceData.tax_behavior) {
        serviceData.tax_behavior = userTaxData.default_tax_behavior || 'exclusive';
      }
      if (!['inclusive', 'exclusive'].includes(serviceData.tax_behavior)) {
        throw new Error('Tax behavior must be either "inclusive" or "exclusive"');
      }
      logStep("Tax validation passed", { tax_code: serviceData.tax_code, tax_behavior: serviceData.tax_behavior });
    } else if (serviceData) {
      // Auto-assign tax codes for create-new services without explicit tax config.
      logStep("Auto-assigning tax codes for service");
      try {
        const { data: taxAssignmentResult } = await supabaseClient.functions.invoke('assign-tax-codes', {
          body: {
            calendar_id: serviceData.calendar_id,
            service_data: {
              name: serviceData.name,
              category: serviceData.service_category || 'general',
              description: serviceData.description
            }
          }
        });
        if (taxAssignmentResult?.success && taxAssignmentResult?.tax_code) {
          serviceData.tax_enabled = true;
          serviceData.tax_code = taxAssignmentResult.tax_code;
          serviceData.tax_behavior = taxAssignmentResult.tax_behavior || 'exclusive';
          serviceData.applicable_tax_rate = taxAssignmentResult.applicable_tax_rate;
          serviceData.business_country = taxAssignmentResult.business_country || 'NL';
          logStep("Tax codes auto-assigned");
        }
      } catch (taxError) {
        logStep("Auto tax assignment failed, continuing without tax", { error: (taxError as any).message });
      }
    }

    // Initialize Stripe.
    const stripeKey = testMode
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    if (!stripeKey) {
      throw new Error(`Stripe ${testMode ? 'test' : 'live'} secret key not configured`);
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Build the Stripe price. product_data supports name/metadata/tax_code (no description).
    const priceData: any = {
      currency: currency || 'eur',
      unit_amount: Math.round((svcPrice || 0) * 100),
      product_data: {
        name: svcName,
        metadata: {
          service_duration: svcDuration != null ? String(svcDuration) : '',
          calendar_id: calId || '',
          description: (serviceData?.description ?? existingService?.description) || '',
        },
      },
    };
    if (serviceData?.tax_enabled && serviceData?.tax_code) {
      priceData.product_data.tax_code = serviceData.tax_code;
      priceData.tax_behavior = serviceData.tax_behavior;
    }
    if (serviceData?.allow_installments) {
      priceData.product_data.metadata.allow_installments = 'true';
      priceData.product_data.metadata.installment_plans = JSON.stringify(serviceData.installment_plans || []);
    }

    const stripePrice = await stripe.prices.create(priceData);
    logStep("Stripe price created", { priceId: stripePrice.id });

    const priceIdField = testMode ? { stripe_test_price_id: stripePrice.id } : { stripe_live_price_id: stripePrice.id };

    // Persist. On any DB failure, deactivate the just-created Stripe price/product so
    // we don't orphan it (the original bug: a failed insert left a dangling price).
    let savedService: any = null;
    try {
      if (isExisting) {
        const { data, error } = await supabaseClient
          .from('service_types')
          .update(priceIdField)
          .eq('id', serviceTypeId)
          .select()
          .single();
        if (error) throw error;
        savedService = data;
      } else {
        // NOTE: service_types has NO user_id column — the previous version spread
        // user_id into the insert, which failed every time. Insert only real columns.
        const insertData: any = { ...serviceData, ...priceIdField };
        delete insertData.user_id;
        const { data, error } = await supabaseClient
          .from('service_types')
          .insert(insertData)
          .select()
          .single();
        if (error) throw error;
        savedService = data;
      }
    } catch (dbErr: any) {
      logStep("DB persist failed, cleaning up orphaned Stripe price", { error: dbErr.message });
      try {
        await stripe.prices.update(stripePrice.id, { active: false });
        if (stripePrice.product) {
          await stripe.products.update(stripePrice.product as string, { active: false });
        }
      } catch (cleanupErr) {
        logStep("Stripe cleanup failed (price left inactive-pending)", { error: (cleanupErr as any).message });
      }
      throw new Error('Failed to save service: ' + dbErr.message);
    }

    logStep("Service persisted", { serviceId: savedService.id });
    return json({
      success: true,
      service: savedService,
      stripe_price_id: stripePrice.id,
      test_mode: testMode,
    }, 200);

  } catch (error: any) {
    console.error('Error in create-service-type-with-stripe:', error);
    return json({ success: false, error: error.message }, 500);
  }
})
