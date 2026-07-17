import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  type BookingPaymentRowLike,
  computeOssBucket,
  isCountedStatus,
} from "./ossThreshold.ts";
import { computeRefundAdjustedRow } from "./taxReport.ts";

const functionSources = {
  "generate-tax-report": await Deno.readTextFile(
    new URL("../generate-tax-report/index.ts", import.meta.url),
  ),
  "export-tax-report": await Deno.readTextFile(
    new URL("../export-tax-report/index.ts", import.meta.url),
  ),
  "get-tax-data": await Deno.readTextFile(
    new URL("../get-tax-data/index.ts", import.meta.url),
  ),
  "get-tax-analytics": await Deno.readTextFile(
    new URL("../get-tax-analytics/index.ts", import.meta.url),
  ),
} as const;

function firstLiteralStatusFilter(source: string): string[] {
  const match = source.match(
    /\.in\(\s*["']status["']\s*,\s*\[([^\]]+)\]\s*\)/,
  );
  assert(match, "expected a literal booking_payments status filter");
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

Deno.test("tax queries retain partially_refunded rows without admitting unrelated statuses", () => {
  assertEquals(
    firstLiteralStatusFilter(functionSources["generate-tax-report"]),
    [
      "succeeded",
      "completed",
      "partially_refunded",
    ],
  );
  assertEquals(firstLiteralStatusFilter(functionSources["export-tax-report"]), [
    "succeeded",
    "completed",
    "partially_refunded",
  ]);
  assertEquals(firstLiteralStatusFilter(functionSources["get-tax-data"]), [
    "succeeded",
    "completed",
    "partially_refunded",
  ]);
  assertEquals(firstLiteralStatusFilter(functionSources["get-tax-analytics"]), [
    "succeeded",
    "completed",
    "partially_refunded",
    // Analytics needs fully-refunded rows so it can reduce the related booking to zero.
    "refunded",
  ]);
});

Deno.test("partially_refunded keeps only retained gross, VAT, and net amounts", () => {
  assertEquals(isCountedStatus("partially_refunded"), true);

  const adjusted = computeRefundAdjustedRow(12_100, 2_100, 6_050);
  assertEquals(adjusted, {
    grossCents: 6_050,
    taxCents: 1_050,
    netCents: 5_000,
    refundedCents: 6_050,
    fullyRefunded: false,
  });

  const payment: BookingPaymentRowLike = {
    amount_cents: 12_100,
    customer_country: "DE",
    reverse_charge: false,
    refund_amount_cents: 6_050,
    tax_breakdown: [{ amountCents: 2_100, country: "DE" }],
    status: "partially_refunded",
    currency: "eur",
  };
  const oss = computeOssBucket([payment], "NL");
  assertEquals(oss.cumulativeCents, 5_000);
  assertEquals(oss.contributingPayments, 1);
});

Deno.test("fully refunded and unsettled statuses do not pollute the OSS revenue bucket", () => {
  const base: Omit<BookingPaymentRowLike, "status"> = {
    amount_cents: 12_100,
    customer_country: "DE",
    reverse_charge: false,
    refund_amount_cents: 12_100,
    tax_breakdown: [{ amountCents: 2_100, country: "DE" }],
    currency: "eur",
  };
  const rows: BookingPaymentRowLike[] = [
    { ...base, status: "refunded" },
    { ...base, status: "pending" },
    { ...base, status: "failed" },
    { ...base, status: "canceled" },
  ];

  const oss = computeOssBucket(rows, "NL");
  assertEquals(oss.cumulativeCents, 0);
  assertEquals(oss.contributingPayments, 0);
});

Deno.test("get-tax-data applies authoritative refund adjustment in both overview passes", () => {
  const source = functionSources["get-tax-data"];
  assertStringIncludes(source, "retrieveBookingPaymentIntent");
  assertStringIncludes(source, "resolveRefundedCents");
  assertStringIncludes(source, "computeRefundAdjustedRow");
  assertEquals(source.match(/retrieveBookingPaymentIntent\(/g)?.length, 2);
  assertEquals(source.match(/resolveRefundedCents\(/g)?.length, 2);
  assertEquals(source.match(/computeRefundAdjustedRow\(/g)?.length, 2);
  assertEquals(
    source.match(/\[\s*["']latest_charge["']\s*\]/g)?.length,
    2,
  );
  assertEquals(source.match(/\.grossCents \/ 100/g)?.length, 2);
  assertEquals(source.match(/\.taxCents \/ 100/g)?.length, 2);
});
