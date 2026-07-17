import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";
import {
  calculateApplicationFee,
  PLATFORM_FEE_PERCENTAGE,
  PLATFORM_FEE_RATE,
} from "../_shared/feeCalculator.ts";
import {
  getStripeSecretKey,
  validateStripeMode,
} from "../_shared/stripeValidation.ts";
import { evaluatePaymentLaunchGate } from "../_shared/paymentLaunchGate.ts";
import { evaluateBookingPaymentPolicy } from "../_shared/bookingPaymentPolicy.ts";
import { resolveCheckoutOrigin } from "../_shared/checkoutUrl.ts";
import {
  type CalculatedInstallment,
  calculateInstallmentSchedule,
  type InstallmentPlan,
  installmentPlanSchema,
  planFromInstallmentConfig,
} from "../_shared/installmentPlan.ts";
import { whatsappPaymentRequestSchema } from "./request.ts";
import { installmentScheduleIdentityMatches } from "../_shared/installmentSchedulePersistence.ts";
import {
  fingerprintWhatsappPaymentAttempt,
  runWhatsappPaymentAttempt,
  WhatsappPaymentAttemptError,
} from "../_shared/whatsappPaymentAttempt.ts";
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
  type BookingPaymentProviderClaim,
  BookingPaymentProviderError,
  bookingPaymentProviderMetadata,
  fingerprintBookingPaymentProvider,
  parseBookingPaymentProviderClaim,
  parseBookingPaymentProviderMetadata,
  throwForBookingPaymentProviderClaim,
} from "../_shared/bookingPaymentProviderReservation.ts";

// VIES-trust policy flag (X4), identical to create-booking-payment so BOTH charge paths
// honor the same owner policy. Default OFF = Stripe format-only reverse-charge (today's
// behavior). Flip to ON (TAX_REQUIRE_VIES=true edge secret) to require a real VIES
// confirmation before honoring a reverse-charge.
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
  console.log(`[WHATSAPP-PAYMENT-HANDLER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Server-side endpoint (called by the WhatsApp booking agent), not a logged-in user.
    // Require a shared secret so the public anon key cannot mint Stripe payment links
    // for any conversation id.
    const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
    if (
      !expectedSecret || req.headers.get("x-internal-secret") !== expectedSecret
    ) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const parsedRequest = whatsappPaymentRequestSchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsedRequest.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid WhatsApp payment request",
          code: "INVALID_WHATSAPP_PAYMENT_REQUEST",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const {
      conversationId,
      serviceTypeId,
      paymentType = "full",
      paymentMethod,
      paymentTiming = "pay_now",
      bookingId,
    } = parsedRequest.data;

    // SECURITY: pin the Stripe mode to the server's STRIPE_MODE — never trust a body flag
    // (mirrors create-booking-payment). A caller can't force live keys/charges.
    const testMode = validateStripeMode().mode === "test";

    logStep("Request parsed", {
      conversationId,
      serviceTypeId,
      paymentType,
      testMode,
      paymentMethod,
      paymentTiming,
      bookingId,
    });

    // Get conversation and calendar details
    const { data: conversation, error: convError } = await supabaseClient
      .from("whatsapp_conversations")
      .select("calendar_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      throw new Error("Conversation not found");
    }
    logStep("Conversation found", { calendarId: conversation.calendar_id });

    // Defense-in-depth: if a bookingId is supplied (pay-and-book), it MUST belong to
    // this conversation's calendar. Prevents a confused-deputy where a mismatched id
    // would later be confirmed-as-paid by the stripe-webhook for the wrong calendar.
    // X3b-1: also read the booking row's customer_country / customer_vat_id (the X1
    // columns) here. These drive the cross-border Stripe Tax calc below for a
    // remote/digital service. They come from the BOOKING ROW only (X3b-2 wires the
    // agent's conversational capture of these onto the row); the handler never trusts a
    // body value for them, and they influence ONLY the tax figure (a Stripe-bounded
    // computation) + reporting columns, never the destination account or platform fee.
    let bookingCustomerCountry: string | null = null;
    let bookingCustomerVatId: string | null = null;
    // R130 (PRICE-INTEGRITY fix): the price actually charged must match what was quoted and
    // confirmed in the WhatsApp conversation, not a live re-read of service_types.price that may
    // have moved since (an owner raising/lowering a price between confirm and charge previously
    // silently charged the NEW price with zero disclosure -- see tools.ts's book_appointment
    // commit, which now snapshots the CURRENT price onto bookings.total_price at the moment the
    // customer actually confirmed, and discloses any change from the preview). null when the
    // booking predates this fix (no snapshot was ever written) or the service has no price
    // configured; the amount calc below falls back to the live service_types.price ONLY in that
    // narrow legacy/unconfigured case, never as the default path for a booking created after this
    // fix shipped.
    let bookingTotalPrice: number | null = null;
    let bookingStartTime: string | null = null;
    if (bookingId) {
      const { data: bk } = await supabaseClient
        .from("bookings")
        .select(
          "calendar_id, customer_country, customer_vat_id, total_price, start_time, status, payment_status, is_deleted",
        )
        .eq("id", bookingId)
        .maybeSingle();
      if (!bk || bk.calendar_id !== conversation.calendar_id) {
        throw new Error("bookingId does not belong to this conversation");
      }
      if (bk.is_deleted === true) {
        throw new WhatsappPaymentAttemptError(
          "BOOKING_DELETED",
          "Booking can no longer be paid",
        );
      }
      if (["cancelled", "completed", "no-show"].includes(bk.status)) {
        throw new WhatsappPaymentAttemptError(
          "BOOKING_NOT_PAYABLE",
          "Booking can no longer be paid",
        );
      }
      if (
        [
          "paid",
          "refunded",
          "partial",
          "partially_refunded",
          "refund_required",
        ].includes(bk.payment_status)
      ) {
        throw new WhatsappPaymentAttemptError(
          "BOOKING_PAYMENT_BALANCE_ALREADY_RETAINED",
          "Booking already has a completed or partial payment",
        );
      }
      bookingCustomerCountry = typeof bk.customer_country === "string" &&
          bk.customer_country.length === 2
        ? bk.customer_country.toUpperCase()
        : null;
      bookingCustomerVatId = typeof bk.customer_vat_id === "string" &&
          bk.customer_vat_id.trim().length > 0
        ? bk.customer_vat_id.trim()
        : null;
      bookingTotalPrice = typeof bk.total_price === "number"
        ? bk.total_price
        : (typeof bk.total_price === "string" && bk.total_price !== ""
          ? Number(bk.total_price)
          : null);
      bookingStartTime = typeof bk.start_time === "string"
        ? bk.start_time
        : null;
    }

    // Get payment settings for this calendar
    const { data: paymentSettings, error: settingsError } = await supabaseClient
      .from("payment_settings")
      .select("*")
      .eq("calendar_id", conversation.calendar_id)
      .single();

    if (settingsError) {
      logStep("No payment settings found, using defaults", {
        error: settingsError.message,
      });
    }

    // Get effective settings (with defaults)
    const settings = {
      payout_option:
        (paymentSettings?.payout_option as "standard" | "instant") ??
          "standard",
      payment_required_for_booking:
        paymentSettings?.payment_required_for_booking ?? false,
      payment_optional: paymentSettings?.payment_optional ?? false,
      secure_payments_enabled: paymentSettings?.secure_payments_enabled ??
        false,
      enabled_payment_methods: paymentSettings?.enabled_payment_methods ??
        ["ideal", "card"],
      allowed_payment_timing: paymentSettings?.allowed_payment_timing ??
        ["pay_now"],
    };
    logStep("Payment settings loaded", settings);

    const paymentPolicy = evaluateBookingPaymentPolicy({
      securePaymentsEnabled: settings.secure_payments_enabled,
      paymentOptional: settings.payment_optional,
      allowedPaymentTiming: settings.allowed_payment_timing,
      enabledPaymentMethods: settings.enabled_payment_methods,
      requestedTiming: paymentTiming,
      requestedMethod: paymentMethod,
      currency: "eur",
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

    // Deferred on-site payment never creates or touches a Stripe object.
    if (paymentPolicy.action === "DEFER_PAYMENT") {
      logStep("Customer chose pay on-site", { paymentTiming });

      return new Response(
        JSON.stringify({
          success: true,
          payment_deferred: true,
          payment_timing: "pay_on_site",
          message: "Payment will be collected on-site",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Get service type details
    const { data: serviceType, error: serviceError } = await supabaseClient
      .from("service_types")
      .select("*")
      .eq("id", serviceTypeId)
      .eq("calendar_id", conversation.calendar_id)
      .single();

    if (serviceError || !serviceType) {
      throw new Error("Service type not found");
    }
    logStep("Service type found", {
      serviceName: serviceType.name,
      price: serviceType.price,
    });

    // R130 (PRICE-INTEGRITY fix): the AUTHORITATIVE price for this charge is the booking's own
    // total_price SNAPSHOT (what was actually confirmed/disclosed in the conversation at commit
    // time), never a fresh live re-read of service_types.price -- a price the owner changes AFTER
    // the customer confirmed must not silently change what gets charged. Falls back to the live
    // service price ONLY when no snapshot exists (a booking created before this fix shipped, or a
    // legacy conversation-only flow with no bookingId at all), so this never breaks pre-existing
    // pending pay-and-book bookings mid-flight; every booking created going forward always has a
    // real snapshot, so this fallback is a one-time transitional safety net, not the steady state.
    const chargePrice =
      typeof bookingTotalPrice === "number" && !Number.isNaN(bookingTotalPrice)
        ? bookingTotalPrice
        : serviceType.price;
    if (!Number.isFinite(chargePrice) || chargePrice <= 0) {
      throw new Error("Booking does not have a payable amount");
    }
    logStep("Charge price resolved", {
      chargePrice,
      fromSnapshot: bookingTotalPrice != null,
      liveServicePrice: serviceType.price,
    });

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
    logStep("Account owner determined", {
      calendarUserId: calendar.user_id,
      accountOwnerId,
    });

    if (paymentType === "installment") {
      const { data: installmentOwner, error: installmentOwnerError } =
        await supabaseClient
          .from("users")
          .select(
            "installments_enabled,subscription_tier,grace_period_end",
          )
          .eq("id", accountOwnerId)
          .single();
      const { data: ownerStatus, error: ownerStatusError } =
        await supabaseClient.rpc(
          "get_user_status_type",
          { p_user_id: accountOwnerId },
        );
      if (
        installmentOwnerError || !installmentOwner ||
        ownerStatusError || typeof ownerStatus !== "string"
      ) {
        throw new Error("Installment entitlement could not be verified");
      }

      let effectiveTier = installmentOwner.subscription_tier ?? "free";
      if (
        ownerStatus === "expired_trial" ||
        ownerStatus === "canceled_and_inactive"
      ) {
        effectiveTier = "free";
      } else if (ownerStatus === "missed_payment") {
        const graceEnd = installmentOwner.grace_period_end
          ? new Date(installmentOwner.grace_period_end).getTime()
          : 0;
        if (!Number.isFinite(graceEnd) || graceEnd <= Date.now()) {
          effectiveTier = "free";
        }
      }
      if (
        installmentOwner.installments_enabled !== true ||
        !["professional", "enterprise"].includes(effectiveTier)
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Installment payments are not enabled for this business.",
            code: "INSTALLMENTS_NOT_ENTITLED",
          }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Evaluate the server-owned booking launch gate before key selection,
    // Stripe client construction or any provider call.
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

    // Resolve the active platform before selecting a destination. Historical
    // TEST/LIVE rows from another platform must never win by created_at ordering.
    const stripeKey = getStripeSecretKey(testMode ? "test" : "live");
    if (!stripeKey) {
      throw new Error(
        `Stripe ${testMode ? "test" : "live"} secret key not configured`,
      );
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;

    // Get Stripe account by owner, mode and current platform.
    const { data: stripeAccount } = await supabaseClient
      .from("business_stripe_accounts")
      .select("*")
      .eq("account_owner_id", accountOwnerId)
      .eq("environment", testMode ? "test" : "live")
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

    // Calculate payment amount based on type
    // R130: use the booking's snapshot price (chargePrice), not a live serviceType.price re-read.
    let amountCents = Math.round(chargePrice * 100);

    // Tax (mirror create-booking-payment so the WhatsApp payment matches the web
    // payment; previously the WhatsApp path charged the untaxed price, an
    // inconsistent amount for the same service). Exclusive tax is added on top;
    // inclusive tax is already in the price so the amount is unchanged.
    // F-TAX-23: also TRACK the VAT in cents and stamp it onto the PaymentIntent
    // metadata (tax_amount, as a EUR string) below, exactly like create-booking-payment.
    // The tax filing reports read the tax from PI metadata.tax_amount via
    // resolvePaymentTaxCents; without it a paid WhatsApp VAT charge reported 0% VAT.
    //
    // This DOMESTIC manual block is correct for in_person services (place-of-supply =
    // where performed) and as the not_collecting domestic (NL) fallback. The
    // CROSS-BORDER branch below overrides it for remote_service/digital services.
    let taxAmountCents = 0;
    const taxEnabled = !!(serviceType.tax_enabled && serviceType.tax_code &&
      serviceType.applicable_tax_rate);
    if (taxEnabled) {
      const taxRate = serviceType.applicable_tax_rate / 100;
      if (serviceType.tax_behavior === "inclusive") {
        // Tax is already inside the price; report only the tax portion of the gross.
        taxAmountCents = Math.round(
          (chargePrice * taxRate / (1 + taxRate)) * 100,
        );
      } else {
        // Tax is exclusive: add it on top and report the added VAT.
        taxAmountCents = Math.round(chargePrice * taxRate * 100);
        amountCents = Math.round(chargePrice * 100) + taxAmountCents;
      }
      logStep("Tax applied", {
        taxRate: serviceType.applicable_tax_rate,
        behavior: serviceType.tax_behavior,
        amountCents,
        taxAmountCents,
      });
    }

    // ---------------------------------------------------------------------------
    // CROSS-BORDER / OSS branch (X3b-1): the SAME supply_type-based Stripe Tax
    // Calculation-API branch create-booking-payment got in X2, on the WhatsApp charge
    // path, REUSING _shared/taxCalc.ts (the calc logic is NOT duplicated here). For a
    // remote_service/digital service the VAT is computed by Stripe Tax against the
    // customer's country (cross-border / reverse-charge / OSS), NEVER hardcoded; for an
    // in_person service this whole block is skipped and the domestic manual path above
    // stands (regression-safe). The charge model is UNCHANGED below (still a destination
    // charge via Stripe Checkout); we only adjust amountCents/taxAmountCents and stamp
    // the calc id + breakdown markers onto the PI metadata for the webhook + reports.
    //
    // Persistence vars: stamped onto the PI metadata below; stripe-webhook's
    // ensureBookingPaymentRow (the WhatsApp path's only booking_payments inserter, the
    // F-TAX-23 idempotent insert) reads them back and persists customer_country +
    // tax_breakdown + reverse_charge onto the row, so a WhatsApp remote charge is
    // report-visible per-jurisdiction (X6), not EUR0.
    let taxCalculationId: string | null = null; // -> metadata[tax_calculation]
    let taxBreakdownToPersist: TaxBreakdownEntry[] | null = null;
    let reverseChargeApplied = false;
    let crossBorderGuardTripped = false; // not_collecting + cross-border
    let domesticGuardTripped = false; // (CB-F-03) domestic, no usable rate
    let vatIdRejected = false; // supplied VAT id was format-invalid
    let persistedCustomerCountry: string | null = null;
    let taxTransactionPending = false; // case (a) collecting -> create_from_calculation on success

    const supplyType: string = serviceType.supply_type ?? "in_person";
    const isRemoteSupply = supplyType === "remote_service" ||
      supplyType === "digital";
    // The merchant's home country (where Stripe Tax is registered); business_country is
    // the existing source of truth on the service, defaulting NL (mirrors X2).
    const merchantCountry = (serviceType.business_country || "NL")
      .toUpperCase();

    // A Stripe Tax calculation is tied to one exact amount. Until every later
    // installment can create and persist its own calculation, charging only the first
    // part while recording tax for the full service would overstate tax. Fail closed
    // instead of producing a financially incorrect partial cross-border charge.
    if (
      paymentType === "installment" && isRemoteSupply &&
      serviceType.tax_enabled && serviceType.tax_code
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Installments for taxed remote or digital services require manual review.",
          code: "INSTALLMENT_CROSS_BORDER_TAX_UNSUPPORTED",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      isRemoteSupply && serviceType.tax_enabled && serviceType.tax_code &&
      paymentType === "full"
    ) {
      if (!bookingCustomerCountry) {
        // A remote/digital taxable service needs the customer country to compute VAT.
        // Fail loud rather than silently apply the wrong (domestic) rate. X3b-2 will make
        // the agent capture this onto the booking row before invoking this handler.
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "customer_country is required on the booking for a remote/digital service (cross-border VAT cannot be computed without it)",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      persistedCustomerCountry = bookingCustomerCountry;
      const taxBehavior: "inclusive" | "exclusive" =
        serviceType.tax_behavior === "inclusive" ? "inclusive" : "exclusive";
      // R130: chargePrice (the booking snapshot), not a live serviceType.price re-read.
      const lineAmountCents = Math.round(chargePrice * 100);

      try {
        const calc = await calculateTax({
          stripeSecretKey: stripeKey,
          connectedAccountId: stripeAccount.stripe_account_id,
          // Stripe Tax is not yet active on the connected account (registration
          // human-gate); compute in the platform context (Tax active there) so we still
          // get a real not_collecting / reverse_charge result. Flip to true (no other
          // change) once OSS + Tax are activated on the connected account.
          connectedTaxActive: false,
          currency: "eur",
          lineAmountCents,
          taxCode: serviceType.tax_code,
          taxBehavior,
          customerCountry: bookingCustomerCountry,
          customerVatId: bookingCustomerVatId ?? undefined,
          requireViesValidation: requireViesPolicy(),
        });

        taxBreakdownToPersist = calc.breakdown;
        taxCalculationId = calc.calculationId;
        vatIdRejected = calc.vatIdRejected === true;
        logStep("Cross-border tax calc", {
          supplyType,
          customerCountry: bookingCustomerCountry,
          state: calc.collectionState,
          taxCents: calc.taxAmountCents,
          context: calc.context,
          calc: calc.calculationId,
          vatIdRejected,
        });

        if (calc.collectionState === "collecting") {
          // (a) Positive collectible rate -> use Stripe's figure; record a filing
          // transaction after payment success (registration-gated, D-CB-REG today).
          taxAmountCents = calc.taxAmountCents;
          amountCents = taxBehavior === "inclusive"
            ? lineAmountCents
            : calc.amountTotalCents;
          taxTransactionPending = true;
        } else if (calc.collectionState === "reverse_charge") {
          // (b) Valid EU B2B reverse-charge -> 0%, marked. No tax added.
          taxAmountCents = 0;
          amountCents = lineAmountCents;
          reverseChargeApplied = true;
        } else if (calc.collectionState === "vat_id_unverified") {
          // (b') (X4 VIES, only when the policy is ON) format-valid eu_vat that VIES could
          // not confirm. Never a silent 0% reverse-charge: fail the charge loudly so the
          // booking is not completed on an unconfirmed id.
          logStep("VAT-ID UNVERIFIED GUARD (require-VIES on)", {
            customerCountry: bookingCustomerCountry,
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
        } else if (merchantCountry === bookingCustomerCountry) {
          // (c) not_collecting AND destination == merchant country (NL): manual domestic
          // fallback. The manual block above set taxAmountCents ONLY when applicable_tax_rate
          // is positive. CB-F-03: if it did not (NULL/0 rate), fire the DOMESTIC hard guard
          // instead of silently charging 0% domestic VAT.
          if (taxEnabled && taxAmountCents > 0) {
            logStep(
              "Cross-border not_collecting domestic -> manual NL fallback",
              {
                customerCountry: bookingCustomerCountry,
                taxAmount: taxAmountCents / 100,
              },
            );
          } else {
            domesticGuardTripped = true;
            taxAmountCents = 0;
            amountCents = lineAmountCents;
            taxBreakdownToPersist = [
              {
                amountCents: 0,
                inclusive: false,
                taxabilityReason: DOMESTIC_RATE_UNAVAILABLE_STATUS,
                country: bookingCustomerCountry,
                percentageDecimal: null,
                taxType: null,
              },
              ...calc.breakdown,
            ];
            logStep(
              "DOMESTIC RATE GUARD (CB-F-03: no usable domestic rate, never silent 0%)",
              {
                customerCountry: bookingCustomerCountry,
                merchantCountry,
                applicableTaxRate: serviceType.applicable_tax_rate ?? null,
                message: DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
              },
            );
          }
        } else {
          // (d) not_collecting AND cross-border: the HARD GUARD. Never a silent clean 0%.
          // The charge proceeds (destination charge) but the tax outcome is flagged so
          // X6/reports surface "register for OSS" instead of a fake 0% VAT line.
          crossBorderGuardTripped = true;
          taxAmountCents = 0;
          amountCents = lineAmountCents;
          taxBreakdownToPersist = [
            {
              amountCents: 0,
              inclusive: false,
              taxabilityReason: CROSS_BORDER_UNAVAILABLE_STATUS,
              country: bookingCustomerCountry,
              percentageDecimal: null,
              taxType: null,
            },
            ...calc.breakdown,
          ];
          logStep("CROSS-BORDER GUARD", {
            customerCountry: bookingCustomerCountry,
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

    let installmentSchedule: CalculatedInstallment[] | null = null;
    let authoritativeInstallmentPlan: InstallmentPlan | null = null;
    let chargedTaxAmountCents = taxAmountCents;
    // Gross, immutable ceiling for the booking. For installments only the first
    // tranche is charged now; the ceiling remains the full tax-inclusive amount.
    const totalDueCents = amountCents;
    if (paymentType === "installment") {
      if (!bookingStartTime) {
        throw new Error("Booking start time is missing");
      }
      const { data: installmentConfig, error: installmentConfigError } =
        await supabaseClient
          .from("service_installment_configs")
          .select(
            "enabled,plan_type,preset_plan,custom_deposits,fixed_deposit_amount",
          )
          .eq("service_type_id", serviceTypeId)
          .maybeSingle();
      if (installmentConfigError) {
        throw new Error("Installment configuration could not be loaded");
      }

      if (installmentConfig) {
        authoritativeInstallmentPlan = planFromInstallmentConfig(
          installmentConfig,
        );
      } else if (
        serviceType.installments_enabled === true &&
        serviceType.custom_installment_plan
      ) {
        authoritativeInstallmentPlan = installmentPlanSchema.parse(
          serviceType.custom_installment_plan,
        );
      } else {
        throw new Error("Installments are not enabled for this service");
      }

      installmentSchedule = calculateInstallmentSchedule(
        authoritativeInstallmentPlan,
        totalDueCents,
      );
      amountCents = installmentSchedule[0].amount_cents;
      chargedTaxAmountCents = taxAmountCents > 0
        ? Math.round(taxAmountCents * amountCents / totalDueCents)
        : 0;
    }
    logStep("Amount calculated", {
      amountCents,
      paymentType,
      totalInstallments: installmentSchedule?.length ?? 1,
    });

    // Calculate application fee using shared calculator
    const feeCalculation = calculateApplicationFee({
      amountCents,
      platformFeePercentage: PLATFORM_FEE_RATE,
    });

    logStep("Fee calculation", {
      amount: amountCents / 100,
      applicationFee: feeCalculation.applicationFeeCents / 100,
      platformFee: feeCalculation.platformFeeCents / 100,
      connectedAccountNet: feeCalculation.connectedAccountNetCents / 100,
      stripeFeePayer: feeCalculation.breakdown.stripeFeePayer,
    });

    // Get origin for redirect URLs
    const origin = resolveCheckoutOrigin(req.headers.get("origin"));

    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: paymentPolicy
        .stripePaymentMethods as Stripe.Checkout.SessionCreateParams[
          "payment_method_types"
        ],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: installmentSchedule
                ? `${serviceType.name} - payment 1 of ${installmentSchedule.length}`
                : serviceType.name,
              description: installmentSchedule
                ? `First installment for ${serviceType.name}`
                : serviceType.description || `Booking for ${serviceType.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
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
          platform_fee_percentage: PLATFORM_FEE_PERCENTAGE.toString(),
          payout_option: settings.payout_option,
          test_mode: testMode.toString(),
          payment_gate_state: gate.state,
          gate_configuration_hash: gate.configurationHash,
          ...(installmentSchedule
            ? {
              installment_number: "1",
              total_installments: installmentSchedule.length.toString(),
            }
            : {}),
          // Pay-and-book (WhatsApp agent): carry the booking id so stripe-webhook's
          // handleBookingPaymentSucceeded / handleCheckoutCompleted confirm exactly
          // this booking on payment. Omitted for the legacy conversation-only flow.
          ...(bookingId ? { booking_id: bookingId } : {}),
          // F-TAX-23: stamp the VAT onto the PI metadata exactly like
          // create-booking-payment, so the tax filing reports (which read
          // metadata.tax_amount via resolvePaymentTaxCents) see this WhatsApp charge's
          // VAT instead of 0%. Domestic installments carry only the tax allocated
          // to this first payment; taxed remote/digital installments are blocked
          // above until per-installment Stripe Tax calculations exist.
          ...(taxEnabled
            ? {
              tax_amount: (chargedTaxAmountCents / 100).toString(),
              tax_rate: serviceType.applicable_tax_rate?.toString() || "0",
              tax_behavior: serviceType.tax_behavior || "exclusive",
              manual_tax_calculated: "true",
            }
            : {}),
          // CROSS-BORDER (X3b-1): mirror create-booking-payment's PI markers so
          // stripe-webhook's ensureBookingPaymentRow can persist the X1 columns onto
          // booking_payments (customer_country, tax_breakdown, reverse_charge) and
          // recordTaxFilingTransactionIfPending can record the case-(a) filing
          // transaction. tax_breakdown is carried as a compact JSON string (Stripe
          // metadata values cap at 500 chars; a single-line per-jurisdiction breakdown
          // fits). The reverse-charge / cross-border-guard / domestic-guard markers let
          // the reports surface the right line. in_person -> none of these are set.
          supply_type: supplyType,
          ...(persistedCustomerCountry
            ? { customer_country: persistedCustomerCountry }
            : {}),
          ...(taxBreakdownToPersist
            ? {
              tax_breakdown: JSON.stringify(taxBreakdownToPersist).slice(
                0,
                500,
              ),
            }
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
      },
      metadata: {
        conversation_id: conversationId,
        service_type_id: serviceTypeId,
        payment_type: paymentType,
        test_mode: testMode.toString(),
        payment_gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
        ...(installmentSchedule
          ? {
            installment_number: "1",
            total_installments: installmentSchedule.length.toString(),
          }
          : {}),
        ...(bookingId ? { booking_id: bookingId } : {}),
      },
    };

    // R39: reserve/read the one local booking attempt before Checkout create.
    // The fingerprint binds every provider-visible money/destination parameter.
    const requestFingerprint = await fingerprintWhatsappPaymentAttempt({
      bookingId,
      platformAccountId,
      destinationAccountId: stripeAccount.stripe_account_id,
      checkoutSessionParams,
    });
    const providerRequestFingerprint = await fingerprintBookingPaymentProvider({
      bookingId,
      channel: "whatsapp",
      providerKind: "checkout_session",
      amountCents,
      totalDueCents,
      currency: "eur",
      stripeMode: testMode ? "test" : "live",
      destinationAccountId: stripeAccount.stripe_account_id,
      localAttemptFingerprint: requestFingerprint,
      checkoutSessionParams,
    });
    let activeProviderClaim:
      | Extract<
        BookingPaymentProviderClaim,
        { outcome: "claimed" | "reconcile" }
      >
      | null = null;
    const paymentSessionExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: attemptClaim, error: attemptClaimError } =
      await supabaseClient.rpc("claim_whatsapp_payment_attempt", {
        p_booking_id: bookingId,
        p_conversation_id: conversationId,
        p_service_type_id: serviceTypeId,
        p_calendar_id: conversation.calendar_id,
        p_amount_cents: amountCents,
        p_currency: "eur",
        p_stripe_mode: testMode ? "test" : "live",
        p_payment_type: paymentType,
        p_installment_plan: authoritativeInstallmentPlan,
        p_request_fingerprint: requestFingerprint,
        p_expires_at: paymentSessionExpiresAt,
        p_claim_ttl_seconds: 120,
      });
    if (attemptClaimError) {
      throw new WhatsappPaymentAttemptError(
        "WHATSAPP_PAYMENT_ATTEMPT_CLAIM_UNAVAILABLE",
        "Failed to claim the local payment attempt",
        500,
        { retryable: true },
      );
    }

    const claimGlobalProvider = async (): Promise<
      BookingPaymentProviderClaim
    > => {
      const { data, error } = await supabaseClient.rpc(
        "claim_booking_payment_provider_reservation",
        {
          p_booking_id: bookingId,
          p_channel: "whatsapp",
          p_provider_kind: "checkout_session",
          p_amount_cents: amountCents,
          p_total_due_cents: totalDueCents,
          p_currency: "eur",
          p_stripe_mode: testMode ? "test" : "live",
          p_destination_account_id: stripeAccount.stripe_account_id,
          p_platform_account_id: platformAccountId,
          p_tax_calculation_id: taxCalculationId,
          p_request_fingerprint: providerRequestFingerprint,
          p_claim_ttl_seconds: 120,
        },
      );
      if (error) {
        throw new BookingPaymentProviderError(
          "BOOKING_PROVIDER_RESERVATION_UNAVAILABLE",
          "The booking-global provider reservation could not be verified.",
          { httpStatus: 500, retryable: true },
        );
      }
      return parseBookingPaymentProviderClaim(data);
    };

    const persistedAttempt = await runWhatsappPaymentAttempt({
      claim: attemptClaim,
      providerBookingId: bookingId,
      transport: {
        createCheckoutSession: async (params, options) => {
          const checkoutParams = params as Stripe.Checkout.SessionCreateParams;
          let providerClaim = await claimGlobalProvider();
          if (
            providerClaim.outcome !== "claimed" &&
            providerClaim.outcome !== "reconcile"
          ) {
            throwForBookingPaymentProviderClaim(providerClaim);
          }

          // A provider object may already exist after an uncertain prior response.
          // Retrieve and reuse it when open; renew only after Stripe itself proves the
          // exact owned Checkout generation expired and remained unpaid.
          if (providerClaim.outcome === "reconcile") {
            let existing: Stripe.Checkout.Session;
            try {
              existing = await stripe.checkout.sessions.retrieve(
                providerClaim.providerObjectId,
              );
            } catch {
              throw new BookingPaymentProviderError(
                "BOOKING_PROVIDER_RECONCILIATION_FAILED",
                "The existing Checkout session could not be verified.",
                { httpStatus: 502, retryable: true },
              );
            }
            const existingOwnership = parseBookingPaymentProviderMetadata(
              existing.metadata,
            );
            if (
              existingOwnership?.channel !== "whatsapp" ||
              existingOwnership.providerKind !== "checkout_session" ||
              existingOwnership.generation !== providerClaim.generation ||
              existingOwnership.requestFingerprint !==
                providerClaim.requestFingerprint
            ) {
              throw new BookingPaymentProviderError(
                "BOOKING_PROVIDER_RECONCILIATION_CONFLICT",
                "The stored Checkout session does not match its reservation.",
                { retryable: false },
              );
            }
            if (
              existing.status === "open" &&
              existing.payment_status === "unpaid" &&
              typeof existing.url === "string"
            ) {
              activeProviderClaim = providerClaim;
              return { id: existing.id, url: existing.url };
            }
            if (
              existing.status === "expired" &&
              existing.payment_status === "unpaid"
            ) {
              const { data: renewedRaw, error: renewedError } =
                await supabaseClient.rpc(
                  "renew_booking_payment_provider_after_expiry",
                  {
                    p_booking_id: bookingId,
                    p_reservation_id: providerClaim.reservationId,
                    p_generation: providerClaim.generation,
                    p_request_fingerprint: providerClaim.requestFingerprint,
                    p_stripe_mode: testMode ? "test" : "live",
                    p_provider_object_id: existing.id,
                    p_provider_status: existing.status,
                    p_provider_payment_status: existing.payment_status,
                    p_claim_ttl_seconds: 120,
                  },
                );
              if (renewedError) {
                throw new BookingPaymentProviderError(
                  "BOOKING_PROVIDER_RENEWAL_UNAVAILABLE",
                  "The expired Checkout reservation could not be renewed.",
                  { httpStatus: 500, retryable: true },
                );
              }
              providerClaim = parseBookingPaymentProviderClaim(renewedRaw);
              if (providerClaim.outcome !== "claimed") {
                if (providerClaim.outcome === "reconcile") {
                  throw new BookingPaymentProviderError(
                    "BOOKING_PROVIDER_RENEWAL_CONFLICT",
                    "The expired Checkout reservation did not renew.",
                    { retryable: true },
                  );
                }
                throwForBookingPaymentProviderClaim(providerClaim);
              }
            } else {
              throw new BookingPaymentProviderError(
                "BOOKING_PROVIDER_COMPLETION_PENDING",
                "The existing Checkout session is already completing or paid.",
                { retryable: true },
              );
            }
          }

          activeProviderClaim = providerClaim;
          const providerOwnership = bookingPaymentProviderMetadata({
            channel: "whatsapp",
            providerKind: "checkout_session",
            generation: providerClaim.generation,
            requestFingerprint: providerClaim.requestFingerprint,
          });
          const providerOwnedParams = {
            ...checkoutParams,
            metadata: {
              ...checkoutParams.metadata,
              ...providerOwnership,
              whatsapp_payment_attempt_generation: String(
                options.attemptGeneration,
              ),
              whatsapp_payment_request_fingerprint: options.requestFingerprint,
            },
            payment_intent_data: {
              ...checkoutParams.payment_intent_data,
              metadata: {
                ...checkoutParams.payment_intent_data?.metadata,
                ...providerOwnership,
                whatsapp_payment_attempt_generation: String(
                  options.attemptGeneration,
                ),
                whatsapp_payment_request_fingerprint:
                  options.requestFingerprint,
              },
            },
          };
          const created = await stripe.checkout.sessions.create(
            providerOwnedParams,
            {
              idempotencyKey: providerClaim.idempotencyKey,
            },
          );
          const { data: finalized, error: finalizedError } =
            await supabaseClient.rpc(
              "finalize_booking_payment_provider_reservation",
              {
                p_booking_id: bookingId,
                p_reservation_id: providerClaim.reservationId,
                p_claim_token: providerClaim.claimToken,
                p_generation: providerClaim.generation,
                p_request_fingerprint: providerClaim.requestFingerprint,
                p_stripe_mode: testMode ? "test" : "live",
                p_provider_object_id: created.id,
                p_provider_url: created.url,
                p_provider_expires_at: new Date(
                  created.expires_at * 1000,
                ).toISOString(),
              },
            );
          if (
            finalizedError || !finalized ||
            !["created", "replay"].includes(finalized.outcome) ||
            finalized.provider_object_id !== created.id
          ) {
            throw new BookingPaymentProviderError(
              "BOOKING_PROVIDER_FINALIZATION_UNCERTAIN",
              "The Checkout session was not durably attached. Retry safely.",
              { httpStatus: 500, retryable: true },
            );
          }
          return created;
        },
        retrieveCheckoutSession: async (sessionId) => {
          const providerSession = await stripe.checkout.sessions.retrieve(
            sessionId,
          );
          return {
            id: providerSession.id,
            url: providerSession.url,
            status: providerSession.status as "open" | "complete" | "expired",
            paymentStatus: providerSession.payment_status as
              | "paid"
              | "unpaid"
              | "no_payment_required",
            expiresAt: new Date(
              providerSession.expires_at * 1000,
            ).toISOString(),
            metadata: providerSession.metadata ?? {},
          };
        },
        expireCheckoutSession: async (sessionId) => {
          if (!activeProviderClaim) {
            throw new Error("BOOKING_PROVIDER_CLEANUP_IDENTITY_MISSING");
          }
          const { data: queued, error: queueError } = await supabaseClient.rpc(
            "require_booking_payment_provider_cleanup",
            {
              p_booking_id: bookingId,
              p_reservation_id: activeProviderClaim.reservationId,
              p_generation: activeProviderClaim.generation,
              p_request_fingerprint: activeProviderClaim.requestFingerprint,
              p_provider_object_id: sessionId,
              p_reason_code: "WHATSAPP_LOCAL_ATTEMPT_FINALIZE_CONFLICT",
            },
          );
          if (queueError || queued?.outcome !== "queued") {
            throw new Error("BOOKING_PROVIDER_CLEANUP_QUEUE_UNCERTAIN");
          }
          logStep("Queued fenced cleanup for unledgered Checkout session", {
            sessionId,
          });
        },
      },
      createParams: checkoutSessionParams,
      // Keep the historical per-booking Stripe key. A retry after an uncertain
      // provider response recovers the same Checkout session within one claim
      // generation. A lease takeover gets a new generation suffix so an old loser
      // can never expire the replacement link.
      idempotencyKey: `whatsapp-booking-checkout-${bookingId}`,
      reconcile: async (providerSession) => {
        const { data, error } = await supabaseClient.rpc(
          "reconcile_or_renew_whatsapp_payment_attempt",
          {
            p_booking_id: bookingId,
            p_attempt_generation: providerSession.attemptGeneration,
            p_request_fingerprint: providerSession.requestFingerprint,
            p_stripe_mode: testMode ? "test" : "live",
            p_stripe_session_id: providerSession.stripeSessionId,
            p_provider_status: providerSession.providerStatus,
            p_provider_payment_status: providerSession.providerPaymentStatus,
            p_provider_expires_at: providerSession.providerExpiresAt,
            p_payment_url: providerSession.paymentUrl,
            p_new_expires_at: paymentSessionExpiresAt,
            p_claim_ttl_seconds: 120,
          },
        );
        if (error) {
          throw new WhatsappPaymentAttemptError(
            "WHATSAPP_PAYMENT_RECONCILIATION_UNAVAILABLE",
            "Failed to reconcile the stored Stripe payment session",
            500,
            { retryable: true },
          );
        }
        return data;
      },
      finalize: async (providerSession) => {
        const { data, error } = await supabaseClient.rpc(
          "finalize_whatsapp_payment_attempt",
          {
            p_booking_id: bookingId,
            p_claim_token: providerSession.claimToken,
            p_attempt_generation: providerSession.attemptGeneration,
            p_request_fingerprint: providerSession.requestFingerprint,
            p_stripe_mode: testMode ? "test" : "live",
            p_stripe_session_id: providerSession.stripeSessionId,
            p_payment_url: providerSession.paymentUrl,
          },
        );
        if (error) {
          throw new WhatsappPaymentAttemptError(
            "WHATSAPP_PAYMENT_ATTEMPT_FINALIZE_UNAVAILABLE",
            "Failed to finalize the local payment attempt",
            500,
            { retryable: true },
          );
        }
        return data;
      },
    });
    const { data: verifiedProvider, error: verifiedProviderError } =
      await supabaseClient.rpc(
        "verify_booking_payment_provider_reservation",
        {
          p_booking_id: bookingId,
          p_channel: "whatsapp",
          p_provider_kind: "checkout_session",
          p_amount_cents: amountCents,
          p_total_due_cents: totalDueCents,
          p_currency: "eur",
          p_stripe_mode: testMode ? "test" : "live",
          p_destination_account_id: stripeAccount.stripe_account_id,
          p_platform_account_id: platformAccountId,
          p_tax_calculation_id: taxCalculationId,
          p_request_fingerprint: providerRequestFingerprint,
          p_provider_object_id: persistedAttempt.stripeSessionId,
        },
      );
    if (
      verifiedProviderError || verifiedProvider?.outcome !== "verified" ||
      verifiedProvider.provider_object_id !== persistedAttempt.stripeSessionId
    ) {
      throw new BookingPaymentProviderError(
        "BOOKING_PROVIDER_REPLAY_NOT_VERIFIED",
        "The payment link is not backed by the booking-global reservation.",
        { httpStatus: 500, retryable: true },
      );
    }
    const persistedPaymentSession = {
      id: persistedAttempt.paymentSessionId,
      stripe_session_id: persistedAttempt.stripeSessionId,
      payment_url: persistedAttempt.paymentUrl,
      created_at: persistedAttempt.createdAt,
      amount_cents: persistedAttempt.amountCents,
      payment_status: persistedAttempt.paymentStatus,
      attempt_generation: persistedAttempt.attemptGeneration,
    };

    logStep(
      persistedAttempt.replayed
        ? "Reused exact stored Checkout session"
        : "Checkout session created and stored",
      {
        sessionId: persistedPaymentSession.stripe_session_id,
        applicationFee: feeCalculation.applicationFeeCents,
      },
    );

    if (installmentSchedule) {
      const immediateDueDate = persistedPaymentSession?.created_at;
      if (
        typeof immediateDueDate !== "string" ||
        !Number.isFinite(new Date(immediateDueDate).getTime())
      ) {
        throw new Error("Payment session creation time is unavailable");
      }
      const installmentRows = installmentSchedule.map((installment, index) => {
        const dueDate = installment.timing === "appointment"
          ? bookingStartTime
          : immediateDueDate;
        return {
          booking_id: bookingId,
          whatsapp_session_id: persistedPaymentSession.id,
          installment_number: index + 1,
          total_installments: installmentSchedule.length,
          amount_cents: installment.amount_cents,
          currency: "eur",
          due_date: dueDate,
          payment_timing: installment.timing,
          payment_method: installment.payment_method,
          status: "pending",
        };
      });
      // Insert-only is intentional. Upsert used to replay `status: pending` over a
      // webhook-confirmed paid/refunded row. A unique conflict is accepted only when
      // the immutable schedule is an exact replay; lifecycle state is never rewritten.
      let { error: installmentError } = await supabaseClient
        .from("installment_payments")
        .insert(installmentRows);
      if (installmentError?.code === "23505") {
        const { data: existingInstallments, error: existingInstallmentsError } =
          await supabaseClient
            .from("installment_payments")
            .select(
              "booking_id,whatsapp_session_id,installment_number,total_installments,amount_cents,currency,due_date,payment_timing,payment_method,status",
            )
            .eq("booking_id", bookingId)
            .order("installment_number", { ascending: true });
        if (
          !existingInstallmentsError &&
          installmentScheduleIdentityMatches(
            existingInstallments ?? [],
            installmentRows,
          )
        ) {
          installmentError = null;
          logStep(
            "Reused exact installment schedule without rewriting lifecycle state",
            {
              bookingId,
            },
          );
        }
      }
      if (installmentError) {
        logStep("Error storing installment schedule", {
          error: installmentError.message,
        });
        const { data: queued, error: queueError } = await supabaseClient.rpc(
          "require_booking_payment_provider_cleanup",
          {
            p_booking_id: bookingId,
            p_reservation_id: verifiedProvider.reservation_id,
            p_generation: verifiedProvider.generation,
            p_request_fingerprint: providerRequestFingerprint,
            p_provider_object_id: persistedPaymentSession.stripe_session_id,
            p_reason_code: "INSTALLMENT_SCHEDULE_PERSISTENCE_FAILED",
          },
        );
        if (queueError || queued?.outcome !== "queued") {
          throw new BookingPaymentProviderError(
            "BOOKING_PROVIDER_CLEANUP_QUEUE_UNCERTAIN",
            "Installment persistence failed and provider cleanup could not be queued.",
            { httpStatus: 500, retryable: true },
          );
        }
        await supabaseClient
          .from("whatsapp_payment_sessions")
          .update({ payment_status: "failed" })
          .eq("id", persistedPaymentSession.id);
        throw new Error("Failed to store installment schedule");
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: persistedPaymentSession.payment_url,
        session_id: persistedPaymentSession.stripe_session_id,
        payment_session_id: persistedPaymentSession.id,
        attempt_generation: persistedPaymentSession.attempt_generation,
        test_mode: testMode,
        application_fee: feeCalculation.applicationFeeCents,
        fee_breakdown: feeCalculation,
        payment_methods: paymentPolicy.stripePaymentMethods,
        gate_state: gate.state,
        gate_configuration_hash: gate.configurationHash,
        installment_schedule: installmentSchedule,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const attemptError = error instanceof WhatsappPaymentAttemptError
      ? error
      : null;
    const providerError = error instanceof BookingPaymentProviderError
      ? error
      : null;
    const typedError = providerError ?? attemptError;
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", {
      message,
      ...(typedError ? { code: typedError.code } : {}),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        ...(typedError
          ? {
            code: typedError.code,
            booking_disposition: typedError.bookingDisposition,
            retryable: typedError.retryable,
          }
          : {
            // Unknown failures provide no durable proof that provider creation
            // did not happen. Preserve the booking by default.
            booking_disposition: "preserve",
            retryable: true,
          }),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: typedError?.httpStatus ?? 500,
      },
    );
  }
});
