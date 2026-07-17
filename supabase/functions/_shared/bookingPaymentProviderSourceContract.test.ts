import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";

const decoder = new TextDecoder();
async function source(relativePath: string): Promise<string> {
  return decoder.decode(
    await Deno.readFile(new URL(relativePath, import.meta.url)),
  );
}

Deno.test("web claims and finalizes the global authority before returning a client secret", async () => {
  const web = await source("../create-booking-payment/index.ts");
  const claim = web.indexOf('"claim_booking_payment_provider_reservation"');
  const create = web.indexOf("stripe.paymentIntents.create");
  const finalize = web.indexOf(
    '"finalize_booking_payment_provider_reservation"',
  );
  const response = web.indexOf("client_secret: paymentIntent.client_secret");
  assert(claim >= 0 && create > claim);
  assert(finalize > create && response > finalize);
  assert(web.includes("p_total_due_cents: amount"));
  assert(web.includes(
    "p_destination_account_id: stripeAccount.stripe_account_id",
  ));
});

Deno.test("WhatsApp claims the same authority before Checkout create and verifies before response", async () => {
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  const claim = whatsapp.indexOf(
    '"claim_booking_payment_provider_reservation"',
  );
  const create = whatsapp.indexOf("stripe.checkout.sessions.create");
  const finalize = whatsapp.indexOf(
    '"finalize_booking_payment_provider_reservation"',
  );
  const verify = whatsapp.indexOf(
    '"verify_booking_payment_provider_reservation"',
  );
  const response = whatsapp.lastIndexOf(
    "payment_url: persistedPaymentSession.payment_url",
  );
  assert(claim >= 0 && create > claim);
  assert(finalize > create && verify > finalize && response > verify);
  assert(whatsapp.includes("p_total_due_cents: totalDueCents"));
  assert(whatsapp.includes(
    "p_destination_account_id: stripeAccount.stripe_account_id",
  ));
});

Deno.test("both provider objects carry settlement ownership metadata", async () => {
  const web = await source("../create-booking-payment/index.ts");
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  for (
    const marker of [
      "booking_payment_provider_channel",
      "booking_payment_provider_kind",
      "booking_payment_provider_generation",
      "booking_payment_provider_fingerprint",
    ]
  ) {
    assert(web.includes("bookingPaymentProviderMetadata"));
    assert(whatsapp.includes("bookingPaymentProviderMetadata"));
    const helper = await source("./bookingPaymentProviderReservation.ts");
    assert(helper.includes(marker));
  }
});

Deno.test("webhook authorizes provider settlement before ledger settlement", async () => {
  const webhook = await source("../stripe-webhook/index.ts");
  const authorize = webhook.indexOf(
    '"authorize_booking_payment_provider_settlement"',
  );
  const ensure = webhook.indexOf("await ensureBookingPaymentRow(", authorize);
  const finalize = webhook.indexOf(
    '"finalize_booking_payment_success_v2"',
    ensure,
  );
  assert(authorize >= 0 && ensure > authorize && finalize > ensure);
  assert(webhook.includes("parseBookingPaymentProviderMetadata"));
  assert(webhook.includes("checkoutSessionId"));
});

Deno.test("WhatsApp booking cancellation requires exact database cancel_safe proof", async () => {
  const tools = await source("../whatsapp-agent/tools.ts");
  const preserve = tools.indexOf(
    'paymentFailure?.booking_disposition !== "cancel_safe"',
  );
  const cancellation = tools.indexOf(
    '.update({ status: "cancelled" })',
    preserve,
  );
  assert(preserve >= 0 && cancellation > preserve);
  assert(tools.includes("booking_preserved: true"));
  assert(tools.includes("PAYMENT_PROVIDER_STATE_UNCERTAIN"));
});

Deno.test("cleanup rechecks its database fence immediately before Stripe mutation", async () => {
  const cleanup = await source("../process-booking-provider-cleanup/index.ts");
  const rpc = cleanup.indexOf(
    '"verify_booking_payment_provider_cleanup_claim"',
  );
  const fence = cleanup.indexOf("if (!await verifySideEffectFence())");
  const expire = cleanup.indexOf(
    "stripe.checkout.sessions.expire",
    fence,
  );
  const cancel = cleanup.indexOf("stripe.paymentIntents.cancel", fence);
  assert(rpc >= 0 && fence >= 0);
  assert(expire > fence && cancel > fence);
  assert(cleanup.includes("PROVIDER_CLEANUP_FENCE_LOST"));
});

Deno.test("R48 first claim is bound to the canonical owner mode and platform destination", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  const web = await source("../create-booking-payment/index.ts");
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  assert(migration.includes("BOOKING_PROVIDER_DESTINATION_NOT_CANONICAL"));
  assert(migration.includes("p_platform_account_id"));
  assert(migration.includes("v_old.platform_account_id"));
  assert(web.includes("p_platform_account_id: platformAccountId"));
  assert(whatsapp.includes("p_platform_account_id: platformAccountId"));
});

Deno.test("R48 remote gross ceiling fails closed until provider-authenticated tax proof exists", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  const web = await source("../create-booking-payment/index.ts");
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  assert(migration.includes(
    "BOOKING_PROVIDER_REMOTE_GROSS_REQUIRES_VERIFIED_PROVIDER_ATTESTATION",
  ));
  assert(migration.includes("tax_calculation_id"));
  assert(web.includes("p_tax_calculation_id: taxCalculationId"));
  assert(whatsapp.includes("p_tax_calculation_id: taxCalculationId"));
});

Deno.test("R48 blocks unresolved legacy provider objects instead of adopting metadata-less objects", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  assert(
    migration.includes("R48_LEGACY_ACTIVE_PROVIDER_OBJECT_REQUIRES_RESOLUTION"),
  );
  assertEquals(
    migration.includes("r48-web-backfill"),
    false,
  );
  assertEquals(
    migration.includes("r48-whatsapp-backfill"),
    false,
  );
});

Deno.test("R48 Checkout async failure releases exact provider ownership before retry", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  const webhook = await source("../stripe-webhook/index.ts");
  assert(migration.includes("release_booking_payment_provider_after_failure"));
  assert(webhook.includes('"release_booking_payment_provider_after_failure"'));
  const release = webhook.indexOf(
    '"release_booking_payment_provider_after_failure"',
  );
  const failedState = webhook.indexOf(
    '"record_booking_checkout_failure"',
    release,
  );
  assert(release >= 0 && failedState > release);
});

Deno.test("all ad-hoc provider cleanup is removed from request paths", async () => {
  const web = await source("../create-booking-payment/index.ts");
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  assertEquals(web.includes("stripe.paymentIntents.cancel"), false);
  assertEquals(whatsapp.includes("stripe.checkout.sessions.expire"), false);
});

Deno.test("R48 cleanup has bounded retries, explicit escalation and indexed expired claims", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  const cleanup = await source("../process-booking-provider-cleanup/index.ts");
  assert(migration.includes("BOOKING_PROVIDER_CLEANUP_ATTEMPTS_EXHAUSTED"));
  assert(
    migration.includes("booking_payment_provider_cleanup_claim_expiry_idx"),
  );
  assert(migration.includes("booking_provider_cleanup_dead_letter"));
  assert(migration.includes("'cleanup_worker'"));
  assert(cleanup.includes("human_action_required"));
  assert(cleanup.includes("finalizeBookingProviderCleanupOutcome"));
});

Deno.test("R48 prevents booking close while provider creation is unresolved", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  assert(migration.includes("BOOKING_PROVIDER_CREATE_IN_PROGRESS"));
});

Deno.test("R48 settlement supersedes pending cleanup crash-idempotently", async () => {
  const migration = await source(
    "../../migrations/20260717043000_R48_booking_global_provider_reservation.sql",
  );
  assert(migration.includes("BOOKING_PROVIDER_SETTLEMENT_CLEANUP_SUPERSEDED"));
  assert(migration.includes("R48_EXPLICIT_CLEANUP_LOCK_ORDER"));
  assert(migration.includes("R48_REQUIRE_CLEANUP_LOCK_ORDER"));
});

Deno.test("WhatsApp reads typed non-2xx function decisions from the invoke error response", async () => {
  const tools = await source("../whatsapp-agent/tools.ts");
  assert(tools.includes("readFunctionInvokeFailure"));
  assert(tools.includes("await readFunctionInvokeFailure(pay, payErr)"));
});

Deno.test("the grants gate protects active v2 settlement and rejects narrowing", async () => {
  const grants = await source("../../../security/grants_check.sh");
  assert(grants.includes("finalize_booking_payment_success_v2"));
  assert(grants.includes("release_booking_payment_provider_after_failure"));
  assert(grants.includes("security_mode_changes"));
  assert(
    grants.includes(
      "if widened or narrowed or added or removed or security_mode_changes:",
    ),
  );
});

Deno.test("retired duplicate installment endpoint still creates no provider object", async () => {
  const retired = await source("../create-installment-payment/index.ts");
  assertEquals(retired.includes("paymentIntents.create"), false);
  assertEquals(retired.includes("checkout.sessions.create"), false);
  assert(retired.includes("INSTALLMENT_ENDPOINT_RETIRED"));
});
