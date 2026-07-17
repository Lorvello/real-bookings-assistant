export type BookingProviderKind = "payment_intent" | "checkout_session";
export type BookingProviderStripeMode = "test" | "live";

export interface ClaimedBookingProviderCleanup {
  outcome: "claimed";
  job_id: string;
  claim_token: string;
  provider_kind: BookingProviderKind;
  provider_object_id: string;
  stripe_mode: BookingProviderStripeMode;
  attempt_count: number;
}

export type BookingProviderCleanupClaim =
  | { outcome: "empty" }
  | ClaimedBookingProviderCleanup;

export interface BookingProviderCleanupFinalizeOutcome {
  outcome: "completed" | "replay" | "retry_scheduled" | "dead_letter";
  humanActionRequired: boolean;
}

export type BookingProviderState =
  | {
    providerKind: "checkout_session";
    status: unknown;
    paymentStatus: unknown;
  }
  | {
    providerKind: "payment_intent";
    status: unknown;
  };

export type BookingProviderCleanupClassification =
  | { outcome: "success" }
  | {
    outcome: "action_required";
    action: "expire_checkout_session" | "cancel_payment_intent";
  }
  | {
    outcome: "permanent_failure";
    errorCode: "PROVIDER_ALREADY_COMPLETED" | "PROVIDER_ALREADY_CAPTURED";
  }
  | {
    outcome: "retryable_failure";
    errorCode: "PROVIDER_STATE_RETRYABLE";
  };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseBookingProviderCleanupClaim(
  value: unknown,
): BookingProviderCleanupClaim | null {
  // PostgREST represents a RETURNS TABLE claim as an array. The processor asks
  // for one row, so [] is the durable empty outcome and [row] is one claim.
  if (Array.isArray(value)) {
    if (value.length === 0) return { outcome: "empty" };
    if (value.length !== 1 || !isRecord(value[0])) return null;
    value = { outcome: "claimed", ...value[0] };
  }
  if (!isRecord(value)) return null;
  if (value.outcome === "empty") return { outcome: "empty" };
  if (value.outcome !== "claimed") return null;

  if (
    typeof value.job_id !== "string" ||
    !UUID_PATTERN.test(value.job_id) ||
    typeof value.claim_token !== "string" ||
    !UUID_PATTERN.test(value.claim_token) ||
    (value.provider_kind !== "payment_intent" &&
      value.provider_kind !== "checkout_session") ||
    typeof value.provider_object_id !== "string" ||
    value.provider_object_id.trim().length === 0 ||
    (value.stripe_mode !== "test" && value.stripe_mode !== "live") ||
    typeof value.attempt_count !== "number" ||
    !Number.isInteger(value.attempt_count) ||
    value.attempt_count <= 0
  ) {
    return null;
  }

  return {
    outcome: "claimed",
    job_id: value.job_id,
    claim_token: value.claim_token,
    provider_kind: value.provider_kind,
    provider_object_id: value.provider_object_id.trim(),
    stripe_mode: value.stripe_mode,
    attempt_count: value.attempt_count,
  };
}

export function finalizeBookingProviderCleanupOutcome(
  value: unknown,
): BookingProviderCleanupFinalizeOutcome | null {
  if (!isRecord(value)) return null;
  if (
    value.outcome !== "completed" &&
    value.outcome !== "replay" &&
    value.outcome !== "retry_scheduled" &&
    value.outcome !== "dead_letter"
  ) {
    return null;
  }
  return {
    outcome: value.outcome,
    humanActionRequired: value.outcome === "dead_letter" ||
      value.human_action_required === true,
  };
}

const RETRYABLE_STATE: BookingProviderCleanupClassification = {
  outcome: "retryable_failure",
  errorCode: "PROVIDER_STATE_RETRYABLE",
};

export function classifyBookingProviderCleanupState(
  state: BookingProviderState,
): BookingProviderCleanupClassification {
  if (state.providerKind === "checkout_session") {
    if (state.status === "expired") {
      return { outcome: "success" };
    }
    if (state.status === "open") {
      return {
        outcome: "action_required",
        action: "expire_checkout_session",
      };
    }
    if (
      state.status === "complete" &&
      (state.paymentStatus === "paid" ||
        state.paymentStatus === "no_payment_required")
    ) {
      return {
        outcome: "permanent_failure",
        errorCode: "PROVIDER_ALREADY_COMPLETED",
      };
    }
    return RETRYABLE_STATE;
  }

  switch (state.status) {
    case "canceled":
      return { outcome: "success" };
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
    case "processing":
    case "requires_capture":
      return {
        outcome: "action_required",
        action: "cancel_payment_intent",
      };
    case "succeeded":
      return {
        outcome: "permanent_failure",
        errorCode: "PROVIDER_ALREADY_CAPTURED",
      };
    default:
      return RETRYABLE_STATE;
  }
}
