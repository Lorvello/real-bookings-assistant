import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ContactDeliveryConfigurationError,
  ContactDeliveryProviderError,
  deliverContactSubmission,
  resolveContactDeliveryConfig,
} from "./contactDelivery.ts";

const email = {
  submissionId: "05e2d9bb-aac4-4d2f-a0e4-4325be1f1fc1",
  replyTo: "ada@example.com",
  subject: "Contact form: sales",
  html: "<p>Safe</p>",
  text: "Safe",
};

Deno.test("record-only mode is allowed for tests and performs no network request", async () => {
  const config = resolveContactDeliveryConfig({
    APP_ENV: "test",
    CONTACT_FORM_DELIVERY_MODE: "record-only",
  });
  let fetchCalls = 0;
  const result = await deliverContactSubmission(
    config,
    email,
    (() => {
      fetchCalls += 1;
      throw new Error("fetch must not be called");
    }) as typeof fetch,
  );

  assertEquals(result, { mode: "record-only", providerMessageId: null });
  assertEquals(fetchCalls, 0);
});

Deno.test("record-only mode fails closed outside local and test environments", () => {
  assertThrows(
    () =>
      resolveContactDeliveryConfig({
        APP_ENV: "production",
        CONTACT_FORM_DELIVERY_MODE: "record-only",
      }),
    ContactDeliveryConfigurationError,
  );
});

Deno.test("send mode requires explicit provider configuration", () => {
  assertThrows(
    () => resolveContactDeliveryConfig({ APP_ENV: "test" }),
    ContactDeliveryConfigurationError,
  );
});

Deno.test("send mode uses a stable provider idempotency key and complete payload", async () => {
  const config = resolveContactDeliveryConfig({
    APP_ENV: "test",
    CONTACT_FORM_DELIVERY_MODE: "send",
    RESEND_API_KEY: "test-key",
    CONTACT_FORM_FROM_EMAIL: "Bookings Assistant <forms@example.com>",
    CONTACT_FORM_TO_EMAIL: "support@example.com, sales@example.com",
  });
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const result = await deliverContactSubmission(
    config,
    email,
    ((url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return Promise.resolve(
        new Response(JSON.stringify({ id: "provider-id" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }) as typeof fetch,
  );

  assertEquals(result, { mode: "send", providerMessageId: "provider-id" });
  assertEquals(capturedUrl, "https://api.resend.com/emails");
  assertEquals(
    new Headers(capturedInit?.headers).get("Idempotency-Key"),
    `contact-form/${email.submissionId}`,
  );
  const body = JSON.parse(String(capturedInit?.body));
  assertEquals(body.to, ["support@example.com", "sales@example.com"]);
  assertEquals(body.reply_to, "ada@example.com");
  assertEquals(body.subject, email.subject);
});

Deno.test("provider rejection is returned as a fail-closed delivery error", async () => {
  const config = resolveContactDeliveryConfig({
    APP_ENV: "test",
    CONTACT_FORM_DELIVERY_MODE: "send",
    RESEND_API_KEY: "test-key",
    CONTACT_FORM_FROM_EMAIL: "forms@example.com",
    CONTACT_FORM_TO_EMAIL: "support@example.com",
  });

  await assertRejects(
    () =>
      deliverContactSubmission(
        config,
        email,
        (() =>
          Promise.resolve(
            new Response(JSON.stringify({ message: "rejected" }), {
              status: 422,
              headers: { "Content-Type": "application/json" },
            }),
          )) as typeof fetch,
      ),
    ContactDeliveryProviderError,
    "status 422",
  );
});

Deno.test("provider success without a message ID also fails closed", async () => {
  const config = resolveContactDeliveryConfig({
    APP_ENV: "test",
    CONTACT_FORM_DELIVERY_MODE: "send",
    RESEND_API_KEY: "test-key",
    CONTACT_FORM_FROM_EMAIL: "forms@example.com",
    CONTACT_FORM_TO_EMAIL: "support@example.com",
  });

  await assertRejects(
    () =>
      deliverContactSubmission(
        config,
        email,
        (() =>
          Promise.resolve(
            new Response("{}", {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }),
          )) as typeof fetch,
      ),
    ContactDeliveryProviderError,
    "without a message ID",
  );
});
