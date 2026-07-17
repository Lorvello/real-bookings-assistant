import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assertStripeWebhookMode,
  StripeWebhookModeError,
} from "./stripeWebhookMode.ts";

Deno.test("authoritative Stripe mode accepts only the matching verified event", () => {
  assertEquals(assertStripeWebhookMode("test", "test", false), "test");
  assertEquals(assertStripeWebhookMode(" LIVE ", "live", true), "live");
});

Deno.test("a valid TEST signature cannot mutate a LIVE-configured database", () => {
  const error = assertThrows(
    () => assertStripeWebhookMode("live", "test", false),
    StripeWebhookModeError,
  );
  assertEquals(error.code, "STRIPE_WEBHOOK_MODE_MISMATCH");
});

Deno.test("the signed Event livemode must agree with the verifying secret", () => {
  const error = assertThrows(
    () => assertStripeWebhookMode("test", "test", true),
    StripeWebhookModeError,
  );
  assertEquals(error.code, "STRIPE_EVENT_LIVEMODE_MISMATCH");
});

Deno.test("missing STRIPE_MODE fails closed", () => {
  const error = assertThrows(
    () => assertStripeWebhookMode(undefined, "test", false),
    StripeWebhookModeError,
  );
  assertEquals(error.code, "STRIPE_MODE_NOT_CONFIGURED");
});
