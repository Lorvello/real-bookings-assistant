export type StripeMode = "test" | "live";

export class StripeWebhookModeError extends Error {
  readonly code:
    | "STRIPE_MODE_NOT_CONFIGURED"
    | "STRIPE_WEBHOOK_MODE_MISMATCH"
    | "STRIPE_EVENT_LIVEMODE_MISMATCH";

  constructor(code: StripeWebhookModeError["code"]) {
    super(code);
    this.name = "StripeWebhookModeError";
    this.code = code;
  }
}

export function assertStripeWebhookMode(
  configuredMode: string | undefined,
  verifiedMode: StripeMode,
  eventLivemode: boolean,
): StripeMode {
  const normalized = configuredMode?.trim().toLowerCase();
  if (normalized !== "test" && normalized !== "live") {
    throw new StripeWebhookModeError("STRIPE_MODE_NOT_CONFIGURED");
  }
  if (normalized !== verifiedMode) {
    throw new StripeWebhookModeError("STRIPE_WEBHOOK_MODE_MISMATCH");
  }
  if (eventLivemode !== (verifiedMode === "live")) {
    throw new StripeWebhookModeError("STRIPE_EVENT_LIVEMODE_MISMATCH");
  }
  return normalized;
}
