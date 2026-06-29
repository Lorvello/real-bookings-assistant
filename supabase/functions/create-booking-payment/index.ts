import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { calculateApplicationFee } from "../_shared/feeCalculator.ts";
import { validateStripeMode, getStripeSecretKey } from "../_shared/stripeValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BOOKING-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Default to {} on unparseable JSON so we return a clean 400 below instead
    // of the catch-all 500.
    const { booking_id, calendar_id, confirmation_token, test_mode = false, payment_method = 'card', payment_timing = 'pay_now' } = await req.json().catch(() => ({}));

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    logStep("Request parsed", { booking_id, calendar_id, test_mode, payment_method, payment_timing });

    // SECURITY: pin the Stripe mode to the server's STRIPE_MODE — never trust the
    // client's test_mode (mirrors the customer-portal R73 fix). A public booking
    // customer is anonymous, so the client param is ignored. We also return the mode
    // so the Elements UI can pick the matching publishable key (no test/live mismatch).
    const serverIsTest = validateStripeMode().mode === 'test';

    // Get booking details with complete service information including tax config
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select(`
        *,
        service_types (
          name, 
          price, 
          tax_enabled,
          tax_code,
          tax_behavior,
          applicable_tax_rate,
          business_country,
          stripe_test_price_id,
          stripe_live_price_id
        )
      `)
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorize the caller: they must present this booking's confirmation token
    // (handed out when the booking was created). Prevents strangers from creating
    // checkouts or flipping payment status for arbitrary booking ids.
    if (!confirmation_token || booking.confirmation_token !== confirmation_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing confirmation token" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Booking fetched", { bookingId: booking.id, serviceName: booking.service_types?.name });

    // SECURITY (confused-deputy / payment mis-routing): the booking, authorized by its
    // confirmation_token above, is the single source of truth for which calendar (and
    // therefore which Connect destination account, fee settings and amount) this payment
    // belongs to. NEVER trust the client-supplied calendar_id for routing: a caller
    // holding a valid token for booking A could otherwise pass calendar_id=B and route
    // A's destination charge to merchant B's account (or apply B's lower platform fee).
    // Pin everything downstream to the booking's own calendar_id. The sibling pay fns
    // (whatsapp-payment-handler, create-installment-payment) already bind to the
    // conversation's calendar; this matches that invariant.
    const effectiveCalendarId = booking.calendar_id;
    if (calendar_id && calendar_id !== effectiveCalendarId) {
      logStep("Ignoring mismatched client calendar_id; using booking's own calendar", {
        clientCalendarId: calendar_id,
        bookingCalendarId: effectiveCalendarId,
      });
    }

    // Get payment settings for this calendar
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from("payment_settings")
      .select("*")
      .eq("calendar_id", effectiveCalendarId)
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
    };
    logStep("Payment settings loaded", settings);

    // Handle pay on-site option when payment is optional
    if (settings.payment_optional && payment_timing === 'pay_on_site') {
      const { error: updateError } = await supabaseClient
        .from("bookings")
        .update({
          payment_timing: 'pay_on_site',
          payment_status: 'pay_on_site',
        })
        .eq("id", booking_id);

      if (updateError) {
        logStep("Error updating booking for pay on-site", { error: updateError.message });
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_timing: 'pay_on_site',
          message: 'Booking confirmed with pay on-site option',
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get the calendar owner for Stripe account lookup (booking's own calendar).
    const { data: calendarOwner } = await supabaseClient
      .from("calendars")
      .select("user_id")
      .eq("id", effectiveCalendarId)
      .single();

    if (!calendarOwner) {
      throw new Error("Calendar not found");
    }

    // Get account_owner_id from users table (may be null for solo users)
    const { data: ownerData } = await supabaseClient
      .from("users")
      .select("account_owner_id")
      .eq("id", calendarOwner.user_id)
      .single();

    const accountOwnerId = ownerData?.account_owner_id || calendarOwner.user_id;
    logStep("Account owner determined", { calendarUserId: calendarOwner.user_id, accountOwnerId });

    // Get Stripe account by account_owner_id
    const { data: stripeAccount } = await supabaseClient
      .from("business_stripe_accounts")
      .select("*")
      .eq("account_owner_id", accountOwnerId)
      .eq("environment", serverIsTest ? 'test' : 'live')
      .eq("charges_enabled", true)
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!stripeAccount) {
      throw new Error("Stripe account not connected or charges not enabled");
    }
    logStep("Stripe account found", { accountId: stripeAccount.stripe_account_id });

    // Initialize Stripe with the server-validated mode's secret key.
    const stripeKey = getStripeSecretKey(serverIsTest ? 'test' : 'live');

    if (!stripeKey) {
      throw new Error(`Stripe ${serverIsTest ? 'test' : 'live'} secret key not configured`);
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    // Calculate amount (use booking total_price or service price)
    const baseAmount = booking.total_price || booking.service_types?.price || 0;
    let amount = Math.round(baseAmount * 100);
    
    // Check if service has tax configuration and calculate tax if needed
    const service = booking.service_types;
    let taxAmount = 0;
    let automaticTaxEnabled = false;
    
    if (service?.tax_enabled && service?.tax_code && service?.applicable_tax_rate) {
      // Calculate tax based on service configuration
      if (service.tax_behavior === 'inclusive') {
        // Tax is already included in the price, calculate the tax portion
        const taxRate = service.applicable_tax_rate / 100;
        taxAmount = Math.round((baseAmount * taxRate / (1 + taxRate)) * 100);
      } else {
        // Tax is exclusive, add it to the base amount
        const taxRate = service.applicable_tax_rate / 100;
        taxAmount = Math.round((baseAmount * taxRate) * 100);
        amount = Math.round(baseAmount * 100) + taxAmount;
      }
      
      automaticTaxEnabled = true;
      logStep("Tax calculation", { 
        base: baseAmount, 
        taxRate: service.applicable_tax_rate, 
        taxAmount: taxAmount / 100, 
        total: amount / 100 
      });
    }

    // Calculate application fee using shared calculator
    const feeCalculation = calculateApplicationFee({
      amountCents: amount,
      paymentMethod: payment_method,
      payoutOption: settings.payout_option,
      platformFeePercentage: settings.platform_fee_percentage / 100, // Convert from percentage to decimal
    });

    logStep("Fee calculation", {
      amount: amount / 100,
      applicationFee: feeCalculation.applicationFeeCents / 100,
      platformFee: feeCalculation.platformFeeCents / 100,
      payoutFee: feeCalculation.payoutFeeCents / 100,
      paymentMethodFee: feeCalculation.paymentMethodFeeCents / 100,
    });

    // Get user's subscription tier for enhanced tax compliance features
    const { data: calendarData } = await supabaseClient
      .from("calendars")
      .select("user_id")
      .eq("id", effectiveCalendarId)
      .single();

    const { data: userData } = await supabaseClient
      .from("users")
      .select("subscription_tier")
      .eq("id", calendarData?.user_id)
      .single();

    // Enhanced automatic tax for higher tiers with Stripe Tax API
    const useStripeTaxAPI = userData?.subscription_tier === 'professional' || 
                           userData?.subscription_tier === 'enterprise';

    // Create payment intent with destination charge and application fee
    const paymentIntentData: any = {
      amount,
      currency: booking.payment_currency || (service?.business_country === 'GB' ? 'gbp' : 'eur'),
      application_fee_amount: feeCalculation.applicationFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking.id,
        calendar_id: effectiveCalendarId,
        customer_email: booking.customer_email || '',
        customer_name: booking.customer_name,
        service_name: service?.name || 'Appointment Service',
        subscription_tier: userData?.subscription_tier || 'starter',
        business_country: service?.business_country || 'NL',
        tax_enabled: service?.tax_enabled?.toString() || 'false',
        base_amount: baseAmount.toString(),
        tax_amount: (taxAmount / 100).toString(),
        platform_fee_percentage: settings.platform_fee_percentage.toString(),
        payout_option: settings.payout_option,
        payment_method: payment_method,
        payment_timing: payment_timing,
        application_fee_breakdown: JSON.stringify(feeCalculation.breakdown),
      },
    };

    // Use Stripe Tax API for professional/enterprise tiers, or manual calculation for others
    if (useStripeTaxAPI && service?.tax_enabled) {
      paymentIntentData.automatic_tax = { enabled: true };
      logStep("Using Stripe Tax API for automatic tax calculation");
    } else if (automaticTaxEnabled) {
      // Manual tax calculation is already included in the amount
      paymentIntentData.metadata.manual_tax_calculated = 'true';
      paymentIntentData.metadata.tax_rate = service?.applicable_tax_rate?.toString() || '0';
      paymentIntentData.metadata.tax_behavior = service?.tax_behavior || 'exclusive';
      logStep("Using manual tax calculation based on service configuration");
    }

    // Idempotency key: a double-click (two requests for the same booking + amount)
    // returns the SAME PaymentIntent instead of minting a duplicate. A genuine
    // amount change yields a new key -> new PI.
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentData, {
      idempotencyKey: `booking-pi-${booking.id}-${amount}`,
    });
    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      amount: paymentIntent.amount,
      applicationFee: feeCalculation.applicationFeeCents 
    });

    // Record payment attempt
    const { error: paymentError } = await supabaseClient
      .from("booking_payments")
      .insert({
        booking_id: booking.id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_account_id: stripeAccount.stripe_account_id,
        amount_cents: amount,
        platform_fee_cents: feeCalculation.applicationFeeCents,
        currency: paymentIntent.currency,
        status: "pending",
        customer_email: booking.customer_email,
        customer_name: booking.customer_name,
        payment_method_type: payment_method,
      });

    if (paymentError) {
      logStep("Error recording payment", { error: paymentError.message });
    }

    // Update booking payment status and timing
    await supabaseClient
      .from("bookings")
      .update({
        payment_status: "pending",
        payment_required: true,
        payment_timing: payment_timing,
      })
      .eq("id", booking.id);

    return new Response(
      JSON.stringify({
        success: true,
        mode: serverIsTest ? 'test' : 'live',
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        application_fee: feeCalculation.applicationFeeCents,
        fee_breakdown: feeCalculation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("ERROR", { message: (error as Error)?.message });
    return new Response(
      JSON.stringify({ error: (error as Error)?.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
