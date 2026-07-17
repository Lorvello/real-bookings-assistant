export interface PublicBookingPolicySnapshot {
  version: 1;
  capturedAt: string;
  securePaymentsEnabled: boolean;
  paymentRequiredForBooking: boolean;
  paymentOptional: boolean;
  paymentRequired: boolean;
  enabledPaymentMethods: string[];
  allowedPaymentTiming: string[];
  payoutOption: "standard" | "instant";
  paymentDeadlineHours: number | null;
  autoCancelUnpaidBookings: boolean;
  tax: PublicBookingTaxSnapshot;
}

export interface PublicBookingTaxSnapshot {
  taxEnabled: boolean;
  taxCode: string | null;
  taxBehavior: "inclusive" | "exclusive";
  applicableTaxRate: number | null;
  businessCountry: string;
  supplyType: "in_person" | "remote_service" | "digital";
  customerCountry: string | null;
  customerVatId: string | null;
}

export interface PublicBookingPriceSnapshot {
  baseAmount: number;
  baseAmountCents: number;
  currency: string;
}

export type PublicBookingCommitResult =
  | {
    ok: true;
    booking: Record<string, unknown>;
    paymentRequired: boolean;
  }
  | {
    ok: false;
    code: string;
    reason: unknown;
    status: number;
  };

export type PublicBookingSnapshotResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; reason: string };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactBoolean(value: unknown): value is boolean {
  return value === true || value === false;
}

function stringArray(value: unknown): string[] | null {
  if (
    !Array.isArray(value) || value.some((entry) => typeof entry !== "string")
  ) {
    return null;
  }
  return value.map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePublicBookingPolicySnapshot(
  snapshot: unknown,
  bookingPaymentRequired: unknown,
): PublicBookingSnapshotResult<PublicBookingPolicySnapshot> {
  if (!isRecord(snapshot) || snapshot.version !== 1) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_POLICY_SNAPSHOT_MISSING",
      reason: "This booking has no supported booking-time payment policy.",
    };
  }

  const enabledPaymentMethods = stringArray(snapshot.enabled_payment_methods);
  const allowedPaymentTiming = stringArray(snapshot.allowed_payment_timing);
  const tax = isRecord(snapshot.tax) ? snapshot.tax : null;
  const payoutOption = snapshot.payout_option;
  const paymentDeadlineHours = snapshot.payment_deadline_hours;
  const normalizedPaymentDeadlineHours = paymentDeadlineHours === null
    ? null
    : typeof paymentDeadlineHours === "number" &&
        Number.isInteger(paymentDeadlineHours) && paymentDeadlineHours > 0
    ? paymentDeadlineHours
    : undefined;
  const taxCode = tax?.tax_code === null
    ? null
    : typeof tax?.tax_code === "string" && tax.tax_code.trim() !== ""
    ? tax.tax_code.trim()
    : undefined;
  const applicableTaxRate = tax?.applicable_tax_rate === null
    ? null
    : typeof tax?.applicable_tax_rate === "number" &&
        Number.isFinite(tax.applicable_tax_rate) &&
        tax.applicable_tax_rate >= 0 && tax.applicable_tax_rate <= 100
    ? tax.applicable_tax_rate
    : undefined;
  const businessCountry = typeof tax?.business_country === "string" &&
      /^[A-Z]{2}$/.test(tax.business_country)
    ? tax.business_country
    : undefined;
  const supplyType = tax?.supply_type;
  const customerCountry = tax?.customer_country === null
    ? null
    : typeof tax?.customer_country === "string" &&
        /^[A-Z]{2}$/.test(tax.customer_country)
    ? tax.customer_country
    : undefined;
  const customerVatId = tax?.customer_vat_id === null
    ? null
    : typeof tax?.customer_vat_id === "string" &&
        /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(tax.customer_vat_id)
    ? tax.customer_vat_id
    : undefined;
  if (
    typeof snapshot.captured_at !== "string" ||
    !exactBoolean(snapshot.secure_payments_enabled) ||
    !exactBoolean(snapshot.payment_required_for_booking) ||
    !exactBoolean(snapshot.payment_optional) ||
    !exactBoolean(snapshot.payment_required) ||
    enabledPaymentMethods === null ||
    allowedPaymentTiming === null ||
    (payoutOption !== "standard" && payoutOption !== "instant") ||
    !exactBoolean(snapshot.auto_cancel_unpaid_bookings) ||
    normalizedPaymentDeadlineHours === undefined ||
    !tax ||
    !exactBoolean(tax.tax_enabled) ||
    taxCode === undefined ||
    (tax.tax_behavior !== "inclusive" && tax.tax_behavior !== "exclusive") ||
    applicableTaxRate === undefined ||
    businessCountry === undefined ||
    !["in_person", "remote_service", "digital"].includes(
      typeof supplyType === "string" ? supplyType : "",
    ) ||
    customerCountry === undefined ||
    customerVatId === undefined
  ) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_POLICY_SNAPSHOT_INVALID",
      reason: "The booking-time payment policy is incomplete or invalid.",
    };
  }

  const computedPaymentRequired = snapshot.secure_payments_enabled &&
    snapshot.payment_required_for_booking && !snapshot.payment_optional;
  if (
    snapshot.payment_required !== computedPaymentRequired ||
    !exactBoolean(bookingPaymentRequired) ||
    (computedPaymentRequired && bookingPaymentRequired !== true)
  ) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_POLICY_SNAPSHOT_CONFLICT",
      reason:
        "The booking payment requirement conflicts with its policy snapshot.",
    };
  }

  if (
    computedPaymentRequired &&
    (
      !allowedPaymentTiming.includes("pay_now") ||
      enabledPaymentMethods.length === 0
    )
  ) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_POLICY_SNAPSHOT_UNPAYABLE",
      reason:
        "The required booking payment has no valid pay-now configuration.",
    };
  }

  return {
    ok: true,
    value: {
      version: 1,
      capturedAt: snapshot.captured_at,
      securePaymentsEnabled: snapshot.secure_payments_enabled,
      paymentRequiredForBooking: snapshot.payment_required_for_booking,
      paymentOptional: snapshot.payment_optional,
      paymentRequired: snapshot.payment_required,
      enabledPaymentMethods,
      allowedPaymentTiming,
      payoutOption,
      paymentDeadlineHours: normalizedPaymentDeadlineHours,
      autoCancelUnpaidBookings: snapshot.auto_cancel_unpaid_bookings,
      tax: {
        taxEnabled: tax.tax_enabled,
        taxCode,
        taxBehavior: tax.tax_behavior,
        applicableTaxRate,
        businessCountry,
        supplyType: supplyType as PublicBookingTaxSnapshot["supplyType"],
        customerCountry,
        customerVatId,
      },
    },
  };
}

export function parsePublicBookingPriceSnapshot(input: {
  totalPrice: unknown;
  totalAmountCents: unknown;
  paymentCurrency: unknown;
}): PublicBookingSnapshotResult<PublicBookingPriceSnapshot> {
  const totalPrice = finiteNumber(input.totalPrice);
  const totalAmountCents = finiteNumber(input.totalAmountCents);
  const currency = typeof input.paymentCurrency === "string"
    ? input.paymentCurrency.trim().toLowerCase()
    : "";

  if (
    totalPrice === null || totalPrice <= 0 ||
    totalAmountCents === null || !Number.isInteger(totalAmountCents) ||
    totalAmountCents <= 0 ||
    !/^[a-z]{3}$/.test(currency) ||
    Math.round(totalPrice * 100) !== totalAmountCents
  ) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_PRICE_SNAPSHOT_INVALID",
      reason: "This booking does not have a valid immutable price snapshot.",
    };
  }

  return {
    ok: true,
    value: {
      baseAmount: totalAmountCents / 100,
      baseAmountCents: totalAmountCents,
      currency,
    },
  };
}

function publicBookingCommitFailureStatus(code: string): number {
  if (code === "SLOT_TAKEN") return 409;
  if (code === "CALENDAR_NOT_FOUND" || code === "SERVICE_NOT_FOUND") {
    return 404;
  }
  if (code === "INVALID_BOOKING_INPUT" || code === "VALIDATION_FAILED") {
    return 400;
  }
  if (
    code === "PAYMENT_POLICY_UNAVAILABLE" ||
    code === "PUBLIC_BOOKING_PRICE_INVALID" ||
    code === "PUBLIC_BOOKING_TAX_POLICY_INVALID" ||
    code === "SERVICE_DURATION_INVALID"
  ) {
    return 503;
  }
  return 500;
}

export function parsePublicBookingCommitResult(
  value: unknown,
): PublicBookingCommitResult {
  const result = isRecord(value) ? value : null;
  if (!result || typeof result.success !== "boolean") {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_COMMIT_RESULT_INVALID",
      reason: "The booking could not be committed safely. Please try again.",
      status: 500,
    };
  }

  if (result.success) {
    const booking = isRecord(result.booking) ? result.booking : null;
    if (
      !booking ||
      typeof result.payment_required !== "boolean" ||
      booking.payment_required !== result.payment_required
    ) {
      return {
        ok: false,
        code: "PUBLIC_BOOKING_COMMIT_RESULT_INVALID",
        reason: "The booking could not be committed safely. Please try again.",
        status: 500,
      };
    }
    return {
      ok: true,
      booking,
      paymentRequired: result.payment_required,
    };
  }

  if (
    typeof result.code !== "string" ||
    !/^[A-Z0-9_]+$/.test(result.code)
  ) {
    return {
      ok: false,
      code: "PUBLIC_BOOKING_COMMIT_RESULT_INVALID",
      reason: "The booking could not be committed safely. Please try again.",
      status: 500,
    };
  }

  return {
    ok: false,
    code: result.code,
    reason: result.errors ?? result.error ??
      "The booking could not be committed safely. Please try again.",
    status: publicBookingCommitFailureStatus(result.code),
  };
}
