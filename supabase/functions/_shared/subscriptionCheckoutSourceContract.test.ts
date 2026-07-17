import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(
  new URL("../create-checkout/index.ts", import.meta.url),
);

Deno.test("subscription checkout claims locally before provider creation", () => {
  const activeProviderCheck = source.indexOf("stripe.subscriptions.list(");
  const claim = source.indexOf('"claim_subscription_checkout"');
  const providerCreate = source.indexOf("stripe.checkout.sessions.create(");
  const completion = source.indexOf('"complete_subscription_checkout"');
  assert(activeProviderCheck >= 0);
  assert(claim > activeProviderCheck);
  assert(providerCreate > claim);
  assert(completion > providerCreate);
  assertStringIncludes(source, "SUBSCRIPTION_CHECKOUT_IN_PROGRESS");
  assertStringIncludes(source, "SUBSCRIPTION_ALREADY_EXISTS_USE_PORTAL");
  assertStringIncludes(source, '"fail_subscription_checkout"');
});

Deno.test("subscription retries use the durable claim, not a time bucket", () => {
  assertEquals(source.includes("fiveMinuteBucket"), false);
  assertStringIncludes(source, "checkoutClaim.claimToken");
  assertStringIncludes(source, 'kind === "replay"');
});
