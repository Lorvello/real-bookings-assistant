import { assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";

const code = await Deno.readTextFile(
  new URL("../check-subscription-by-session/index.ts", import.meta.url),
);

Deno.test("checkout verification retrieves only the session subscription", () => {
  assertStringIncludes(
    code,
    "stripe.subscriptions.retrieve(\n      verifiedSession.subscriptionId",
  );
  assertEquals(code.includes("stripe.subscriptions.list"), false);
  assertStringIncludes(code, "verifySubscriptionCheckoutSession(");
  assertStringIncludes(code, "verifyExactSessionSubscription(");
});

Deno.test("activation is one checked RPC followed by checked durable readback", () => {
  assertStringIncludes(code, '"apply_stripe_subscription_event"');
  assertStringIncludes(code, "if (applyError || applied?.success !== true)");
  assertStringIncludes(code, "if (userRead.error || subscriberRead.error)");
  assertStringIncludes(code, "SUBSCRIPTION_ACTIVATION_READBACK_MISMATCH");
  assertEquals(code.includes('.from("users").update('), false);
  assertEquals(code.includes('.from("subscribers").upsert('), false);
});
