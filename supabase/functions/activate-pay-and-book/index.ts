import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[ACTIVATE-PAY-AND-BOOK] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Starting Pay & Book activation');

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
    const { calendar_id = null, test_mode = true } = body;
    
    logStep('Request parameters', { calendar_id, test_mode, user_id: user.id });

    // Get user's calendars
    let calendarQuery = supabaseClient
      .from('calendars')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (calendar_id) {
      calendarQuery = calendarQuery.eq('id', calendar_id);
    }

    const { data: calendars, error: calendarsError } = await calendarQuery;

    if (calendarsError) {
      throw new Error(`Failed to fetch calendars: ${calendarsError.message}`);
    }

    if (!calendars || calendars.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No active calendars found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if user has active Stripe account
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
          error: 'Active Stripe account required. Please complete Stripe onboarding first.',
          action_required: 'stripe_onboarding'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if services have Stripe price IDs
    const { data: services, error: servicesError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (servicesError) {
      throw new Error(`Failed to fetch services: ${servicesError.message}`);
    }

    const priceIdField = test_mode ? 'stripe_test_price_id' : 'stripe_live_price_id';
    const servicesWithoutPrices = services?.filter(s => !s[priceIdField]) || [];

    let syncResults = null;
    if (servicesWithoutPrices.length > 0) {
      logStep(`Found ${servicesWithoutPrices.length} services without Stripe prices, syncing...`);
      
      // Auto-sync services with Stripe
      const { data: syncResponse } = await supabaseClient.functions.invoke('sync-service-stripe-prices', {
        body: { test_mode },
        headers: { Authorization: req.headers.get('Authorization')! }
      });

      syncResults = syncResponse;
      
      if (!syncResponse?.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to sync services with Stripe',
            details: syncResponse?.error
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Activate payment settings for each calendar
    const activationResults = [];

    for (const calendar of calendars) {
      try {
        logStep(`Activating Pay & Book for calendar: ${calendar.name}`, { calendar_id: calendar.id });

        // Check if payment settings already exist
        const { data: existingSettings } = await supabaseClient
          .from('payment_settings')
          .select('*')
          .eq('calendar_id', calendar.id)
          .maybeSingle();

        const paymentSettingsData = {
          calendar_id: calendar.id,
          secure_payments_enabled: true,
          payment_required_for_booking: true,
          auto_cancel_unpaid_bookings: true,
          payment_deadline_hours: 24,
          allow_partial_refunds: true,
          platform_fee_percentage: 2.50,
          enabled_payment_methods: ['ideal', 'cards_eea'],
          payout_option: 'standard'
        };

        if (existingSettings) {
          // Update existing settings
          const { error: updateError } = await supabaseClient
            .from('payment_settings')
            .update(paymentSettingsData)
            .eq('calendar_id', calendar.id);

          if (updateError) {
            throw new Error(`Failed to update payment settings: ${updateError.message}`);
          }
        } else {
          // Create new settings
          const { error: insertError } = await supabaseClient
            .from('payment_settings')
            .insert(paymentSettingsData);

          if (insertError) {
            throw new Error(`Failed to create payment settings: ${insertError.message}`);
          }
        }

        activationResults.push({
          calendar_id: calendar.id,
          calendar_name: calendar.name,
          status: 'activated'
        });

        logStep(`Pay & Book activated for calendar: ${calendar.name}`);

      } catch (error) {
        logStep(`Error activating Pay & Book for calendar ${calendar.name}`, { error: error.message });
        activationResults.push({
          calendar_id: calendar.id,
          calendar_name: calendar.name,
          status: 'error',
          error: error.message
        });
      }
    }

    const successCount = activationResults.filter(r => r.status === 'activated').length;
    const errorCount = activationResults.filter(r => r.status === 'error').length;

    logStep('Pay & Book activation completed', {
      total_calendars: calendars.length,
      success_count: successCount,
      error_count: errorCount
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Pay & Book activated for ${successCount} calendar(s)`,
        activated_count: successCount,
        error_count: errorCount,
        calendars: activationResults,
        stripe_sync: syncResults,
        stripe_account: {
          id: stripeAccount.stripe_account_id,
          status: stripeAccount.account_status,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    logStep('Pay & Book activation failed', { error: error.message });
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});