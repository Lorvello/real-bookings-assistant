import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-SERVICE-STRIPE-PRICES] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting service price synchronization');

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      logStep('Authentication failed', { error: userError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { test_mode = true, service_type_id = null, force_recreate = false } = body;
    
    logStep('Request parameters', { test_mode, service_type_id, force_recreate, user_id: user.id });

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');

    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe ${test_mode ? 'test' : 'live'} secret key`);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get user's active Stripe account
    logStep('Fetching Stripe account');
    const { data: stripeAccount, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', test_mode ? 'test' : 'live')
      .eq('account_status', 'active')
      .single();

    if (accountError || !stripeAccount) {
      logStep('No active Stripe account found', { error: accountError });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active Stripe account found. Please complete Stripe onboarding first.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get services to sync
    let query = supabaseClient
      .from('service_types')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (service_type_id) {
      query = query.eq('id', service_type_id);
    }

    const { data: services, error: servicesError } = await query;

    if (servicesError) {
      throw new Error(`Failed to fetch services: ${servicesError.message}`);
    }

    if (!services || services.length === 0) {
      logStep('No services found to sync');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No services found to sync',
          synced_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep(`Processing ${services.length} services`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const service of services) {
      try {
        const priceIdField = test_mode ? 'stripe_test_price_id' : 'stripe_live_price_id';
        const existingPriceId = service[priceIdField];

        // Skip if price already exists and not forcing recreate
        if (existingPriceId && !force_recreate) {
          logStep(`Skipping service ${service.name} - price already exists`, { 
            service_id: service.id, 
            existing_price_id: existingPriceId 
          });
          results.push({
            service_id: service.id,
            service_name: service.name,
            status: 'skipped',
            reason: 'Price already exists'
          });
          continue;
        }

        // Create or update Stripe product
        let productId = service.stripe_product_id;
        
        if (!productId || force_recreate) {
          logStep(`Creating Stripe product for ${service.name}`);
          
          const productData = {
            name: service.name,
            description: service.description || `${service.name} - ${service.duration} minutes`,
            metadata: {
              user_id: user.id,
              service_type_id: service.id,
              duration_minutes: service.duration.toString(),
              business_country: service.business_country || 'NL',
              service_category: service.service_category || 'general'
            }
          };

          // Add tax code if tax is enabled
          if (service.tax_enabled && service.tax_code) {
            productData.tax_code = service.tax_code;
          }

          const product = await stripe.products.create(productData, {
            stripeAccount: stripeAccount.stripe_account_id
          });

          productId = product.id;
          
          // Update service with product ID
          await supabaseClient
            .from('service_types')
            .update({ stripe_product_id: productId })
            .eq('id', service.id);
        }

        // Create Stripe price
        if (!service.price) {
          logStep(`Skipping price creation for ${service.name} - no price set`);
          results.push({
            service_id: service.id,
            service_name: service.name,
            status: 'skipped',
            reason: 'No price set for service'
          });
          continue;
        }

        logStep(`Creating Stripe price for ${service.name}`, {
          price: service.price,
          currency: 'eur',
          product_id: productId
        });

        const priceData = {
          product: productId,
          unit_amount: Math.round(service.price * 100), // Convert to cents
          currency: 'eur',
          metadata: {
            service_type_id: service.id,
            user_id: user.id,
            business_country: service.business_country || 'NL'
          }
        };

        // Add tax behavior if tax is enabled
        if (service.tax_enabled) {
          priceData.tax_behavior = service.tax_behavior || 'exclusive';
        }

        const price = await stripe.prices.create(priceData, {
          stripeAccount: stripeAccount.stripe_account_id
        });

        // Update service with price ID
        const updateData = {
          [priceIdField]: price.id
        };

        await supabaseClient
          .from('service_types')
          .update(updateData)
          .eq('id', service.id);

        logStep(`Successfully created price for ${service.name}`, {
          price_id: price.id,
          amount: price.unit_amount
        });

        results.push({
          service_id: service.id,
          service_name: service.name,
          stripe_price_id: price.id,
          amount_cents: price.unit_amount,
          status: 'success'
        });

        successCount++;

      } catch (error) {
        logStep(`Error processing service ${service.name}`, { error: error.message });
        results.push({
          service_id: service.id,
          service_name: service.name,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }
    }

    logStep('Sync completed', {
      total_services: services.length,
      success_count: successCount,
      error_count: errorCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Synced ${successCount} services successfully`,
        synced_count: successCount,
        error_count: errorCount,
        total_services: services.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    logStep('Sync failed', { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});