import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import {
  calculateInstallmentSchedule,
  planFromInstallmentConfig,
  planFromStoredInstallmentConfig,
} from "./installmentPlan.ts";

Deno.test("50/50 uses exact remainder for an odd-cent service price", () => {
  assertEquals(
    calculateInstallmentSchedule({
      type: "preset",
      preset: "50_50",
    }, 9_999).map((part) => part.amount_cents),
    [5_000, 4_999],
  );
});

Deno.test("unsupported delayed collection plans fail closed", () => {
  assertThrows(() =>
    calculateInstallmentSchedule({
      type: "custom",
      deposits: [
        { percentage: 50, timing: "now" },
        { percentage: 50, timing: "hours_after", hours: 168 },
      ],
    }, 9_999)
  );
});

Deno.test("fixed deposit must be positive and below the service price", () => {
  assertThrows(
    () =>
      calculateInstallmentSchedule({
        type: "preset",
        preset: "fixed_deposit",
        fixed_deposit_amount: 100,
      }, 10_000),
    Error,
    "FIXED_DEPOSIT_AMOUNT_INVALID",
  );
  assertThrows(
    () =>
      calculateInstallmentSchedule({
        type: "preset",
        preset: "fixed_deposit",
        fixed_deposit_amount: -1,
      }, 10_000),
  );
});

Deno.test("custom percentages must total exactly 100", () => {
  assertThrows(
    () =>
      calculateInstallmentSchedule({
        type: "custom",
        deposits: [
          { percentage: 40, timing: "now" },
          { percentage: 50, timing: "appointment" },
        ],
      }, 10_000),
    Error,
    "INSTALLMENT_PERCENTAGE_TOTAL_INVALID",
  );
});

Deno.test("custom amount plans must sum to the authoritative price", () => {
  assertEquals(
    calculateInstallmentSchedule({
      type: "custom",
      deposits: [
        { amount: 30, timing: "now" },
        { amount: 70, timing: "appointment" },
      ],
    }, 10_000).map((part) => part.amount_cents),
    [3_000, 7_000],
  );
  assertThrows(
    () =>
      calculateInstallmentSchedule({
        type: "custom",
        deposits: [
          { amount: 30, timing: "now" },
          { amount: 60, timing: "appointment" },
        ],
      }, 10_000),
    Error,
    "INSTALLMENT_AMOUNT_TOTAL_INVALID",
  );
});

Deno.test("mixed amount and percentage plans fail closed", () => {
  assertThrows(
    () =>
      calculateInstallmentSchedule({
        type: "custom",
        deposits: [
          { percentage: 50, timing: "now" },
          { amount: 50, timing: "appointment" },
        ],
      }, 10_000),
    Error,
    "INSTALLMENT_VALUE_TYPES_MIXED",
  );
});

Deno.test("database config is normalized before calculation", () => {
  const plan = planFromInstallmentConfig({
    enabled: true,
    plan_type: "preset",
    preset_plan: "fixed_deposit",
    custom_deposits: [],
    fixed_deposit_amount: "25.00",
  });
  assertEquals(
    calculateInstallmentSchedule(plan, 10_000).map((part) => part.amount_cents),
    [2_500, 7_500],
  );
});

Deno.test("settings can round-trip a disabled stored override without authorizing it", () => {
  const row = {
    enabled: false,
    plan_type: "preset",
    preset_plan: "50_50",
    custom_deposits: [],
    fixed_deposit_amount: null,
  };

  assertEquals(planFromStoredInstallmentConfig(row), {
    type: "preset",
    preset: "50_50",
  });
  assertThrows(
    () => planFromInstallmentConfig(row),
    Error,
    "INSTALLMENTS_NOT_ENABLED",
  );
});
