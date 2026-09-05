import { assertEquals, assertNotEquals } from "jsr:@std/assert@1.0.19";
import { evaluatePaymentLaunchGate } from "./paymentLaunchGate.ts";

const TENANT_A = "00000000-0000-4000-8000-000000000001";
const TENANT_B = "00000000-0000-4000-8000-000000000002";

function env(values: Record<string, string | undefined>) {
  return (name: string) => values[name];
}

Deno.test("both payment paths default to fail-closed DISABLED", async () => {
  const booking = await evaluatePaymentLaunchGate("booking", TENANT_A, env({}));
  const subscription = await evaluatePaymentLaunchGate(
    "subscription",
    TENANT_A,
    env({}),
  );

  assertEquals(booking.allowed, false);
  assertEquals(booking.state, "DISABLED");
  assertEquals(booking.code, "PAYMENT_PATH_DISABLED");
  assertEquals(subscription.allowed, false);
  assertEquals(subscription.state, "DISABLED");
});

Deno.test("invalid state or tenant configuration fails closed", async () => {
  const invalidState = await evaluatePaymentLaunchGate(
    "booking",
    TENANT_A,
    env({ STRIPE_BOOKING_PAYMENT_GATE_STATE: "enabled" }),
  );
  const invalidTenant = await evaluatePaymentLaunchGate(
    "booking",
    TENANT_A,
    env({
      STRIPE_BOOKING_PAYMENT_GATE_STATE: "CONTROLLED_TENANT",
      STRIPE_BOOKING_PAYMENT_CONTROLLED_TENANTS: "not-a-uuid",
    }),
  );

  assertEquals(invalidState.allowed, false);
  assertEquals(invalidState.code, "PAYMENT_GATE_CONFIG_INVALID");
  assertEquals(invalidState.state, "DISABLED");
  assertEquals(invalidTenant.allowed, false);
  assertEquals(invalidTenant.code, "PAYMENT_GATE_CONFIG_INVALID");
});

Deno.test("CONTROLLED_TENANT allows only the exact configured tenant", async () => {
  const readEnv = env({
    STRIPE_BOOKING_PAYMENT_GATE_STATE: "CONTROLLED_TENANT",
    STRIPE_BOOKING_PAYMENT_CONTROLLED_TENANTS: TENANT_A,
  });
  const allowed = await evaluatePaymentLaunchGate(
    "booking",
    TENANT_A,
    readEnv,
  );
  const blocked = await evaluatePaymentLaunchGate(
    "booking",
    TENANT_B,
    readEnv,
  );

  assertEquals(allowed.allowed, true);
  assertEquals(allowed.code, "PAYMENT_GATE_ALLOWED");
  assertEquals(blocked.allowed, false);
  assertEquals(blocked.code, "PAYMENT_TENANT_NOT_ALLOWED");
});

Deno.test("PUBLIC allows a valid tenant and remains path-specific", async () => {
  const readEnv = env({
    STRIPE_BOOKING_PAYMENT_GATE_STATE: "PUBLIC",
    STRIPE_SUBSCRIPTION_GATE_STATE: "DISABLED",
  });
  const booking = await evaluatePaymentLaunchGate(
    "booking",
    TENANT_B,
    readEnv,
  );
  const subscription = await evaluatePaymentLaunchGate(
    "subscription",
    TENANT_B,
    readEnv,
  );

  assertEquals(booking.allowed, true);
  assertEquals(booking.state, "PUBLIC");
  assertEquals(subscription.allowed, false);
  assertNotEquals(booking.configurationHash, subscription.configurationHash);
});

Deno.test("configuration hash is stable across allowlist order and duplicates", async () => {
  const first = await evaluatePaymentLaunchGate(
    "subscription",
    TENANT_A,
    env({
      STRIPE_SUBSCRIPTION_GATE_STATE: "CONTROLLED_TENANT",
      STRIPE_SUBSCRIPTION_CONTROLLED_TENANTS:
        `${TENANT_B}, ${TENANT_A}, ${TENANT_A}`,
    }),
  );
  const second = await evaluatePaymentLaunchGate(
    "subscription",
    TENANT_A,
    env({
      STRIPE_SUBSCRIPTION_GATE_STATE: "CONTROLLED_TENANT",
      STRIPE_SUBSCRIPTION_CONTROLLED_TENANTS: `${TENANT_A},${TENANT_B}`,
    }),
  );

  assertEquals(first.allowed, true);
  assertEquals(first.configurationHash, second.configurationHash);
});

Deno.test("a request value cannot override environment-owned state", async () => {
  const decision = await evaluatePaymentLaunchGate(
    "subscription",
    TENANT_A,
    env({
      STRIPE_SUBSCRIPTION_GATE_STATE: "DISABLED",
      requested_state: "PUBLIC",
    }),
  );

  assertEquals(decision.allowed, false);
  assertEquals(decision.state, "DISABLED");
});
