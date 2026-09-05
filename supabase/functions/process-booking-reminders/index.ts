import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.50.0";
import { formatDate, reminderHtml } from "./reminderBody.ts";
import {
  EXTERNAL_SEND_TIMEOUT_MS,
  normalizePhoneForMeta,
  sendWhatsAppTemplate,
} from "../_shared/whatsappSend.ts";
import { checkBookingRefundedAtStripe } from "../_shared/stripeRefundCheck.ts";
import {
  beginReminderProviderAttemptOrThrow,
  deliverReminderEmail,
  recordReminderResultOrThrow,
  reminderDeliveryKey,
  type ReminderDeliveryMode,
  ReminderProviderAttemptPersistenceError,
  resolveReminderDeliveryMode,
  runReminderStage,
  withReminderAbortSignal,
} from "./reminderDelivery.ts";
import { parseReminderProcessRequest } from "./request.ts";

// LR-R95 + E1/E2/E4 + SEQP1R3: reminder-engine. Door pg_cron (via pg_net) periodiek
// aangeroepen (zie 20260630191000_E1_schedule_process_booking_reminders_cron.sql): haalt
// de due reminders op (get_due_booking_reminders), kiest per boeking een kanaal (email of
// WhatsApp), stuurt de herinnering en legt de uitkomst vast in booking_reminders_sent.
// Claim + result-write lopen elk via ÉÉN atomic RPC (claim_booking_reminder /
// record_booking_reminder_result, zie migratie 20260706130000) zodat Postgres'
// row-locking dubbel sturen voorkomt, ook bij overlappende runs -- niet application-code
// die eerst leest en dan los terugschrijft.
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_KEY);

interface DueReminder {
  booking_id: string;
  reminder_number: 1 | 2;
}

interface ClaimedReminder {
  claim_token: string;
  schedule_generation: string;
  attempt_count: number;
  status: "pending";
  calendar_timezone: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_name: string | null;
  customer_locale: string | null;
  channel: "email" | "whatsapp";
  start_time: string;
  business_name: string;
  calendar_id: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown_error";
}

const environment = () => ({
  APP_ENV: Deno.env.get("APP_ENV"),
  REMINDER_DELIVERY_MODE: Deno.env.get("REMINDER_DELIVERY_MODE"),
});

// SEQP1R19 (finding R18-2, defense-in-depth alongside the reminderBody HTML-escape): the email
// From field is built as an RFC 5322 `display-name <addr>` string from the owner-controlled
// business_name. reminderHtml escaping fixes the BODY/subject, but the From display-name is a
// separate header sink: newlines/control chars enable header injection, and `<>"@,;:` break the
// `display-name <addr>` structure (e.g. a business_name containing `<` could smuggle a different
// address). Strip those characters (and collapse whitespace) so the display-name is always inert,
// then fall back to a safe literal if nothing usable remains.
function sanitizeFromName(raw: string | null | undefined): string {
  const cleaned = (raw ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, " ") // CR/LF + all control chars: header-injection guard
    .replace(/["<>@,;:\\]/g, " ") // structural chars that would break `display-name <addr>`
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : "Bookings Assistant";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// SEQP1R3: bounded retry for gated WhatsApp reminders (P1-6). At the existing */5 * * * *
// cron cadence, 12 attempts = ~1 hour of active retrying. Reminders fire on a schedule
// relative to start_time, so retrying every 5 minutes for hours/days has no value: if the
// Meta template isn't approved within an hour of the first attempt, that is not a
// transient blip, it is the standing human-gate. After the cap, the row is parked in
// 'pending_template_approval' (see migration 20260706130000) so it stops consuming cron
// cycles but stays visible and DB-queryable, never silently dropped and never falsely
// marked 'sent'.
const WHATSAPP_REMINDER_MAX_ATTEMPTS = 12;
const MAX_BATCH_SIZE = 10;
const PROCESSING_BUDGET_MS = 35_000;
const MIN_ITEM_BUDGET_MS = 14_000;

// SEQP1R8 (P1-9): env-gated switch for the real Meta template send. Defaults OFF (unset,
// or any value other than the literal string "true") so today's fail-closed/stub-only
// behavior is completely unchanged unless BOTH this flag is explicitly set to "true" AND a
// real approved template name is configured. This is the single on-switch Mathew flips once
// Meta approves the template staged in launch-ready-loop/META_TEMPLATE_REMINDER.md; no code
// change is needed at that point, only these two Supabase Edge Function secrets.
const WHATSAPP_REMINDER_TEMPLATE_LIVE =
  Deno.env.get("WHATSAPP_REMINDER_TEMPLATE_LIVE") === "true";
const META_REMINDER_TEMPLATE_NAME =
  Deno.env.get("META_REMINDER_TEMPLATE_NAME") ?? "";

// E-2: route a WhatsApp-origin booking (phone, no email) to a WhatsApp reminder.
// The LIVE Meta template send is a human-gate (a business-initiated message outside the
// 24h customer-care window needs an APPROVED template). Until WHATSAPP_REMINDER_TEMPLATE_LIVE
// is explicitly "true" (and a template name is configured), this returns delivered:false so
// the reminder is NOT marked sent (it is retried on a later run, not silently lost). In
// Local/test evidence uses the server-owned REMINDER_DELIVERY_MODE=record-only switch. The
// switch is rejected outside APP_ENV=local/test and is never controlled by a request header.
async function sendWhatsAppReminder(
  r: {
    booking_id: string;
    customer_phone: string;
    customer_name: string;
    business_name: string;
    start_time: string;
    reminder_number: number;
    customer_locale: "nl" | "en";
    calendar_timezone: string;
  },
  deliveryMode: ReminderDeliveryMode,
  beginProviderAttempt: () => Promise<void>,
  signal: AbortSignal,
): Promise<
  {
    providerAccepted: boolean;
    recorded: boolean;
    reason?: string;
    providerMessageId?: string;
  }
> {
  // SEQP1R9 (P1-9-PHONE): checked up front, BEFORE the gated/live branch split, and even in
  // the stub path, so (a) a bad phone number is caught regardless of which branch the env
  // flag currently selects, and (b) record-only evidence genuinely proves the fail-closed
  // behaviour for a garbage number rather than bypassing validation. This is the SAME
  // normalizer sendWhatsAppTemplate itself calls
  // (single source of truth), just surfaced one level up so the caller can route the
  // distinct "invalid_phone_format" reason into its own terminal status instead of the
  // generic gated/failed-send paths.
  if (!normalizePhoneForMeta(r.customer_phone)) {
    console.error(
      `[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number}: customer_phone niet betrouwbaar te normaliseren, send geweigerd (geen Meta-call).`,
    );
    return {
      providerAccepted: false,
      recorded: false,
      reason: "invalid_phone_format",
    };
  }

  if (deliveryMode === "record-only") {
    console.log(
      `[whatsapp-reminder][record-only] validated reminder ${r.reminder_number} for booking ${r.booking_id}; no Meta request made.`,
    );
    return { providerAccepted: false, recorded: true };
  }

  if (!WHATSAPP_REMINDER_TEMPLATE_LIVE || !META_REMINDER_TEMPLATE_NAME) {
    // SAFE DEFAULT: flag unset/false, or set true but no template name configured yet
    // (half-configured is treated as OFF, never as an accidental live send). Unchanged
    // from pre-P1-9 behavior.
    console.warn(
      `[whatsapp-reminder] Meta template send is gated; booking reminder ${r.reminder_number} for booking ${r.booking_id} left for retry.`,
    );
    return {
      providerAccepted: false,
      recorded: false,
      reason: "meta_template_gated",
    };
  }

  // Missing credentials are known local configuration failures. Detect them before
  // the at-most-once marker and before network I/O so they can never be parked as an
  // ambiguous delivery outcome.
  if (
    !Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim() ||
    !Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim()
  ) {
    return {
      providerAccepted: false,
      recorded: false,
      reason: "whatsapp_configuration_missing",
    };
  }

  // LIVE branch: flag is "true" AND a template name is configured. Build the exact
  // 4 body-variables staged in META_TEMPLATE_REMINDER.md (name, business, date, time), in
  // that positional order (Meta template params are positional, not named).
  const { datum, tijd } = formatDate(
    r.start_time,
    r.customer_locale,
    r.calendar_timezone || "Europe/Amsterdam",
  );
  const displayName = r.customer_name && r.customer_name.trim().length > 0
    ? r.customer_name
    : (r.customer_locale === "en" ? "there" : "daar");
  const bodyParams = [displayName, r.business_name, datum, tijd];

  // Meta does not expose a provider idempotency key in this integration. Persist the
  // at-most-once `delivery_unknown` guard immediately before the network request. A known
  // response is finalized below; a crash or failed final write remains visible and is never
  // auto-retried into a duplicate customer message.
  await beginProviderAttempt();
  const result = await sendWhatsAppTemplate(
    r.customer_phone,
    META_REMINDER_TEMPLATE_NAME,
    r.customer_locale,
    bodyParams,
    signal,
  );
  if (!result.ok) {
    console.error(
      `[whatsapp-reminder] LIVE template send failed for booking ${r.booking_id}: status=${result.status} error=${result.error}`,
    );
    return {
      providerAccepted: false,
      recorded: false,
      reason: result.status === 0 || result.status >= 500
        ? "whatsapp_delivery_unknown"
        : "whatsapp_send_failed",
    };
  }
  if (!result.messageId) {
    return {
      providerAccepted: false,
      recorded: false,
      reason: "whatsapp_delivery_unknown",
    };
  }
  return {
    providerAccepted: true,
    recorded: false,
    providerMessageId: result.messageId,
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Alleen de cron-job (via pg_net) mag dit draaien: het stuurt klant-herinneringen.
  // Zelfde gedeelde-secret-patroon als whatsapp-payment-handler (x-internal-secret).
  // De cron leest zijn secret uit vault (REMINDER_CRON_SECRET); function-to-function
  // callers gebruiken INTERNAL_FUNCTION_SECRET. Beide worden geaccepteerd.
  const provided = req.headers.get("x-internal-secret");
  const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const authorized = !!provided &&
    ((!!cronSecret && provided === cronSecret) ||
      (!!internalSecret && provided === internalSecret));
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const startedAt = Date.now();
    const processingDeadlineAt = startedAt + PROCESSING_BUDGET_MS;
    const deliveryMode = resolveReminderDeliveryMode(environment());
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch (_) {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsedRequest = parseReminderProcessRequest(rawBody);
    if (!parsedRequest) {
      return new Response(JSON.stringify({ error: "invalid_request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: reconcileError } = await runReminderStage(
      (signal) =>
        withReminderAbortSignal(
          supabase.rpc("reconcile_booking_reminders_v2"),
          signal,
        ),
      processingDeadlineAt,
      "reconcile_rpc",
    );
    if (reconcileError) {
      throw new Error(`REMINDER_RECONCILE_FAILED:${reconcileError.message}`);
    }

    const { data: due, error } = await runReminderStage(
      (signal) =>
        withReminderAbortSignal(
          supabase.rpc("get_due_booking_reminders_v2", {
            p_booking_id: parsedRequest.bookingId,
            p_limit: MAX_BATCH_SIZE,
          }),
          signal,
        ),
      processingDeadlineAt,
      "due_rpc",
    );
    if (error) throw new Error(`RPC: ${error.message}`);

    const reminders = (due || []) as DueReminder[];

    let accepted = 0,
      recorded = 0,
      skipped = 0,
      failed = 0,
      whatsapp = 0,
      email = 0,
      processed = 0,
      truncated = false;
    for (const r of reminders) {
      const elapsedMs = Date.now() - startedAt;
      if (
        elapsedMs >= PROCESSING_BUDGET_MS ||
        PROCESSING_BUDGET_MS - elapsedMs < MIN_ITEM_BUDGET_MS
      ) {
        truncated = true;
        break;
      }
      processed++;
      const { data: claimRows, error: claimErr } = await runReminderStage(
        (signal) =>
          withReminderAbortSignal(
            supabase.rpc("claim_booking_reminder_v2", {
              p_booking_id: r.booking_id,
              p_reminder_number: r.reminder_number,
            }),
            signal,
          ),
        processingDeadlineAt,
        "claim_rpc",
      );
      if (claimErr) {
        throw new Error(`REMINDER_CLAIM_FAILED:${claimErr.message}`);
      }
      if (!claimRows || claimRows.length === 0) {
        skipped++;
        continue;
      }
      const claim = claimRows[0] as ClaimedReminder;
      const channel = claim.channel;
      const locale: "nl" | "en" = claim.customer_locale === "en" ? "en" : "nl";
      const tz = claim.calendar_timezone;
      const customerEmail = claim.customer_email ?? "";
      const customerPhone = claim.customer_phone ?? "";
      const customerName = claim.customer_name ?? "";
      const deliveryKey = reminderDeliveryKey(
        r.booking_id,
        r.reminder_number,
        channel,
        claim.schedule_generation,
      );

      // SEQP1R38 (finding R37-1): authoritative, send-time-fresh refund check against Stripe
      // itself, right before the actual send attempt (email or WhatsApp, both channels).
      // claim_booking_reminder's own payment_status re-check (SEQP1R31) is a real, cheap
      // first-pass filter -- it already catches every refund the charge.refunded webhook has
      // processed by now, at zero extra latency. This closes the narrow remaining window:
      // Stripe's webhook has real observed delivery latency (~1-2s, evidence/SEQ_P1_r37.md +
      // r38.md), and a reminder send is very often faster than that, so the local mirror can
      // still say 'paid' for a booking Stripe itself already knows is refunded. Only Stripe
      // itself can close that gap. checkBookingRefundedAtStripe short-circuits to
      // checked=false/errored=false (no Stripe call at all) for a booking with no payment on
      // record (e.g. unpaid/pay-at-appointment bookings), so this adds no latency for the
      // large cohort of reminders that were never payment-gated in the first place.
      const refundCheck = await runReminderStage(
        (signal) =>
          checkBookingRefundedAtStripe(supabase, r.booking_id, { signal }),
        processingDeadlineAt,
        "stripe_refund_check",
        5_000,
      );
      if (refundCheck.refunded) {
        // Stripe confirms this booking is refunded, ahead of the local webhook mirror: never
        // send, record straight to the same 'payment_refunded' terminal state SEQP1R31
        // already established (not a new state -- this is the SAME outcome, just caught
        // earlier by the authoritative source instead of the local mirror).
        failed++;
        console.warn(
          `[stripe-refund-check] booking ${r.booking_id} reminder ${r.reminder_number}: Stripe confirms a refund the local payment_status had not caught yet; send skipped.`,
        );
        await recordReminderResultOrThrow(supabase, {
          p_booking_id: r.booking_id,
          p_reminder_number: r.reminder_number,
          p_schedule_generation: claim.schedule_generation,
          p_claim_token: claim.claim_token,
          p_provider_accepted: false,
          p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
          p_failure_reason: "stripe_refund_confirmed",
          p_channel: channel,
          p_delivery_mode: deliveryMode,
          p_provider_message_id: null,
          p_delivery_key: deliveryKey,
        }, processingDeadlineAt);
        continue;
      }
      if (refundCheck.errored) {
        // FAIL-CLOSED: the live Stripe check itself errored or timed out, so we genuinely do
        // not know whether this booking is refunded. Bias toward not-yet-confirmed (never
        // send on an errored check) rather than risk a false 'sent' on a booking that Stripe
        // may actually have refunded. Bounded-retry, not an unbounded loop: this reuses the
        // EXISTING attempt_count/cap mechanism (P1-6/SEQP1R3) -- below the cap the row simply
        // stays 'pending' and is retried next cron tick (a transient Stripe blip self-heals
        // within a few ticks); at the cap it parks at the distinct 'stripe_check_failed'
        // terminal state (SEQP1R38 migration) rather than the misleading WhatsApp-specific
        // 'pending_template_approval'.
        failed++;
        console.error(
          `[stripe-refund-check] booking ${r.booking_id} reminder ${r.reminder_number}: live Stripe check errored/timed out; send skipped, bounded-retrying.`,
        );
        await recordReminderResultOrThrow(supabase, {
          p_booking_id: r.booking_id,
          p_reminder_number: r.reminder_number,
          p_schedule_generation: claim.schedule_generation,
          p_claim_token: claim.claim_token,
          p_provider_accepted: false,
          p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
          p_failure_reason: "stripe_check_failed",
          p_channel: channel,
          p_delivery_mode: deliveryMode,
          p_provider_message_id: null,
          p_delivery_key: deliveryKey,
        }, processingDeadlineAt);
        continue;
      }

      let providerAccepted = false;
      let recordedOnly = false;
      let providerMessageId: string | null = null;
      // releaseClaim = "this non-delivered outcome must still be recorded via
      // record_booking_reminder_result", i.e. delivery was either deterministically NOT
      // attempted (WhatsApp Meta send still gated -> nothing sent) or the attempt itself
      // threw before we could confirm success. SEQP1R45 (fix for R44-1): previously an
      // email-channel exception left this false and the RPC call below was skipped
      // entirely, so attempt_count (only ever incremented inside that RPC) froze forever
      // and the 12-attempt bounded-retry cap could mathematically never engage -- see the
      // migration 20260707180000_SEQP1R45_reminder_email_exception_result_recording.sql
      // for the full root-cause writeup and evidence/SEQ_P1_r44.md + r45.md for the live
      // reproduction. Every non-delivered outcome now reaches record_booking_reminder_result
      // exactly once, so attempt_count always reflects reality and the cap always
      // eventually engages, for every channel.
      let releaseClaim = false;
      // SEQP1R9 (P1-9-PHONE): a distinct, specific failure reason (currently only
      // "invalid_phone_format") that must be routed to its OWN terminal status rather than
      // treated as a generic retryable gated-send. Left null for every other outcome so
      // record_booking_reminder_result's default behaviour (pending / pending_template_
      // approval-on-cap) is completely unchanged for those. SEQP1R45 adds a second specific
      // value, "email_send_failed", set in the catch block below for an email-channel send
      // exception.
      let failureReason: string | null = null;
      try {
        if (channel === "email") {
          if (deliveryMode === "send") {
            await beginReminderProviderAttemptOrThrow(supabase, {
              p_booking_id: r.booking_id,
              p_reminder_number: r.reminder_number,
              p_schedule_generation: claim.schedule_generation,
              p_claim_token: claim.claim_token,
              p_channel: "email",
              p_delivery_mode: "send",
              p_delivery_key: deliveryKey,
            }, processingDeadlineAt);
          }
          const { datum, tijd } = formatDate(claim.start_time, locale, tz);
          const { subject, html } = reminderHtml(
            locale,
            customerName,
            claim.business_name,
            null,
            datum,
            tijd,
            r.reminder_number === 2,
          );
          const emailDelivery = await runReminderStage(
            (signal) =>
              deliverReminderEmail(
                deliveryMode,
                Deno.env.get("RESEND_API_KEY"),
                {
                  from: `${
                    sanitizeFromName(claim.business_name)
                  } <noreply@bookingsassistant.com>`,
                  to: customerEmail,
                  subject,
                  html,
                  bookingId: r.booking_id,
                  reminderNumber: r.reminder_number,
                  scheduleGeneration: claim.schedule_generation,
                },
                undefined,
                Math.max(
                  1,
                  Math.min(
                    EXTERNAL_SEND_TIMEOUT_MS,
                    processingDeadlineAt - Date.now(),
                  ),
                ),
                signal,
              ),
            processingDeadlineAt,
            "email_provider",
            EXTERNAL_SEND_TIMEOUT_MS,
          );
          providerAccepted = emailDelivery.mode === "send";
          recordedOnly = emailDelivery.mode === "record-only";
          providerMessageId = emailDelivery.providerMessageId;
          email++;
        } else {
          const wa = await runReminderStage(
            (signal) =>
              sendWhatsAppReminder(
                {
                  booking_id: r.booking_id,
                  customer_phone: customerPhone,
                  customer_name: customerName,
                  business_name: claim.business_name,
                  start_time: claim.start_time,
                  reminder_number: r.reminder_number,
                  customer_locale: locale,
                  calendar_timezone: tz,
                },
                deliveryMode,
                () =>
                  beginReminderProviderAttemptOrThrow(supabase, {
                    p_booking_id: r.booking_id,
                    p_reminder_number: r.reminder_number,
                    p_schedule_generation: claim.schedule_generation,
                    p_claim_token: claim.claim_token,
                    p_channel: "whatsapp",
                    p_delivery_mode: "send",
                    p_delivery_key: deliveryKey,
                  }, processingDeadlineAt),
                signal,
              ),
            processingDeadlineAt,
            "whatsapp_provider",
            EXTERNAL_SEND_TIMEOUT_MS + 2_000,
          );
          providerAccepted = wa.providerAccepted;
          recordedOnly = wa.recorded;
          providerMessageId = wa.providerMessageId ?? null;
          if (providerAccepted || recordedOnly) whatsapp++;
          // Gated WhatsApp (delivered:false) sent nothing: eligible for bounded retry.
          else releaseClaim = true;
          if (
            wa.reason === "invalid_phone_format" ||
            wa.reason === "whatsapp_send_failed" ||
            wa.reason === "whatsapp_delivery_unknown" ||
            wa.reason === "meta_template_gated" ||
            wa.reason === "whatsapp_configuration_missing"
          ) {
            failureReason = wa.reason;
          }
        }
      } catch (e) {
        if (e instanceof ReminderProviderAttemptPersistenceError) {
          throw e;
        }
        providerAccepted = false;
        console.error(
          `Reminder mislukt voor booking ${r.booking_id} (${channel}):`,
          errorMessage(e),
        );
        // SEQP1R45 (fix for R44-1): an email-channel exception (a network error, a Resend
        // API error response -- resp.error is converted into a throw a few lines above --
        // a timeout, quota exhaustion, or anything else) is overwhelmingly a "nothing left
        // the building" case, so it must still be recorded via record_booking_reminder_result
        // like every other failure path in this function, never silently skipped. This is a
        // deliberate, documented trade-off, not an oversight: the small residual risk that
        // Resend actually sent before the client-side error surfaced is strictly better than
        // the prior behaviour (an unbounded, invisible, forever-retrying reminder). Scoped to
        // the email channel only: the WhatsApp branch above never throws today
        // (sendWhatsAppReminder / sendWhatsAppTemplate both catch their own errors and
        // return {delivered:false, ...} rather than throwing, confirmed by source-read this
        // round), so in practice this catch block is reached exclusively by the email path.
        if (channel === "email") {
          releaseClaim = true;
          failureReason = "email_send_failed";
        }
      }

      if (recordedOnly) {
        recorded++;
      } else if (providerAccepted) {
        accepted++;
      } else {
        failed++;
        if (!releaseClaim) continue;
      }

      // SEQP1R3/SEQP1R9: single atomic write of the outcome (code-review fix). record_
      // booking_reminder_result does `attempt_count = attempt_count + 1` evaluated against
      // the LIVE row at commit time inside Postgres, not a count read earlier in this
      // request, so concurrent invocations cannot lose an increment, and it refuses to
      // overwrite an already-terminal outcome. FAIL-CLOSED GUARANTEE: a provider receipt
      // becomes `provider_accepted`, never `delivered`; gated/record-only paths cannot create
      // customer-delivery evidence. p_failure_reason routes an unresolvable
      // phone number straight to its own 'invalid_phone_format' terminal status in this SAME
      // write, reached in one attempt (never conflated with the retry-cap-driven
      // pending_template_approval, per the P1-9-VERIFY-1 finding).
      const result = await recordReminderResultOrThrow(supabase, {
        p_booking_id: r.booking_id,
        p_reminder_number: r.reminder_number,
        p_schedule_generation: claim.schedule_generation,
        p_claim_token: claim.claim_token,
        p_provider_accepted: providerAccepted,
        p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
        p_failure_reason: failureReason,
        // SEQP1R55: re-affirm the channel actually attempted for THIS outcome (dashboard
        // sibling fix), so booking_reminders_sent.channel reflects the real send-time channel
        // rather than being re-derived later from the booking's current, mutable contact state.
        p_channel: channel,
        p_delivery_mode: deliveryMode,
        p_provider_message_id: providerMessageId,
        p_delivery_key: deliveryKey,
      }, processingDeadlineAt);
      if (result?.status === "invalid_phone_format") {
        console.error(
          `[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number} parked as invalid_phone_format; customer_phone could not be normalized, needs a human data fix (NOT a Meta template-approval wait).`,
        );
      } else if (result?.status === "pending_template_approval") {
        console.warn(
          `[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number} hit the ${WHATSAPP_REMINDER_MAX_ATTEMPTS}-attempt retry cap; parked as pending_template_approval.`,
        );
      } else if (result?.status === "delivery_unknown") {
        console.error(
          `[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number} has an unknown Meta delivery outcome; automatic retry is stopped to prevent a duplicate message.`,
        );
      }
    }

    return new Response(
      JSON.stringify({
        processed,
        accepted,
        recorded,
        skipped,
        failed,
        email,
        whatsapp,
        truncated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    console.error("process-booking-reminders error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage(error), success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

serve(handler);
