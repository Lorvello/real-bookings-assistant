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

// International tax code mapping for countries
const INTERNATIONAL_TAX_CODES = {
  // EU countries - use harmonized VAT codes
  NL: { // Netherlands
    'txcd_10000000': 'Standard services (21% VAT)',
    'txcd_20030000': 'Personal care services (21% VAT)',
    'txcd_30060000': 'Professional services (21% VAT)',
    'txcd_30070000': 'Medical services (9% VAT)',
  },
  DE: { // Germany  
    'txcd_10000000': 'Standard services (19% VAT)',
    'txcd_20030000': 'Personal care services (19% VAT)',
    'txcd_30060000': 'Professional services (19% VAT)',
    'txcd_30070000': 'Medical services (7% VAT)',
  },
  FR: { // France
    'txcd_10000000': 'Standard services (20% VAT)',
    'txcd_20030000': 'Personal care services (20% VAT)',
    'txcd_30060000': 'Professional services (20% VAT)',
    'txcd_30070000': 'Medical services (10% VAT)',
  },
  GB: { // United Kingdom
    'txcd_10000000': 'Standard services (20% VAT)',
    'txcd_20030000': 'Personal care services (20% VAT)',
    'txcd_30060000': 'Professional services (20% VAT)',
    'txcd_30070000': 'Medical services (5% VAT)',
  },
  // Add more countries as needed
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

    // Detect business country for international tax handling
    const businessCountry = detectBusinessCountry(stripeAccount);
    logStep('Detected business country', { country: businessCountry });

    // Get all services that need Stripe integration for calendars owned by this user
    const { data: services, error: servicesError } = await supabaseClient
      .from('service_types')
      .select('*, calendars!inner(user_id)')
      .eq('calendars.user_id', user.id)
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
        logStep('Processing service', { 
          serviceId: service.id, 
          name: service.name, 
          price: service.price,
          country: businessCountry 
        });

        // Create Stripe Price with international support
        const priceData: any = {
          currency: stripeAccount.currency || 'eur',
          unit_amount: Math.round((service.price || 0) * 100), // Convert to cents
          product_data: {
            name: service.name,
            description: service.payment_description || `${service.name} - ${service.duration} minutes`,
            metadata: {
              service_duration: service.duration.toString(),
              calendar_id: service.calendar_id || '',
              service_type_id: service.id,
              business_country: businessCountry,
            },
          },
        };

        // Add tax configuration if enabled - with international support
        if (service.tax_enabled && service.tax_code) {
          logStep('Adding international tax configuration to Stripe Price', {
            tax_code: service.tax_code,
            tax_behavior: service.tax_behavior,
            country: businessCountry,
            applicable_rate: service.applicable_tax_rate
          });

          priceData.product_data.tax_code = service.tax_code;
          priceData.tax_behavior = service.tax_behavior || 'exclusive';
          
          // Add country-specific tax metadata
          priceData.product_data.metadata.tax_country = businessCountry;
          priceData.product_data.metadata.tax_rate = service.applicable_tax_rate?.toString() || '0';
        }

        const price = await stripe.prices.create(priceData, {
          stripeAccount: stripeAccount.stripe_account_id
        });

        logStep('Stripe price created', { priceId: price.id, serviceId: service.id });

        // Update service with Stripe price ID and ensure country is set
        const updateData = test_mode 
          ? { 
              stripe_test_price_id: price.id,
              business_country: businessCountry
            }
          : { 
              stripe_live_price_id: price.id,
              business_country: businessCountry
            };

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
          logStep('Service updated successfully', { 
            serviceId: service.id, 
            priceId: price.id,
            country: businessCountry
          });
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: true,
            stripePriceId: price.id,
            businessCountry: businessCountry
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

    logStep('Processing complete', { 
      successCount, 
      failureCount, 
      businessCountry,
      internationalSupport: true
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${services.length} services for ${businessCountry}: ${successCount} successful, ${failureCount} failed`,
      servicesProcessed: services.length,
      successCount,
      failureCount,
      businessCountry,
      internationalSupport: true,
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