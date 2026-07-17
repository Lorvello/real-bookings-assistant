// SEQP1R38 (finding R37-1): authoritative, send-time-fresh refund check against Stripe
// itself, closing the narrow race window where the local `bookings.payment_status` mirror
// lags Stripe's real refund state. Root cause (evidence/SEQ_P1_r37.md): `charge.refunded`
// webhook delivery has real observed latency (~1-2s in TEST mode, confirmed live this round
// too), and a reminder send (Resend/WhatsApp round-trip, hundreds of ms) is very often
// faster than that window. `record_booking_reminder_result`'s own claim-time-fresh
// `payment_status` re-check (SEQP1R31) is correct but can only ever be as fresh as whatever
// the webhook has ALREADY written -- it cannot see a refund Stripe itself already knows
// about but our DB does not yet. This helper closes that gap by asking Stripe directly,
// right before the actual send, rather than trusting the local mirror alone.
//
// Kept local `payment_status` check (SEQP1R31/R35, unchanged) as the cheap first-pass
// filter -- it already fully excludes anything the webhook HAS processed, at zero latency
// cost. This helper is the narrow-window backstop for the specific case where the webhook
// has not landed yet, so it is only ever called once claim_booking_reminder has already
// returned a fresh 'pending' claim (i.e. the cheap check already passed).
import { getStripeSecretKey, validateStripeMode } from "./stripeValidation.ts";
import { composeAbortSignal } from "./abortSignal.ts";
// Keep the client type on the same pinned Supabase release as the reminder
// entrypoint. Mixing the floating @2 type with the runtime's @2.50.0 client
// creates two nominally distinct classes because SupabaseClient has protected
// members, so the entrypoint cannot be type-checked even though the API shape
// is compatible at runtime.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

export interface RefundCheckResult {
  // true only when a live Stripe lookup genuinely completed and returned an answer.
  checked: boolean;
  // true only when Stripe confirms the charge/PaymentIntent is refunded (full or partial,
  // no distinction, mirroring the existing "any refund stops reminders" policy, SEQP1R31).
  refunded: boolean;
  // true when the Stripe call itself failed or timed out (network error, missing key,
  // 4xx/5xx from Stripe, timeout). Distinct from checked=false/refunded=false (which also
  // covers the normal "no payment on this booking at all" case, e.g. an unpaid/pay-later
  // booking with no booking_payments row -- nothing to check, not an error).
  errored: boolean;
}

// Bounded per-call timeout: this runs synchronously in the hot send path, once per reminder
// item, so it must never be allowed to hang the whole batch. 4s leaves headroom under the
// pg_net/cron round-trip budget (P1-W1's own historical 5000ms pg_net timeout ceiling) while
// still being generous for a single Stripe API round-trip (typically <500ms).
export const STRIPE_CHECK_TIMEOUT_MS = 4000;

// A booking's payment history has at most a small handful of rows in practice (one normal
// booking-payment write path, create-booking-payment; a card-decline-then-retry can leave
// more than one PaymentIntent on the same booking_id -- stripe_payment_intent_id itself is
// globally UNIQUE, booking_id is not). Bounded so a pathological/corrupted booking can never
// turn this into an unbounded per-item Stripe call fan-out.
export const MAX_PAYMENTS_PER_BOOKING_CHECKED = 10;

interface BookingPaymentIntentRow {
  stripe_payment_intent_id: string | null;
}

export interface PaymentIntentSelection {
  paymentIntentIds: string[];
  overflow: boolean;
}

interface RefundCheckOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchStripeRefundState(
  secretKey: string,
  paymentIntentId: string,
  options: RefundCheckOptions = {},
): Promise<boolean> {
  const composed = composeAbortSignal(
    options.signal,
    options.timeoutMs ?? STRIPE_CHECK_TIMEOUT_MS,
  );
  try {
    const id = encodeURIComponent(paymentIntentId);
    const response = await (options.fetchImpl ?? fetch)(
      `https://api.stripe.com/v1/payment_intents/${id}?expand[]=latest_charge`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: composed.signal,
      },
    );
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(body)) {
      throw new Error(`stripe_payment_intent_http_${response.status}`);
    }
    const charge = body.latest_charge;
    return isRecord(charge) &&
      (charge.refunded === true ||
        (typeof charge.amount_refunded === "number" &&
          charge.amount_refunded > 0));
  } finally {
    composed.dispose();
  }
}

// The query asks for one row beyond the supported fan-out. That extra row is never ignored:
// it turns the send-time check into a fail-closed error so a pathological booking cannot hide
// an older refunded payment or create unbounded external calls.
export function selectPaymentIntentsForRefundCheck(
  payments: BookingPaymentIntentRow[],
  maxPayments = MAX_PAYMENTS_PER_BOOKING_CHECKED,
): PaymentIntentSelection {
  const overflow = payments.length > maxPayments;
  const paymentIntentIds = payments.slice(0, maxPayments).flatMap((payment) => {
    const id = payment.stripe_payment_intent_id;
    return typeof id === "string" && id.length > 0 ? [id] : [];
  });
  return { paymentIntentIds, overflow };
}

// SEQP1R38: given a booking_id, find EVERY payment on record for it (code-review finding:
// checking only the most-recent row would miss an EARLIER charge that was refunded if a
// LATER, different PaymentIntent on the same booking succeeded -- a real, if narrow,
// possibility after a card-decline-then-retry), then ask Stripe directly whether ANY of
// those PaymentIntents' charges is currently refunded. Fail-closed: any refunded charge on
// the booking is enough, matching the existing "any refund, full or partial, no distinction"
// policy (SEQP1R31 / Mathew's decision) applied across payment attempts too, not just within
// one charge. A booking with no booking_payments row at all (unpaid / pay-at-appointment
// bookings, a real and common case, confirmed live via `select distinct payment_status from
// bookings` returning both 'unpaid' and 'refunded') has nothing to check -- there is no
// charge that could have been refunded -- so this correctly short-circuits to
// checked=false/refunded=false/errored=false without ever calling Stripe.
export async function checkBookingRefundedAtStripe(
  supabase: SupabaseClient,
  bookingId: string,
  options: RefundCheckOptions = {},
): Promise<RefundCheckResult> {
  try {
    let paymentQuery = supabase
      .from("booking_payments")
      .select("stripe_payment_intent_id")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(MAX_PAYMENTS_PER_BOOKING_CHECKED + 1);
    if (options.signal && typeof paymentQuery.abortSignal === "function") {
      paymentQuery = paymentQuery.abortSignal(options.signal);
    }
    const { data: payments, error: paymentErr } = await paymentQuery;

    if (paymentErr) {
      console.error(
        `[stripe-refund-check] booking ${bookingId}: booking_payments lookup failed:`,
        paymentErr.message,
      );
      return { checked: false, refunded: false, errored: true };
    }
    const { paymentIntentIds, overflow } = selectPaymentIntentsForRefundCheck(
      payments ?? [],
    );
    if (overflow) {
      console.error(
        `[stripe-refund-check] booking ${bookingId}: more than ${MAX_PAYMENTS_PER_BOOKING_CHECKED} payment rows; refusing to ignore older Stripe state.`,
      );
      return { checked: false, refunded: false, errored: true };
    }
    if (paymentIntentIds.length === 0) {
      // No payment on record for this booking at all -- nothing to check (fail-open here is
      // correct, not fail-closed: there is no charge in existence that could be refunded).
      return { checked: false, refunded: false, errored: false };
    }

    // SECURITY (mirrors create-booking-payment / customer-portal / every other Stripe call
    // site in this codebase): pin the mode to the server's STRIPE_MODE, never accept a
    // caller-supplied mode. This is a service-role-only internal call path (no HTTP caller
    // input reaches this function at all), but the pinned-mode pattern is kept for
    // consistency and because getStripeSecretKey() needs a mode either way.
    const mode = validateStripeMode().mode;
    const secretKey = getStripeSecretKey(mode);
    if (!secretKey) {
      console.error(
        `[stripe-refund-check] booking ${bookingId}: no Stripe secret key configured for mode=${mode}.`,
      );
      return { checked: false, refunded: false, errored: true };
    }

    // Check every bounded PaymentIntent concurrently. Sequential 4-second calls would make
    // one item overrun the cron budget. The fan-out is capped at ten, the query detects an
    // eleventh row fail-closed, and each call keeps the same SDK timeout.
    const refundStates = await Promise.all(
      paymentIntentIds.map(async (paymentIntentId) => {
        return await fetchStripeRefundState(
          secretKey,
          paymentIntentId,
          options,
        );
      }),
    );
    if (refundStates.some(Boolean)) {
      return { checked: true, refunded: true, errored: false };
    }

    return { checked: true, refunded: false, errored: false };
  } catch (e) {
    console.error(
      `[stripe-refund-check] booking ${bookingId}: live Stripe lookup failed/timed out:`,
      e instanceof Error ? e.message : e,
    );
    return { checked: false, refunded: false, errored: true };
  }
}
