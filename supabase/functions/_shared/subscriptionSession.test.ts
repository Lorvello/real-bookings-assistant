import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import {
  verifyExactSessionSubscription,
  verifySubscriptionCheckoutSession,
} from "./subscriptionSession.ts";

const baseSession = {
  id: "cs_test_exact",
  mode: "subscription",
  status: "complete",
  payment_status: "paid",
  livemode: false,
  client_reference_id: "user-1",
  customer: "cus_exact",
  subscription: "sub_exact",
  metadata: { user_id: "user-1", stripe_mode: "test" },
};

Deno.test("paid Checkout session returns its exact subscription identity", () => {
  assertEquals(
    verifySubscriptionCheckoutSession(
      baseSession,
      "cs_test_exact",
      "user-1",
      "test",
    ),
    { userId: "user-1", customerId: "cus_exact", subscriptionId: "sub_exact" },
  );
});

Deno.test("an unrelated paid session or missing subscription fails closed", () => {
  assertThrows(
    () =>
      verifySubscriptionCheckoutSession(
        { ...baseSession, id: "cs_other" },
        "cs_test_exact",
        "user-1",
        "test",
      ),
    Error,
    "SUBSCRIPTION_SESSION_ID_MISMATCH",
  );
  assertThrows(
    () =>
      verifySubscriptionCheckoutSession(
        { ...baseSession, subscription: null },
        "cs_test_exact",
        "user-1",
        "test",
      ),
    Error,
    "SUBSCRIPTION_SESSION_IDENTITY_MISSING",
  );
});

Deno.test("session mode, completion, payment and user metadata are all authoritative", () => {
  for (
    const session of [
      { ...baseSession, mode: "payment" },
      { ...baseSession, status: "open" },
      { ...baseSession, payment_status: "unpaid" },
      { ...baseSession, livemode: true },
      { ...baseSession, client_reference_id: "user-2" },
      { ...baseSession, metadata: { user_id: "user-2", stripe_mode: "test" } },
      { ...baseSession, metadata: { user_id: "user-1", stripe_mode: "live" } },
    ]
  ) {
    assertThrows(
      () =>
        verifySubscriptionCheckoutSession(
          session,
          "cs_test_exact",
          "user-1",
          "test",
        ),
    );
  }
});

Deno.test("only the exact active subscription for the session can grant access", () => {
  const verified = verifySubscriptionCheckoutSession(
    baseSession,
    "cs_test_exact",
    "user-1",
    "test",
  );
  verifyExactSessionSubscription(
    {
      id: "sub_exact",
      customer: "cus_exact",
      status: "active",
      livemode: false,
      metadata: { user_id: "user-1" },
    },
    verified,
    "test",
  );

  for (
    const subscription of [
      {
        id: "sub_old",
        customer: "cus_exact",
        status: "active",
        livemode: false,
        metadata: { user_id: "user-1" },
      },
      {
        id: "sub_exact",
        customer: "cus_other",
        status: "active",
        livemode: false,
        metadata: { user_id: "user-1" },
      },
      {
        id: "sub_exact",
        customer: "cus_exact",
        status: "canceled",
        livemode: false,
        metadata: { user_id: "user-1" },
      },
      {
        id: "sub_exact",
        customer: "cus_exact",
        status: "active",
        livemode: true,
        metadata: { user_id: "user-1" },
      },
      {
        id: "sub_exact",
        customer: "cus_exact",
        status: "active",
        livemode: false,
        metadata: { user_id: "user-2" },
      },
    ]
  ) {
    assertThrows(() =>
      verifyExactSessionSubscription(subscription, verified, "test")
    );
  }
});
