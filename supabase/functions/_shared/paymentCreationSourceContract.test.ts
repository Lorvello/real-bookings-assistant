import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";

async function source(relativePath: string): Promise<string> {
  return await Deno.readTextFile(
    new URL(relativePath, import.meta.url),
  );
}

function assertGateBeforeProviderCreate(
  code: string,
  path: "booking" | "subscription",
  providerMarker: string,
) {
  const gateIndex = code.indexOf("evaluatePaymentLaunchGate(");
  const providerIndex = code.indexOf(providerMarker);
  assert(gateIndex >= 0, `missing ${path} payment launch gate`);
  assert(
    code.slice(gateIndex, gateIndex + 180).includes(`"${path}"`),
    `launch gate does not select the ${path} path`,
  );
  assert(providerIndex >= 0, `missing provider marker ${providerMarker}`);
  assert(
    gateIndex < providerIndex,
    `${path} gate must execute before ${providerMarker}`,
  );
}

Deno.test("every active money-creation route gates before Stripe creation", async () => {
  const booking = await source("../create-booking-payment/index.ts");
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  const subscription = await source("../create-checkout/index.ts");

  assertGateBeforeProviderCreate(
    booking,
    "booking",
    "stripe.paymentIntents.create",
  );
  assertGateBeforeProviderCreate(
    whatsapp,
    "booking",
    "stripe.checkout.sessions.create",
  );
  assertGateBeforeProviderCreate(
    subscription,
    "subscription",
    "stripe.checkout.sessions.create",
  );
});

Deno.test("retired duplicate installment endpoint cannot create money", async () => {
  const retired = await source("../create-installment-payment/index.ts");
  assertStringIncludes(retired, "INSTALLMENT_ENDPOINT_RETIRED");
  assertStringIncludes(retired, "status: 410");
  assertEquals(retired.includes("new Stripe"), false);
  assertEquals(retired.includes(".create("), false);
});

Deno.test("saving installment settings has no Stripe provider side effect", async () => {
  const settings = await source("../manage-installment-settings/index.ts");
  assertEquals(settings.includes("new Stripe"), false);
  assertEquals(settings.includes("stripe.prices.create"), false);
  assertStringIncludes(settings, "calculateInstallmentSchedule");
});

Deno.test("booking charge routes use the locked 1.9 percent source", async () => {
  for (
    const path of [
      "../create-booking-payment/index.ts",
      "../whatsapp-payment-handler/index.ts",
    ]
  ) {
    const code = await source(path);
    assertStringIncludes(code, "PLATFORM_FEE_RATE");
    assertStringIncludes(code, "PLATFORM_FEE_PERCENTAGE");
    assertEquals(
      code.includes("settings.platform_fee_percentage"),
      false,
      `${path} still trusts a mutable fee`,
    );
  }
});

Deno.test("booking charge routes bind Connect destinations to the active platform", async () => {
  for (
    const path of [
      "../create-booking-payment/index.ts",
      "../whatsapp-payment-handler/index.ts",
    ]
  ) {
    const code = await source(path);
    assertStringIncludes(code, "stripe.accounts.retrieve()");
    assertStringIncludes(
      code,
      '.eq("platform_account_id", platformAccountId)',
    );
    const retrieveIndex = code.indexOf("stripe.accounts.retrieve()");
    const destinationIndex = code.indexOf('.from("business_stripe_accounts")');
    assert(
      retrieveIndex >= 0 && retrieveIndex < destinationIndex,
      `${path} must resolve the platform before selecting a destination`,
    );
  }
});

Deno.test("public booking payment initialization recovers an exact local idempotency replay", async () => {
  const booking = await source("../create-booking-payment/index.ts");
  assertStringIncludes(booking, 'paymentError?.code === "23505"');
  assertStringIncludes(booking, "bookingPaymentLedgerMatches");
  assertStringIncludes(booking, "BOOKING_PAYMENT_LEDGER_CONFLICT");
  assertStringIncludes(booking, "Reused matching payment ledger row");
});

Deno.test("public booking payment initialization cannot race a cancellation", async () => {
  const booking = await source("../create-booking-payment/index.ts");
  const providerCreate = booking.indexOf("stripe.paymentIntents.create");
  const compareAndSet = booking.indexOf(
    '.eq("status", booking.status)',
    providerCreate,
  );
  const cleanupQueue = booking.indexOf(
    '"require_booking_payment_provider_cleanup"',
    compareAndSet,
  );
  assert(providerCreate >= 0 && compareAndSet > providerCreate);
  assert(cleanupQueue > compareAndSet);
  assertEquals(booking.includes("stripe.paymentIntents.cancel"), false);
  assertStringIncludes(booking, "isReusablePendingPaymentInitialization");
  assert(
    booking.indexOf("isReusablePendingPaymentInitialization", compareAndSet) <
      cleanupQueue,
    "a normal concurrent replay must be classified before cleanup is queued",
  );
  assertStringIncludes(
    booking,
    "BOOKING_CHANGED_DURING_PAYMENT_INITIALIZATION",
  );
  assertStringIncludes(booking, "cleanup_queued: true");
});

Deno.test("pay on site cannot erase retained-money or refund-required truth", async () => {
  const booking = await source("../create-booking-payment/index.ts");
  const terminalGate = booking.indexOf('"partially_refunded"');
  const deferWrite = booking.indexOf('payment_status: "pay_on_site"');
  assert(terminalGate >= 0 && deferWrite > terminalGate);
  assertStringIncludes(booking, '"refund_required"');
});

Deno.test("WhatsApp installment replay is insert-only and identity checked", async () => {
  const whatsapp = await source("../whatsapp-payment-handler/index.ts");
  const schedule = whatsapp.indexOf('.from("installment_payments")');
  const insert = whatsapp.indexOf(".insert(installmentRows)", schedule);
  assert(schedule >= 0 && insert > schedule);
  assertStringIncludes(whatsapp, "installmentScheduleIdentityMatches");
  assertStringIncludes(whatsapp, "persistedPaymentSession?.created_at");
  assertStringIncludes(whatsapp, ": immediateDueDate;");
  assertStringIncludes(whatsapp, 'installmentError?.code === "23505"');
  assertEquals(
    whatsapp.slice(schedule, insert + 40).includes(".upsert("),
    false,
  );
});
