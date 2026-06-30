import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { calculateApplicationFee } from "../_shared/feeCalculator.ts";
import { validateStripeMode, getStripeSecretKey } from "../_shared/stripeValidation.ts";
import {
  calculateTax,
  type TaxBreakdownEntry,
  CROSS_BORDER_UNAVAILABLE_STATUS,
  CROSS_BORDER_UNAVAILABLE_MESSAGE,
  DOMESTIC_RATE_UNAVAILABLE_STATUS,
  DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
  VAT_ID_UNVERIFIED_STATUS,
  VAT_ID_UNVERIFIED_MESSAGE,
} from "../_shared/taxCalc.ts";

// VIES-trust policy flag (X4). Default OFF = Stripe format-only reverse-charge (today's
// behavior). Flip to ON (TAX_REQUIRE_VIES=true as a Supabase edge secret) to additionally
// require a real VIES confirmation before honoring a reverse-charge. One-liner to enforce.
function requireViesPolicy(): boolean {
  const v = (Deno.env.get("TAX_REQUIRE_VIES") || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

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
    const {
      booking_id,
      calendar_id,
      confirmation_token,
      test_mode = false,
      payment_method = 'card',
      payment_timing = 'pay_now',
      // Cross-border (X2): the customer billing country (ISO-3166 alpha-2) + optional
      // EU B2B VAT id. For remote_service/digital services these drive the Stripe Tax
      // Calculation API. The web FORM wiring lands in X3; for X2 we thread whatever the
      // caller passes (a booking row value or an explicit field), and persist it server
      // side. These influence ONLY the tax computation (a Stripe-bounded figure), never
      // the destination account or platform fee, which stay pinned to the booking below.
      customer_country: bodyCustomerCountry,
      customer_vat_id: bodyCustomerVatId,
    } = await req.json().catch(() => ({}));

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
          supply_type,
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

    // ---------------------------------------------------------------------------
    // CROSS-BORDER / OSS branch (X2). The manual block above is the DOMESTIC NL path
    // and is correct for in_person services (place-of-supply = where performed) and as
    // the not_collecting domestic fallback. For remote_service/digital services the
    // VAT must be computed by Stripe Tax against the customer's country (cross-border /
    // reverse-charge / OSS), NEVER hardcoded. We pre-compute with the Calculation API
    // and branch on Stripe's collection state. The charge model is UNCHANGED (still a
    // destination charge below); we only adjust `amount`/`taxAmount` and stamp the calc
    // id + breakdown for persistence and the post-success filing transaction.
    //
    // Persistence vars (written onto booking_payments + PI metadata further down):
    let taxCalculationId: string | null = null;        // -> metadata[tax_calculation]
    let taxBreakdownToPersist: TaxBreakdownEntry[] | null = null;
    let reverseChargeApplied = false;
    let crossBorderGuardTripped = false;                // not_collecting + cross-border
    let domesticGuardTripped = false;                   // (X4 CB-F-03) domestic, no usable rate
    let vatIdRejected = false;                          // (X4) supplied VAT id was format-invalid
    let persistedCustomerCountry: string | null = null;
    let taxTransactionPending = false;                  // case (a) collecting -> create_from_calculation on success

    const supplyType = service?.supply_type ?? 'in_person';
    const isRemoteSupply = supplyType === 'remote_service' || supplyType === 'digital';
    // Customer country: explicit body field (X3 form wiring) else the booking row (X1 col).
    const customerCountry: string | null =
      (typeof bodyCustomerCountry === 'string' && bodyCustomerCountry.trim().length === 2
        ? bodyCustomerCountry.trim().toUpperCase()
        : null) ?? (typeof booking.customer_country === 'string' && booking.customer_country.length === 2
        ? booking.customer_country.toUpperCase()
        : null);
    const customerVatId: string | null =
      (typeof bodyCustomerVatId === 'string' && bodyCustomerVatId.trim().length > 0
        ? bodyCustomerVatId.trim()
        : null) ?? (typeof booking.customer_vat_id === 'string' && booking.customer_vat_id.length > 0
        ? booking.customer_vat_id
        : null);
    // The merchant's home country (where Stripe Tax is registered); business_country is
    // the existing source of truth on the service, defaulting NL.
    const merchantCountry = (service?.business_country || 'NL').toUpperCase();

    if (isRemoteSupply && service?.tax_enabled && service?.tax_code) {
      if (!customerCountry) {
        // A remote/digital taxable service needs the customer country to compute VAT.
        // Fail loud rather than silently apply the wrong (domestic) rate.
        return new Response(
          JSON.stringify({
            success: false,
            error: 'customer_country is required for a remote/digital service (cross-border VAT cannot be computed without it)',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      persistedCustomerCountry = customerCountry;
      // Stripe Tax has not been activated on the connected account yet (registration
      // human-gate); compute in the platform context (Tax active there) so we still get
      // a real not_collecting / reverse_charge result. When the merchant completes OSS +
      // activates Tax on the connected account, flip connectedTaxActive true (no other
      // change) and the same call computes against their registrations.
      const taxBehavior: 'inclusive' | 'exclusive' = service.tax_behavior === 'inclusive' ? 'inclusive' : 'exclusive';
      const lineAmountCents = Math.round(baseAmount * 100);

      try {
        const calc = await calculateTax({
          stripeSecretKey: stripeKey,
          connectedAccountId: stripeAccount.stripe_account_id,
          connectedTaxActive: false,
          currency: (booking.payment_currency || (merchantCountry === 'GB' ? 'gbp' : 'eur')).toLowerCase(),
          lineAmountCents,
          taxCode: service.tax_code,
          taxBehavior,
          customerCountry,
          customerVatId: customerVatId ?? undefined,
          // VIES-trust policy (X4). OFF by default -> Stripe format-only reverse-charge.
          // ON -> a format-valid-but-VIES-unconfirmed number is downgraded to
          // vat_id_unverified (handled below), never a silent 0% reverse-charge.
          requireViesValidation: requireViesPolicy(),
        });

        taxBreakdownToPersist = calc.breakdown;
        taxCalculationId = calc.calculationId;
        vatIdRejected = calc.vatIdRejected === true;
        logStep("Cross-border tax calc", {
          supplyType, customerCountry, state: calc.collectionState,
          taxCents: calc.taxAmountCents, context: calc.context, calc: calc.calculationId,
          vatIdRejected,
        });
        if (vatIdRejected) {
          // NO-ABUSE: the supplied VAT id was format-invalid; Stripe rejected it and the
          // calc was retried as B2C (no reverse-charge). Surface it; never silently honor.
          logStep("VAT-ID REJECTED (format-invalid) -> treated as B2C, no reverse-charge", {
            customerCountry,
          });
        }

        if (calc.collectionState === 'collecting') {
          // (a) Positive collectible rate -> use Stripe's figure. Attach the calc id and
          // record a filing transaction after payment success.
          taxAmount = calc.taxAmountCents;
          amount = taxBehavior === 'inclusive' ? lineAmountCents : calc.amountTotalCents;
          taxTransactionPending = true;
        } else if (calc.collectionState === 'reverse_charge') {
          // (b) Valid EU B2B reverse-charge -> 0%, marked. No tax added. (Under the
          // require-VIES policy this state means VIES CONFIRMED the id; an unconfirmed id
          // would have been downgraded to vat_id_unverified, handled below.)
          taxAmount = 0;
          amount = lineAmountCents;
          reverseChargeApplied = true;
        } else if (calc.collectionState === 'vat_id_unverified') {
          // (b') (X4 VIES) The require-VIES policy is ON and the eu_vat was format-valid
          // but could NOT be confirmed via VIES. Do NOT silently apply a 0% reverse-charge.
          // We fail the charge loudly so the booking is not completed on an unconfirmed id;
          // the owner (or customer) must supply a verifiable VAT id or proceed without one.
          // (When the policy is OFF, default, this state never occurs.)
          logStep("VAT-ID UNVERIFIED GUARD (require-VIES on)", {
            customerCountry, message: VAT_ID_UNVERIFIED_MESSAGE,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: VAT_ID_UNVERIFIED_MESSAGE,
              code: VAT_ID_UNVERIFIED_STATUS,
            }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } else if (merchantCountry === customerCountry) {
          // (c) not_collecting AND destination == merchant country (NL): fall back to the
          // manual domestic path. The manual block above sets amount/taxAmount ONLY when
          // applicable_tax_rate is a positive number (automaticTaxEnabled === true).
          //
          // CB-F-03 FIX: a remote DOMESTIC taxable service with tax_enabled + tax_code but
          // a NULL/0 applicable_tax_rate would otherwise fall through here with amount =
          // bare base and taxAmount = 0 -> a SILENT 0% domestic VAT charge. Guard against
          // that: only treat case (c) as a clean manual fallback when the manual block
          // actually applied a positive rate; otherwise fire a DOMESTIC hard guard (no
          // hardcoded rate, no fake 0%).
          if (automaticTaxEnabled && taxAmount > 0) {
            logStep("Cross-border not_collecting domestic -> manual NL fallback", {
              customerCountry, taxAmount: taxAmount / 100,
            });
          } else {
            domesticGuardTripped = true;
            taxAmount = 0;
            amount = lineAmountCents;
            taxBreakdownToPersist = [
              {
                amountCents: 0,
                inclusive: false,
                taxabilityReason: DOMESTIC_RATE_UNAVAILABLE_STATUS,
                country: customerCountry,
                percentageDecimal: null,
                taxType: null,
              },
              ...calc.breakdown,
            ];
            logStep("DOMESTIC RATE GUARD (CB-F-03: no usable domestic rate, never silent 0%)", {
              customerCountry, merchantCountry,
              applicableTaxRate: service?.applicable_tax_rate ?? null,
              message: DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
            });
          }
        } else {
          // (d) not_collecting AND cross-border: the HARD GUARD. Never a silent clean 0%.
          // The charge proceeds as a destination charge, but the tax outcome is flagged
          // so X6/reports surface "register for OSS" instead of a fake 0% VAT line.
          crossBorderGuardTripped = true;
          taxAmount = 0;
          amount = lineAmountCents;
          taxBreakdownToPersist = [
            {
              amountCents: 0,
              inclusive: false,
              taxabilityReason: CROSS_BORDER_UNAVAILABLE_STATUS,
              country: customerCountry,
              percentageDecimal: null,
              taxType: null,
            },
            ...calc.breakdown,
          ];
          logStep("CROSS-BORDER GUARD", {
            customerCountry, merchantCountry, message: CROSS_BORDER_UNAVAILABLE_MESSAGE,
          });
        }
      } catch (taxErr) {
        // A Stripe Tax API failure on a remote service must not silently produce a wrong
        // (domestic) VAT. Fail the charge loudly so the issue is visible.
        logStep("Cross-border tax calc FAILED", { error: (taxErr as Error)?.message });
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cross-border tax calculation failed: ${(taxErr as Error)?.message}`,
          }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
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
        // Cross-border (X2): supply type + the persisted customer country, and (case (a))
        // the Stripe Tax calculation id so the webhook can record a filing transaction
        // (transactions/create_from_calculation) on payment success. The reverse-charge /
        // cross-border-guard markers let the reports surface the right line later.
        supply_type: supplyType,
        ...(persistedCustomerCountry ? { customer_country: persistedCustomerCountry } : {}),
        ...(taxCalculationId ? { tax_calculation: taxCalculationId } : {}),
        ...(taxTransactionPending ? { tax_transaction_pending: 'true' } : {}),
        ...(reverseChargeApplied ? { reverse_charge: 'true' } : {}),
        ...(crossBorderGuardTripped ? { cross_border_status: CROSS_BORDER_UNAVAILABLE_STATUS } : {}),
        ...(domesticGuardTripped ? { domestic_status: DOMESTIC_RATE_UNAVAILABLE_STATUS } : {}),
        ...(vatIdRejected ? { vat_id_rejected: 'true' } : {}),
      },
    };

    // F-TAX-20: this is a DESTINATION charge (transfer_data + application_fee_amount).
    // Stripe REJECTS automatic_tax on a destination-charge PaymentIntent ("Received
    // unknown parameter: automatic_tax") -> a 500 and the PI is never created, so the
    // customer cannot pay. Since F-TAX-13 makes trial users professional, the
    // automatic_tax branch was the DEFAULT path for any tax-enabled service and broke
    // the real charge for pro/enterprise merchants. The manual-tax calculation above
    // already produced the correct total (tax is in `amount` and in
    // metadata.tax_amount), and the tax reports read metadata.tax_amount, so we ALWAYS
    // use the manual-tax metadata here and never set automatic_tax on a destination
    // charge. (useStripeTaxAPI is retained for the metadata.subscription_tier signal
    // only; Stripe Tax automatic calculation is not compatible with this charge model.)
    if (automaticTaxEnabled) {
      // Manual tax calculation is already included in `amount`; record the breakdown
      // so the tax reports (which read metadata.tax_amount) see the correct VAT.
      paymentIntentData.metadata.manual_tax_calculated = 'true';
      paymentIntentData.metadata.tax_rate = service?.applicable_tax_rate?.toString() || '0';
      paymentIntentData.metadata.tax_behavior = service?.tax_behavior || 'exclusive';
      logStep("Using manual tax calculation based on service configuration", {
        useStripeTaxAPI,
        note: "automatic_tax is not set on a destination charge (Stripe rejects it)",
      });
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

    // Record payment attempt. Cross-border (X2): persist the customer country, the
    // Stripe per-jurisdiction tax_breakdown, and the reverse_charge flag AT CHARGE TIME
    // (the X1 columns) so the filing reports (X6) can show per-country VAT / reverse-
    // charge 0% lines / the OSS-eligible bucket; the reports cannot recompute these
    // historically. in_person bookings leave these null/false (no regression).
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
        customer_country: persistedCustomerCountry,
        tax_breakdown: taxBreakdownToPersist,
        reverse_charge: reverseChargeApplied,
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
