import { assert, assertEquals } from "jsr:@std/assert@1";

const handlerUrl = new URL(
  "../whatsapp-payment-handler/index.ts",
  import.meta.url,
);
const migrationUrl = new URL(
  "../../migrations/20260717033000_R39_whatsapp_payment_attempt_claim.sql",
  import.meta.url,
);
const generationMigrationUrl = new URL(
  "../../migrations/20260717040000_R46_whatsapp_payment_generation_and_deleted_booking.sql",
  import.meta.url,
);
const sqlContractUrl = new URL(
  "../../tests/whatsapp_payment_attempt_claim_contract.sql",
  import.meta.url,
);

Deno.test({
  name:
    "WhatsApp payment claims the local attempt before Stripe Checkout create",
  permissions: { read: true },
  fn: async () => {
    const source = await Deno.readTextFile(handlerUrl);
    const claimAt = source.indexOf('"claim_whatsapp_payment_attempt"');
    const providerCreateAt = source.indexOf("stripe.checkout.sessions.create");

    assert(claimAt >= 0, "handler has no atomic local payment-attempt claim");
    assert(
      providerCreateAt > claimAt,
      "Stripe Checkout create occurs before the local payment-attempt claim",
    );
  },
});

Deno.test({
  name: "WhatsApp payment response uses only the exactly persisted session",
  permissions: { read: true },
  fn: async () => {
    const source = await Deno.readTextFile(handlerUrl);
    const responseAt = source.indexOf(
      "return new Response(",
      source.indexOf(
        '"claim_whatsapp_payment_attempt"',
      ),
    );
    const responseSource = source.slice(responseAt);

    assert(
      responseSource.includes(
        "payment_url: persistedPaymentSession.payment_url",
      ),
      "success response does not use the persisted payment URL",
    );
    assert(
      responseSource.includes(
        "session_id: persistedPaymentSession.stripe_session_id",
      ),
      "success response does not use the persisted Stripe session id",
    );
    assertEquals(
      responseSource.includes("payment_url: session.url"),
      false,
      "success response can leak an unledgered Stripe session URL",
    );
  },
});

Deno.test({
  name: "R39 claim locks refund truth and keeps its RPC private",
  permissions: { read: true },
  fn: async () => {
    const migration = await Deno.readTextFile(migrationUrl);

    for (
      const required of [
        "CREATE OR REPLACE FUNCTION public.claim_whatsapp_payment_attempt",
        "FOR UPDATE",
        "'partially_refunded'",
        "'refund_required'",
        "v_retained_balance_cents > 0",
        "WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM",
        "stripe_mode text NOT NULL",
        "v_session.stripe_mode IS DISTINCT FROM p_stripe_mode",
        "WHATSAPP_PAYMENT_UNCLAIMED_LEGACY_SESSION",
        "REVOKE ALL ON FUNCTION public.claim_whatsapp_payment_attempt",
        "GRANT EXECUTE ON FUNCTION public.claim_whatsapp_payment_attempt",
      ]
    ) {
      assert(
        migration.includes(required),
        `R39 migration is missing required contract: ${required}`,
      );
    }

    const finalizeAt = migration.indexOf(
      "CREATE OR REPLACE FUNCTION public.finalize_whatsapp_payment_attempt",
    );
    const exactReplayAt = migration.indexOf(
      "IF v_attempt.state = 'completed'",
      finalizeAt,
    );
    const changedStateAt = migration.indexOf(
      "WHATSAPP_PAYMENT_STATE_CHANGED_AFTER_CLAIM",
      finalizeAt,
    );
    assert(
      exactReplayAt > finalizeAt && changedStateAt > exactReplayAt,
      "finalization must permit only an exact stored replay before rejecting a later state change",
    );
  },
});

Deno.test({
  name: "SQL contract covers retained balance and unledgered URL conflicts",
  permissions: { read: true },
  fn: async () => {
    const contract = await Deno.readTextFile(sqlContractUrl);

    for (
      const required of [
        "retained balance claimed a full-price attempt",
        "partially_refunded booking claimed a full-price attempt",
        "refund_required booking claimed a full-price attempt",
        "ledger conflict exposed the new unledgered session",
        "retained balance appeared after claim but provider session persisted",
        "completed finalization did not return only the exact stored replay",
        "WHATSAPP_PAYMENT_ATTEMPT_CLAIM_CONTRACT_PASS",
      ]
    ) {
      assert(
        contract.includes(required),
        `SQL contract is missing required scenario: ${required}`,
      );
    }
  },
});

Deno.test({
  name:
    "R46 fences every provider session by generation and reconciles renewal",
  permissions: { read: true },
  fn: async () => {
    const migration = await Deno.readTextFile(generationMigrationUrl);
    const handler = await Deno.readTextFile(handlerUrl);

    for (
      const required of [
        "attempt_generation",
        "reconcile_or_renew_whatsapp_payment_attempt",
        "provider_status",
        "provider_payment_status",
        "WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING",
        "WHATSAPP_PAYMENT_ATTEMPT_GENERATION_SUPERSEDED",
        "provider_cleanup",
      ]
    ) {
      assert(
        migration.includes(required),
        `R46 migration is missing generation/reconciliation contract: ${required}`,
      );
    }

    for (
      const required of [
        "stripe.checkout.sessions.retrieve",
        "attemptGeneration",
        "whatsapp_payment_attempt_generation",
        "whatsapp_payment_request_fingerprint",
        '"reconcile_or_renew_whatsapp_payment_attempt"',
      ]
    ) {
      assert(
        handler.includes(required),
        `handler is missing provider ownership/reconciliation contract: ${required}`,
      );
    }
  },
});

Deno.test({
  name: "handler and every attempt RPC reject soft-deleted bookings",
  permissions: { read: true },
  fn: async () => {
    const handler = await Deno.readTextFile(handlerUrl);
    const migration = await Deno.readTextFile(generationMigrationUrl);

    assert(
      handler.includes(
        "calendar_id, customer_country, customer_vat_id, total_price, start_time, status, payment_status, is_deleted",
      ),
      "handler booking read omits is_deleted",
    );
    assert(
      handler.includes("bk.is_deleted === true"),
      "handler does not fail closed on a soft-deleted booking",
    );
    assertEquals(
      (migration.match(/COALESCE\(v_booking\.is_deleted, false\)/g) ?? [])
        .length >= 3,
      true,
      "claim, finalization and reconciliation do not all reject deleted bookings",
    );
  },
});

Deno.test({
  name: "R46 keeps one lock order and private SECURITY DEFINER grants",
  permissions: { read: true },
  fn: async () => {
    const migration = await Deno.readTextFile(generationMigrationUrl);
    const functionStarts = [
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.claim_whatsapp_payment_attempt",
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.finalize_whatsapp_payment_attempt(\n  p_booking_id uuid,\n  p_claim_token uuid,\n  p_attempt_generation integer",
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt",
      ),
    ];
    const functionEnds = [
      functionStarts[1],
      functionStarts[2],
      migration.indexOf(
        "-- Compatibility wrapper",
      ),
    ];

    functionStarts.forEach((start, index) => {
      assert(start >= 0, `R46 function ${index} is missing`);
      const body = migration.slice(start, functionEnds[index]);
      const bookingAt = body.indexOf("FROM public.bookings AS booking");
      const paymentsAt = body.indexOf(
        "FROM public.booking_payments AS payment",
      );
      const attemptAt = body.indexOf(
        "FROM public.whatsapp_payment_attempts AS attempt",
      );
      const sessionAt = body.indexOf(
        "FROM public.whatsapp_payment_sessions AS session",
      );
      assert(
        bookingAt >= 0 && paymentsAt > bookingAt && attemptAt > paymentsAt &&
          sessionAt > attemptAt,
        `R46 function ${index} violates booking -> payments -> attempt -> session lock order`,
      );
      assert(
        body.includes("FOR UPDATE"),
        `R46 function ${index} has no row lock`,
      );
      assert(body.includes("SECURITY DEFINER"));
      assert(body.includes("SET search_path = ''"));
    });

    for (
      const signature of [
        "REVOKE ALL ON FUNCTION public.finalize_whatsapp_payment_attempt(\n  uuid, uuid, integer, text, text, text, text",
        "GRANT EXECUTE ON FUNCTION public.finalize_whatsapp_payment_attempt(\n  uuid, uuid, integer, text, text, text, text",
        "REVOKE ALL ON FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(",
        "GRANT EXECUTE ON FUNCTION public.reconcile_or_renew_whatsapp_payment_attempt(",
      ]
    ) {
      assert(
        migration.includes(signature),
        `R46 grant contract missing: ${signature}`,
      );
    }
  },
});

Deno.test({
  name: "SQL contract covers takeover, renewal, completion and deletion races",
  permissions: { read: true },
  fn: async () => {
    const contract = await Deno.readTextFile(sqlContractUrl);

    for (
      const required of [
        "stale claimant reused the replacement generation",
        "stale generation could expire the replacement provider session",
        "expired provider session was not explicitly renewed",
        "completed provider session was incorrectly renewed",
        "soft-deleted booking was claimed for payment",
        "soft-deleted booking was finalized for payment",
      ]
    ) {
      assert(
        contract.includes(required),
        `SQL contract is missing takeover/deletion scenario: ${required}`,
      );
    }
  },
});
