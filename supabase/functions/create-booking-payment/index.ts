import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  calculateApplicationFee,
  PLATFORM_FEE_PERCENTAGE,
  PLATFORM_FEE_RATE,
} from "../_shared/feeCalculator.ts";
import { bookingPaymentLedgerMatches } from "../_shared/bookingPaymentLedger.ts";
import { isReusablePendingPaymentInitialization } from "../_shared/paymentInitializationReplay.ts";
import {
  getStripeSecretKey,
  validateStripeMode,
} from "../_shared/stripeValidation.ts";
import { evaluatePaymentLaunchGate } from "../_shared/paymentLaunchGate.ts";
import { evaluateBookingPaymentPolicy } from "../_shared/bookingPaymentPolicy.ts";
import {
  parsePublicBookingPolicySnapshot,
  parsePublicBookingPriceSnapshot,
} from "../_shared/publicBookingSnapshot.ts";
import {
  calculateTax,
  CROSS_BORDER_UNAVAILABLE_MESSAGE,
  CROSS_BORDER_UNAVAILABLE_STATUS,
  DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
  DOMESTIC_RATE_UNAVAILABLE_STATUS,
  type TaxBreakdownEntry,
  VAT_ID_UNVERIFIED_MESSAGE,
  VAT_ID_UNVERIFIED_STATUS,
} from "../_shared/taxCalc.ts";
import {
  BookingPaymentProviderError,
  bookingPaymentProviderMetadata,
  fingerprintBookingPaymentProvider,
  parseBookingPaymentProviderClaim,
  parseBookingPaymentProviderMetadata,
  throwForBookingPaymentProviderClaim,
} from "../_shared/bookingPaymentProviderReservation.ts";

// VIES-trust policy flag (X4). Default OFF = Stripe format-only reverse-charge (today's
// behavior). Flip to ON (TAX_REQUIRE_VIES=true as a Supabase edge secret) to additionally
// require a real VIES confirmation before honoring a reverse-charge. One-liner to enforce.
function requireViesPolicy(): boolean {
  const v = (Deno.env.get("TAX_REQUIRE_VIES") || "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
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
      { auth: { persistSession: false } },
    );

    // Default to {} on unparseable JSON so we return a clean 400 below instead
    // of the catch-all 500.
    const {
      booking_id,
      calendar_id,
      confirmation_token,
      test_mode = false,
      payment_method,
      payment_timing = "pay_now",
    } = await req.json().catch(() => ({}));

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: "booking_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    logStep("Request parsed", {
      booking_id,
      calendar_id,
      test_mode,
      payment_method,
      payment_timing,
    });

    // SECURITY: pin the Stripe mode to the server's STRIPE_MODE — never trust the
    // client's test_mode (mirrors the customer-portal R73 fix). A public booking
    // customer is anonymous, so the client param is ignored. We also return the mode
    // so the Elements UI can pick the matching publishable key (no test/live mismatch).
    const serverIsTest = validateStripeMode().mode === "test";

    // The booking row contains every immutable amount/policy/tax input. Do not join
    // service_types here: mutable service settings must never change an existing charge.
    const { data: booking, error: bookingError } = await supabaseClient
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Authorize the caller: they must present this booking's confirmation token
    // (handed out when the booking was created). Prevents strangers from creating
    // checkouts or flipping payment status for arbitrary booking ids.
    if (
      !confirmation_token || booking.confirmation_token !== confirmation_token
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid or missing confirmation token",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    logStep("Booking fetched", {
      bookingId: booking.id,
      serviceName: booking.service_name,
    });

    if (["cancelled", "completed", "no-show"].includes(booking.status)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This booking can no longer be paid.",
          code: "BOOKING_NOT_PAYABLE",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (
      [
        "paid",
        "refunded",
        "partial",
        "partially_refunded",
        "refund_required",
      ].includes(booking.payment_status)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "This booking already has a completed or partial payment.",
          code: "BOOKING_PAYMENT_ALREADY_RECORDED",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
      logStep(
        "Ignoring mismatched client calendar_id; using booking's own calendar",
        {
          clientCalendarId: calendar_id,
          bookingCalendarId: effectiveCalendarId,
        },
      );
    }

    // The booking-time policy is immutable. Re-reading mutable payment_settings here
    // could silently change whether/how this already-created booking may be paid.
    const policySnapshot = parsePublicBookingPolicySnapshot(
      booking.public_booking_policy_snapshot,
      booking.payment_required,
    );
    if (!policySnapshot.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: policySnapshot.reason,
          code: policySnapshot.code,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const policy = policySnapshot.value;
    const tax = policy.tax;
    const paymentCurrency = typeof booking.payment_currency === "string"
      ? booking.payment_currency.trim().toLowerCase()
      : "";
    if (!/^[a-z]{3}$/.test(paymentCurrency)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "The booking-time currency snapshot is missing or invalid.",
          code: "PUBLIC_BOOKING_CURRENCY_SNAPSHOT_INVALID",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const paymentPolicy = evaluateBookingPaymentPolicy({
      securePaymentsEnabled: policy.securePaymentsEnabled,
      paymentOptional: policy.paymentOptional,
      allowedPaymentTiming: policy.allowedPaymentTiming,
      enabledPaymentMethods: policy.enabledPaymentMethods,
      requestedTiming: payment_timing,
      requestedMethod: payment_method,
      currency: paymentCurrency,
    });
    if (!paymentPolicy.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: paymentPolicy.reason,
          code: paymentPolicy.code,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // A deferred on-site choice does not create or touch a Stripe object and is
    // therefore intentionally outside the Stripe launch gate.
    if (paymentPolicy.action === "DEFER_PAYMENT") {
      const desiredDeferredState = {
        payment_status: "pay_on_site",
        payment_timing: "pay_on_site",
        payment_required: false,
      } as const;
      const { data: deferResult, error: deferError } = await supabaseClient.rpc(
        "defer_public_booking_payment_on_site",
        {
          p_booking_id: booking.id,
          p_expected_booking_status: booking.status,
          p_expected_payment_status: booking.payment_status ?? null,
        },
      );

      if (deferError) {
        logStep("Atomic pay-on-site decision failed", {
          error: deferError.message,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Could not verify the pay-on-site choice.",
            code: "PAY_ON_SITE_STATE_UNCERTAIN",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (
        !deferResult || typeof deferResult !== "object" ||
        typeof deferResult.success !== "boolean"
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "The pay-on-site decision returned an invalid result.",
            code: "PAY_ON_SITE_STATE_UNCERTAIN",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (!deferResult.success) {
        const code = typeof deferResult.code === "string"
          ? deferResult.code
          : "PAY_ON_SITE_STATE_UNCERTAIN";
        const status = code === "PENDING_PAYMENT_ATTEMPT_EXISTS" ||
            code === "BOOKING_CHANGED_DURING_PAY_ON_SITE" ||
            code === "PAY_ON_SITE_NOT_AVAILABLE"
          ? 409
          : 500;
        return new Response(
          JSON.stringify({
            success: false,
            error: deferResult.error ??
              "The booking cannot switch to pay on site.",
            code,
          }),
          {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (deferResult.payment_timing !== desiredDeferredState.payment_timing) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "The pay-on-site state could not be verified.",
            code: "PAY_ON_SITE_STATE_UNCERTAIN",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_timing: "pay_on_site",
          message: "Booking confirmed with pay on-site option",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    const priceSnapshot = parsePublicBookingPriceSnapshot({
      totalPrice: booking.total_price,
      totalAmountCents: booking.total_amount_cents,
      paymentCurrency: booking.payment_currency,
    });
    if (!priceSnapshot.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: priceSnapshot.reason,
          code: priceSnapshot.code,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const { baseAmount, baseAmountCents } = priceSnapshot.value;

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
    logStep("Account owner determined", {
      calendarUserId: calendarOwner.user_id,
      accountOwnerId,
    });

    // This server-owned launch gate is evaluated before key selection, Stripe
    // client construction or any provider call. Runtime roles and request fields
    // cannot override it.
    const gate = await evaluatePaymentLaunchGate("booking", accountOwnerId);
    if (!gate.allowed) {
      logStep("Booking payment gate blocked request", {
        tenantId: accountOwnerId,
        state: gate.state,
        code: gate.code,
        configurationHash: gate.configurationHash,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: gate.reason,
          code: gate.code,
          payment_path: gate.path,
          gate_state: gate.state,
          gate_configuration_hash: gate.configurationHash,
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Resolve the current platform account before selecting a Connect destination.
    // One owner can have historical rows for more than one Stripe platform; selecting
    // merely the newest environment row can route money to stale/wrong-platform state.
    const stripeKey = getStripeSecretKey(serverIsTest ? "test" : "live");
    if (!stripeKey) {
      throw new Error(
        `Stripe ${serverIsTest ? "test" : "live"} secret key not configured`,
      );
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;

    // Get the Connect account for this owner, mode AND current platform.
    const { data: stripeAccount } = await supabaseClient
      .from("business_stripe_accounts")
      .select("*")
      .eq("account_owner_id", accountOwnerId)
      .eq("environment", serverIsTest ? "test" : "live")
      .eq("platform_account_id", platformAccountId)
      .eq("charges_enabled", true)
      .eq("onboarding_completed", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!stripeAccount) {
      throw new Error("Stripe account not connected or charges not enabled");
    }
    logStep("Stripe account found", {
      accountId: stripeAccount.stripe_account_id,
    });

    // Price and cents were snapped atomically when the booking was committed.
    let amount = baseAmountCents;

    // Tax is calculated only from the immutable booking-time snapshot.
    let taxAmount = 0;
    let automaticTaxEnabled = false;

    if (
      tax.taxEnabled && tax.taxCode && tax.applicableTaxRate !== null &&
      tax.applicableTaxRate > 0
    ) {
      if (tax.taxBehavior === "inclusive") {
        // Tax is already included in the price, calculate the tax portion
        const taxRate = tax.applicableTaxRate / 100;
        taxAmount = Math.round(baseAmountCents * taxRate / (1 + taxRate));
      } else {
        // Tax is exclusive, add it to the base amount
        const taxRate = tax.applicableTaxRate / 100;
        taxAmount = Math.round(baseAmountCents * taxRate);
        amount = baseAmountCents + taxAmount;
      }

      automaticTaxEnabled = true;
      logStep("Tax calculation", {
        base: baseAmount,
        taxRate: tax.applicableTaxRate,
        taxAmount: taxAmount / 100,
        total: amount / 100,
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
    let taxCalculationId: string | null = null; // -> metadata[tax_calculation]
    let taxBreakdownToPersist: TaxBreakdownEntry[] | null = null;
    let reverseChargeApplied = false;
    let crossBorderGuardTripped = false; // not_collecting + cross-border
    let domesticGuardTripped = false; // (X4 CB-F-03) domestic, no usable rate
    let vatIdRejected = false; // (X4) supplied VAT id was format-invalid
    let persistedCustomerCountry: string | null = null;
    let taxTransactionPending = false; // case (a) collecting -> create_from_calculation on success

    const supplyType = tax.supplyType;
    const isRemoteSupply = supplyType === "remote_service" ||
      supplyType === "digital";
    const customerCountry = tax.customerCountry;
    const customerVatId = tax.customerVatId;
    const merchantCountry = tax.businessCountry;

    if (isRemoteSupply && tax.taxEnabled && tax.taxCode) {
      if (!customerCountry) {
        // A remote/digital taxable service needs the customer country to compute VAT.
        // Fail loud rather than silently apply the wrong (domestic) rate.
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "customer_country is required for a remote/digital service (cross-border VAT cannot be computed without it)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      persistedCustomerCountry = customerCountry;
      // Stripe Tax has not been activated on the connected account yet (registration
      // human-gate); compute in the platform context (Tax active there) so we still get
      // a real not_collecting / reverse_charge result. When the merchant completes OSS +
      // activates Tax on the connected account, flip connectedTaxActive true (no other
      // change) and the same call computes against their registrations.
      const taxBehavior: "inclusive" | "exclusive" = tax.taxBehavior;
      const lineAmountCents = baseAmountCents;

      try {
        const calc = await calculateTax({
          stripeSecretKey: stripeKey,
          connectedAccountId: stripeAccount.stripe_account_id,
          connectedTaxActive: false,
          currency: paymentCurrency,
          lineAmountCents,
          taxCode: tax.taxCode,
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
          supplyType,
          customerCountry,
          state: calc.collectionState,
          taxCents: calc.taxAmountCents,
          context: calc.context,
          calc: calc.calculationId,
          vatIdRejected,
        });
        if (vatIdRejected) {
          // NO-ABUSE: the supplied VAT id was format-invalid; Stripe rejected it and the
          // calc was retried as B2C (no reverse-charge). Surface it; never silently honor.
          logStep(
            "VAT-ID REJECTED (format-invalid) -> treated as B2C, no reverse-charge",
            {
              customerCountry,
            },
          );
        }

        if (calc.collectionState === "collecting") {
          // (a) Positive collectible rate -> use Stripe's figure. Attach the calc id and
          // record a filing transaction after payment success.
          taxAmount = calc.taxAmountCents;
          amount = taxBehavior === "inclusive"
            ? lineAmountCents
            : calc.amountTotalCents;
          taxTransactionPending = true;
        } else if (calc.collectionState === "reverse_charge") {
          // (b) Valid EU B2B reverse-charge -> 0%, marked. No tax added. (Under the
          // require-VIES policy this state means VIES CONFIRMED the id; an unconfirmed id
          // would have been downgraded to vat_id_unverified, handled below.)
          taxAmount = 0;
          amount = lineAmountCents;
          reverseChargeApplied = true;
        } else if (calc.collectionState === "vat_id_unverified") {
          // (b') (X4 VIES) The require-VIES policy is ON and the eu_vat was format-valid
          // but could NOT be confirmed via VIES. Do NOT silently apply a 0% reverse-charge.
          // We fail the charge loudly so the booking is not completed on an unconfirmed id;
          // the owner (or customer) must supply a verifiable VAT id or proceed without one.
          // (When the policy is OFF, default, this state never occurs.)
          logStep("VAT-ID UNVERIFIED GUARD (require-VIES on)", {
            customerCountry,
            message: VAT_ID_UNVERIFIED_MESSAGE,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: VAT_ID_UNVERIFIED_MESSAGE,
              code: VAT_ID_UNVERIFIED_STATUS,
            }),
            {
              status: 422,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
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
            logStep(
              "Cross-border not_collecting domestic -> manual NL fallback",
              {
                customerCountry,
                taxAmount: taxAmount / 100,
              },
            );
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
            logStep(
              "DOMESTIC RATE GUARD (CB-F-03: no usable domestic rate, never silent 0%)",
              {
                customerCountry,
                merchantCountry,
                applicableTaxRate: tax.applicableTaxRate,
                message: DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
              },
            );
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
            customerCountry,
            merchantCountry,
            message: CROSS_BORDER_UNAVAILABLE_MESSAGE,
          });
        }
      } catch (taxErr) {
        // A Stripe Tax API failure on a remote service must not silently produce a wrong
        // (domestic) VAT. Fail the charge loudly so the issue is visible.
        logStep("Cross-border tax calc FAILED", {
          error: (taxErr as Error)?.message,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: `Cross-border tax calculation failed: ${
              (taxErr as Error)?.message
            }`,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Calculate application fee using shared calculator
    const feeCalculation = calculateApplicationFee({
      amountCents: amount,
      platformFeePercentage: PLATFORM_FEE_RATE,
    });

    logStep("Fee calculation", {
      amount: amount / 100,
      applicationFee: feeCalculation.applicationFeeCents / 100,
      platformFee: feeCalculation.platformFeeCents / 100,
      connectedAccountNet: feeCalculation.connectedAccountNetCents / 100,
      stripeFeePayer: feeCalculation.breakdown.stripeFeePayer,
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
    const useStripeTaxAPI = userData?.subscription_tier === "professional" ||
      userData?.subscription_tier === "enterprise";

    // Create payment intent with destination charge and application fee
    const paymentIntentData: Stripe.PaymentIntentCreateParams = {
      amount,
      currency: paymentCurrency,
      payment_method_types: paymentPolicy.stripePaymentMethods,
      application_fee_amount: feeCalculation.applicationFeeCents,
      transfer_data: {
        destination: stripeAccount.stripe_account_id,
      },
      metadata: {
        booking_id: booking.id,
        calendar_id: effectiveCalendarId,
        customer_email: booking.customer_email || "",
        customer_name: booking.customer_name,
        service_name: booking.service_name || "Appointment Service",
        subscription_tier: userData?.subscription_tier || "starter",
        business_country: tax.businessCountry,
        tax_enabled: tax.taxEnabled.toString(),
        base_amount: baseAmount.toString(),
        tax_amount: (taxAmount / 100).toString(),
        platform_fee_percentage: PLATFORM_FEE_PERCENTAGE.toString(),
        payout_option: policy.payoutOption,
        payment_method: paymentPolicy.feePaymentMethod,
        enabled_payment_methods: paymentPolicy.stripePaymentMethods.join(","),
        payment_timing: payment_timing,
        payment_gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
        application_fee_breakdown: JSON.stringify(feeCalculation.breakdown),
        // Cross-border (X2): supply type + the persisted customer country, and (case (a))
        // the Stripe Tax calculation id so the webhook can record a filing transaction
        // (transactions/create_from_calculation) on payment success. The reverse-charge /
        // cross-border-guard markers let the reports surface the right line later.
        supply_type: supplyType,
        ...(persistedCustomerCountry
          ? { customer_country: persistedCustomerCountry }
          : {}),
        ...(taxCalculationId ? { tax_calculation: taxCalculationId } : {}),
        ...(taxTransactionPending ? { tax_transaction_pending: "true" } : {}),
        ...(reverseChargeApplied ? { reverse_charge: "true" } : {}),
        ...(crossBorderGuardTripped
          ? { cross_border_status: CROSS_BORDER_UNAVAILABLE_STATUS }
          : {}),
        ...(domesticGuardTripped
          ? { domestic_status: DOMESTIC_RATE_UNAVAILABLE_STATUS }
          : {}),
        ...(vatIdRejected ? { vat_id_rejected: "true" } : {}),
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
      paymentIntentData.metadata.manual_tax_calculated = "true";
      paymentIntentData.metadata.tax_rate = tax.applicableTaxRate?.toString() ||
        "0";
      paymentIntentData.metadata.tax_behavior = tax.taxBehavior;
      logStep("Using manual tax calculation based on service configuration", {
        useStripeTaxAPI,
        note:
          "automatic_tax is not set on a destination charge (Stripe rejects it)",
      });
    }

    // R48: both public web and WhatsApp now claim the SAME booking-global
    // provider authority. The database lock is acquired before Stripe creation;
    // a competing channel receives conflict/in-progress and cannot mint a second
    // usable object. The fingerprint binds every money, mode and destination input.
    const providerRequestFingerprint = await fingerprintBookingPaymentProvider({
      bookingId: booking.id,
      channel: "web",
      providerKind: "payment_intent",
      amountCents: amount,
      totalDueCents: amount,
      currency: paymentCurrency,
      stripeMode: serverIsTest ? "test" : "live",
      destinationAccountId: stripeAccount.stripe_account_id,
      paymentIntentData,
    });
    const { data: providerClaimRaw, error: providerClaimError } =
      await supabaseClient.rpc("claim_booking_payment_provider_reservation", {
        p_booking_id: booking.id,
        p_channel: "web",
        p_provider_kind: "payment_intent",
        p_amount_cents: amount,
        p_total_due_cents: amount,
        p_currency: paymentCurrency,
        p_stripe_mode: serverIsTest ? "test" : "live",
        p_destination_account_id: stripeAccount.stripe_account_id,
        p_platform_account_id: platformAccountId,
        p_tax_calculation_id: taxCalculationId,
        p_request_fingerprint: providerRequestFingerprint,
        p_claim_ttl_seconds: 120,
      });
    if (providerClaimError) {
      throw new BookingPaymentProviderError(
        "BOOKING_PROVIDER_RESERVATION_UNAVAILABLE",
        "The payment provider reservation could not be verified.",
        { httpStatus: 500, retryable: true },
      );
    }

    const providerClaim = parseBookingPaymentProviderClaim(providerClaimRaw);
    if (
      providerClaim.outcome !== "claimed" &&
      providerClaim.outcome !== "reconcile"
    ) {
      throwForBookingPaymentProviderClaim(providerClaim);
    }
    const ownership = {
      channel: "web" as const,
      providerKind: "payment_intent" as const,
      generation: providerClaim.generation,
      requestFingerprint: providerClaim.requestFingerprint,
    };
    const ownershipMetadata = bookingPaymentProviderMetadata(ownership);
    paymentIntentData.metadata = {
      ...paymentIntentData.metadata,
      ...ownershipMetadata,
    };

    let paymentIntent: Stripe.PaymentIntent;
    if (providerClaim.outcome === "reconcile") {
      try {
        paymentIntent = await stripe.paymentIntents.retrieve(
          providerClaim.providerObjectId,
        );
      } catch {
        throw new BookingPaymentProviderError(
          "BOOKING_PROVIDER_RECONCILIATION_FAILED",
          "The existing payment provider object could not be verified.",
          { httpStatus: 502, retryable: true },
        );
      }
      const destination = typeof paymentIntent.transfer_data?.destination ===
          "string"
        ? paymentIntent.transfer_data.destination
        : paymentIntent.transfer_data?.destination?.id;
      const storedOwnership = parseBookingPaymentProviderMetadata(
        paymentIntent.metadata,
      );
      if (
        paymentIntent.id !== providerClaim.providerObjectId ||
        paymentIntent.amount !== amount ||
        paymentIntent.currency !== paymentCurrency ||
        paymentIntent.livemode === serverIsTest ||
        destination !== stripeAccount.stripe_account_id ||
        storedOwnership?.channel !== ownership.channel ||
        storedOwnership.providerKind !== ownership.providerKind ||
        storedOwnership.generation !== ownership.generation ||
        storedOwnership.requestFingerprint !== ownership.requestFingerprint ||
        paymentIntent.status === "canceled"
      ) {
        throw new BookingPaymentProviderError(
          "BOOKING_PROVIDER_RECONCILIATION_CONFLICT",
          "The existing payment provider object does not match its reservation.",
          { retryable: false },
        );
      }
      if (
        ["processing", "requires_capture", "succeeded"].includes(
          paymentIntent.status,
        )
      ) {
        throw new BookingPaymentProviderError(
          "BOOKING_PROVIDER_COMPLETION_PENDING",
          "The existing payment is already processing or completed.",
          { retryable: true },
        );
      }
    } else {
      paymentIntent = await stripe.paymentIntents.create(
        paymentIntentData,
        { idempotencyKey: providerClaim.idempotencyKey },
      );
      const { data: finalizedProvider, error: finalizeProviderError } =
        await supabaseClient.rpc(
          "finalize_booking_payment_provider_reservation",
          {
            p_booking_id: booking.id,
            p_reservation_id: providerClaim.reservationId,
            p_claim_token: providerClaim.claimToken,
            p_generation: providerClaim.generation,
            p_request_fingerprint: providerClaim.requestFingerprint,
            p_stripe_mode: serverIsTest ? "test" : "live",
            p_provider_object_id: paymentIntent.id,
            p_provider_url: null,
            p_provider_expires_at: null,
          },
        );
      if (
        finalizeProviderError ||
        !finalizedProvider ||
        !["created", "replay"].includes(finalizedProvider.outcome) ||
        finalizedProvider.provider_object_id !== paymentIntent.id
      ) {
        throw new BookingPaymentProviderError(
          "BOOKING_PROVIDER_FINALIZATION_UNCERTAIN",
          "The payment provider object was not durably attached. Retry safely.",
          { httpStatus: 500, retryable: true },
        );
      }
    }
    logStep("PaymentIntent created", {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      applicationFee: feeCalculation.applicationFeeCents,
    });

    // Record payment attempt. Cross-border (X2): persist the customer country, the
    // Stripe per-jurisdiction tax_breakdown, and the reverse_charge flag AT CHARGE TIME
    // (the X1 columns) so the filing reports (X6) can show per-country VAT / reverse-
    // charge 0% lines / the OSS-eligible bucket; the reports cannot recompute these
    // historically. in_person bookings leave these null/false (no regression).
    const paymentAttempt = {
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_account_id: stripeAccount.stripe_account_id,
      amount_cents: amount,
      platform_fee_cents: feeCalculation.applicationFeeCents,
      currency: paymentIntent.currency,
      status: "pending",
      customer_email: booking.customer_email,
      customer_name: booking.customer_name,
      payment_method_type: paymentPolicy.feePaymentMethod,
      customer_country: persistedCustomerCountry,
      tax_breakdown: taxBreakdownToPersist,
      reverse_charge: reverseChargeApplied,
      stripe_mode: serverIsTest ? ("test" as const) : ("live" as const),
    };
    let { error: paymentError } = await supabaseClient
      .from("booking_payments")
      .insert(paymentAttempt);

    // Stripe returns the same PaymentIntent for the same idempotency key. The
    // corresponding local UNIQUE conflict is a normal replay only when the
    // existing durable identity is exactly the same.
    if (paymentError?.code === "23505") {
      const { data: existingPayment, error: existingPaymentError } =
        await supabaseClient
          .from("booking_payments")
          .select(
            "booking_id,stripe_payment_intent_id,stripe_account_id,amount_cents,platform_fee_cents,currency,status,stripe_mode",
          )
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle();

      if (
        existingPaymentError ||
        !bookingPaymentLedgerMatches(existingPayment, paymentAttempt)
      ) {
        logStep("Payment ledger idempotency conflict", {
          paymentIntentId: paymentIntent.id,
          error: existingPaymentError?.message ?? "identity_mismatch",
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Payment state conflicts with an existing attempt.",
            code: "BOOKING_PAYMENT_LEDGER_CONFLICT",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      paymentError = null;
      logStep("Reused matching payment ledger row", {
        paymentIntentId: paymentIntent.id,
      });
    }

    if (paymentError) {
      logStep("Error recording payment", { error: paymentError.message });
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Payment was initialized but could not be recorded. Retry this booking.",
          code: "BOOKING_PAYMENT_RECORD_FAILED",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Compare-and-set against the state authorized above. A cancellation can race the
    // Stripe call; without these predicates this write resurrects payment state and
    // hands out a client secret for a booking that is no longer payable.
    let bookingUpdate = supabaseClient
      .from("bookings")
      .update({
        payment_status: "pending",
        payment_required: true,
        payment_timing: payment_timing,
      })
      .eq("id", booking.id)
      .eq("status", booking.status);
    bookingUpdate = booking.payment_status == null
      ? bookingUpdate.is("payment_status", null)
      : bookingUpdate.eq("payment_status", booking.payment_status);
    const { data: updatedBooking, error: bookingUpdateError } =
      await bookingUpdate
        .select("id")
        .maybeSingle();
    if (bookingUpdateError) {
      logStep("Error updating booking payment status", {
        error: bookingUpdateError.message,
      });
      // A database error gives no proof whether the CAS committed. Do not cancel a
      // Stripe object that a concurrent successful request may already have returned.
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Payment initialization state could not be verified. Retry safely.",
          code: "BOOKING_PAYMENT_STATE_UNCERTAIN",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!updatedBooking) {
      const [currentBookingRead, currentLedgerRead] = await Promise.all([
        supabaseClient
          .from("bookings")
          .select("status,payment_status,payment_required,payment_timing")
          .eq("id", booking.id)
          .maybeSingle(),
        supabaseClient
          .from("booking_payments")
          .select(
            "booking_id,stripe_payment_intent_id,stripe_account_id,amount_cents,platform_fee_cents,currency,status,stripe_mode",
          )
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .maybeSingle(),
      ]);

      if (currentBookingRead.error || currentLedgerRead.error) {
        logStep("Unable to classify zero-row booking payment CAS", {
          bookingError: currentBookingRead.error?.message,
          ledgerError: currentLedgerRead.error?.message,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Payment initialization state could not be verified. Retry safely.",
            code: "BOOKING_PAYMENT_STATE_UNCERTAIN",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const concurrentReplay = isReusablePendingPaymentInitialization(
        currentBookingRead.data,
        booking.status,
        payment_timing,
        currentLedgerRead.data,
        paymentAttempt,
      );
      if (concurrentReplay) {
        logStep("Reused concurrent pending payment initialization", {
          paymentIntentId: paymentIntent.id,
          bookingId: booking.id,
        });
      } else {
        logStep("Booking changed during payment initialization", {
          bookingId: booking.id,
          currentStatus: currentBookingRead.data?.status,
          currentPaymentStatus: currentBookingRead.data?.payment_status,
          ledgerStatus: currentLedgerRead.data?.status,
        });

        // This is a genuine booking-state conflict, not the normal duplicate-request
        // replay above. The client secret has not been returned by THIS request. Queue
        // cleanup durably and leave the Stripe side effect to the fenced worker. Request
        // paths must never race settlement with an ad-hoc provider cancellation.
        const { data: queuedCleanup, error: queuedCleanupError } =
          await supabaseClient.rpc(
            "require_booking_payment_provider_cleanup",
            {
              p_booking_id: booking.id,
              p_reservation_id: providerClaim.reservationId,
              p_generation: providerClaim.generation,
              p_request_fingerprint: providerClaim.requestFingerprint,
              p_provider_object_id: paymentIntent.id,
              p_reason_code: "BOOKING_CHANGED_DURING_PAYMENT_INITIALIZATION",
            },
          );
        if (
          queuedCleanupError || queuedCleanup?.outcome !== "queued"
        ) {
          return new Response(
            JSON.stringify({
              success: false,
              error:
                "Payment cleanup could not be durably queued. Retry safely.",
              code: "BOOKING_PROVIDER_CLEANUP_QUEUE_UNCERTAIN",
              booking_disposition: "preserve",
              retryable: true,
            }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: "The booking changed while payment was being initialized.",
            code: "BOOKING_CHANGED_DURING_PAYMENT_INITIALIZATION",
            cleanup_queued: true,
            retryable: true,
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode: serverIsTest ? "test" : "live",
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        application_fee: feeCalculation.applicationFeeCents,
        fee_breakdown: feeCalculation,
        payment_methods: paymentPolicy.stripePaymentMethods,
        gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const providerError = error instanceof BookingPaymentProviderError
      ? error
      : null;
    logStep("ERROR", {
      message: (error as Error)?.message,
      ...(providerError ? { code: providerError.code } : {}),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error)?.message,
        ...(providerError
          ? {
            code: providerError.code,
            booking_disposition: providerError.bookingDisposition,
            retryable: providerError.retryable,
          }
          : {}),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: providerError?.httpStatus ?? 500,
      },
    );
  }
});
