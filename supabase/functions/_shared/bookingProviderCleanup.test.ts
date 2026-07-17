import { assertEquals } from "jsr:@std/assert@1";
import {
  classifyBookingProviderCleanupState,
  finalizeBookingProviderCleanupOutcome,
  parseBookingProviderCleanupClaim,
} from "./bookingProviderCleanup.ts";

const SUCCESS = { outcome: "success" } as const;
const EXPIRE = {
  outcome: "action_required",
  action: "expire_checkout_session",
} as const;
const CANCEL = {
  outcome: "action_required",
  action: "cancel_payment_intent",
} as const;
const RETRYABLE = {
  outcome: "retryable_failure",
  errorCode: "PROVIDER_STATE_RETRYABLE",
} as const;
const ALREADY_COMPLETED = {
  outcome: "permanent_failure",
  errorCode: "PROVIDER_ALREADY_COMPLETED",
} as const;
const ALREADY_CAPTURED = {
  outcome: "permanent_failure",
  errorCode: "PROVIDER_ALREADY_CAPTURED",
} as const;

const checkoutCases = [
  ["expired", "paid", SUCCESS],
  ["expired", "unpaid", SUCCESS],
  ["expired", "no_payment_required", SUCCESS],
  ["open", "paid", EXPIRE],
  ["open", "unpaid", EXPIRE],
  ["open", "no_payment_required", EXPIRE],
  ["complete", "paid", ALREADY_COMPLETED],
  ["complete", "no_payment_required", ALREADY_COMPLETED],
  ["complete", "unpaid", RETRYABLE],
] as const;

for (const [status, paymentStatus, expected] of checkoutCases) {
  Deno.test(
    `checkout_session ${status}/${paymentStatus} is classified exhaustively`,
    () => {
      assertEquals(
        classifyBookingProviderCleanupState({
          providerKind: "checkout_session",
          status,
          paymentStatus,
        }),
        expected,
      );
    },
  );
}

for (const status of [null, undefined, "future_checkout_status"] as const) {
  Deno.test(`checkout_session unknown status ${String(status)} retries`, () => {
    assertEquals(
      classifyBookingProviderCleanupState({
        providerKind: "checkout_session",
        status,
        paymentStatus: "unpaid",
      }),
      RETRYABLE,
    );
  });
}

const paymentIntentCases = [
  ["canceled", SUCCESS],
  ["requires_payment_method", CANCEL],
  ["requires_confirmation", CANCEL],
  ["requires_action", CANCEL],
  ["processing", CANCEL],
  ["requires_capture", CANCEL],
  ["succeeded", ALREADY_CAPTURED],
] as const;

for (const [status, expected] of paymentIntentCases) {
  Deno.test(`payment_intent ${status} is classified exhaustively`, () => {
    assertEquals(
      classifyBookingProviderCleanupState({
        providerKind: "payment_intent",
        status,
      }),
      expected,
    );
  });
}

for (
  const status of [null, undefined, "future_payment_intent_status"] as const
) {
  Deno.test(`payment_intent unknown status ${String(status)} retries`, () => {
    assertEquals(
      classifyBookingProviderCleanupState({
        providerKind: "payment_intent",
        status,
      }),
      RETRYABLE,
    );
  });
}

const validClaim = {
  outcome: "claimed",
  job_id: "4fbd6d9e-a0cf-44b2-b6da-0c55369a0ab1",
  claim_token: crypto.randomUUID(),
  provider_kind: "checkout_session",
  provider_object_id: "cs_test_cleanup",
  stripe_mode: "test",
  attempt_count: 1,
} as const;

Deno.test("claim parser accepts the empty outcome", () => {
  assertEquals(parseBookingProviderCleanupClaim({ outcome: "empty" }), {
    outcome: "empty",
  });
});

Deno.test("claim parser accepts and normalizes a valid claimed outcome", () => {
  assertEquals(
    parseBookingProviderCleanupClaim({
      ...validClaim,
      provider_object_id: "  cs_test_cleanup  ",
    }),
    validClaim,
  );
});

Deno.test("claim parser accepts the one-row PostgREST table shape", () => {
  assertEquals(parseBookingProviderCleanupClaim([validClaim]), validClaim);
  assertEquals(parseBookingProviderCleanupClaim([]), { outcome: "empty" });
});

const invalidClaims: ReadonlyArray<readonly [string, unknown]> = [
  ["non-object", null],
  ["multiple rows", [validClaim, validClaim]],
  ["unknown outcome", { ...validClaim, outcome: "waiting" }],
  ["invalid job UUID", { ...validClaim, job_id: "job" }],
  ["invalid claim UUID", { ...validClaim, claim_token: "claim" }],
  ["unknown provider kind", { ...validClaim, provider_kind: "charge" }],
  ["empty provider object", { ...validClaim, provider_object_id: "" }],
  ["blank provider object", { ...validClaim, provider_object_id: "   " }],
  ["unknown Stripe mode", { ...validClaim, stripe_mode: "preview" }],
  ["zero attempts", { ...validClaim, attempt_count: 0 }],
  ["negative attempts", { ...validClaim, attempt_count: -1 }],
  ["fractional attempts", { ...validClaim, attempt_count: 1.5 }],
  ["string attempts", { ...validClaim, attempt_count: "1" }],
];

for (const [name, claim] of invalidClaims) {
  Deno.test(`claim parser rejects ${name}`, () => {
    assertEquals(parseBookingProviderCleanupClaim(claim), null);
  });
}

Deno.test("cleanup finalize parser accepts only durable terminal/retry outcomes", () => {
  assertEquals(
    finalizeBookingProviderCleanupOutcome({ outcome: "completed" }),
    {
      outcome: "completed",
      humanActionRequired: false,
    },
  );
  assertEquals(finalizeBookingProviderCleanupOutcome({ outcome: "replay" }), {
    outcome: "replay",
    humanActionRequired: false,
  });
  assertEquals(
    finalizeBookingProviderCleanupOutcome({ outcome: "retry_scheduled" }),
    { outcome: "retry_scheduled", humanActionRequired: false },
  );
  assertEquals(
    finalizeBookingProviderCleanupOutcome({
      outcome: "dead_letter",
      human_action_required: true,
    }),
    { outcome: "dead_letter", humanActionRequired: true },
  );
});

Deno.test("cleanup finalize parser rejects conflicts and malformed success", () => {
  assertEquals(
    finalizeBookingProviderCleanupOutcome({ outcome: "conflict" }),
    null,
  );
  assertEquals(finalizeBookingProviderCleanupOutcome({ accepted: true }), null);
  assertEquals(finalizeBookingProviderCleanupOutcome(false), null);
  assertEquals(finalizeBookingProviderCleanupOutcome(null), null);
});
