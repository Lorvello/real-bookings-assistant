import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { calculateApplicationFee } from '../_shared/feeCalculator.ts'
import { validateStripeMode } from '../_shared/stripeValidation.ts'

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

    // Server-side endpoint (called by the WhatsApp booking agent), not a logged-in user.
    // Require a shared secret so the public anon key cannot mint Stripe payment links
    // for any conversation id.
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    if (!expectedSecret || req.headers.get("x-internal-secret") !== expectedSecret) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      paymentMethod = 'ideal',
      paymentTiming = 'pay_now',
      bookingId = null
    } = await req.json();

    // SECURITY: pin the Stripe mode to the server's STRIPE_MODE — never trust a body flag
    // (mirrors create-booking-payment). A caller can't force live keys/charges.
    const testMode = validateStripeMode().mode === 'test';

    logStep("Request parsed", { conversationId, serviceTypeId, paymentType, installmentPlan, testMode, paymentMethod, paymentTiming, bookingId });

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

    // Defense-in-depth: if a bookingId is supplied (pay-and-book), it MUST belong to
    // this conversation's calendar. Prevents a confused-deputy where a mismatched id
    // would later be confirmed-as-paid by the stripe-webhook for the wrong calendar.
    if (bookingId) {
      const { data: bk } = await supabaseClient
        .from('bookings')
        .select('calendar_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!bk || bk.calendar_id !== conversation.calendar_id) {
        throw new Error('bookingId does not belong to this conversation');
      }
    }

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

    // Tax (mirror create-booking-payment so the WhatsApp payment matches the web
    // payment; previously the WhatsApp path charged the untaxed price, an
    // inconsistent amount for the same service). Exclusive tax is added on top;
    // inclusive tax is already in the price so the amount is unchanged.
    // F-TAX-23: also TRACK the VAT in cents and stamp it onto the PaymentIntent
    // metadata (tax_amount, as a EUR string) below, exactly like create-booking-payment.
    // The tax filing reports read the tax from PI metadata.tax_amount via
    // resolvePaymentTaxCents; without it a paid WhatsApp VAT charge reported 0% VAT.
    let taxAmountCents = 0;
    const taxEnabled = !!(serviceType.tax_enabled && serviceType.tax_code && serviceType.applicable_tax_rate);
    if (taxEnabled) {
      const taxRate = serviceType.applicable_tax_rate / 100;
      if (serviceType.tax_behavior === 'inclusive') {
        // Tax is already inside the price; report only the tax portion of the gross.
        taxAmountCents = Math.round((serviceType.price * taxRate / (1 + taxRate)) * 100);
      } else {
        // Tax is exclusive: add it on top and report the added VAT.
        taxAmountCents = Math.round(serviceType.price * taxRate * 100);
        amountCents = Math.round(serviceType.price * 100) + taxAmountCents;
      }
      logStep("Tax applied", { taxRate: serviceType.applicable_tax_rate, behavior: serviceType.tax_behavior, amountCents, taxAmountCents });
    }

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
          // Pay-and-book (WhatsApp agent): carry the booking id so stripe-webhook's
          // handleBookingPaymentSucceeded / handleCheckoutCompleted confirm exactly
          // this booking on payment. Omitted for the legacy conversation-only flow.
          ...(bookingId ? { booking_id: bookingId } : {}),
          // F-TAX-23: stamp the VAT onto the PI metadata exactly like
          // create-booking-payment, so the tax filing reports (which read
          // metadata.tax_amount via resolvePaymentTaxCents) see this WhatsApp charge's
          // VAT instead of 0%. Only on a full taxed payment; an installment charges a
          // partial amount whose per-payment VAT split is out of this fix's scope.
          ...(taxEnabled && paymentType !== 'installment'
            ? {
                tax_amount: (taxAmountCents / 100).toString(),
                tax_rate: serviceType.applicable_tax_rate?.toString() || '0',
                tax_behavior: serviceType.tax_behavior || 'exclusive',
                manual_tax_calculated: 'true',
              }
            : {}),
        },
      },
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: paymentType,
        test_mode: testMode.toString(),
        ...(bookingId ? { booking_id: bookingId } : {}),
      },
    });

    logStep("Checkout session created", { 
      sessionId: session.id, 
      applicationFee: feeCalculation.applicationFeeCents 
    });

    // Store payment session in Supabase.
    // NOTE: whatsapp_payment_sessions only has these columns (migration
    // 20250828223936, re-verified via Mgmt-API): conversation_id, service_type_id,
    // calendar_id, amount_cents, currency, payment_type, installment_plan (jsonb),
    // stripe_payment_intent_id, stripe_session_id, payment_status, payment_url,
    // expires_at. The previous insert referenced installment_plan_id / status /
    // test_mode (none of which exist), so an installment WhatsApp booking threw 42703
    // here (500 plus an orphaned Stripe session plus an orphaned pending booking),
    // the exact same failure mode as the create-installment-payment F-V07 bug. The
    // installment plan is now stored on the installment_plan jsonb column; status maps
    // to payment_status; test_mode is carried on the Stripe session metadata, not this table.
    const { data: paymentSession, error: sessionError } = await supabaseClient
      .from('whatsapp_payment_sessions')
      .insert({
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        calendar_id: conversation.calendar_id,
        stripe_session_id: session.id,
        payment_url: session.url || '',
        amount_cents: amountCents,
        currency: 'eur',
        payment_type: paymentType,
        installment_plan: installmentPlan ?? null,
        payment_status: 'pending',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
