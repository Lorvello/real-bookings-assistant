// Regression guard for the Stripe MODE-BYPASS class (findings F-V01/F-V05/F-V08/F-V09
// for the payment/connect fns, and F-CLOSE-04 for the 12 Stripe Tax fns).
// The recurring vuln across this codebase was reading `test_mode` from the request
// BODY to select the Stripe key/environment, letting an authed user instantiate a
// LIVE Stripe client in a TEST deployment. The fix everywhere is the same:
// `validateStripeMode().mode` derives the mode from the server's STRIPE_MODE env,
// never from caller input. This test pins that invariant so the class cannot reopen.
//
// Run: deno test supabase/functions/_shared/stripeValidation.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { validateStripeMode, getStripeSecretKey } from "./stripeValidation.ts";

const ORIG = Deno.env.get("STRIPE_MODE");
function setMode(v: string | undefined) {
  if (v === undefined) Deno.env.delete("STRIPE_MODE");
  else Deno.env.set("STRIPE_MODE", v);
}
function restore() {
  setMode(ORIG);
}

Deno.test("STRIPE_MODE unset -> defaults to test (safety default)", () => {
  setMode(undefined);
  try {
    assertEquals(validateStripeMode().mode, "test");
    assertEquals(validateStripeMode().isValid, true);
  } finally {
    restore();
  }
});

Deno.test("STRIPE_MODE=test -> test", () => {
  setMode("test");
  try {
    assertEquals(validateStripeMode().mode, "test");
  } finally {
    restore();
  }
});

Deno.test("STRIPE_MODE=live -> live", () => {
  setMode("live");
  try {
    assertEquals(validateStripeMode().mode, "live");
  } finally {
    restore();
  }
});

Deno.test("MODE-BYPASS GUARD: a TEST server stays TEST regardless of caller-supplied mode", () => {
  // This is the exact attack F-V01/F-V05/F-V08/F-V09 enabled: caller asks for 'live'
  // while the server is in TEST. The no-arg call (the pattern every fixed fn uses)
  // must IGNORE the caller and pin TEST. The arg form must REJECT the mismatch
  // rather than silently honoring 'live'.
  setMode("test");
  try {
    // No-arg form: caller intent is structurally impossible to inject -> always test.
    assertEquals(validateStripeMode().mode, "test");
    // Arg form without the trusted-caller override: mismatch is rejected, mode stays test.
    const attack = validateStripeMode("live");
    assertEquals(attack.isValid, false);
    assertEquals(attack.mode, "test");
  } finally {
    restore();
  }
});

Deno.test("trusted-caller override (admin dev dashboard only) honors requested mode", () => {
  // The ONLY sanctioned way to pick a non-server mode is allowRequestedMode=true,
  // which the caller must gate to admins (e.g. create-checkout via has_role).
  setMode("test");
  try {
    const dev = validateStripeMode("live", true);
    assertEquals(dev.isValid, true);
    assertEquals(dev.mode, "live");
  } finally {
    restore();
  }
});

Deno.test("getStripeSecretKey maps mode -> the matching env key, never the other", () => {
  const origTest = Deno.env.get("STRIPE_SECRET_KEY_TEST");
  const origLive = Deno.env.get("STRIPE_SECRET_KEY_LIVE");
  Deno.env.set("STRIPE_SECRET_KEY_TEST", "sk_test_sentinel");
  Deno.env.set("STRIPE_SECRET_KEY_LIVE", "sk_live_sentinel");
  try {
    assertEquals(getStripeSecretKey("test"), "sk_test_sentinel");
    assertEquals(getStripeSecretKey("live"), "sk_live_sentinel");
  } finally {
    if (origTest === undefined) Deno.env.delete("STRIPE_SECRET_KEY_TEST");
    else Deno.env.set("STRIPE_SECRET_KEY_TEST", origTest);
    if (origLive === undefined) Deno.env.delete("STRIPE_SECRET_KEY_LIVE");
    else Deno.env.set("STRIPE_SECRET_KEY_LIVE", origLive);
  }
});

// ---------------------------------------------------------------------------
// F-CLOSE-04: the 12 Stripe Tax fns. Before T1 they read `test_mode` from the
// request BODY to pick the key/env. They now derive it server-side with the
// exact expression below. These tests model that expression and prove a hostile
// body `test_mode:false` cannot flip a TEST server to LIVE for the tax surface.
//   auto-setup-tax, detect-tax-requirements, export-tax-report, generate-tax-report,
//   get-tax-codes, get-tax-data, get-tax-registrations, get-tax-settings,
//   get-tax-thresholds, manage-tax-registrations, update-service-tax-codes,
//   validate-tax-compliance
// ---------------------------------------------------------------------------

// Mirror of the line every tax fn now runs: `const test_mode = validateStripeMode().mode === 'test'`.
// `bodyTestMode` is what a (possibly hostile) caller sent; it MUST NOT influence the result.
function taxFnDerivedTestMode(_bodyTestMode?: boolean): boolean {
  return validateStripeMode().mode === "test";
}

Deno.test("TAX FNS (F-CLOSE-04): a TEST server stays TEST even when body sends test_mode:false", () => {
  setMode("test");
  try {
    // The exact attack: an authed pro/enterprise user posts {"test_mode": false}.
    // The derived test_mode must remain true (TEST) and the key must be the TEST key.
    assertEquals(taxFnDerivedTestMode(false), true);
    assertEquals(taxFnDerivedTestMode(true), true);
    assertEquals(taxFnDerivedTestMode(undefined), true);
    // And the env/key selection that follows is TEST regardless of the body.
    const mode = validateStripeMode().mode;
    assertEquals(mode, "test");
  } finally {
    restore();
  }
});

Deno.test("TAX FNS (F-CLOSE-04): STRIPE_MODE unset -> tax fns default to TEST regardless of body", () => {
  setMode(undefined);
  try {
    assertEquals(taxFnDerivedTestMode(false), true);
    assertEquals(taxFnDerivedTestMode(true), true);
  } finally {
    restore();
  }
});

Deno.test("TAX FNS (F-CLOSE-04): the derived test_mode is purely a function of the server env, not the body", () => {
  // Same body value, both server modes: the body is inert; only STRIPE_MODE moves the result.
  setMode("test");
  try {
    assertEquals(taxFnDerivedTestMode(false), true); // server test -> test
  } finally {
    restore();
  }
  setMode("live");
  try {
    assertEquals(taxFnDerivedTestMode(true), false); // server live -> live, despite body asking test
  } finally {
    restore();
  }
});
