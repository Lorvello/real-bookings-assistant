import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";

const source = await Deno.readTextFile(
  new URL("../process-booking-reminders/index.ts", import.meta.url),
);
const requestSource = await Deno.readTextFile(
  new URL("../process-booking-reminders/request.ts", import.meta.url),
);
const refundCheckSource = await Deno.readTextFile(
  new URL("./stripeRefundCheck.ts", import.meta.url),
);
const whatsappSendSource = await Deno.readTextFile(
  new URL("./whatsappSend.ts", import.meta.url),
);

Deno.test("reminder mutation endpoint and request body fail closed", () => {
  assertStringIncludes(source, 'req.method !== "POST"');
  assertStringIncludes(source, "status: 405");
  assertStringIncludes(source, 'error: "invalid_json"');
  assertStringIncludes(source, 'error: "invalid_request"');
  assertStringIncludes(source, "parseReminderProcessRequest(rawBody)");
  assertStringIncludes(requestSource, 'key !== "booking_id"');
  assertStringIncludes(requestSource, "UUID.test(input.booking_id)");
});

Deno.test("reminder record-only mode is server-configured and production-closed", () => {
  assertStringIncludes(source, "resolveReminderDeliveryMode(environment())");
  assertEquals(source.includes("x-test-stub-whatsapp"), false);
  assertEquals(source.includes("x-test-stub-email"), false);
});

Deno.test("v2 reconciliation, bounded batching, and token-fenced claims are mandatory", () => {
  assertStringIncludes(source, '"reconcile_booking_reminders_v2"');
  assertStringIncludes(source, '"get_due_booking_reminders_v2"');
  assertStringIncludes(source, '"claim_booking_reminder_v2"');
  assertStringIncludes(source, "REMINDER_RECONCILE_FAILED");
  assertStringIncludes(source, "REMINDER_CLAIM_FAILED");
  assertStringIncludes(source, "const MAX_BATCH_SIZE = 10");
  assertStringIncludes(source, "const PROCESSING_BUDGET_MS = 35_000");
  assertStringIncludes(source, "const MIN_ITEM_BUDGET_MS = 14_000");
  assertStringIncludes(
    source,
    "PROCESSING_BUDGET_MS - elapsedMs < MIN_ITEM_BUDGET_MS",
  );
  assertStringIncludes(source, "truncated = true");
  assertStringIncludes(source, "claim.schedule_generation");
  assertStringIncludes(source, "claim.claim_token");
  assertStringIncludes(source, "processingDeadlineAt");
  assertStringIncludes(source, "runReminderStage(");
  assertStringIncludes(source, "withReminderAbortSignal(");
  assertStringIncludes(
    source,
    "checkBookingRefundedAtStripe(supabase, r.booking_id, { signal })",
  );
  assertStringIncludes(source, "sendWhatsAppReminder(");
  assertStringIncludes(source, "signal,\n              )");

  const directRpcNames = [...source.matchAll(
    /supabase\.rpc\(\s*["']([^"']+)["']/g,
  )].map((match) => match[1]);
  assertEquals(directRpcNames, [
    "reconcile_booking_reminders_v2",
    "get_due_booking_reminders_v2",
    "claim_booking_reminder_v2",
  ]);
});

Deno.test("one reminder item cannot consume the whole cron HTTP timeout", () => {
  assertStringIncludes(
    refundCheckSource,
    "MAX_PAYMENTS_PER_BOOKING_CHECKED = 10",
  );
  assertStringIncludes(
    refundCheckSource,
    ".limit(MAX_PAYMENTS_PER_BOOKING_CHECKED + 1)",
  );
  assertStringIncludes(refundCheckSource, "if (overflow)");
  assertStringIncludes(
    refundCheckSource,
    "const refundStates = await Promise.all(",
  );
  assertStringIncludes(refundCheckSource, "paymentIntentIds.map(async");
  assertStringIncludes(refundCheckSource, "STRIPE_CHECK_TIMEOUT_MS = 4000");
  assertStringIncludes(refundCheckSource, "fetchStripeRefundState(");
  assertStringIncludes(refundCheckSource, "signal: composed.signal");
  assertStringIncludes(whatsappSendSource, "EXTERNAL_SEND_TIMEOUT_MS = 8_000");
  assertStringIncludes(whatsappSendSource, "signal: composed.signal");
});

Deno.test("email reminders use generation-scoped idempotency and retain provider evidence", () => {
  assertStringIncludes(source, "deliverReminderEmail(");
  assertStringIncludes(source, "reminderDeliveryKey(");
  assertStringIncludes(source, "claim.schedule_generation");
  assertStringIncludes(source, "providerMessageId");
});

Deno.test("WhatsApp configuration is checked before the at-most-once provider marker", () => {
  const credentialCheck = source.indexOf(
    '!Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim()',
  );
  const guard = source.indexOf("await beginProviderAttempt();");
  const provider = source.indexOf("sendWhatsAppTemplate(", guard);
  assertEquals(credentialCheck >= 0 && guard > credentialCheck, true);
  assertEquals(provider > guard, true);
  assertStringIncludes(source, 'reason: "whatsapp_configuration_missing"');
  assertStringIncludes(source, 'reason: "whatsapp_delivery_unknown"');
});

Deno.test("every provider begin and outcome write uses the v2 fail-closed helpers", () => {
  assertStringIncludes(source, "beginReminderProviderAttemptOrThrow(");
  assertStringIncludes(source, "recordReminderResultOrThrow(");
  assertStringIncludes(
    source,
    "p_schedule_generation: claim.schedule_generation",
  );
  assertStringIncludes(source, "p_claim_token: claim.claim_token");
  assertEquals(
    source.includes('supabase.rpc("record_booking_reminder_result"'),
    false,
  );
  assertEquals(
    source.includes('supabase.rpc("begin_booking_reminder_provider_attempt"'),
    false,
  );
});

Deno.test("response reports provider acceptance, never a false sent or delivered count", () => {
  assertStringIncludes(source, "let accepted = 0");
  assertStringIncludes(source, "providerAccepted");
  assertStringIncludes(source, "accepted,");
  assertEquals(/JSON\.stringify\(\{[\s\S]*?\bsent\s*,/.test(source), false);
  assertEquals(
    /JSON\.stringify\(\{[\s\S]*?\bdelivered\s*,/.test(source),
    false,
  );
});
