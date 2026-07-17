import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";

async function source(relativePath: string): Promise<string> {
  return await Deno.readTextFile(new URL(relativePath, import.meta.url));
}

Deno.test("public booking creation delegates one atomic server-authoritative commit", async () => {
  const code = await source("../create-booking/index.ts");

  assertStringIncludes(code, '.rpc("commit_public_booking"');
  assertStringIncludes(code, "parsePublicBookingCommitResult");
  assertEquals(code.includes("sanitized.endTime"), false);
  assertEquals(code.includes("bookingData.endTime"), false);
  assertEquals(code.includes("p_end_time"), false);
  assertEquals(code.includes('.from("payment_settings")'), false);
  assertEquals(code.includes('.from("bookings")'), false);
});

Deno.test("public booking payment requires the booking-time policy snapshot", async () => {
  const code = await source("../create-booking-payment/index.ts");

  assertStringIncludes(code, "parsePublicBookingPolicySnapshot");
  assertEquals(code.includes('.from("payment_settings")'), false);
  assertEquals(code.includes("using defaults"), false);
});

Deno.test("pay on site is an atomic server decision that rejects pending provider attempts", async () => {
  const code = await source("../create-booking-payment/index.ts");
  const deferStart = code.indexOf('paymentPolicy.action === "DEFER_PAYMENT"');
  const priceStart = code.indexOf(
    "parsePublicBookingPriceSnapshot",
    deferStart,
  );
  const deferBranch = code.slice(deferStart, priceStart);

  assert(deferStart >= 0 && priceStart > deferStart);
  assertStringIncludes(deferBranch, ".rpc(");
  assertStringIncludes(deferBranch, '"defer_public_booking_payment_on_site"');
  assertStringIncludes(deferBranch, "PENDING_PAYMENT_ATTEMPT_EXISTS");
  assertEquals(deferBranch.includes('.from("bookings")'), false);
  assertEquals(deferBranch.includes(".update("), false);
});

Deno.test("public booking payment cannot fall back to a mutable service price", async () => {
  const code = await source("../create-booking-payment/index.ts");

  assertStringIncludes(code, "parsePublicBookingPriceSnapshot");
  assertEquals(code.includes("booking.service_types?.price"), false);
  assertEquals(code.includes("service.price"), false);
  assertEquals(code.includes("service?.price"), false);
  assertEquals(/^\s*price\s*,?\s*$/m.test(code), false);
});

Deno.test("public booking charge tax comes only from the immutable booking snapshot", async () => {
  const code = await source("../create-booking-payment/index.ts");

  assertStringIncludes(code, "policy.tax");
  assertEquals(code.includes("service_types ("), false);
  for (
    const mutableField of [
      "service?.tax_enabled",
      "service.tax_behavior",
      "service.applicable_tax_rate",
      "service?.supply_type",
      "service?.business_country",
      "service.tax_code",
      "bodyCustomerCountry",
      "bodyCustomerVatId",
    ]
  ) {
    assertEquals(
      code.includes(mutableField),
      false,
      `charge path still reads mutable tax input: ${mutableField}`,
    );
  }
});

Deno.test("R45 migration owns duration, policy, price, and RPC grants", async () => {
  const sql = await source(
    "../../migrations/20260717039000_R45_atomic_public_booking_policy_snapshot.sql",
  );

  assertStringIncludes(sql, "public_booking_policy_snapshot");
  assertStringIncludes(
    sql,
    "CREATE OR REPLACE FUNCTION public.commit_public_booking",
  );
  assertStringIncludes(sql, "make_interval(mins => v_service.duration)");
  assertEquals(sql.includes("FOR KEY SHARE"), false);
  assertStringIncludes(sql, "FOR SHARE");
  assertStringIncludes(sql, "PAYMENT_POLICY_UNAVAILABLE");
  assertStringIncludes(sql, "total_price");
  assertStringIncludes(sql, "total_amount_cents");
  assertStringIncludes(
    sql,
    "NEW.booking_duration IS DISTINCT FROM OLD.booking_duration",
  );
  assertEquals(sql.includes("COALESCE(v_service.price, 0)"), false);
  assertStringIncludes(
    sql,
    "REVOKE ALL ON FUNCTION public.commit_public_booking",
  );
  assert(
    sql.includes("TO service_role"),
    "atomic commit must be callable only through the service-role edge boundary",
  );
});

Deno.test("R45 deployment preflight is deterministic and never backfills mutable settings", async () => {
  const sql = await source(
    "../../migrations/20260717039000_R45_atomic_public_booking_policy_snapshot.sql",
  );

  assertStringIncludes(
    sql,
    "assert_r45_no_active_payable_legacy_bookings",
  );
  assertStringIncludes(
    sql,
    "R45_PRECHECK_ACTIVE_PAYABLE_LEGACY_BOOKINGS count=",
  );
  assertStringIncludes(
    sql,
    "SELECT public.assert_r45_no_active_payable_legacy_bookings()",
  );
  const preflightStart = sql.indexOf(
    "CREATE OR REPLACE FUNCTION public.assert_r45_no_active_payable_legacy_bookings",
  );
  const preflightEnd = sql.indexOf(
    "SELECT public.assert_r45_no_active_payable_legacy_bookings()",
  );
  const preflight = sql.slice(preflightStart, preflightEnd);
  assert(preflightStart >= 0 && preflightEnd > preflightStart);
  assertEquals(preflight.includes("UPDATE public.bookings"), false);
  assertEquals(preflight.includes("FROM public.payment_settings"), false);
  assertEquals(preflight.includes("FROM public.service_types"), false);
  assertEquals(
    /UPDATE\s+public\.bookings[\s\S]*FROM\s+public\.payment_settings/i.test(
      preflight,
    ),
    false,
  );
});

Deno.test("R45 normalizes only the authoritative supported currency-method matrix", async () => {
  const sql = await source(
    "../../migrations/20260717039000_R45_atomic_public_booking_policy_snapshot.sql",
  );

  for (
    const contract of [
      "normalize_public_booking_payment_methods",
      "cards_international",
      "cartes_bancaires",
      "revolut_pay",
      "pay_by_bank",
      "sepa_debit",
      "v_method IN ('ideal', 'bancontact', 'sofort', 'eps', 'sepa_debit')",
      "v_method = 'pay_by_bank' AND v_currency <> 'gbp'",
    ]
  ) {
    assertStringIncludes(sql, contract);
  }
});
