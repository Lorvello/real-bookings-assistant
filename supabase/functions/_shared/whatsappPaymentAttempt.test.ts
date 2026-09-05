import {
  assertEquals,
  assertNotEquals,
  assertRejects,
} from "jsr:@std/assert@1.0.19";
import {
  fingerprintWhatsappPaymentAttempt,
  runWhatsappPaymentAttempt,
  WhatsappPaymentAttemptError,
} from "./whatsappPaymentAttempt.ts";

const claimToken = "39000000-0000-4000-8000-000000000001";
const paymentSessionId = "39000000-0000-4000-8000-000000000002";
const requestFingerprint = "a".repeat(64);
const createdAt = "2026-07-17T03:30:00.000Z";

const storedSession = {
  payment_session_id: paymentSessionId,
  stripe_session_id: "cs_test_stored",
  payment_url: "https://checkout.stripe.test/stored",
  created_at: createdAt,
  amount_cents: 10000,
  payment_status: "pending",
  attempt_generation: 1,
};

Deno.test("exact stored replay never invokes Stripe transport", async () => {
  let providerCalls = 0;
  let finalizeCalls = 0;
  const result = await runWhatsappPaymentAttempt({
    claim: { outcome: "replay", ...storedSession },
    transport: {
      createCheckoutSession: () => {
        providerCalls += 1;
        throw new Error("provider must not be called for replay");
      },
    },
    createParams: { amount: 10000 },
    idempotencyKey: "whatsapp-booking-checkout-booking-a",
    finalize: () => {
      finalizeCalls += 1;
      throw new Error("finalize must not be called for replay");
    },
  });

  assertEquals(providerCalls, 0);
  assertEquals(finalizeCalls, 0);
  assertEquals(result.paymentUrl, storedSession.payment_url);
  assertEquals(result.stripeSessionId, storedSession.stripe_session_id);
  assertEquals(result.replayed, true);
});

Deno.test("blocked, conflicting and in-progress claims never invoke Stripe", async () => {
  for (const outcome of ["blocked", "conflict", "in_progress"] as const) {
    let providerCalls = 0;
    const error = await assertRejects(
      () =>
        runWhatsappPaymentAttempt({
          claim: {
            outcome,
            code: `PAYMENT_ATTEMPT_${outcome.toUpperCase()}`,
            retained_balance_cents: outcome === "blocked" ? 2500 : 0,
          },
          transport: {
            createCheckoutSession: () => {
              providerCalls += 1;
              throw new Error("provider must not be called");
            },
          },
          createParams: { amount: 10000 },
          idempotencyKey: "whatsapp-booking-checkout-booking-a",
          finalize: () => Promise.resolve(null),
        }),
      WhatsappPaymentAttemptError,
    );
    assertEquals(providerCalls, 0);
    assertEquals(error.code, `PAYMENT_ATTEMPT_${outcome.toUpperCase()}`);
  }
});

Deno.test("claimed attempt creates once and returns only the finalized row", async () => {
  const order: string[] = [];
  const result = await runWhatsappPaymentAttempt({
    claim: {
      outcome: "claimed",
      claim_token: claimToken,
      request_fingerprint: requestFingerprint,
      attempt_generation: 1,
    },
    transport: {
      createCheckoutSession: (_params, options) => {
        order.push("provider");
        assertEquals(
          options.idempotencyKey,
          "whatsapp-booking-checkout-booking-a:generation:1",
        );
        return Promise.resolve({
          id: "cs_test_created",
          url: "https://checkout.stripe.test/created",
        });
      },
    },
    createParams: { amount: 10000 },
    idempotencyKey: "whatsapp-booking-checkout-booking-a",
    finalize: (input) => {
      order.push("finalize");
      assertEquals(input.claimToken, claimToken);
      assertEquals(input.requestFingerprint, requestFingerprint);
      return Promise.resolve({
        outcome: "created",
        ...storedSession,
        stripe_session_id: input.stripeSessionId,
        payment_url: input.paymentUrl,
      });
    },
  });

  assertEquals(order, ["provider", "finalize"]);
  assertEquals(result.stripeSessionId, "cs_test_created");
  assertEquals(result.paymentUrl, "https://checkout.stripe.test/created");
  assertEquals(result.replayed, false);
});

Deno.test("finalize conflict never leaks the new unledgered provider URL", async () => {
  const newUrl = "https://checkout.stripe.test/unledgered-new";
  const expired: string[] = [];
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "claimed",
          claim_token: claimToken,
          request_fingerprint: requestFingerprint,
          attempt_generation: 1,
        },
        transport: {
          createCheckoutSession: () =>
            Promise.resolve({ id: "cs_test_new", url: newUrl }),
          expireCheckoutSession: (sessionId) => {
            expired.push(sessionId);
            return Promise.resolve();
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        finalize: () =>
          Promise.resolve({
            outcome: "conflict",
            code: "PAYMENT_SESSION_LEDGER_CONFLICT",
            provider_cleanup: "expire",
          }),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(error.code, "PAYMENT_SESSION_LEDGER_CONFLICT");
  assertEquals(error.message.includes(newUrl), false);
  assertEquals(expired, ["cs_test_new"]);
});

Deno.test("only an exact finalized replay is accepted", async () => {
  const newUrl = "https://checkout.stripe.test/new-unledgered";
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "claimed",
          claim_token: claimToken,
          request_fingerprint: requestFingerprint,
          attempt_generation: 1,
        },
        transport: {
          createCheckoutSession: () =>
            Promise.resolve({ id: "cs_test_new", url: newUrl }),
          expireCheckoutSession: () => Promise.resolve(),
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        finalize: () =>
          Promise.resolve({
            outcome: "replay",
            ...storedSession,
          }),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(
    error.code,
    "WHATSAPP_PAYMENT_ATTEMPT_PERSISTED_SESSION_MISMATCH",
  );
  assertEquals(error.message.includes(newUrl), false);
});

Deno.test("cleanup failure does not mask the ledger conflict", async () => {
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "claimed",
          claim_token: claimToken,
          request_fingerprint: requestFingerprint,
          attempt_generation: 1,
        },
        transport: {
          createCheckoutSession: () =>
            Promise.resolve({
              id: "cs_test_cleanup_fails",
              url: "https://checkout.stripe.test/cleanup-fails",
            }),
          expireCheckoutSession: () => {
            throw new Error("mock cleanup unavailable");
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        finalize: () =>
          Promise.resolve({
            outcome: "conflict",
            code: "WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM",
            provider_cleanup: "expire",
          }),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(error.code, "WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM");
});

Deno.test("attempt fingerprint is canonical and money-sensitive", async () => {
  const first = await fingerprintWhatsappPaymentAttempt({
    bookingId: "booking-a",
    checkout: { amount: 10000, methods: ["ideal", "card"] },
  });
  const reordered = await fingerprintWhatsappPaymentAttempt({
    checkout: { methods: ["ideal", "card"], amount: 10000 },
    bookingId: "booking-a",
  });
  const changedAmount = await fingerprintWhatsappPaymentAttempt({
    bookingId: "booking-a",
    checkout: { amount: 9999, methods: ["ideal", "card"] },
  });

  assertEquals(first, reordered);
  assertEquals(first.length, 64);
  assertNotEquals(first, changedAmount);
});

Deno.test("claim generations never reuse one Stripe idempotency key", async () => {
  const idempotencyKeys: string[] = [];

  for (const attemptGeneration of [1, 2]) {
    await runWhatsappPaymentAttempt({
      claim: {
        outcome: "claimed",
        claim_token: claimToken,
        request_fingerprint: requestFingerprint,
        attempt_generation: attemptGeneration,
      },
      transport: {
        createCheckoutSession: (_params, options) => {
          idempotencyKeys.push(options.idempotencyKey);
          return Promise.resolve({
            id: `cs_test_generation_${attemptGeneration}`,
            url: `https://checkout.stripe.test/generation-${attemptGeneration}`,
          });
        },
      },
      createParams: { amount: 10000 },
      idempotencyKey: "whatsapp-booking-checkout-booking-a",
      finalize: (input) =>
        Promise.resolve({
          outcome: "created",
          ...storedSession,
          stripe_session_id: input.stripeSessionId,
          payment_url: input.paymentUrl,
          attempt_generation: attemptGeneration,
        }),
    });
  }

  assertNotEquals(idempotencyKeys[0], idempotencyKeys[1]);
});

Deno.test("a finalize conflict cannot expire without an ownership decision", async () => {
  const expired: string[] = [];
  await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "claimed",
          claim_token: claimToken,
          request_fingerprint: requestFingerprint,
          attempt_generation: 1,
        },
        transport: {
          createCheckoutSession: () =>
            Promise.resolve({
              id: "cs_test_maybe_replacement",
              url: "https://checkout.stripe.test/maybe-replacement",
            }),
          expireCheckoutSession: (sessionId) => {
            expired.push(sessionId);
            return Promise.resolve();
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        finalize: () =>
          Promise.resolve({
            outcome: "conflict",
            code: "WHATSAPP_PAYMENT_ATTEMPT_CLAIM_LOST",
          }),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(expired, []);
});

Deno.test("an expired owned provider session renews into a new generation", async () => {
  const bookingId = "39000000-0000-4000-8000-000000000010";
  const order: string[] = [];
  const result = await runWhatsappPaymentAttempt({
    claim: {
      outcome: "reconcile",
      ...storedSession,
      request_fingerprint: requestFingerprint,
      provider_ownership_version: 2,
    },
    providerBookingId: bookingId,
    transport: {
      retrieveCheckoutSession: (sessionId) => {
        order.push("retrieve");
        assertEquals(sessionId, storedSession.stripe_session_id);
        return Promise.resolve({
          id: storedSession.stripe_session_id,
          url: storedSession.payment_url,
          status: "expired",
          paymentStatus: "unpaid",
          expiresAt: "2026-07-17T02:00:00.000Z",
          metadata: {
            booking_id: bookingId,
            whatsapp_payment_attempt_generation: "1",
            whatsapp_payment_request_fingerprint: requestFingerprint,
          },
        });
      },
      createCheckoutSession: (_params, options) => {
        order.push("create");
        assertEquals(options.attemptGeneration, 2);
        assertEquals(
          options.idempotencyKey,
          "whatsapp-booking-checkout-booking-a:generation:2",
        );
        return Promise.resolve({
          id: "cs_test_renewed_generation_2",
          url: "https://checkout.stripe.test/renewed-generation-2",
        });
      },
    },
    createParams: { amount: 10000 },
    idempotencyKey: "whatsapp-booking-checkout-booking-a",
    reconcile: (input) => {
      order.push("reconcile");
      assertEquals(input.providerStatus, "expired");
      assertEquals(input.attemptGeneration, 1);
      return Promise.resolve({
        outcome: "claimed",
        claim_token: "39000000-0000-4000-8000-000000000003",
        request_fingerprint: requestFingerprint,
        attempt_generation: 2,
      });
    },
    finalize: (input) => {
      order.push("finalize");
      assertEquals(input.attemptGeneration, 2);
      return Promise.resolve({
        outcome: "created",
        ...storedSession,
        stripe_session_id: input.stripeSessionId,
        payment_url: input.paymentUrl,
        attempt_generation: 2,
      });
    },
  });

  assertEquals(order, ["retrieve", "reconcile", "create", "finalize"]);
  assertEquals(result.attemptGeneration, 2);
  assertEquals(result.replayed, false);
});

Deno.test("an open owned provider session reconciles without creating", async () => {
  const bookingId = "39000000-0000-4000-8000-000000000010";
  let createCalls = 0;
  const result = await runWhatsappPaymentAttempt({
    claim: {
      outcome: "reconcile",
      ...storedSession,
      request_fingerprint: requestFingerprint,
      provider_ownership_version: 2,
    },
    providerBookingId: bookingId,
    transport: {
      retrieveCheckoutSession: () =>
        Promise.resolve({
          id: storedSession.stripe_session_id,
          url: storedSession.payment_url,
          status: "open",
          paymentStatus: "unpaid",
          expiresAt: "2026-07-18T03:30:00.000Z",
          metadata: {
            booking_id: bookingId,
            whatsapp_payment_attempt_generation: "1",
            whatsapp_payment_request_fingerprint: requestFingerprint,
          },
        }),
      createCheckoutSession: () => {
        createCalls += 1;
        throw new Error("open replay must not create");
      },
    },
    createParams: { amount: 10000 },
    idempotencyKey: "whatsapp-booking-checkout-booking-a",
    reconcile: () => Promise.resolve({ outcome: "replay", ...storedSession }),
    finalize: () => {
      throw new Error("open replay must not finalize");
    },
  });

  assertEquals(createCalls, 0);
  assertEquals(result.replayed, true);
  assertEquals(result.stripeSessionId, storedSession.stripe_session_id);
});

Deno.test("provider ownership mismatch fails before reconciliation", async () => {
  let reconcileCalls = 0;
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "reconcile",
          ...storedSession,
          request_fingerprint: requestFingerprint,
          provider_ownership_version: 2,
        },
        providerBookingId: "39000000-0000-4000-8000-000000000010",
        transport: {
          retrieveCheckoutSession: () =>
            Promise.resolve({
              id: storedSession.stripe_session_id,
              url: storedSession.payment_url,
              status: "expired",
              paymentStatus: "unpaid",
              expiresAt: "2026-07-17T02:00:00.000Z",
              metadata: {
                booking_id: "39000000-0000-4000-8000-000000000099",
                whatsapp_payment_attempt_generation: "1",
                whatsapp_payment_request_fingerprint: requestFingerprint,
              },
            }),
          createCheckoutSession: () => {
            throw new Error("ownership mismatch must not create");
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        reconcile: () => {
          reconcileCalls += 1;
          return Promise.resolve(null);
        },
        finalize: () => Promise.resolve(null),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(error.code, "WHATSAPP_PAYMENT_PROVIDER_OWNERSHIP_MISMATCH");
  assertEquals(reconcileCalls, 0);
});

Deno.test("a completed provider session blocks renewal and creation", async () => {
  const bookingId = "39000000-0000-4000-8000-000000000010";
  let createCalls = 0;
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "reconcile",
          ...storedSession,
          request_fingerprint: requestFingerprint,
          provider_ownership_version: 2,
        },
        providerBookingId: bookingId,
        transport: {
          retrieveCheckoutSession: () =>
            Promise.resolve({
              id: storedSession.stripe_session_id,
              url: storedSession.payment_url,
              status: "complete",
              paymentStatus: "paid",
              expiresAt: "2026-07-18T03:30:00.000Z",
              metadata: {
                booking_id: bookingId,
                whatsapp_payment_attempt_generation: "1",
                whatsapp_payment_request_fingerprint: requestFingerprint,
              },
            }),
          createCheckoutSession: () => {
            createCalls += 1;
            throw new Error("completed provider session must not renew");
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        reconcile: () =>
          Promise.resolve({
            outcome: "blocked",
            code: "WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING",
          }),
        finalize: () => Promise.resolve(null),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(error.code, "WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING");
  assertEquals(createCalls, 0);
});

Deno.test("legacy generation one reconciles only with exact booking ownership", async () => {
  const bookingId = "39000000-0000-4000-8000-000000000010";
  const result = await runWhatsappPaymentAttempt({
    claim: {
      outcome: "reconcile",
      ...storedSession,
      request_fingerprint: requestFingerprint,
      provider_ownership_version: 1,
    },
    providerBookingId: bookingId,
    transport: {
      retrieveCheckoutSession: () =>
        Promise.resolve({
          id: storedSession.stripe_session_id,
          url: storedSession.payment_url,
          status: "open",
          paymentStatus: "unpaid",
          expiresAt: "2026-07-18T03:30:00.000Z",
          metadata: { booking_id: bookingId },
        }),
      createCheckoutSession: () => {
        throw new Error("legacy open replay must not create");
      },
    },
    createParams: { amount: 10000 },
    idempotencyKey: "whatsapp-booking-checkout-booking-a",
    reconcile: () => Promise.resolve({ outcome: "replay", ...storedSession }),
    finalize: () => Promise.resolve(null),
  });

  assertEquals(result.replayed, true);
});

Deno.test("provider retrieval failure is generic and creates nothing", async () => {
  let createCalls = 0;
  const error = await assertRejects(
    () =>
      runWhatsappPaymentAttempt({
        claim: {
          outcome: "reconcile",
          ...storedSession,
          request_fingerprint: requestFingerprint,
          provider_ownership_version: 2,
        },
        providerBookingId: "39000000-0000-4000-8000-000000000010",
        transport: {
          retrieveCheckoutSession: () => {
            throw new Error("provider-internal detail");
          },
          createCheckoutSession: () => {
            createCalls += 1;
            throw new Error("retrieve failure must not create");
          },
        },
        createParams: { amount: 10000 },
        idempotencyKey: "whatsapp-booking-checkout-booking-a",
        reconcile: () => Promise.resolve(null),
        finalize: () => Promise.resolve(null),
      }),
    WhatsappPaymentAttemptError,
  );

  assertEquals(error.code, "STRIPE_CHECKOUT_SESSION_RETRIEVE_FAILED");
  assertEquals(error.message.includes("provider-internal detail"), false);
  assertEquals(createCalls, 0);
});
