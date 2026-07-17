const BLOCKING_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

export function blocksNewSubscriptionCheckout(status: string): boolean {
  return BLOCKING_SUBSCRIPTION_STATUSES.has(status);
}

export type SubscriptionCheckoutClaim =
  | { kind: "claimed"; claimToken: string }
  | { kind: "replay"; sessionId: string; checkoutUrl: string }
  | { kind: "in_progress" }
  | { kind: "existing_session" };

export function parseSubscriptionCheckoutClaim(
  value: unknown,
): SubscriptionCheckoutClaim {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("SUBSCRIPTION_CHECKOUT_CLAIM_INVALID");
  }
  const row = value as Record<string, unknown>;
  if (row.claimed === true && typeof row.claim_token === "string") {
    return { kind: "claimed", claimToken: row.claim_token };
  }
  if (
    row.replay === true &&
    typeof row.session_id === "string" &&
    typeof row.checkout_url === "string"
  ) {
    return {
      kind: "replay",
      sessionId: row.session_id,
      checkoutUrl: row.checkout_url,
    };
  }
  if (row.claimed === false && row.reason === "in_progress") {
    return { kind: "in_progress" };
  }
  if (row.claimed === false && row.reason === "existing_session") {
    return { kind: "existing_session" };
  }
  throw new Error("SUBSCRIPTION_CHECKOUT_CLAIM_INVALID");
}
