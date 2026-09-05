import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import { parseStripeEventClaim } from "./stripeEventClaim.ts";

Deno.test("Stripe event claim parser distinguishes claimed, completed and in-progress", () => {
  assertEquals(
    parseStripeEventClaim({
      claimed: true,
      completed: false,
      claim_token: "00000000-0000-0000-0000-000000000026",
    }),
    {
      claimed: true,
      completed: false,
      claimToken: "00000000-0000-0000-0000-000000000026",
    },
  );
  assertEquals(
    parseStripeEventClaim({
      claimed: false,
      completed: true,
      reason: "already_completed",
    }),
    { claimed: false, completed: true, reason: "already_completed" },
  );
  assertEquals(
    parseStripeEventClaim({
      claimed: false,
      completed: false,
      reason: "in_progress",
    }),
    { claimed: false, completed: false, reason: "in_progress" },
  );
});

Deno.test("Stripe event claim parser rejects fail-open or malformed shapes", () => {
  for (
    const value of [
      null,
      {},
      { claimed: false, completed: false },
      { claimed: true, completed: false, claim_token: "short" },
      { claimed: false, completed: true, reason: "in_progress" },
    ]
  ) {
    assertThrows(() => parseStripeEventClaim(value));
  }
});
