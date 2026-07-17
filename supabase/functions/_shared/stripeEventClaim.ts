export type StripeEventClaim =
  | {
    claimed: true;
    completed: false;
    claimToken: string;
  }
  | {
    claimed: false;
    completed: true;
    reason: "already_completed";
  }
  | {
    claimed: false;
    completed: false;
    reason: "in_progress";
  };

export function parseStripeEventClaim(value: unknown): StripeEventClaim {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_STRIPE_EVENT_CLAIM");
  }
  const claim = value as Record<string, unknown>;

  if (
    claim.claimed === true && claim.completed === false &&
    typeof claim.claim_token === "string" && claim.claim_token.length >= 32
  ) {
    return {
      claimed: true,
      completed: false,
      claimToken: claim.claim_token,
    };
  }
  if (
    claim.claimed === false && claim.completed === true &&
    claim.reason === "already_completed"
  ) {
    return { claimed: false, completed: true, reason: "already_completed" };
  }
  if (
    claim.claimed === false && claim.completed === false &&
    claim.reason === "in_progress"
  ) {
    return { claimed: false, completed: false, reason: "in_progress" };
  }
  throw new Error("INVALID_STRIPE_EVENT_CLAIM");
}
