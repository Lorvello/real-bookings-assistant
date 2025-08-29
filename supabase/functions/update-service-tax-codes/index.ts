import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { service_type_id, tax_code, test_mode = true } = await req.json();

    if (!service_type_id || !tax_code) {
      throw new Error('service_type_id and tax_code are required');
    }

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

    // Get service type and verify ownership
    const { data: serviceType, error: serviceError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('id', service_type_id)
      .eq('user_id', user.id)
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

    // Get the appropriate price ID
    const priceId = test_mode ? serviceType.stripe_test_price_id : serviceType.stripe_live_price_id;

    if (!priceId) {
      // Create a new price with the tax code if none exists
      const accountOwnerId = userData.account_owner_id || user.id;
      const environment = test_mode ? 'test' : 'live';

      // Get user's Stripe account
      const { data: stripeAccount } = await supabaseClient
        .from('business_stripe_accounts')
        .select('*')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('charges_enabled', true)
        .single();

      if (!stripeAccount) {
        throw new Error('No active Stripe account found');
      }

      // Create product first
      const product = await stripe.products.create({
        name: serviceType.name,
        description: serviceType.description || undefined,
        tax_code: tax_code
      }, {
        stripeAccount: stripeAccount.stripe_account_id
      });

      // Create price
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round((serviceType.price || 0) * 100), // Convert to cents
        currency: 'eur',
        tax_behavior: 'exclusive'
      }, {
        stripeAccount: stripeAccount.stripe_account_id
      });

      // Update service type with new price ID
      const updateData = test_mode 
        ? { stripe_test_price_id: price.id, tax_code }
        : { stripe_live_price_id: price.id, tax_code };

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
      // Update existing price's product with tax code
      try {
        const price = await stripe.prices.retrieve(priceId);
        
        await stripe.products.update(price.product as string, {
          tax_code: tax_code
        });

        // Update service type in database
        await supabaseClient
          .from('service_types')
          .update({ tax_code })
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