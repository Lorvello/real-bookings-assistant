import { subscriptionCanGrantAccess } from "./subscriptionEvent.ts";

export type StripeMode = "test" | "live";

type StripeReference = string | { id?: string } | null | undefined;

function referenceId(value: StripeReference): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (
    value && typeof value === "object" &&
    typeof value.id === "string" && value.id.trim()
  ) {
    return value.id;
  }
  return null;
}

export interface VerifiedSubscriptionSession {
  userId: string;
  customerId: string;
  subscriptionId: string;
}

export function verifySubscriptionCheckoutSession(
  session: {
    id?: string;
    mode?: string | null;
    status?: string | null;
    payment_status?: string | null;
    livemode?: boolean;
    client_reference_id?: string | null;
    customer?: StripeReference;
    subscription?: StripeReference;
    metadata?: Record<string, string> | null;
  },
  requestedSessionId: string,
  authenticatedUserId: string,
  expectedMode: StripeMode,
): VerifiedSubscriptionSession {
  if (session.id !== requestedSessionId) {
    throw new Error("SUBSCRIPTION_SESSION_ID_MISMATCH");
  }
  if (
    session.mode !== "subscription" ||
    session.status !== "complete" ||
    session.payment_status !== "paid"
  ) {
    throw new Error("SUBSCRIPTION_SESSION_NOT_PAID_AND_COMPLETE");
  }
  if (session.livemode !== (expectedMode === "live")) {
    throw new Error("SUBSCRIPTION_SESSION_MODE_MISMATCH");
  }
  if (
    session.client_reference_id !== authenticatedUserId ||
    session.metadata?.user_id !== authenticatedUserId
  ) {
    throw new Error("SUBSCRIPTION_SESSION_USER_MISMATCH");
  }
  if (session.metadata?.stripe_mode !== expectedMode) {
    throw new Error("SUBSCRIPTION_SESSION_METADATA_MODE_MISMATCH");
  }

  const customerId = referenceId(session.customer);
  const subscriptionId = referenceId(session.subscription);
  if (!customerId || !subscriptionId) {
    throw new Error("SUBSCRIPTION_SESSION_IDENTITY_MISSING");
  }

  return {
    userId: authenticatedUserId,
    customerId,
    subscriptionId,
  };
}

export function verifyExactSessionSubscription(
  subscription: {
    id?: string;
    customer?: StripeReference;
    status?: string;
    livemode?: boolean;
    metadata?: Record<string, string> | null;
  },
  session: VerifiedSubscriptionSession,
  expectedMode: StripeMode,
): void {
  if (subscription.id !== session.subscriptionId) {
    throw new Error("SUBSCRIPTION_ID_MISMATCH");
  }
  if (referenceId(subscription.customer) !== session.customerId) {
    throw new Error("SUBSCRIPTION_CUSTOMER_MISMATCH");
  }
  if (subscription.livemode !== (expectedMode === "live")) {
    throw new Error("SUBSCRIPTION_MODE_MISMATCH");
  }
  if (subscription.metadata?.user_id !== session.userId) {
    throw new Error("SUBSCRIPTION_USER_MISMATCH");
  }
  if (
    !subscription.status || !subscriptionCanGrantAccess(subscription.status)
  ) {
    throw new Error("SUBSCRIPTION_NOT_ACTIVE");
  }
}
