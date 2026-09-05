import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import { resolveConfiguredSubscriptionTier } from "./subscriptionTierResolver.ts";

const tiers = [
  {
    tier_name: "starter",
    is_active: true,
    stripe_test_monthly_price_id: "price_startertestmonth",
    stripe_test_yearly_price_id: "price_startertestyear",
    stripe_live_monthly_price_id: "price_starterlivemonth",
    stripe_live_yearly_price_id: "price_starterliveyear",
  },
  {
    tier_name: "professional",
    is_active: true,
    stripe_test_monthly_price_id: "price_protestmonth",
    stripe_test_yearly_price_id: "price_protestyear",
    stripe_live_monthly_price_id: "price_prolivemonth",
    stripe_live_yearly_price_id: "price_proliveyear",
  },
];

Deno.test("configured price is authoritative for the tier", () => {
  assertEquals(
    resolveConfiguredSubscriptionTier(
      tiers,
      "price_protestyear",
      "test",
      "professional",
    ),
    "professional",
  );
});

Deno.test("test and live price mappings cannot cross", () => {
  assertThrows(
    () =>
      resolveConfiguredSubscriptionTier(
        tiers,
        "price_prolivemonth",
        "test",
      ),
    Error,
    "SUBSCRIPTION_PRICE_UNKNOWN",
  );
});

Deno.test("unknown prices fail closed instead of granting starter", () => {
  assertThrows(
    () =>
      resolveConfiguredSubscriptionTier(
        tiers,
        "price_unknownvalue",
        "test",
      ),
    Error,
    "SUBSCRIPTION_PRICE_UNKNOWN",
  );
});

Deno.test("metadata cannot escalate or contradict the configured price", () => {
  assertThrows(
    () =>
      resolveConfiguredSubscriptionTier(
        tiers,
        "price_startertestmonth",
        "test",
        "professional",
      ),
    Error,
    "SUBSCRIPTION_TIER_METADATA_MISMATCH",
  );
});

Deno.test("ambiguous mappings and inactive mappings fail closed", () => {
  assertThrows(
    () =>
      resolveConfiguredSubscriptionTier(
        [...tiers, { ...tiers[0], tier_name: "professional" }],
        "price_startertestmonth",
        "test",
      ),
    Error,
    "SUBSCRIPTION_PRICE_MAPPING_AMBIGUOUS",
  );
  assertThrows(
    () =>
      resolveConfiguredSubscriptionTier(
        [{ ...tiers[0], is_active: false }],
        "price_startertestmonth",
        "test",
      ),
    Error,
    "SUBSCRIPTION_PRICE_UNKNOWN",
  );
});
