import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import {
  isAllowedCheckoutUrl,
  resolveSubscriptionPriceId,
  subscriptionCheckoutSchema,
} from "./subscriptionCheckout.ts";

const tier = {
  tier_name: "starter",
  is_active: true,
  stripe_test_monthly_price_id: "price_testmonth",
  stripe_test_yearly_price_id: "price_testyear",
  stripe_live_monthly_price_id: "price_livemonth",
  stripe_live_yearly_price_id: "price_liveyear",
};

Deno.test("subscription checkout accepts the current client payload", () => {
  const parsed = subscriptionCheckoutSchema.parse({
    priceId: "price_testmonth",
    tier_name: "starter",
    price: 30,
    is_annual: false,
    mode: "test",
    success_url: "https://bookingsassistant.com/success",
    cancel_url: "https://bookingsassistant.com/dashboard",
  });
  assertEquals(parsed.tier_name, "starter");
});

Deno.test("booking/service fields cannot enter the subscription endpoint", () => {
  assertThrows(() =>
    subscriptionCheckoutSchema.parse({
      tier_name: "starter",
      is_annual: false,
      serviceIds: ["00000000-0000-4000-8000-000000000001"],
    })
  );
  assertThrows(() =>
    subscriptionCheckoutSchema.parse({
      tier_name: "starter",
      is_annual: false,
      calendarId: "00000000-0000-4000-8000-000000000001",
    })
  );
});

Deno.test("server tier row selects the authoritative mode and cadence price", () => {
  assertEquals(
    resolveSubscriptionPriceId(tier, "test", false),
    "price_testmonth",
  );
  assertEquals(
    resolveSubscriptionPriceId(tier, "live", true),
    "price_liveyear",
  );
});

Deno.test("inactive or unconfigured tiers fail closed", () => {
  assertThrows(
    () =>
      resolveSubscriptionPriceId({ ...tier, is_active: false }, "test", false),
    Error,
    "SUBSCRIPTION_TIER_INACTIVE",
  );
  assertThrows(
    () =>
      resolveSubscriptionPriceId(
        { ...tier, stripe_live_yearly_price_id: null },
        "live",
        true,
      ),
    Error,
    "SUBSCRIPTION_PRICE_NOT_CONFIGURED",
  );
});

Deno.test("redirects allow only canonical HTTPS or loopback development", () => {
  assertEquals(
    isAllowedCheckoutUrl("https://bookingsassistant.com/success"),
    true,
  );
  assertEquals(isAllowedCheckoutUrl("http://localhost:5173/success"), true);
  assertEquals(isAllowedCheckoutUrl("https://evil.example/success"), false);
  assertEquals(
    isAllowedCheckoutUrl("http://bookingsassistant.com/success"),
    false,
  );
});
