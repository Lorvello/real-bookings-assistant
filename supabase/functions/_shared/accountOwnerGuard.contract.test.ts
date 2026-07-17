import {
  assert,
  assertStringIncludes,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";

const ownerOnlyFunctions = [
  "create-account-session",
  "create-checkout",
  "customer-portal",
  "get-account-requirements",
  "stripe-connect-embedded",
  "stripe-connect-login",
  "stripe-connect-onboard",
  "stripe-connect-refresh",
  "stripe-connect-reset",
  "sync-payment-methods",
  "sync-payout-settings",
] as const;

for (const functionName of ownerOnlyFunctions) {
  Deno.test(`${functionName}: calls the shared account-owner guard before privileged work`, async () => {
    const source = await Deno.readTextFile(
      new URL(`../${functionName}/index.ts`, import.meta.url),
    );

    assertStringIncludes(
      source,
      "../_shared/accountOwnerGuard.ts",
      `${functionName} must import the canonical account-owner guard`,
    );

    const guardCall = source.search(/\brequireAccountOwner\s*\(/);
    assert(
      guardCall >= 0,
      `${functionName} must call requireAccountOwner()`,
    );

    const privilegedMarkers = [
      "new Stripe(",
      ".billingPortal.sessions.create(",
      ".accounts.create(",
      ".accountSessions.create(",
      ".loginLinks.create(",
      ".from('business_stripe_accounts')",
      '.from("business_stripe_accounts")',
    ];
    const privilegedOffsets = privilegedMarkers
      .map((marker) => source.indexOf(marker))
      .filter((offset) => offset >= 0);

    if (privilegedOffsets.length > 0) {
      assert(
        guardCall < Math.min(...privilegedOffsets),
        `${functionName} must reject team members before Stripe or business_stripe_accounts access`,
      );
    }
  });
}

Deno.test("privileged Connect session routes never trust calendar_settings as account authority", async () => {
  const login = await Deno.readTextFile(
    new URL("../stripe-connect-login/index.ts", import.meta.url),
  );
  const accountSession = await Deno.readTextFile(
    new URL("../create-account-session/index.ts", import.meta.url),
  );

  for (
    const [name, source] of [
      ["stripe-connect-login", login],
      ["create-account-session", accountSession],
    ] as const
  ) {
    assertStringIncludes(source, "account_owner_id");
    assertStringIncludes(source, "platform_account_id");
    assertStringIncludes(source, "environment");
    assert(
      !source.includes("calendar_settings!inner(stripe_connect_account_id)"),
      `${name} still uses the calendar cache as a Stripe account authority`,
    );
    assert(
      !source.includes("Using cached account ID"),
      `${name} still routes a privileged Stripe operation through the cache`,
    );
  }
});
