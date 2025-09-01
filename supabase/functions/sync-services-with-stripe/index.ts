import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-SERVICES-WITH-STRIPE] ${step}${detailsStr}`);
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

    const { test_mode = true } = await req.json();
    logStep('Function started', { userId: user.id, testMode: test_mode });

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get user's Stripe account
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', test_mode ? 'test' : 'live')
      .eq('charges_enabled', true)
      .single();

    if (!stripeAccount) {
      throw new Error('No active Stripe account found. Please complete Stripe onboarding first.');
    }

    logStep('Found Stripe account', { accountId: stripeAccount.stripe_account_id });

    // Get all services that need Stripe integration
    const { data: services, error: servicesError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('user_id', user.id)
      .is(test_mode ? 'stripe_test_price_id' : 'stripe_live_price_id', null)
      .not('price', 'is', null);

    if (servicesError) {
      throw new Error('Failed to fetch services: ' + servicesError.message);
    }

    if (!services || services.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No services need Stripe integration',
        servicesProcessed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    logStep('Services to process', { count: services.length });

    const results = [];

    for (const service of services) {
      try {
        logStep('Processing service', { serviceId: service.id, name: service.name, price: service.price });

        // Create Stripe Price
        const priceData: any = {
          currency: 'eur',
          unit_amount: Math.round((service.price || 0) * 100), // Convert to cents
          product_data: {
            name: service.name,
            description: service.payment_description || `${service.name} - ${service.duration} minuten`,
            metadata: {
              service_duration: service.duration.toString(),
              calendar_id: service.calendar_id || '',
              service_type_id: service.id,
            },
          },
        };

        // Add tax configuration if enabled
        if (service.tax_enabled && service.tax_code) {
          logStep('Adding tax configuration to Stripe Price', {
            tax_code: service.tax_code,
            tax_behavior: service.tax_behavior
          });

          priceData.product_data.tax_code = service.tax_code;
          priceData.tax_behavior = service.tax_behavior || 'exclusive';
        }

        const price = await stripe.prices.create(priceData, {
          stripeAccount: stripeAccount.stripe_account_id
        });

        logStep('Stripe price created', { priceId: price.id, serviceId: service.id });

        // Update service with Stripe price ID
        const updateData = test_mode 
          ? { stripe_test_price_id: price.id }
          : { stripe_live_price_id: price.id };

        const { error: updateError } = await supabaseClient
          .from('service_types')
          .update(updateData)
          .eq('id', service.id);

        if (updateError) {
          logStep('Error updating service', { serviceId: service.id, error: updateError.message });
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: updateError.message
          });
        } else {
          logStep('Service updated successfully', { serviceId: service.id, priceId: price.id });
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: true,
            stripePriceId: price.id
          });
        }

      } catch (serviceError) {
        logStep('Error processing service', { serviceId: service.id, error: serviceError.message });
        results.push({
          serviceId: service.id,
          serviceName: service.name,
          success: false,
          error: serviceError.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    logStep('Processing complete', { successCount, failureCount });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${services.length} services: ${successCount} successful, ${failureCount} failed`,
      servicesProcessed: services.length,
      successCount,
      failureCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});