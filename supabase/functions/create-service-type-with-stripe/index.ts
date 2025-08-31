import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-SERVICE-TYPE-WITH-STRIPE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Function started");
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }
    logStep("User authenticated", { userId: userData.user.id });

    const { serviceData, testMode = false } = await req.json();
    logStep("Request data parsed", { hasServiceData: !!serviceData, testMode });

    // Check if tax is enabled for this service
    if (serviceData.tax_enabled) {
      logStep("Tax enabled for service, checking user tax configuration");
      
      // Check if user has completed tax configuration
      const { data: userTaxData, error: userTaxError } = await supabaseClient
        .from('users')
        .select('tax_configured, default_tax_behavior')
        .eq('id', userData.user.id)
        .single();

      if (userTaxError) {
        logStep("Error fetching user tax configuration", userTaxError);
        throw new Error('Failed to check tax configuration: ' + userTaxError.message);
      }

      if (!userTaxData.tax_configured) {
        logStep("User has not configured tax yet");
        throw new Error('Configure tax first. Please complete your tax settings before enabling tax on services.');
      }

      // Validate tax data for the service
      if (!serviceData.tax_code) {
        throw new Error('Tax code is required when tax is enabled');
      }

      if (!serviceData.tax_behavior) {
        // Use user's default tax behavior as fallback
        serviceData.tax_behavior = userTaxData.default_tax_behavior || 'exclusive';
        logStep("Using fallback tax behavior", { tax_behavior: serviceData.tax_behavior });
      }

      if (!['inclusive', 'exclusive'].includes(serviceData.tax_behavior)) {
        throw new Error('Tax behavior must be either "inclusive" or "exclusive"');
      }

      logStep("Tax validation passed", { 
        tax_code: serviceData.tax_code, 
        tax_behavior: serviceData.tax_behavior 
      });
    }

    // Initialize Stripe with appropriate key based on mode
    const stripeKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_TEST_KEY")
      : Deno.env.get("STRIPE_SECRET_LIVE_KEY");
    
    if (!stripeKey) {
      throw new Error(`Stripe ${testMode ? 'test' : 'live'} secret key not configured`);
    }
    logStep("Stripe key retrieved", { mode: testMode ? 'test' : 'live' });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    console.log('Creating Stripe price for service:', serviceData.name)

    // Create Stripe Price
    const priceData: any = {
      currency: 'eur',
      unit_amount: Math.round((serviceData.price || 0) * 100), // Convert to cents
      product_data: {
        name: serviceData.name,
        description: serviceData.description || `${serviceData.name} - ${serviceData.duration} minuten`,
        metadata: {
          service_duration: serviceData.duration.toString(),
          calendar_id: serviceData.calendar_id || '',
        },
      },
    }

    // Add tax configuration to Stripe Price if tax is enabled
    if (serviceData.tax_enabled && serviceData.tax_code) {
      logStep("Adding tax configuration to Stripe Price", {
        tax_code: serviceData.tax_code,
        tax_behavior: serviceData.tax_behavior
      });

      // Set tax code on the product
      priceData.product_data.tax_code = serviceData.tax_code;

      // Set tax behavior on the price
      priceData.tax_behavior = serviceData.tax_behavior;

      logStep("Tax configuration added to price data");
    }

    // Add installment-specific metadata if present
    if (serviceData.allow_installments) {
      priceData.product_data.metadata.allow_installments = 'true'
      priceData.product_data.metadata.installment_plans = JSON.stringify(serviceData.installment_plans || [])
    }

    const price = await stripe.prices.create(priceData)
    console.log('Stripe price created:', price.id)

    // Update serviceData with Stripe price IDs
    const updatedServiceData = {
      ...serviceData,
      user_id: userData.user.id,
      // Store price ID based on mode
      ...(testMode ? {
        stripe_test_price_id: price.id
      } : {
        stripe_live_price_id: price.id
      })
    }

    // Save to Supabase
    const { data: savedService, error: saveError } = await supabaseClient
      .from('service_types')
      .insert(updatedServiceData)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving service to Supabase:', saveError)
      throw new Error('Failed to save service: ' + saveError.message)
    }

    console.log('Service saved to Supabase:', savedService.id)

    return new Response(
      JSON.stringify({
        success: true,
        service: savedService,
        stripe_price_id: price.id,
        test_mode: testMode
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('Error in create-service-type-with-stripe:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})