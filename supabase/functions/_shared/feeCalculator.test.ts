import { assertEquals, assertThrows } from "jsr:@std/assert@1.0.19";
import {
  calculateApplicationFee,
  calculateNetAmount,
  PLATFORM_FEE_PERCENTAGE,
  PLATFORM_FEE_RATE,
} from "./feeCalculator.ts";

Deno.test("destination charge deducts exactly the locked 1.9 percent", () => {
  const result = calculateApplicationFee({ amountCents: 10_000 });

  assertEquals(PLATFORM_FEE_PERCENTAGE, 1.9);
  assertEquals(PLATFORM_FEE_RATE, 0.019);
  assertEquals(result.applicationFeeCents, 190);
  assertEquals(result.platformFeeCents, 190);
  assertEquals(result.connectedAccountNetCents, 9_810);
  assertEquals(result.breakdown, {
    platformFeePercent: 0.019,
    platformFeeFixed: 0,
    chargeModel: "destination",
    stripeFeePayer: "platform",
  });
});

Deno.test("currency rounding is deterministic and never adds a fixed surcharge", () => {
  assertEquals(
    calculateApplicationFee({ amountCents: 105 }).applicationFeeCents,
    2,
  );
  assertEquals(
    calculateApplicationFee({ amountCents: 10_001 }).applicationFeeCents,
    190,
  );
});

Deno.test("connected-account net does not subtract platform-paid Stripe processing", () => {
  assertEquals(calculateNetAmount(10_000, 190), 9_810);
});

Deno.test("invalid money and rate inputs fail closed", () => {
  assertThrows(() => calculateApplicationFee({ amountCents: 0 }), TypeError);
  assertThrows(
    () =>
      calculateApplicationFee({
        amountCents: 100,
        platformFeePercentage: 1.01,
      }),
    TypeError,
  );
  assertThrows(() => calculateNetAmount(100, 101), TypeError);
});
