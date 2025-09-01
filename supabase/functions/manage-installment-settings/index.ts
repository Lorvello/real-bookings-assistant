import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-INSTALLMENT-SETTINGS] ${step}${detailsStr}`);
};

interface InstallmentPlan {
  type: 'preset' | 'custom';
  preset?: '100_at_booking' | '50_50' | '25_25_50' | 'fixed_deposit';
  deposits?: Array<{
    percentage?: number;
    amount?: number;
    timing: 'now' | 'appointment' | 'hours_after';
    hours?: number;
  }>;
  fixed_deposit_amount?: number;
}

interface ServiceInstallmentConfig {
  serviceTypeId: string;
  enabled: boolean;
  plan: InstallmentPlan;
  allowCustomerChoice: boolean;
}

interface InstallmentSettingsRequest {
  enabled: boolean;
  allowCustomerChoice: boolean;
  defaultPlan: InstallmentPlan;
  applyToServices: 'all' | 'selected';
  selectedServices?: string[];
  serviceConfigs?: ServiceInstallmentConfig[];
  test_mode?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error('Invalid authentication');
    }
    logStep("User authenticated", { userId: userData.user.id });

    // Check subscription tier - installments require Professional or Enterprise
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('subscription_tier')
      .eq('id', userData.user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User profile not found');
    }

    if (!userProfile.subscription_tier || !['professional', 'enterprise'].includes(userProfile.subscription_tier)) {
      throw new Error('Installment payments require Professional plan or higher');
    }
    logStep("Subscription tier validated", { tier: userProfile.subscription_tier });

    const settings: InstallmentSettingsRequest = await req.json();
    logStep("Settings received", { enabled: settings.enabled, applyToServices: settings.applyToServices });

    // Update user's global installment settings
    const { error: userUpdateError } = await supabaseClient
      .from('users')
      .update({
        installments_enabled: settings.enabled,
        default_installment_plan: settings.defaultPlan,
        allow_customer_installment_choice: settings.allowCustomerChoice
      })
      .eq('id', userData.user.id);

    if (userUpdateError) {
      throw new Error('Failed to update user settings: ' + userUpdateError.message);
    }
    logStep("User settings updated");

    // Initialize Stripe with test/live key based on mode
    const stripeKey = settings.test_mode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    
    if (!stripeKey) {
      throw new Error(`Stripe ${settings.test_mode ? 'test' : 'live'} key is not configured`);
    }
    logStep("Stripe key found", { mode: settings.test_mode ? 'test' : 'live' });
    
    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

    // Get user's Stripe account
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id')
      .eq('user_id', userData.user.id)
      .eq('account_status', 'active')
      .single();

    if (!stripeAccount && settings.enabled) {
      logStep("Warning: No active Stripe account found");
      // Don't throw error, just log warning - user might set up later
    }

    // Handle service-specific configurations
    if (settings.enabled && settings.applyToServices === 'selected' && settings.serviceConfigs) {
      logStep("Processing service-specific configurations", { count: settings.serviceConfigs.length });
      
      for (const config of settings.serviceConfigs) {
        // Get service type details
        const { data: serviceType, error: serviceError } = await supabaseClient
          .from('service_types')
          .select('*')
          .eq('id', config.serviceTypeId)
          .eq('user_id', userData.user.id)
          .single();

        if (serviceError || !serviceType) {
          logStep("Service type not found", { serviceTypeId: config.serviceTypeId });
          continue;
        }

        // Upsert service installment configuration
        const { error: configError } = await supabaseClient
          .from('service_installment_configs')
          .upsert({
            service_type_id: config.serviceTypeId,
            enabled: config.enabled,
            plan_type: config.plan.type,
            preset_plan: config.plan.preset,
            custom_deposits: config.plan.deposits || [],
            fixed_deposit_amount: config.plan.fixed_deposit_amount,
            allow_customer_choice: config.allowCustomerChoice
          });

        if (configError) {
          logStep("Error updating service config", { serviceTypeId: config.serviceTypeId, error: configError.message });
          continue;
        }

        // Create Stripe products for installment options if enabled and Stripe is configured
        if (config.enabled && stripeAccount && serviceType.price) {
          await createInstallmentStripeProducts(stripe, stripeAccount.stripe_account_id, serviceType, config.plan);
        }

        logStep("Service configuration updated", { serviceTypeId: config.serviceTypeId });
      }
    } else if (settings.enabled && settings.applyToServices === 'all') {
      // Apply to all services - update service_types table
      const { error: allServicesError } = await supabaseClient
        .from('service_types')
        .update({
          installments_enabled: true,
          custom_installment_plan: settings.defaultPlan
        })
        .eq('user_id', userData.user.id);

      if (allServicesError) {
        logStep("Error updating all services", { error: allServicesError.message });
      } else {
        logStep("All services updated with installments");
      }
    }

    logStep("Settings saved successfully");

    return new Response(JSON.stringify({
      success: true,
      message: 'Installment settings updated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function createInstallmentStripeProducts(
  stripe: Stripe, 
  stripeAccountId: string, 
  serviceType: any, 
  plan: InstallmentPlan
) {
  try {
    logStep("Creating Stripe installment products", { serviceTypeId: serviceType.id, planType: plan.type });
    
    const servicePriceCents = Math.round((serviceType.price || 0) * 100);
    
    // Calculate installment amounts
    const installments = calculateInstallments(plan, servicePriceCents);
    
    for (let i = 0; i < installments.length; i++) {
      const installment = installments[i];
      
      // Skip cash payments - only create Stripe products for online payments
      if (installment.payment_method === 'cash') continue;
      
      const productName = `${serviceType.name} - Installment ${i + 1}/${installments.length}`;
      
      // Create Stripe price for this installment
      const price = await stripe.prices.create({
        currency: 'eur',
        unit_amount: installment.amount_cents,
        product_data: {
          name: productName,
          description: `${installment.timing} payment for ${serviceType.name}`,
          metadata: {
            service_type_id: serviceType.id,
            installment_number: (i + 1).toString(),
            total_installments: installments.length.toString(),
            payment_timing: installment.timing
          }
        }
      }, {
        stripeAccount: stripeAccountId
      });
      
      logStep("Created Stripe price for installment", { 
        priceId: price.id, 
        installmentNumber: i + 1,
        amount: installment.amount_cents 
      });
    }
    
  } catch (error) {
    logStep("Error creating Stripe products", { error: error.message });
  }
}

function calculateInstallments(plan: InstallmentPlan, servicePriceCents: number) {
  const installments = [];
  
  if (plan.type === 'preset') {
    switch (plan.preset) {
      case '100_at_booking':
        installments.push({
          amount_cents: servicePriceCents,
          timing: 'now',
          payment_method: 'online'
        });
        break;
        
      case '50_50':
        installments.push({
          amount_cents: Math.round(servicePriceCents * 0.5),
          timing: 'now',
          payment_method: 'online'
        });
        installments.push({
          amount_cents: Math.round(servicePriceCents * 0.5),
          timing: 'appointment',
          payment_method: 'cash'
        });
        break;
        
      case '25_25_50':
        installments.push({
          amount_cents: Math.round(servicePriceCents * 0.25),
          timing: 'now',
          payment_method: 'online'
        });
        installments.push({
          amount_cents: Math.round(servicePriceCents * 0.25),
          timing: 'appointment',
          payment_method: 'cash'
        });
        installments.push({
          amount_cents: Math.round(servicePriceCents * 0.5),
          timing: 'appointment',
          payment_method: 'cash'
        });
        break;
        
      case 'fixed_deposit':
        const depositCents = Math.round((plan.fixed_deposit_amount || 50) * 100);
        const remainderCents = servicePriceCents - depositCents;
        
        installments.push({
          amount_cents: depositCents,
          timing: 'now',
          payment_method: 'online'
        });
        installments.push({
          amount_cents: remainderCents,
          timing: 'appointment',
          payment_method: 'cash'
        });
        break;
    }
  } else {
    // Custom plan
    plan.deposits?.forEach((deposit) => {
      const amountCents = deposit.amount ? 
        Math.round(deposit.amount * 100) : 
        Math.round((servicePriceCents * (deposit.percentage || 0)) / 100);
      
      installments.push({
        amount_cents: amountCents,
        timing: deposit.timing,
        payment_method: deposit.timing === 'now' ? 'online' : 'cash'
      });
    });
  }
  
  return installments;
}