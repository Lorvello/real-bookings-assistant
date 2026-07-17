export interface FunctionInvokeFailureDecision {
  booking_disposition?: "cancel_safe" | "preserve";
  retryable?: boolean;
  code?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decisionFrom(value: unknown): FunctionInvokeFailureDecision | null {
  if (!isRecord(value)) return null;
  const decision: FunctionInvokeFailureDecision = {};
  if (
    value.booking_disposition === "cancel_safe" ||
    value.booking_disposition === "preserve"
  ) {
    decision.booking_disposition = value.booking_disposition;
  }
  if (typeof value.retryable === "boolean") {
    decision.retryable = value.retryable;
  }
  if (typeof value.code === "string" && value.code.trim()) {
    decision.code = value.code.trim();
  }
  return Object.keys(decision).length > 0 ? decision : null;
}

export async function readFunctionInvokeFailure(
  data: unknown,
  error: unknown,
): Promise<FunctionInvokeFailureDecision | null> {
  const direct = decisionFrom(data);
  if (direct) return direct;
  if (!isRecord(error)) return null;
  const context = error.context;
  if (!(context instanceof Response)) return null;
  try {
    return decisionFrom(await context.clone().json());
  } catch {
    return null;
  }
}
