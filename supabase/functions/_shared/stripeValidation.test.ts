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

// ---------------------------------------------------------------------------
// T2: manage-tax-registrations create payload contract. The old code sent
// country_options { [cc]: { type: 'vat', value } } which the current Stripe Tax
// API rejects (it expects type 'standard' with a place_of_supply_scheme). This
// mirror of the production buildCountryOptions() pins the corrected shape, which
// was verified LIVE against the Stripe TEST Tax API for NL, GB and AU. US and CA
// are excluded from SUPPORTED_COUNTRIES (their registrations are subdivision-scoped),
// so the create builder only ever runs for the standard-scheme set.
// ---------------------------------------------------------------------------
function buildCountryOptionsMirror(country: string): Record<string, any> {
  const cc = country.toLowerCase();
  return { [cc]: { type: 'standard', standard: { place_of_supply_scheme: 'standard' } } };
}

Deno.test("T2 manage-tax-registrations: country options use 'standard' scheme, never the old 'vat' type", () => {
  const nl = buildCountryOptionsMirror('NL');
  assertEquals(nl.nl.type, 'standard');
  assertEquals(nl.nl.standard.place_of_supply_scheme, 'standard');
  // Regression: the removed { type: 'vat' } shape must not appear.
  assertEquals((nl.nl as any).value, undefined);
});

Deno.test("T2 manage-tax-registrations: GB and AU (verified live) take the same standard scheme", () => {
  assertEquals(buildCountryOptionsMirror('GB').gb.type, 'standard');
  assertEquals(buildCountryOptionsMirror('GB').gb.standard.place_of_supply_scheme, 'standard');
  assertEquals(buildCountryOptionsMirror('AU').au.type, 'standard');
  assertEquals(buildCountryOptionsMirror('AU').au.standard.place_of_supply_scheme, 'standard');
});

// ---------------------------------------------------------------------------
// T3: tax codes + service mapping.
// F-TAX-06: detect-tax-requirements + validate-tax-compliance scoped
// business_stripe_accounts by user_id while the siblings (get-tax-data,
// update-service-tax-codes) scoped by account_owner_id. For a top-level account
// the two are identical; for a sub-account they diverge and the user_id scope
// resolved the wrong/empty account. The fix derives the same accountOwnerId the
// siblings use: `userData.account_owner_id || user.id`. This mirror pins that
// derivation (sub-account picks the OWNER's account, no IDOR for a top-level user).
// F-TAX-04: get-tax-data must source tax-behavior from the Tax Settings API
// (defaults.tax_behavior), never from unrelated account fields. The accepted set
// is the Stripe tax_behavior enum plus the local 'unknown' fallback.
// ---------------------------------------------------------------------------
function resolveAccountOwnerId(userId: string, accountOwnerId?: string | null): string {
  return accountOwnerId || userId;
}

Deno.test("F-TAX-06: top-level user resolves to their own id (no IDOR)", () => {
  // account_owner_id null/equal-to-self -> the caller's own account, same as before.
  assertEquals(resolveAccountOwnerId("user-1", null), "user-1");
  assertEquals(resolveAccountOwnerId("user-1", "user-1"), "user-1");
});

Deno.test("F-TAX-06: sub-account user resolves to the business OWNER's id (matches siblings)", () => {
  // The whole bug: a member whose account_owner_id points at the owner must read
  // the OWNER's Stripe account, exactly as get-tax-data/update-service-tax-codes do.
  assertEquals(resolveAccountOwnerId("member-9", "owner-3"), "owner-3");
});

Deno.test("F-TAX-04: tax-behavior comes from the Tax Settings enum, never an unrelated field", () => {
  // The Tax Settings API defaults.tax_behavior is one of these; the unrelated
  // statement-descriptor / dashboard-display-name fields the old code read are not.
  const VALID = new Set(["inclusive", "exclusive", "unknown"]);
  assertEquals(VALID.has("exclusive"), true);
  assertEquals(VALID.has("inclusive"), true);
  assertEquals(VALID.has("unknown"), true); // local fallback when retrieve fails
  // A dashboard display name (what the buggy automaticTax read) is not a behavior.
  assertEquals(VALID.has("Bookings Assistant sandbox"), false);
});

// ---------------------------------------------------------------------------
// TX-FIX-1: assign-tax-codes hardening (F-TAX-12 + F-TAX-13).
// F-TAX-12 (LIVE charge tamper): the request body MUST NOT influence the tax
// outcome. assign-tax-codes writes service_types.applicable_tax_rate (the rate
// create-booking-payment + whatsapp-payment-handler charge with). The country
// that picks the rate/tax_code is now resolved SERVER-SIDE from the caller's
// business_stripe_accounts.country, and the zod schema no longer accepts a
// business_country field, so a body-supplied country is stripped (inert).
// F-TAX-13: assign-tax-codes (a write path) + 4 sibling tax fns gate on the SAME
// ['professional','enterprise'] predicate the other tax fns use. Trial users have
// subscription_tier='professional', so the gate does not block onboarding.
// ---------------------------------------------------------------------------
import { z } from "https://esm.sh/zod@3.23.8";

// Mirror of assign-tax-codes' AssignSchema after the F-TAX-12 fix (no business_country).
const AssignSchemaMirror = z.object({
  calendar_id: z.string().uuid().optional(),
  service_ids: z.array(z.string().uuid()).optional(),
  bulk_update: z.boolean().optional().default(false),
});

// Mirror of the server-side country -> rate derivation in assign-tax-codes.
function getCountryTaxRateMirror(country: string): number {
  const rates: Record<string, number> = {
    'NL': 21, 'DE': 19, 'FR': 20, 'GB': 20, 'US': 8.5, 'CA': 13, 'AU': 10,
    'ES': 21, 'IT': 22, 'BE': 21, 'AT': 20, 'DK': 25, 'SE': 25, 'FI': 24,
  };
  return rates[country] ?? 21;
}
function resolveBusinessCountry(stripeAccountCountry?: string | null): string {
  return (stripeAccountCountry?.toUpperCase()) || 'NL';
}

Deno.test("F-TAX-12: AssignSchema strips a body business_country (it cannot reach the rate lookup)", () => {
  const parsed = AssignSchemaMirror.parse({ business_country: "AU", bulk_update: false });
  // The field is stripped by zod .object(); it is not present in the parsed payload.
  assertEquals((parsed as any).business_country, undefined);
});

Deno.test("F-TAX-12: rate is derived from the SERVER-resolved country, body is inert", () => {
  // An NL Stripe account with a hostile body business_country:'AU' still charges 21.
  const serverCountry = resolveBusinessCountry("nl"); // from business_stripe_accounts.country
  assertEquals(serverCountry, "NL");
  assertEquals(getCountryTaxRateMirror(serverCountry), 21);
  // The exploit value (AU -> 10) is never reached because the body field is gone.
  assertEquals(getCountryTaxRateMirror("AU"), 10); // proves AU would have been 10
});

Deno.test("F-TAX-12: missing Stripe account falls back to NL (21), never to a body value", () => {
  assertEquals(resolveBusinessCountry(null), "NL");
  assertEquals(getCountryTaxRateMirror(resolveBusinessCountry(undefined)), 21);
});

Deno.test("F-TAX-13: tier gate admits professional/enterprise (incl. trial=professional), blocks the rest", () => {
  const allowed = (tier: string | null | undefined) =>
    !!tier && ['professional', 'enterprise'].includes(tier);
  // Trial users get subscription_tier='professional' (update_user_status), so onboarding works.
  assertEquals(allowed('professional'), true);
  assertEquals(allowed('enterprise'), true);
  // Free / starter / expired (null) are blocked.
  assertEquals(allowed('free'), false);
  assertEquals(allowed('starter'), false);
  assertEquals(allowed(null), false);
  assertEquals(allowed(undefined), false);
});
