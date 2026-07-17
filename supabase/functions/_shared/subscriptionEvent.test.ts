import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  normalizeStripeSubscriptionStatus,
  subscriptionCanGrantAccess,
  subscriptionIdFromInvoice,
} from "./subscriptionEvent.ts";

Deno.test("created subscriptions retain their real Stripe status", () => {
  assertEquals(
    normalizeStripeSubscriptionStatus("incomplete", "created"),
    "incomplete",
  );
  assertEquals(subscriptionCanGrantAccess("incomplete"), false);
  assertEquals(subscriptionCanGrantAccess("active"), true);
  assertEquals(subscriptionCanGrantAccess("trialing"), true);
});

Deno.test("deleted events are terminal canceled state", () => {
  assertEquals(
    normalizeStripeSubscriptionStatus("active", "deleted"),
    "canceled",
  );
});

Deno.test("unknown subscription states fail closed", () => {
  assertThrows(
    () => normalizeStripeSubscriptionStatus("mystery", "updated"),
    Error,
    "STRIPE_SUBSCRIPTION_STATUS_UNSUPPORTED",
  );
});

Deno.test("invoice subscription ids support legacy and modern Stripe shapes", () => {
  assertEquals(
    subscriptionIdFromInvoice({ subscription: "sub_legacy" }),
    "sub_legacy",
  );
  assertEquals(
    subscriptionIdFromInvoice({
      parent: { subscription_details: { subscription: "sub_modern" } },
    }),
    "sub_modern",
  );
  assertEquals(subscriptionIdFromInvoice({}), null);
});
