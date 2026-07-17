import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  bookingPaymentProviderMetadata,
  fingerprintBookingPaymentProvider,
  parseBookingPaymentProviderClaim,
  parseBookingPaymentProviderMetadata,
} from "./bookingPaymentProviderReservation.ts";

const reservationId = "550e8400-e29b-41d4-a716-446655440000";
const claimToken = "550e8400-e29b-41d4-a716-446655440001";
const fingerprint = "a".repeat(64);

Deno.test("parses a fenced provider claim", () => {
  assertEquals(
    parseBookingPaymentProviderClaim({
      outcome: "claimed",
      reservation_id: reservationId,
      claim_token: claimToken,
      generation: 2,
      request_fingerprint: fingerprint,
      idempotency_key: "ba:booking:example:payment_intent:generation:2",
    }),
    {
      outcome: "claimed",
      reservationId,
      claimToken,
      generation: 2,
      requestFingerprint: fingerprint,
      idempotencyKey: "ba:booking:example:payment_intent:generation:2",
    },
  );
});

Deno.test("rejects incomplete provider ownership results", () => {
  assertThrows(() =>
    parseBookingPaymentProviderClaim({
      outcome: "claimed",
      reservation_id: reservationId,
      claim_token: claimToken,
      generation: 1,
      request_fingerprint: "short",
      idempotency_key: "key",
    })
  );
});

Deno.test("fingerprint is canonical across object key order", async () => {
  const left = await fingerprintBookingPaymentProvider({
    amount: 12100,
    nested: { destination: "acct_1", mode: "test" },
  });
  const right = await fingerprintBookingPaymentProvider({
    nested: { mode: "test", destination: "acct_1" },
    amount: 12100,
  });
  assertEquals(left, right);
  assertEquals(left.length, 64);
});

Deno.test("fingerprint rejects non-finite numbers", async () => {
  await assertRejects(
    () => fingerprintBookingPaymentProvider({ amount: Number.NaN }),
    Error,
    "NON_FINITE",
  );
});

Deno.test("provider metadata round trips and fails closed", () => {
  const metadata = bookingPaymentProviderMetadata({
    channel: "whatsapp",
    providerKind: "checkout_session",
    generation: 3,
    requestFingerprint: fingerprint,
  });
  assertEquals(parseBookingPaymentProviderMetadata(metadata), {
    channel: "whatsapp",
    providerKind: "checkout_session",
    generation: 3,
    requestFingerprint: fingerprint,
  });
  assertEquals(
    parseBookingPaymentProviderMetadata({
      ...metadata,
      booking_payment_provider_generation: "0",
    }),
    null,
  );
});
