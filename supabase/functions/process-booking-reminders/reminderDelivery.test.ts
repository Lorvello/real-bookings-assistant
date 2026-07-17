import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert@1";
import {
  beginReminderProviderAttemptOrThrow,
  deliverReminderEmail,
  recordReminderResultOrThrow,
  ReminderDeliveryConfigurationError,
  reminderDeliveryKey,
  ReminderDeliveryProviderError,
  ReminderProcessingDeadlineError,
  ReminderProviderAttemptPersistenceError,
  ReminderResultPersistenceError,
  resolveReminderDeliveryMode,
  runReminderStage,
} from "./reminderDelivery.ts";

const bookingId = "60000000-0000-4000-8000-000000000001";
const scheduleGeneration = "60000000-0000-4000-8000-000000000002";
const claimToken = "60000000-0000-4000-8000-000000000003";
const email = {
  from: "Studio <noreply@bookingsassistant.com>",
  to: "customer@example.invalid",
  subject: "Reminder",
  html: "<p>Reminder</p>",
  bookingId,
  reminderNumber: 1,
  scheduleGeneration,
};

Deno.test("record-only reminder delivery is local/test only", () => {
  assertEquals(resolveReminderDeliveryMode({}), "send");
  assertEquals(
    resolveReminderDeliveryMode({
      APP_ENV: "test",
      REMINDER_DELIVERY_MODE: "record-only",
    }),
    "record-only",
  );
  assertThrows(
    () =>
      resolveReminderDeliveryMode({
        APP_ENV: "production",
        REMINDER_DELIVERY_MODE: "record-only",
      }),
    ReminderDeliveryConfigurationError,
  );
  assertThrows(
    () => resolveReminderDeliveryMode({ REMINDER_DELIVERY_MODE: "stub" }),
    ReminderDeliveryConfigurationError,
  );
});

Deno.test("reminder provider idempotency key is stable and channel-scoped", () => {
  assertEquals(
    reminderDeliveryKey(bookingId, 1, "email", scheduleGeneration),
    `booking-reminder/${bookingId}/1/email/${scheduleGeneration}`,
  );
  assertEquals(
    reminderDeliveryKey(bookingId, 1, "whatsapp", scheduleGeneration),
    `booking-reminder/${bookingId}/1/whatsapp/${scheduleGeneration}`,
  );
});

Deno.test("record-only email proves payload flow without network delivery", async () => {
  let fetched = false;
  const result = await deliverReminderEmail(
    "record-only",
    undefined,
    email,
    () => {
      fetched = true;
      return Promise.resolve(new Response(null, { status: 500 }));
    },
  );
  assertEquals(fetched, false);
  assertEquals(result.mode, "record-only");
  assertEquals(result.providerMessageId, null);
  assertEquals(
    result.deliveryKey,
    `booking-reminder/${bookingId}/1/email/${scheduleGeneration}`,
  );
});

Deno.test("send mode uses stable Resend idempotency and preserves provider receipt", async () => {
  let request: RequestInit | undefined;
  const result = await deliverReminderEmail(
    "send",
    "re_test",
    email,
    (_url, init) => {
      request = init;
      return Promise.resolve(
        Response.json({ id: "resend-message-1" }, { status: 200 }),
      );
    },
  );
  assertEquals(
    new Headers(request?.headers).get("Idempotency-Key"),
    `booking-reminder/${bookingId}/1/email/${scheduleGeneration}`,
  );
  assertEquals(result.providerMessageId, "resend-message-1");
});

Deno.test("provider rejection and missing receipts fail closed", async () => {
  await assertRejects(
    () =>
      deliverReminderEmail(
        "send",
        "re_test",
        email,
        () =>
          Promise.resolve(
            Response.json({ message: "rejected" }, { status: 429 }),
          ),
      ),
    ReminderDeliveryProviderError,
    "provider_http_429",
  );
  await assertRejects(
    () =>
      deliverReminderEmail(
        "send",
        "re_test",
        email,
        () => Promise.resolve(Response.json({}, { status: 200 })),
      ),
    ReminderDeliveryProviderError,
    "provider_http_200",
  );
});

Deno.test("result persistence errors and empty writes fail closed", async () => {
  const args = {
    p_booking_id: bookingId,
    p_reminder_number: 1,
    p_schedule_generation: scheduleGeneration,
    p_claim_token: claimToken,
    p_provider_accepted: true,
    p_max_attempts: 12,
    p_failure_reason: null,
    p_channel: "email" as const,
    p_delivery_mode: "send" as const,
    p_provider_message_id: "resend-message-1",
    p_delivery_key:
      `booking-reminder/${bookingId}/1/email/${scheduleGeneration}`,
  };
  await assertRejects(
    () =>
      recordReminderResultOrThrow(
        {
          rpc: () => Promise.resolve({ data: null, error: new Error("db") }),
        },
        args,
        Date.now() + 1_000,
      ),
    ReminderResultPersistenceError,
  );
  await assertRejects(
    () =>
      recordReminderResultOrThrow(
        {
          rpc: () => Promise.resolve({ data: [], error: null }),
        },
        args,
        Date.now() + 1_000,
      ),
    ReminderResultPersistenceError,
  );
  assertEquals(
    await recordReminderResultOrThrow(
      {
        rpc: () =>
          Promise.resolve({
            data: [{ attempt_count: 1, status: "provider_accepted" }],
            error: null,
          }),
      },
      args,
      Date.now() + 1_000,
    ),
    { attempt_count: 1, status: "provider_accepted" },
  );
});

Deno.test("WhatsApp provider attempt must be durably parked before network I/O", async () => {
  const args = {
    p_booking_id: bookingId,
    p_reminder_number: 1,
    p_schedule_generation: scheduleGeneration,
    p_claim_token: claimToken,
    p_channel: "whatsapp" as const,
    p_delivery_mode: "send" as const,
    p_delivery_key:
      `booking-reminder/${bookingId}/1/whatsapp/${scheduleGeneration}`,
  };
  let called = false;
  await beginReminderProviderAttemptOrThrow(
    {
      rpc: (name, received) => {
        called = name === "begin_booking_reminder_attempt_v2" &&
          received.p_delivery_key === args.p_delivery_key;
        return Promise.resolve({ data: true, error: null });
      },
    },
    args,
    Date.now() + 1_000,
  );
  assertEquals(called, true);

  await assertRejects(
    () =>
      beginReminderProviderAttemptOrThrow(
        {
          rpc: () => Promise.resolve({ data: false, error: null }),
        },
        args,
        Date.now() + 1_000,
      ),
    ReminderProviderAttemptPersistenceError,
  );
});

Deno.test("reminder stage deadline aborts a hanging operation", async () => {
  let aborted = false;
  await assertRejects(
    () =>
      runReminderStage(
        (signal) =>
          new Promise<never>(() => {
            signal.addEventListener("abort", () => {
              aborted = true;
            }, { once: true });
          }),
        Date.now() + 20,
        "hanging_test_stage",
      ),
    ReminderProcessingDeadlineError,
    "hanging_test_stage",
  );
  assertEquals(aborted, true);
});

Deno.test("email provider fetch cannot continue after the absolute stage deadline", async () => {
  let providerAborted = false;
  let providerSettled = false;
  await assertRejects(
    () =>
      runReminderStage(
        (signal) =>
          deliverReminderEmail(
            "send",
            "re_test",
            email,
            (_url, init) =>
              new Promise<Response>((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                  providerAborted = true;
                  providerSettled = true;
                  reject(new DOMException("Aborted", "AbortError"));
                }, { once: true });
              }),
            10_000,
            signal,
          ),
        Date.now() + 20,
        "email_provider_contract",
      ),
    ReminderProcessingDeadlineError,
    "email_provider_contract",
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  assertEquals(providerAborted, true);
  assertEquals(providerSettled, true);
});
