import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTO-SETUP-TAX] ${step}${detailsStr}`);
};

// Default tax codes by service category and country
const DEFAULT_TAX_CODES = {
  'professional_services': {
    'NL': 'txcd_30060000', 'DE': 'txcd_30060000', 'FR': 'txcd_30060000', 'GB': 'txcd_30060000',
    'US': 'txcd_30060000', 'CA': 'txcd_30060000', 'AU': 'txcd_30060000'
  },
  'personal_care': {
    'NL': 'txcd_20030000', 'DE': 'txcd_20030000', 'FR': 'txcd_20030000', 'GB': 'txcd_20030000',
    'US': 'txcd_20030000', 'CA': 'txcd_20030000', 'AU': 'txcd_20030000'
  },
  'medical': {
    'NL': 'txcd_30070000', 'DE': 'txcd_30070000', 'FR': 'txcd_30070000', 'GB': 'txcd_30070000',
    'US': 'txcd_30070000', 'CA': 'txcd_30070000', 'AU': 'txcd_30070000'
  },
  'general': {
    'NL': 'txcd_10000000', 'DE': 'txcd_10000000', 'FR': 'txcd_10000000', 'GB': 'txcd_10000000',
    'US': 'txcd_10000000', 'CA': 'txcd_10000000', 'AU': 'txcd_10000000'
  }
};

const detectServiceCategory = async (serviceName: string, supabaseClient: any): Promise<string> => {
  // Try to find matching classification
  const { data: classifications } = await supabaseClient
    .from('service_classifications')
    .select('*')
    .order('confidence_score', { ascending: false });

  if (classifications) {
    for (const classification of classifications) {
      const keywords = classification.classification_keywords || [];
      const nameWords = serviceName.toLowerCase().split(/\s+/);
      
      for (const keyword of keywords) {
        if (nameWords.some(word => word.includes(keyword.toLowerCase()))) {
          logStep('Service category detected', { 
            service: serviceName, 
            category: classification.suggested_category,
            confidence: classification.confidence_score 
          });
          return classification.suggested_category;
        }
      }
    }
  }

  return 'general'; // Default fallback
};

const getCountryTaxRate = (country: string): number => {
  const rates = {
    'NL': 21, 'DE': 19, 'FR': 20, 'GB': 20, 'US': 8.5, 'CA': 13, 'AU': 10,
    'ES': 21, 'IT': 22, 'BE': 21, 'AT': 20, 'DK': 25, 'SE': 25, 'FI': 24
  };
  return rates[country] || 21;
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

    const { test_mode = true, calendar_id } = await req.json();
    logStep('Auto tax setup started', { userId: user.id, testMode: test_mode, calendarId: calendar_id });

    // Check user's subscription tier
    const { data: userData } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Automated tax setup requires Professional or Enterprise subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const accountOwnerId = userData.account_owner_id || user.id;

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

    const businessCountry = stripeAccount.country?.toUpperCase() || 'NL';
    logStep('Detected business country', { country: businessCountry });

    // STEP 1: Detect tax requirements
    logStep('Step 1: Detecting tax requirements');
    const { data: reqResponse } = await supabaseClient.functions.invoke('detect-tax-requirements', {
      body: { test_mode, calendar_id }
    });

    if (!reqResponse?.success) {
      throw new Error('Failed to detect tax requirements');
    }

    const requirements = reqResponse;
    logStep('Tax requirements detected', requirements);

    let registrationCreated = false;
    let servicesConfigured = 0;
    let setupSteps = [];

    // STEP 2: Create tax registration if required
    if (requirements.registration_required && !requirements.has_existing_registration) {
      logStep('Step 2: Creating tax registration');
      setupSteps.push('Creating tax registration...');

      try {
        const { data: regResponse } = await supabaseClient.functions.invoke('manage-tax-registrations', {
          body: { 
            action: 'create',
            country: businessCountry,
            test_mode: test_mode
          }
        });

        if (regResponse?.success) {
          registrationCreated = true;
          setupSteps.push(`✓ ${requirements.tax_system.name} registration created for ${businessCountry}`);
          logStep('Tax registration created successfully');
        } else {
          setupSteps.push(`⚠ Tax registration failed: ${regResponse?.error || 'Unknown error'}`);
          logStep('Tax registration failed', { error: regResponse?.error });
        }
      } catch (error) {
        setupSteps.push(`⚠ Tax registration failed: ${error.message}`);
        logStep('Tax registration error', { error: error.message });
      }
    } else if (requirements.has_existing_registration) {
      setupSteps.push(`✓ ${requirements.tax_system.name} registration already exists`);
    }

    // STEP 3: Configure services with tax codes
    logStep('Step 3: Configuring services with tax codes');
    setupSteps.push('Configuring services with appropriate tax codes...');

    const { data: services } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('calendar_id', calendar_id)
      .eq('is_active', true);

    if (services && services.length > 0) {
      for (const service of services) {
        try {
          const category = await detectServiceCategory(service.name, supabaseClient);
          const taxCode = DEFAULT_TAX_CODES[category]?.[businessCountry] || DEFAULT_TAX_CODES['general'][businessCountry];
          const taxRate = getCountryTaxRate(businessCountry);

          await supabaseClient
            .from('service_types')
            .update({
              tax_enabled: true,
              tax_code: taxCode,
              applicable_tax_rate: taxRate,
              business_country: businessCountry,
              tax_behavior: 'exclusive' // Standard for most countries
            })
            .eq('id', service.id);

          servicesConfigured++;
          logStep('Service configured', { 
            service: service.name, 
            category, 
            taxCode, 
            taxRate 
          });
        } catch (error) {
          logStep('Service configuration error', { service: service.name, error: error.message });
        }
      }
      setupSteps.push(`✓ ${servicesConfigured} services configured with tax codes`);
    }

    // STEP 4: Create tax configuration record
    logStep('Step 4: Creating tax configuration');
    setupSteps.push('Creating tax configuration...');

    try {
      await supabaseClient
        .from('tax_configurations')
        .upsert({
          calendar_id: calendar_id,
          country_code: businessCountry,
          tax_system_name: requirements.tax_system.name,
          default_tax_rate: requirements.tax_system.rate,
          default_tax_code: DEFAULT_TAX_CODES['general'][businessCountry],
          multi_country_business: false
        });
      setupSteps.push('✓ Tax configuration created');
    } catch (error) {
      setupSteps.push(`⚠ Tax configuration failed: ${error.message}`);
      logStep('Tax configuration error', { error: error.message });
    }

    // STEP 5: Sync services with Stripe (create price IDs)
    logStep('Step 5: Syncing services with Stripe');
    setupSteps.push('Creating Stripe prices with tax configuration...');

    try {
      const { data: syncResponse } = await supabaseClient.functions.invoke('sync-services-with-stripe', {
        body: { test_mode }
      });

      if (syncResponse?.success) {
        setupSteps.push(`✓ ${syncResponse.successCount || 0} Stripe prices created`);
      } else {
        setupSteps.push(`⚠ Stripe sync failed: ${syncResponse?.error || 'Unknown error'}`);
      }
    } catch (error) {
      setupSteps.push(`⚠ Stripe sync failed: ${error.message}`);
      logStep('Stripe sync error', { error: error.message });
    }

    const setupComplete = registrationCreated || requirements.has_existing_registration;

    logStep('Auto tax setup completed', {
      setupComplete,
      registrationCreated,
      servicesConfigured,
      businessCountry
    });

    return new Response(
      JSON.stringify({
        success: true,
        setup_complete: setupComplete,
        business_country: businessCountry,
        tax_system: requirements.tax_system,
        registration_created: registrationCreated,
        services_configured: servicesConfigured,
        setup_steps: setupSteps,
        next_steps: setupComplete 
          ? ['Start accepting payments with automatic tax calculation', 'Monitor tax compliance in dashboard']
          : ['Complete any failed setup steps', 'Contact support if needed'],
        message: setupComplete 
          ? `Tax setup complete for ${businessCountry}! Your business is ready to collect ${requirements.tax_system.name}.`
          : 'Tax setup partially completed. Please review any failed steps.'
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