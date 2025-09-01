import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-TAX-COMPLIANCE] ${step}${detailsStr}`);
};

interface ComplianceIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  details?: any;
  action_required?: string;
}

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
    logStep('Compliance validation started', { userId: user.id, testMode: test_mode, calendarId: calendar_id });

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    const issues: ComplianceIssue[] = [];
    let complianceScore = 100;

    // 1. Validate Stripe Connect Account
    logStep('Validating Stripe Connect account');
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', test_mode ? 'test' : 'live')
      .single();

    if (!stripeAccount) {
      issues.push({
        type: 'error',
        category: 'stripe_setup',
        message: 'No Stripe Connect account found',
        action_required: 'Complete Stripe onboarding to accept payments'
      });
      complianceScore -= 50;
    } else {
      if (!stripeAccount.charges_enabled) {
        issues.push({
          type: 'error',
          category: 'stripe_setup', 
          message: 'Stripe account cannot accept charges',
          action_required: 'Complete Stripe account verification'
        });
        complianceScore -= 30;
      }

      if (!stripeAccount.payouts_enabled) {
        issues.push({
          type: 'warning',
          category: 'stripe_setup',
          message: 'Stripe payouts not enabled',
          details: 'You may not receive automatic payouts'
        });
        complianceScore -= 10;
      }

      if (!stripeAccount.details_submitted) {
        issues.push({
          type: 'warning',
          category: 'stripe_setup',
          message: 'Stripe account details incomplete',
          action_required: 'Complete business information in Stripe dashboard'
        });
        complianceScore -= 15;
      }
    }

    // 2. Validate Tax Registrations
    if (stripeAccount) {
      logStep('Validating tax registrations');
      const businessCountry = stripeAccount.country?.toUpperCase() || 'NL';
      
      try {
        const registrations = await stripe.tax.registrations.list({
          stripeAccount: stripeAccount.stripe_account_id
        });

        const activeRegistrations = registrations.data.filter(reg => reg.status === 'active');
        
        if (activeRegistrations.length === 0) {
          issues.push({
            type: 'warning',
            category: 'tax_registration',
            message: 'No active tax registrations found',
            details: { business_country: businessCountry },
            action_required: 'Consider registering for tax collection if required'
          });
          complianceScore -= 20;
        } else {
          // Check if business country registration exists
          const businessCountryReg = activeRegistrations.find(reg => reg.country === businessCountry);
          if (!businessCountryReg) {
            issues.push({
              type: 'info',
              category: 'tax_registration',
              message: `No tax registration for business country (${businessCountry})`,
              details: { registered_countries: activeRegistrations.map(r => r.country) }
            });
            complianceScore -= 5;
          }
        }
      } catch (error) {
        logStep('Tax registrations check failed', { error: error.message });
        issues.push({
          type: 'info',
          category: 'tax_registration',
          message: 'Unable to verify tax registrations',
          details: 'May not be available for Express accounts'
        });
      }
    }

    // 3. Validate Service Tax Configuration
    logStep('Validating service tax configuration');
    const { data: services } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('calendar_id', calendar_id)
      .eq('is_active', true);

    if (services && services.length > 0) {
      let servicesWithoutTax = 0;
      let servicesWithInvalidCodes = 0;

      for (const service of services) {
        if (!service.tax_enabled) {
          servicesWithoutTax++;
        } else {
          if (!service.tax_code || !service.applicable_tax_rate) {
            servicesWithInvalidCodes++;
          }
        }
      }

      if (servicesWithoutTax > 0) {
        issues.push({
          type: 'warning',
          category: 'service_configuration',
          message: `${servicesWithoutTax} services don't have tax enabled`,
          details: { services_without_tax: servicesWithoutTax, total_services: services.length },
          action_required: 'Enable tax for services that require it'
        });
        complianceScore -= Math.min(25, servicesWithoutTax * 5);
      }

      if (servicesWithInvalidCodes > 0) {
        issues.push({
          type: 'error',
          category: 'service_configuration',
          message: `${servicesWithInvalidCodes} services have invalid tax configuration`,
          details: { services_with_invalid_config: servicesWithInvalidCodes },
          action_required: 'Fix tax codes and rates for affected services'
        });
        complianceScore -= Math.min(30, servicesWithInvalidCodes * 10);
      }
    } else {
      issues.push({
        type: 'info',
        category: 'service_configuration',
        message: 'No active services found',
        action_required: 'Create services to start accepting bookings'
      });
    }

    // 4. Validate Stripe Price IDs
    if (services && services.length > 0) {
      logStep('Validating Stripe price IDs');
      const priceField = test_mode ? 'stripe_test_price_id' : 'stripe_live_price_id';
      const servicesWithoutPrices = services.filter(s => !s[priceField]);

      if (servicesWithoutPrices.length > 0) {
        issues.push({
          type: 'warning',
          category: 'stripe_integration',
          message: `${servicesWithoutPrices.length} services don't have Stripe prices`,
          details: { services_without_prices: servicesWithoutPrices.length },
          action_required: 'Sync services with Stripe to create price IDs'
        });
        complianceScore -= Math.min(20, servicesWithoutPrices.length * 5);
      }
    }

    // 5. Check Tax Configuration Record
    logStep('Validating tax configuration');
    const { data: taxConfig } = await supabaseClient
      .from('tax_configurations')
      .select('*')
      .eq('calendar_id', calendar_id)
      .single();

    if (!taxConfig) {
      issues.push({
        type: 'warning',
        category: 'tax_configuration',
        message: 'No tax configuration found',
        action_required: 'Create tax configuration for this calendar'
      });
      complianceScore -= 15;
    } else {
      if (!taxConfig.default_tax_code || !taxConfig.default_tax_rate) {
        issues.push({
          type: 'warning',
          category: 'tax_configuration',
          message: 'Incomplete tax configuration',
          action_required: 'Set default tax code and rate'
        });
        complianceScore -= 10;
      }
    }

    // 6. Check Revenue Thresholds
    if (stripeAccount && calendar_id) {
      logStep('Checking revenue thresholds');
      const businessCountry = stripeAccount.country?.toUpperCase() || 'NL';
      
      const { data: threshold } = await supabaseClient
        .from('tax_thresholds')
        .select('*')
        .eq('country_code', businessCountry)
        .single();

      if (threshold) {
        // Calculate revenue for the last 12 months
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const { data: bookings } = await supabaseClient
          .from('bookings')
          .select('total_price')
          .eq('calendar_id', calendar_id)
          .eq('status', 'completed')
          .gte('created_at', oneYearAgo.toISOString());

        if (bookings && bookings.length > 0) {
          const totalRevenue = bookings.reduce((sum, booking) => sum + (booking.total_price || 0), 0);
          const thresholdAmount = threshold.threshold_amount_cents / 100;
          
          if (totalRevenue >= thresholdAmount) {
            const hasRegistration = stripeAccount.tax_collection_countries?.includes(businessCountry);
            if (!hasRegistration) {
              issues.push({
                type: 'error',
                category: 'compliance_requirement',
                message: `Revenue exceeds tax registration threshold for ${businessCountry}`,
                details: { 
                  revenue: totalRevenue, 
                  threshold: thresholdAmount,
                  currency: threshold.currency
                },
                action_required: `Register for tax collection in ${businessCountry}`
              });
              complianceScore -= 40;
            }
          } else if (totalRevenue >= thresholdAmount * 0.8) {
            issues.push({
              type: 'info',
              category: 'compliance_requirement',
              message: `Approaching tax registration threshold for ${businessCountry}`,
              details: { 
                revenue: totalRevenue, 
                threshold: thresholdAmount,
                percentage: Math.round((totalRevenue / thresholdAmount) * 100)
              }
            });
          }
        }
      }
    }

    // Calculate final compliance level
    const complianceLevel = Math.max(0, complianceScore);
    const complianceStatus = complianceLevel >= 90 ? 'excellent' : 
                           complianceLevel >= 70 ? 'good' : 
                           complianceLevel >= 50 ? 'needs_improvement' : 'critical';

    logStep('Compliance validation completed', {
      complianceScore: complianceLevel,
      complianceStatus,
      issuesCount: issues.length,
      errorCount: issues.filter(i => i.type === 'error').length,
      warningCount: issues.filter(i => i.type === 'warning').length
    });

    return new Response(
      JSON.stringify({
        success: true,
        compliance_score: complianceLevel,
        compliance_status: complianceStatus,
        issues: issues,
        summary: {
          total_issues: issues.length,
          errors: issues.filter(i => i.type === 'error').length,
          warnings: issues.filter(i => i.type === 'warning').length,
          info: issues.filter(i => i.type === 'info').length
        },
        recommendations: complianceLevel < 70 ? [
          'Complete Stripe Connect account setup',
          'Enable tax for all applicable services',
          'Create tax registrations for required countries',
          'Sync services with Stripe to create price IDs'
        ] : [
          'Monitor compliance regularly',
          'Review tax registrations when expanding to new countries',
          'Keep service tax codes up to date'
        ],
        last_checked: new Date().toISOString()
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