import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { calculateApplicationFee } from '../_shared/feeCalculator.ts'
import { validateStripeMode } from '../_shared/stripeValidation.ts'
import {
  calculateTax,
  type TaxBreakdownEntry,
  CROSS_BORDER_UNAVAILABLE_STATUS,
  CROSS_BORDER_UNAVAILABLE_MESSAGE,
  DOMESTIC_RATE_UNAVAILABLE_STATUS,
  DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
  VAT_ID_UNVERIFIED_STATUS,
  VAT_ID_UNVERIFIED_MESSAGE,
} from '../_shared/taxCalc.ts'

// VIES-trust policy flag (X4), identical to create-booking-payment so BOTH charge paths
// honor the same owner policy. Default OFF = Stripe format-only reverse-charge (today's
// behavior). Flip to ON (TAX_REQUIRE_VIES=true edge secret) to require a real VIES
// confirmation before honoring a reverse-charge.
function requireViesPolicy(): boolean {
  const v = (Deno.env.get('TAX_REQUIRE_VIES') || '').trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

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
    if (bookingId) {
      const { data: bk } = await supabaseClient
        .from('bookings')
        .select('calendar_id, customer_country, customer_vat_id, total_price')
        .eq('id', bookingId)
        .maybeSingle();
      if (!bk || bk.calendar_id !== conversation.calendar_id) {
        throw new Error('bookingId does not belong to this conversation');
      }
      bookingCustomerCountry = typeof bk.customer_country === 'string' && bk.customer_country.length === 2
        ? bk.customer_country.toUpperCase()
        : null;
      bookingCustomerVatId = typeof bk.customer_vat_id === 'string' && bk.customer_vat_id.trim().length > 0
        ? bk.customer_vat_id.trim()
        : null;
      bookingTotalPrice = typeof bk.total_price === 'number'
        ? bk.total_price
        : (typeof bk.total_price === 'string' && bk.total_price !== '' ? Number(bk.total_price) : null);
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

    // R130 (PRICE-INTEGRITY fix): the AUTHORITATIVE price for this charge is the booking's own
    // total_price SNAPSHOT (what was actually confirmed/disclosed in the conversation at commit
    // time), never a fresh live re-read of service_types.price -- a price the owner changes AFTER
    // the customer confirmed must not silently change what gets charged. Falls back to the live
    // service price ONLY when no snapshot exists (a booking created before this fix shipped, or a
    // legacy conversation-only flow with no bookingId at all), so this never breaks pre-existing
    // pending pay-and-book bookings mid-flight; every booking created going forward always has a
    // real snapshot, so this fallback is a one-time transitional safety net, not the steady state.
    const chargePrice = typeof bookingTotalPrice === 'number' && !Number.isNaN(bookingTotalPrice)
      ? bookingTotalPrice
      : serviceType.price;
    logStep("Charge price resolved", { chargePrice, fromSnapshot: bookingTotalPrice != null, liveServicePrice: serviceType.price });

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
    const taxEnabled = !!(serviceType.tax_enabled && serviceType.tax_code && serviceType.applicable_tax_rate);
    if (taxEnabled) {
      const taxRate = serviceType.applicable_tax_rate / 100;
      if (serviceType.tax_behavior === 'inclusive') {
        // Tax is already inside the price; report only the tax portion of the gross.
        taxAmountCents = Math.round((chargePrice * taxRate / (1 + taxRate)) * 100);
      } else {
        // Tax is exclusive: add it on top and report the added VAT.
        taxAmountCents = Math.round(chargePrice * taxRate * 100);
        amountCents = Math.round(chargePrice * 100) + taxAmountCents;
      }
      logStep("Tax applied", { taxRate: serviceType.applicable_tax_rate, behavior: serviceType.tax_behavior, amountCents, taxAmountCents });
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
    let taxCalculationId: string | null = null;        // -> metadata[tax_calculation]
    let taxBreakdownToPersist: TaxBreakdownEntry[] | null = null;
    let reverseChargeApplied = false;
    let crossBorderGuardTripped = false;                // not_collecting + cross-border
    let domesticGuardTripped = false;                   // (CB-F-03) domestic, no usable rate
    let vatIdRejected = false;                           // supplied VAT id was format-invalid
    let persistedCustomerCountry: string | null = null;
    let taxTransactionPending = false;                  // case (a) collecting -> create_from_calculation on success

    const supplyType: string = serviceType.supply_type ?? 'in_person';
    const isRemoteSupply = supplyType === 'remote_service' || supplyType === 'digital';
    // The merchant's home country (where Stripe Tax is registered); business_country is
    // the existing source of truth on the service, defaulting NL (mirrors X2).
    const merchantCountry = (serviceType.business_country || 'NL').toUpperCase();

    // The cross-border calc applies to a FULL taxed remote payment. An installment
    // charges a partial amount whose per-payment VAT split is genuinely ambiguous and out
    // of this fix's scope (the same gate as F-TAX-25 on the metadata stamp), so an
    // installment keeps the existing behavior (no cross-border calc, no tax metadata).
    if (isRemoteSupply && serviceType.tax_enabled && serviceType.tax_code && paymentType !== 'installment') {
      if (!bookingCustomerCountry) {
        // A remote/digital taxable service needs the customer country to compute VAT.
        // Fail loud rather than silently apply the wrong (domestic) rate. X3b-2 will make
        // the agent capture this onto the booking row before invoking this handler.
        return new Response(
          JSON.stringify({
            success: false,
            error: 'customer_country is required on the booking for a remote/digital service (cross-border VAT cannot be computed without it)',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      persistedCustomerCountry = bookingCustomerCountry;
      const taxBehavior: 'inclusive' | 'exclusive' = serviceType.tax_behavior === 'inclusive' ? 'inclusive' : 'exclusive';
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
          currency: 'eur',
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
          supplyType, customerCountry: bookingCustomerCountry, state: calc.collectionState,
          taxCents: calc.taxAmountCents, context: calc.context, calc: calc.calculationId, vatIdRejected,
        });

        if (calc.collectionState === 'collecting') {
          // (a) Positive collectible rate -> use Stripe's figure; record a filing
          // transaction after payment success (registration-gated, D-CB-REG today).
          taxAmountCents = calc.taxAmountCents;
          amountCents = taxBehavior === 'inclusive' ? lineAmountCents : calc.amountTotalCents;
          taxTransactionPending = true;
        } else if (calc.collectionState === 'reverse_charge') {
          // (b) Valid EU B2B reverse-charge -> 0%, marked. No tax added.
          taxAmountCents = 0;
          amountCents = lineAmountCents;
          reverseChargeApplied = true;
        } else if (calc.collectionState === 'vat_id_unverified') {
          // (b') (X4 VIES, only when the policy is ON) format-valid eu_vat that VIES could
          // not confirm. Never a silent 0% reverse-charge: fail the charge loudly so the
          // booking is not completed on an unconfirmed id.
          logStep("VAT-ID UNVERIFIED GUARD (require-VIES on)", { customerCountry: bookingCustomerCountry, message: VAT_ID_UNVERIFIED_MESSAGE });
          return new Response(
            JSON.stringify({ success: false, error: VAT_ID_UNVERIFIED_MESSAGE, code: VAT_ID_UNVERIFIED_STATUS }),
            { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        } else if (merchantCountry === bookingCustomerCountry) {
          // (c) not_collecting AND destination == merchant country (NL): manual domestic
          // fallback. The manual block above set taxAmountCents ONLY when applicable_tax_rate
          // is positive. CB-F-03: if it did not (NULL/0 rate), fire the DOMESTIC hard guard
          // instead of silently charging 0% domestic VAT.
          if (taxEnabled && taxAmountCents > 0) {
            logStep("Cross-border not_collecting domestic -> manual NL fallback", {
              customerCountry: bookingCustomerCountry, taxAmount: taxAmountCents / 100,
            });
          } else {
            domesticGuardTripped = true;
            taxAmountCents = 0;
            amountCents = lineAmountCents;
            taxBreakdownToPersist = [
              { amountCents: 0, inclusive: false, taxabilityReason: DOMESTIC_RATE_UNAVAILABLE_STATUS, country: bookingCustomerCountry, percentageDecimal: null, taxType: null },
              ...calc.breakdown,
            ];
            logStep("DOMESTIC RATE GUARD (CB-F-03: no usable domestic rate, never silent 0%)", {
              customerCountry: bookingCustomerCountry, merchantCountry,
              applicableTaxRate: serviceType.applicable_tax_rate ?? null, message: DOMESTIC_RATE_UNAVAILABLE_MESSAGE,
            });
          }
        } else {
          // (d) not_collecting AND cross-border: the HARD GUARD. Never a silent clean 0%.
          // The charge proceeds (destination charge) but the tax outcome is flagged so
          // X6/reports surface "register for OSS" instead of a fake 0% VAT line.
          crossBorderGuardTripped = true;
          taxAmountCents = 0;
          amountCents = lineAmountCents;
          taxBreakdownToPersist = [
            { amountCents: 0, inclusive: false, taxabilityReason: CROSS_BORDER_UNAVAILABLE_STATUS, country: bookingCustomerCountry, percentageDecimal: null, taxType: null },
            ...calc.breakdown,
          ];
          logStep("CROSS-BORDER GUARD", { customerCountry: bookingCustomerCountry, merchantCountry, message: CROSS_BORDER_UNAVAILABLE_MESSAGE });
        }
      } catch (taxErr) {
        // A Stripe Tax API failure on a remote service must not silently produce a wrong
        // (domestic) VAT. Fail the charge loudly so the issue is visible.
        logStep("Cross-border tax calc FAILED", { error: (taxErr as Error)?.message });
        return new Response(
          JSON.stringify({ success: false, error: `Cross-border tax calculation failed: ${(taxErr as Error)?.message}` }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
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
          // For a cross-border remote service taxAmountCents is the Stripe-computed VAT
          // (0 on the guard / reverse-charge cases), so the reports read the correct line.
          ...(taxEnabled && paymentType !== 'installment'
            ? {
                tax_amount: (taxAmountCents / 100).toString(),
                tax_rate: serviceType.applicable_tax_rate?.toString() || '0',
                tax_behavior: serviceType.tax_behavior || 'exclusive',
                manual_tax_calculated: 'true',
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
          ...(persistedCustomerCountry ? { customer_country: persistedCustomerCountry } : {}),
          ...(taxBreakdownToPersist ? { tax_breakdown: JSON.stringify(taxBreakdownToPersist).slice(0, 500) } : {}),
          ...(taxCalculationId ? { tax_calculation: taxCalculationId } : {}),
          ...(taxTransactionPending ? { tax_transaction_pending: 'true' } : {}),
          ...(reverseChargeApplied ? { reverse_charge: 'true' } : {}),
          ...(crossBorderGuardTripped ? { cross_border_status: CROSS_BORDER_UNAVAILABLE_STATUS } : {}),
          ...(domesticGuardTripped ? { domestic_status: DOMESTIC_RATE_UNAVAILABLE_STATUS } : {}),
          ...(vatIdRejected ? { vat_id_rejected: 'true' } : {}),
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
