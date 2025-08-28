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

    // Initialize Stripe with appropriate key based on mode
    const stripeKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
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
        stripe_price_id_test: price.id
      } : {
        stripe_price_id_live: price.id
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