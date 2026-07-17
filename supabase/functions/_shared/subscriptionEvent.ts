export type SubscriptionEventKind = "created" | "updated" | "deleted";

const STRIPE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
  "canceled",
]);

export function normalizeStripeSubscriptionStatus(
  status: string,
  eventKind: SubscriptionEventKind,
): string {
  if (eventKind === "deleted") return "canceled";
  if (!STRIPE_SUBSCRIPTION_STATUSES.has(status)) {
    throw new Error("STRIPE_SUBSCRIPTION_STATUS_UNSUPPORTED");
  }
  return status;
}

export function subscriptionCanGrantAccess(status: string): boolean {
  return status === "active" || status === "trialing";
}

export function subscriptionIdFromInvoice(
  invoice: {
    subscription?: string | { id?: string } | null;
    parent?: {
      subscription_details?: { subscription?: string | { id?: string } };
    } | null;
  },
): string | null {
  const legacy = invoice.subscription;
  if (typeof legacy === "string") return legacy;
  if (legacy && typeof legacy.id === "string") return legacy.id;
  const modern = invoice.parent?.subscription_details?.subscription;
  if (typeof modern === "string") return modern;
  if (modern && typeof modern.id === "string") return modern.id;
  return null;
}
