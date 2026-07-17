export type BookingPaymentAction = "CREATE_PAYMENT" | "DEFER_PAYMENT";

export type BookingPaymentPolicyCode =
  | "PAYMENT_REQUEST_ALLOWED"
  | "PAYMENT_DEFERRED"
  | "PAYMENT_TIMING_NOT_ALLOWED"
  | "PAY_ON_SITE_NOT_AVAILABLE"
  | "SECURE_PAYMENTS_DISABLED"
  | "PAYMENT_METHOD_NOT_ALLOWED"
  | "NO_COMPATIBLE_PAYMENT_METHOD";

export interface BookingPaymentPolicyInput {
  securePaymentsEnabled: boolean;
  paymentOptional: boolean;
  allowedPaymentTiming: unknown;
  enabledPaymentMethods: unknown;
  requestedTiming: unknown;
  requestedMethod?: unknown;
  currency: string;
}

export interface BookingPaymentPolicyDecision {
  allowed: boolean;
  action: BookingPaymentAction | null;
  code: BookingPaymentPolicyCode;
  reason: string;
  stripePaymentMethods: string[];
  feePaymentMethod: string;
}

const METHOD_ALIASES: Record<string, string> = {
  ideal: "ideal",
  card: "card",
  cards: "card",
  cards_eea: "card",
  cards_uk: "card",
  cards_international: "card",
  "apple-pay": "card",
  apple_pay: "card",
  "google-pay": "card",
  google_pay: "card",
  "cartes-bancaires": "card",
  cartes_bancaires: "card",
  bancontact: "bancontact",
  blik: "blik",
  twint: "twint",
  "revolut-pay": "revolut_pay",
  revolut_pay: "revolut_pay",
  sofort: "sofort",
  eps: "eps",
  przelewy24: "p24",
  p24: "p24",
  "pay-by-bank": "pay_by_bank",
  pay_by_bank: "pay_by_bank",
  sepa_debit: "sepa_debit",
  klarna: "klarna",
};

const CURRENCY_RESTRICTIONS: Partial<Record<string, ReadonlySet<string>>> = {
  ideal: new Set(["eur"]),
  bancontact: new Set(["eur"]),
  blik: new Set(["pln"]),
  twint: new Set(["chf"]),
  sofort: new Set(["eur"]),
  eps: new Set(["eur"]),
  p24: new Set(["eur", "pln"]),
  pay_by_bank: new Set(["gbp"]),
  sepa_debit: new Set(["eur"]),
};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function toStripePaymentMethod(
  value: unknown,
  currency: string,
): string | null {
  if (typeof value !== "string") return null;
  const method = METHOD_ALIASES[value.trim().toLowerCase()];
  if (!method) return null;

  const allowedCurrencies = CURRENCY_RESTRICTIONS[method];
  const normalizedCurrency = currency.trim().toLowerCase();
  if (allowedCurrencies && !allowedCurrencies.has(normalizedCurrency)) {
    return null;
  }
  return method;
}

export function resolveStripePaymentMethods(
  enabledPaymentMethods: unknown,
  currency: string,
): string[] {
  return [
    ...new Set(
      stringList(enabledPaymentMethods)
        .map((method) => toStripePaymentMethod(method, currency))
        .filter((method): method is string => method !== null),
    ),
  ];
}

function denied(
  code: BookingPaymentPolicyCode,
  reason: string,
): BookingPaymentPolicyDecision {
  return {
    allowed: false,
    action: null,
    code,
    reason,
    stripePaymentMethods: [],
    feePaymentMethod: "card",
  };
}

export function evaluateBookingPaymentPolicy(
  input: BookingPaymentPolicyInput,
): BookingPaymentPolicyDecision {
  const timing = typeof input.requestedTiming === "string"
    ? input.requestedTiming.trim().toLowerCase()
    : "";
  const allowedTimings = stringList(input.allowedPaymentTiming);

  if (
    !["pay_now", "pay_on_site"].includes(timing) ||
    !allowedTimings.includes(timing)
  ) {
    return denied(
      "PAYMENT_TIMING_NOT_ALLOWED",
      "The selected payment timing is not enabled for this business.",
    );
  }

  if (timing === "pay_on_site") {
    if (!input.paymentOptional) {
      return denied(
        "PAY_ON_SITE_NOT_AVAILABLE",
        "Pay on site is not available for this booking.",
      );
    }
    return {
      allowed: true,
      action: "DEFER_PAYMENT",
      code: "PAYMENT_DEFERRED",
      reason: "Payment will be collected on site.",
      stripePaymentMethods: [],
      feePaymentMethod: "card",
    };
  }

  if (!input.securePaymentsEnabled) {
    return denied(
      "SECURE_PAYMENTS_DISABLED",
      "Online payments are not enabled for this business.",
    );
  }

  const enabledMethods = resolveStripePaymentMethods(
    input.enabledPaymentMethods,
    input.currency,
  );
  if (enabledMethods.length === 0) {
    return denied(
      "NO_COMPATIBLE_PAYMENT_METHOD",
      "No enabled payment method supports this booking currency.",
    );
  }

  if (
    input.requestedMethod !== undefined &&
    input.requestedMethod !== null &&
    input.requestedMethod !== ""
  ) {
    const requested = toStripePaymentMethod(
      input.requestedMethod,
      input.currency,
    );
    if (!requested || !enabledMethods.includes(requested)) {
      return denied(
        "PAYMENT_METHOD_NOT_ALLOWED",
        "The selected payment method is not enabled for this business.",
      );
    }
    return {
      allowed: true,
      action: "CREATE_PAYMENT",
      code: "PAYMENT_REQUEST_ALLOWED",
      reason: "Online payment is enabled.",
      stripePaymentMethods: [requested],
      feePaymentMethod: requested,
    };
  }

  return {
    allowed: true,
    action: "CREATE_PAYMENT",
    code: "PAYMENT_REQUEST_ALLOWED",
    reason: "Online payment is enabled.",
    stripePaymentMethods: enabledMethods,
    feePaymentMethod: enabledMethods[0],
  };
}
