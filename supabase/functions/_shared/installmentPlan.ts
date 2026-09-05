import { z } from "npm:zod@3.23.8";

const timingSchema = z.enum(["now", "appointment"]);
const depositSchema = z.object({
  percentage: z.number().finite().positive().max(100).optional(),
  amount: z.number().finite().positive().optional(),
  timing: timingSchema,
}).strict().superRefine((deposit, context) => {
  const valueCount = Number(deposit.percentage !== undefined) +
    Number(deposit.amount !== undefined);
  if (valueCount !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Each installment needs exactly one percentage or amount.",
    });
  }
});

const presetPlanSchema = z.object({
  type: z.literal("preset"),
  preset: z.enum([
    "100_at_booking",
    "50_50",
    "fixed_deposit",
  ]),
  fixed_deposit_amount: z.number().finite().positive().optional(),
}).strict();

const customPlanSchema = z.object({
  type: z.literal("custom"),
  deposits: z.array(depositSchema).length(2),
}).strict();

export const installmentPlanSchema = z.discriminatedUnion("type", [
  presetPlanSchema,
  customPlanSchema,
]);

export type InstallmentPlan = z.infer<typeof installmentPlanSchema>;
export type InstallmentTiming = z.infer<typeof timingSchema>;

export interface CalculatedInstallment {
  amount_cents: number;
  timing: InstallmentTiming;
  payment_method: "online" | "cash";
}

export interface InstallmentConfigRow {
  enabled: boolean | null;
  plan_type: string | null;
  preset_plan: string | null;
  custom_deposits: unknown;
  fixed_deposit_amount: number | string | null;
}

function assertServicePrice(servicePriceCents: number): void {
  if (
    !Number.isInteger(servicePriceCents) ||
    servicePriceCents <= 0 ||
    servicePriceCents > 99_999_999
  ) {
    throw new Error("INSTALLMENT_SERVICE_PRICE_INVALID");
  }
}

function presetDeposits(
  plan: Extract<InstallmentPlan, { type: "preset" }>,
): Array<z.infer<typeof depositSchema>> {
  switch (plan.preset) {
    case "100_at_booking":
      return [{ percentage: 100, timing: "now" }];
    case "50_50":
      return [
        { percentage: 50, timing: "now" },
        { percentage: 50, timing: "appointment" },
      ];
    case "fixed_deposit":
      throw new Error("FIXED_DEPOSIT_REQUIRES_AMOUNT_CALCULATION");
  }
}

function validateSchedule(installments: CalculatedInstallment[]): void {
  if (installments.filter((part) => part.timing === "now").length !== 1) {
    throw new Error("INSTALLMENT_REQUIRES_ONE_IMMEDIATE_PAYMENT");
  }
  if (
    installments.filter((part) => part.timing === "appointment").length > 1
  ) {
    throw new Error("INSTALLMENT_ALLOWS_ONE_APPOINTMENT_PAYMENT");
  }
  if (installments.some((part) => part.amount_cents <= 0)) {
    throw new Error("INSTALLMENT_AMOUNT_INVALID");
  }
}

function calculatePercentagePlan(
  deposits: Array<z.infer<typeof depositSchema>>,
  servicePriceCents: number,
): CalculatedInstallment[] {
  if (deposits.some((deposit) => deposit.percentage === undefined)) {
    throw new Error("INSTALLMENT_VALUE_TYPES_MIXED");
  }
  const totalPercentage = deposits.reduce(
    (sum, deposit) => sum + (deposit.percentage ?? 0),
    0,
  );
  if (Math.abs(totalPercentage - 100) > 0.000001) {
    throw new Error("INSTALLMENT_PERCENTAGE_TOTAL_INVALID");
  }

  let allocatedCents = 0;
  return deposits.map((deposit, index) => {
    const amountCents = index === deposits.length - 1
      ? servicePriceCents - allocatedCents
      : Math.round(servicePriceCents * (deposit.percentage ?? 0) / 100);
    allocatedCents += amountCents;
    return {
      amount_cents: amountCents,
      timing: deposit.timing,
      payment_method: deposit.timing === "now"
        ? "online" as const
        : "cash" as const,
    };
  });
}

function calculateAmountPlan(
  deposits: Array<z.infer<typeof depositSchema>>,
  servicePriceCents: number,
): CalculatedInstallment[] {
  if (deposits.some((deposit) => deposit.amount === undefined)) {
    throw new Error("INSTALLMENT_VALUE_TYPES_MIXED");
  }
  const amounts = deposits.map((deposit) =>
    Math.round((deposit.amount ?? 0) * 100)
  );
  if (amounts.reduce((sum, amount) => sum + amount, 0) !== servicePriceCents) {
    throw new Error("INSTALLMENT_AMOUNT_TOTAL_INVALID");
  }
  return deposits.map((deposit, index) => ({
    amount_cents: amounts[index],
    timing: deposit.timing,
    payment_method: deposit.timing === "now"
      ? "online" as const
      : "cash" as const,
  }));
}

export function calculateInstallmentSchedule(
  rawPlan: unknown,
  servicePriceCents: number,
): CalculatedInstallment[] {
  assertServicePrice(servicePriceCents);
  const plan = installmentPlanSchema.parse(rawPlan);

  let installments: CalculatedInstallment[];
  if (plan.type === "preset" && plan.preset === "fixed_deposit") {
    if (plan.fixed_deposit_amount === undefined) {
      throw new Error("FIXED_DEPOSIT_AMOUNT_REQUIRED");
    }
    const depositCents = Math.round(plan.fixed_deposit_amount * 100);
    if (depositCents <= 0 || depositCents >= servicePriceCents) {
      throw new Error("FIXED_DEPOSIT_AMOUNT_INVALID");
    }
    installments = [
      {
        amount_cents: depositCents,
        timing: "now",
        payment_method: "online",
      },
      {
        amount_cents: servicePriceCents - depositCents,
        timing: "appointment",
        payment_method: "cash",
      },
    ];
  } else {
    const deposits = plan.type === "preset"
      ? presetDeposits(plan)
      : plan.deposits;
    const usesPercentages = deposits.every((part) =>
      part.percentage !== undefined
    );
    installments = usesPercentages
      ? calculatePercentagePlan(deposits, servicePriceCents)
      : calculateAmountPlan(deposits, servicePriceCents);
  }

  validateSchedule(installments);
  if (
    installments.reduce((sum, part) => sum + part.amount_cents, 0) !==
      servicePriceCents
  ) {
    throw new Error("INSTALLMENT_TOTAL_INTEGRITY_FAILED");
  }
  return installments;
}

export function planFromInstallmentConfig(
  row: InstallmentConfigRow,
): InstallmentPlan {
  if (row.enabled !== true) {
    throw new Error("INSTALLMENTS_NOT_ENABLED");
  }
  return planFromStoredInstallmentConfig(row);
}

/**
 * Decode a persisted per-service plan for the owner settings editor.
 *
 * Delivery code must use planFromInstallmentConfig so a disabled override still
 * fails closed. The settings read path also needs to round-trip a saved plan while
 * the master switch is off, so it deliberately decodes the plan without treating
 * `enabled=false` as a delivery authorization.
 */
export function planFromStoredInstallmentConfig(
  row: InstallmentConfigRow,
): InstallmentPlan {
  if (row.plan_type === "preset") {
    const fixedAmount = row.fixed_deposit_amount === null
      ? undefined
      : Number(row.fixed_deposit_amount);
    return installmentPlanSchema.parse({
      type: "preset",
      preset: row.preset_plan,
      ...(row.preset_plan === "fixed_deposit"
        ? { fixed_deposit_amount: fixedAmount }
        : {}),
    });
  }
  if (row.plan_type === "custom") {
    return installmentPlanSchema.parse({
      type: "custom",
      deposits: row.custom_deposits,
    });
  }
  throw new Error("INSTALLMENT_CONFIG_INVALID");
}
