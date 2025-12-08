import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { calculateApplicationFee } from '../_shared/feeCalculator.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WHATSAPP-PAYMENT-HANDLER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep("Function started");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      conversationId, 
      serviceTypeId, 
      paymentType = 'full', 
      installmentPlan, 
      testMode = false,
      paymentMethod = 'ideal',
      paymentTiming = 'pay_now'
    } = await req.json();
    
    logStep("Request parsed", { conversationId, serviceTypeId, paymentType, installmentPlan, testMode, paymentMethod, paymentTiming });

    // Get conversation and calendar details
    const { data: conversation, error: convError } = await supabaseClient
      .from('whatsapp_conversations')
      .select('calendar_id')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      throw new Error('Conversation not found')
    }
    logStep("Conversation found", { calendarId: conversation.calendar_id });

    // Get payment settings for this calendar
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from("payment_settings")
      .select("*")
      .eq("calendar_id", conversation.calendar_id)
      .single();

    if (settingsError) {
      logStep("No payment settings found, using defaults", { error: settingsError.message });
    }

    // Get effective settings (with defaults)
    const settings = {
      platform_fee_percentage: paymentSettings?.platform_fee_percentage ?? 1.9,
      payout_option: (paymentSettings?.payout_option as 'standard' | 'instant') ?? 'standard',
      payment_required_for_booking: paymentSettings?.payment_required_for_booking ?? false,
      payment_optional: paymentSettings?.payment_optional ?? false,
      secure_payments_enabled: paymentSettings?.secure_payments_enabled ?? false,
      enabled_payment_methods: paymentSettings?.enabled_payment_methods ?? ['ideal', 'card'],
      allowed_payment_timing: paymentSettings?.allowed_payment_timing ?? ['pay_now'],
    };
    logStep("Payment settings loaded", settings);

    // Validate payment timing is allowed
    const allowedTimings = Array.isArray(settings.allowed_payment_timing) 
      ? settings.allowed_payment_timing 
      : ['pay_now'];
    
    if (!allowedTimings.includes(paymentTiming)) {
      throw new Error(`Payment timing '${paymentTiming}' is not allowed for this business`);
    }

    // If payment is optional and customer chose pay on-site, return early
    if (settings.payment_optional && paymentTiming === 'pay_on_site') {
      logStep("Customer chose pay on-site", { paymentTiming });
      
      return new Response(
        JSON.stringify({
          success: true,
          payment_deferred: true,
          payment_timing: 'pay_on_site',
          message: 'Payment will be collected on-site',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Get service type details
    const { data: serviceType, error: serviceError } = await supabaseClient
      .from('service_types')
      .select('*')
      .eq('id', serviceTypeId)
      .eq('calendar_id', conversation.calendar_id)
      .single()

    if (serviceError || !serviceType) {
      throw new Error('Service type not found')
    }
    logStep("Service type found", { serviceName: serviceType.name, price: serviceType.price });

    // Get the calendar owner for Stripe account lookup
    const { data: calendar } = await supabaseClient
      .from("calendars")
      .select("user_id")
      .eq("id", conversation.calendar_id)
      .single();

    if (!calendar) {
      throw new Error("Calendar not found");
    }

    // Get account_owner_id from users table (may be null for solo users)
    const { data: ownerData } = await supabaseClient
      .from("users")
      .select("account_owner_id")
      .eq("id", calendar.user_id)
      .single();

    const accountOwnerId = ownerData?.account_owner_id || calendar.user_id;
    logStep("Account owner determined", { calendarUserId: calendar.user_id, accountOwnerId });

    // Get Stripe account by account_owner_id
    const { data: stripeAccount } = await supabaseClient
      .from("business_stripe_accounts")
      .select("*")
      .eq("account_owner_id", accountOwnerId)
      .eq("environment", testMode ? 'test' : 'live')
      .eq("charges_enabled", true)
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!stripeAccount) {
      throw new Error("Stripe account not connected or charges not enabled");
    }
    logStep("Stripe account found", { accountId: stripeAccount.stripe_account_id });

    // Initialize Stripe with appropriate key based on mode
    const stripeKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeKey) {
      throw new Error(`Stripe ${testMode ? 'test' : 'live'} secret key not configured`);
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Calculate payment amount based on type
    let amountCents = Math.round(serviceType.price * 100);
    if (paymentType === 'installment' && installmentPlan) {
      const plan = serviceType.installment_plans?.find((p: any) => p.id === installmentPlan.id)
      if (plan) {
        amountCents = Math.round(plan.amount_per_payment * 100);
      }
    }
    logStep("Amount calculated", { amountCents, paymentType });

    // Calculate application fee using shared calculator
    const feeCalculation = calculateApplicationFee({
      amountCents,
      paymentMethod,
      payoutOption: settings.payout_option,
      platformFeePercentage: settings.platform_fee_percentage / 100,
    });

    logStep("Fee calculation", {
      amount: amountCents / 100,
      applicationFee: feeCalculation.applicationFeeCents / 100,
      platformFee: feeCalculation.platformFeeCents / 100,
      payoutFee: feeCalculation.payoutFeeCents / 100,
    });

    // Determine allowed payment methods for checkout
    const allowedMethods = Array.isArray(settings.enabled_payment_methods) 
      ? settings.enabled_payment_methods 
      : ['ideal', 'card'];

    // Map to Stripe payment method types
    const stripePaymentMethods = allowedMethods.map((method: string) => {
      const mapping: Record<string, string> = {
        'ideal': 'ideal',
        'card': 'card',
        'bancontact': 'bancontact',
        'sepa_debit': 'sepa_debit',
        'eps': 'eps',
        'giropay': 'giropay',
        'klarna': 'klarna',
      };
      return mapping[method] || 'card';
    }).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i); // Remove duplicates

    // Get origin for redirect URLs
    const origin = req.headers.get('origin') || 'https://bookingsassistant.com';

    // Create Stripe Checkout session with destination charge and application fee
    const session = await stripe.checkout.sessions.create({
      payment_method_types: stripePaymentMethods as any,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: serviceType.name,
              description: serviceType.description || `Booking for ${serviceType.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-cancelled`,
      payment_intent_data: {
        application_fee_amount: feeCalculation.applicationFeeCents,
        transfer_data: {
          destination: stripeAccount.stripe_account_id,
        },
        metadata: {
          conversation_id: conversationId,
          service_type_id: serviceTypeId,
          payment_type: paymentType,
          payment_timing: paymentTiming,
          platform_fee_percentage: settings.platform_fee_percentage.toString(),
          payout_option: settings.payout_option,
          test_mode: testMode.toString(),
        },
      },
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: paymentType,
        test_mode: testMode.toString(),
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      applicationFee: feeCalculation.applicationFeeCents 
    });

    // Store payment session in Supabase
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert({
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        stripe_session_id: session.id,
        payment_url: session.url,
        amount_cents: amountCents,
        payment_type: paymentType,
        installment_plan_id: installmentPlan?.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        test_mode: testMode
      })
      .select()
      .single()

    if (sessionError) {
      logStep("Error storing payment session", { error: sessionError.message });
      throw new Error('Failed to store payment session')
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: session.url,
        session_id: session.id,
        payment_session_id: paymentSession.id,
        test_mode: testMode,
        application_fee: feeCalculation.applicationFeeCents,
        fee_breakdown: feeCalculation,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
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
