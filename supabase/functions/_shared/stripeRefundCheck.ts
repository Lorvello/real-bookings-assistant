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
import Stripe from "https://esm.sh/stripe@14.21.0";
import { validateStripeMode, getStripeSecretKey } from "./stripeValidation.ts";

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
const STRIPE_CHECK_TIMEOUT_MS = 4000;

// A booking's payment history has at most a small handful of rows in practice (one normal
// booking-payment write path, create-booking-payment; a card-decline-then-retry can leave
// more than one PaymentIntent on the same booking_id -- stripe_payment_intent_id itself is
// globally UNIQUE, booking_id is not). Bounded so a pathological/corrupted booking can never
// turn this into an unbounded per-item Stripe call fan-out.
const MAX_PAYMENTS_PER_BOOKING_CHECKED = 5;

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
  supabase: any,
  bookingId: string,
): Promise<RefundCheckResult> {
  try {
    const { data: payments, error: paymentErr } = await supabase
      .from("booking_payments")
      .select("stripe_payment_intent_id")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(MAX_PAYMENTS_PER_BOOKING_CHECKED);

    if (paymentErr) {
      console.error(`[stripe-refund-check] booking ${bookingId}: booking_payments lookup failed:`, paymentErr.message);
      return { checked: false, refunded: false, errored: true };
    }
    const paymentIntentIds = (payments ?? [])
      .map((p: { stripe_payment_intent_id: string | null }) => p.stripe_payment_intent_id)
      .filter((id: string | null): id is string => typeof id === "string" && id.length > 0);
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
      console.error(`[stripe-refund-check] booking ${bookingId}: no Stripe secret key configured for mode=${mode}.`);
      return { checked: false, refunded: false, errored: true };
    }

    // maxNetworkRetries: 0 -- the SDK's own retry loop would silently multiply the worst-case
    // latency of a slow/degraded Stripe API well past STRIPE_CHECK_TIMEOUT_MS; a single
    // attempt bounded by `timeout` is more predictable for a per-item hot-path check, and the
    // caller's own bounded-retry (record_booking_reminder_result's attempt_count/cap) already
    // covers the "try again next cron tick" case at a higher level.
    const stripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
      timeout: STRIPE_CHECK_TIMEOUT_MS,
      maxNetworkRetries: 0,
    });

    // Check every PaymentIntent on the booking; short-circuit refunded=true the moment one
    // is found (no need to check the rest). Sequential, not Promise.all: the common case is
    // exactly one row, so parallelizing would add complexity for no real-world latency win,
    // and sequential keeps worst-case call count == actual rows found, never over-fetching.
    for (const paymentIntentId of paymentIntentIds) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = pi.latest_charge;
      // latest_charge is either an expanded Charge object or (if somehow not expanded) a
      // string id; only trust the expanded object's own `refunded` flag / amount_refunded.
      // amount_refunded > 0 also catches a PARTIAL refund, matching the existing "any
      // refund, full or partial, no distinction" policy (SEQP1R31 / Mathew's decision).
      const refunded = typeof charge === "object" && charge !== null
        ? (charge.refunded === true || (charge.amount_refunded ?? 0) > 0)
        : false;
      if (refunded) {
        return { checked: true, refunded: true, errored: false };
      }
    }

    return { checked: true, refunded: false, errored: false };
  } catch (e) {
    console.error(`[stripe-refund-check] booking ${bookingId}: live Stripe lookup failed/timed out:`, (e as any)?.message ?? e);
    return { checked: false, refunded: false, errored: true };
  }
}
