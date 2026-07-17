import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  blocksNewSubscriptionCheckout,
  parseSubscriptionCheckoutClaim,
} from "./subscriptionCheckoutGuard.ts";

Deno.test("existing chargeable or unresolved subscriptions block a new checkout", () => {
  for (
    const status of [
      "active",
      "trialing",
      "past_due",
      "unpaid",
      "incomplete",
      "paused",
    ]
  ) {
    assertEquals(blocksNewSubscriptionCheckout(status), true, status);
  }
  assertEquals(blocksNewSubscriptionCheckout("canceled"), false);
  assertEquals(blocksNewSubscriptionCheckout("incomplete_expired"), false);
});

Deno.test("durable checkout claims distinguish create, replay and contention", () => {
  assertEquals(
    parseSubscriptionCheckoutClaim({ claimed: true, claim_token: "token" }),
    { kind: "claimed", claimToken: "token" },
  );
  assertEquals(
    parseSubscriptionCheckoutClaim({
      claimed: false,
      replay: true,
      session_id: "cs_test_1",
      checkout_url: "https://checkout.stripe.com/c/pay/cs_test_1",
    }),
    {
      kind: "replay",
      sessionId: "cs_test_1",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_1",
    },
  );
  assertEquals(
    parseSubscriptionCheckoutClaim({
      claimed: false,
      replay: false,
      reason: "in_progress",
    }),
    { kind: "in_progress" },
  );
  assertEquals(
    parseSubscriptionCheckoutClaim({
      claimed: false,
      replay: false,
      reason: "existing_session",
    }),
    { kind: "existing_session" },
  );
  assertThrows(() => parseSubscriptionCheckoutClaim({ claimed: true }));
});
