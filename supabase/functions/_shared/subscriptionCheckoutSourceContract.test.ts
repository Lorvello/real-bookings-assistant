import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const source = await Deno.readTextFile(
  new URL("../create-checkout/index.ts", import.meta.url),
);

Deno.test("subscription checkout scans before replay and inside its own claim before creation", () => {
  const scanDefinition = source.indexOf("const scanProviderSubscriptions = async");
  const claim = source.indexOf('"claim_subscription_checkout"');
  const replayGuard = source.indexOf("await guardReplayScan({");
  const replayUrl = source.indexOf("url: checkoutClaim.checkoutUrl");
  const claimedGuard = source.indexOf("const checkoutResult = await executeClaimedCheckout(");
  const providerCreate = source.indexOf("stripe.checkout.sessions.create(");
  const completion = source.indexOf('"complete_subscription_checkout"');
  assert(scanDefinition >= 0 && claim > scanDefinition);
  assert(replayGuard > claim && replayUrl > replayGuard);
  assert(claimedGuard > replayUrl);
  assert(providerCreate > claimedGuard);
  assert(completion > providerCreate);
  assertStringIncludes(source, "stripe.subscriptions.list(params)");
  assertStringIncludes(source, "stripe.subscriptions.retrieve(id)");
  assertStringIncludes(source, 'stripe.checkout.sessions.retrieve(id, { expand: ["line_items"] })');
  assertStringIncludes(source, "p_claim_token: checkoutClaim.claimToken");
  assertStringIncludes(source, "SUBSCRIPTION_CHECKOUT_IN_PROGRESS");
  assertStringIncludes(source, "SUBSCRIPTION_ALREADY_EXISTS_USE_PORTAL");
  assertStringIncludes(source, '"fail_subscription_checkout"');
});

Deno.test("subscription retries use the durable claim, not a time bucket", () => {
  assertEquals(source.includes("fiveMinuteBucket"), false);
  assertStringIncludes(source, "checkoutClaim.claimToken");
  assertStringIncludes(source, 'kind === "replay"');
});
