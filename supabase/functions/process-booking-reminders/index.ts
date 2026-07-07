import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { formatDate, reminderHtml } from "./reminderBody.ts";
import { sendWhatsAppTemplate, normalizePhoneForMeta, EXTERNAL_SEND_TIMEOUT_MS } from "../_shared/whatsappSend.ts";
import { checkBookingRefundedAtStripe } from "../_shared/stripeRefundCheck.ts";

// LR-R95 + E1/E2/E4 + SEQP1R3: reminder-engine. Door pg_cron (via pg_net) periodiek
// aangeroepen (zie 20260630191000_E1_schedule_process_booking_reminders_cron.sql): haalt
// de due reminders op (get_due_booking_reminders), kiest per boeking een kanaal (email of
// WhatsApp), stuurt de herinnering en legt de uitkomst vast in booking_reminders_sent.
// Claim + result-write lopen elk via ÉÉN atomic RPC (claim_booking_reminder /
// record_booking_reminder_result, zie migratie 20260706130000) zodat Postgres'
// row-locking dubbel sturen voorkomt, ook bij overlappende runs -- niet application-code
// die eerst leest en dan los terugschrijft.
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_KEY);

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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
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

// SEQP1R8 (P1-9): env-gated switch for the real Meta template send. Defaults OFF (unset,
// or any value other than the literal string "true") so today's fail-closed/stub-only
// behavior is completely unchanged unless BOTH this flag is explicitly set to "true" AND a
// real approved template name is configured. This is the single on-switch Mathew flips once
// Meta approves the template staged in launch-ready-loop/META_TEMPLATE_REMINDER.md; no code
// change is needed at that point, only these two Supabase Edge Function secrets.
const WHATSAPP_REMINDER_TEMPLATE_LIVE = Deno.env.get("WHATSAPP_REMINDER_TEMPLATE_LIVE") === "true";
const META_REMINDER_TEMPLATE_NAME = Deno.env.get("META_REMINDER_TEMPLATE_NAME") ?? "";

// E-2: route a WhatsApp-origin booking (phone, no email) to a WhatsApp reminder.
// The LIVE Meta template send is a human-gate (a business-initiated message outside the
// 24h customer-care window needs an APPROVED template). Until WHATSAPP_REMINDER_TEMPLATE_LIVE
// is explicitly "true" (and a template name is configured), this returns delivered:false so
// the reminder is NOT marked sent (it is retried on a later run, not silently lost). In
// TEST, x-test-stub-whatsapp lets the harness assert the routing + dedup without contacting
// Meta, on WHICHEVER branch (gated or live) the flag currently selects, so the stub proves
// the actual code path in play, not a separate hardcoded test-only branch.
async function sendWhatsAppReminder(
  r: { booking_id: string; customer_phone: string; customer_name: string; business_name: string; start_time: string; reminder_number: number; customer_locale: "nl" | "en"; calendar_timezone: string },
  stub: boolean,
): Promise<{ delivered: boolean; stubbed: boolean; reason?: string }> {
  // SEQP1R9 (P1-9-PHONE): checked up front, BEFORE the gated/live branch split, and even in
  // the stub path, so (a) a bad phone number is caught regardless of which branch the env
  // flag currently selects, and (b) the x-test-stub-whatsapp harness genuinely proves the
  // fail-closed behaviour for a garbage number rather than skipping past it into a fake
  // "would send" log line. This is the SAME normalizer sendWhatsAppTemplate itself calls
  // (single source of truth), just surfaced one level up so the caller can route the
  // distinct "invalid_phone_format" reason into its own terminal status instead of the
  // generic gated/failed-send paths.
  if (!normalizePhoneForMeta(r.customer_phone)) {
    console.error(`[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number}: customer_phone niet betrouwbaar te normaliseren, send geweigerd (geen Meta-call).`);
    return { delivered: false, stubbed: false, reason: "invalid_phone_format" };
  }

  if (!WHATSAPP_REMINDER_TEMPLATE_LIVE || !META_REMINDER_TEMPLATE_NAME) {
    // SAFE DEFAULT: flag unset/false, or set true but no template name configured yet
    // (half-configured is treated as OFF, never as an accidental live send). Unchanged
    // from pre-P1-9 behavior.
    if (stub) {
      console.log(`[whatsapp-reminder][stub] would send reminder ${r.reminder_number} for booking ${r.booking_id} (${r.customer_locale}), gated branch`);
      return { delivered: true, stubbed: true };
    }
    console.warn(`[whatsapp-reminder] Meta template send is gated; booking reminder ${r.reminder_number} for booking ${r.booking_id} left for retry.`);
    return { delivered: false, stubbed: false, reason: "meta_template_gated" };
  }

  // LIVE branch: flag is "true" AND a template name is configured. Build the exact
  // 4 body-variables staged in META_TEMPLATE_REMINDER.md (name, business, date, time), in
  // that positional order (Meta template params are positional, not named).
  const { datum, tijd } = formatDate(r.start_time, r.customer_locale, r.calendar_timezone || "Europe/Amsterdam");
  const displayName = r.customer_name && r.customer_name.trim().length > 0
    ? r.customer_name
    : (r.customer_locale === "en" ? "there" : "daar");
  const bodyParams = [displayName, r.business_name, datum, tijd];

  if (stub) {
    // TEST-only: exercise the REAL live-branch code path (param assembly, template name,
    // language) but stop short of the actual Meta fetch, so a real cron run can never be
    // stubbed (x-test-stub-whatsapp is only honoured by the caller in the first place) and
    // this stub proves the live branch, not the old no-op gated branch. Log the booking_id
    // (UUID) and template name only, never the phone number (PII).
    console.log(`[whatsapp-reminder][stub] would send LIVE template "${META_REMINDER_TEMPLATE_NAME}" reminder ${r.reminder_number} for booking ${r.booking_id} (${r.customer_locale}), params=${JSON.stringify(bodyParams)}`);
    return { delivered: true, stubbed: true };
  }

  const result = await sendWhatsAppTemplate(r.customer_phone, META_REMINDER_TEMPLATE_NAME, r.customer_locale, bodyParams);
  if (!result.ok) {
    console.error(`[whatsapp-reminder] LIVE template send failed for booking ${r.booking_id}: status=${result.status} error=${result.error}`);
    return { delivered: false, stubbed: false, reason: result.error ?? "template_send_failed" };
  }
  return { delivered: true, stubbed: false };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Alleen de cron-job (via pg_net) mag dit draaien: het stuurt klant-herinneringen.
  // Zelfde gedeelde-secret-patroon als whatsapp-payment-handler (x-internal-secret).
  // De cron leest zijn secret uit vault (REMINDER_CRON_SECRET); function-to-function
  // callers gebruiken INTERNAL_FUNCTION_SECRET. Beide worden geaccepteerd.
  const provided = req.headers.get("x-internal-secret");
  const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
  const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  const authorized = !!provided && ((!!cronSecret && provided === cronSecret) || (!!internalSecret && provided === internalSecret));
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const onlyBookingId: string | undefined = body?.booking_id; // optioneel: scope voor veilig testen
    // TEST-only: stub the Meta send so the WhatsApp branch can be proven without contacting
    // Meta. Only honoured when the request carries x-test-stub-whatsapp:1 (so a real cron
    // run never stubs).
    const stubWhatsApp = req.headers.get("x-test-stub-whatsapp") === "1";

    const { data: due, error } = await supabase.rpc("get_due_booking_reminders");
    if (error) throw new Error(`RPC: ${error.message}`);

    let reminders = (due || []) as Array<any>;
    if (onlyBookingId) reminders = reminders.filter((r) => r.booking_id === onlyBookingId);

    let sent = 0, skipped = 0, failed = 0, whatsapp = 0, email = 0;
    for (const r of reminders) {
      // SEQP1R3: claim-or-resume-retry atomically via one RPC (code-review fix). The
      // previous SELECT-then-INSERT/UPDATE pattern was a TOCTOU race: two overlapping cron
      // ticks could both read the same attempt_count and both write back +1, silently
      // losing an increment (or un-parking an already-capped row). claim_booking_reminder
      // does INSERT ... ON CONFLICT ... DO UPDATE in one statement, so Postgres row-level
      // locking serializes concurrent claims, not application code.
      const { data: claimRows, error: claimErr } = await supabase.rpc("claim_booking_reminder", {
        p_booking_id: r.booking_id,
        p_reminder_number: r.reminder_number,
      });
      if (claimErr || !claimRows || claimRows.length === 0) { skipped++; continue; }
      const claim = claimRows[0] as {
        attempt_count: number;
        status: string;
        calendar_timezone: string;
        customer_email: string | null;
        customer_phone: string | null;
        customer_name: string | null;
        channel: string | null;
      };
      if (claim.status !== "pending") {
        // Do not attempt delivery: the claim did not yield a fresh retryable row. Several
        // cases land here:
        //  (a) a concurrent invocation already resolved this row to a terminal status
        //      (sent / pending_template_approval / invalid_phone_format) between the RPC read
        //      and get_due_booking_reminders()'s snapshot; or
        //  (b) SEQP1R13 (P1-5-CANCEL): the booking was cancelled / deleted / moved to the
        //      past between the get_due snapshot and this claim, so claim_booking_reminder
        //      folded the active-booking guard in and returned the terminal 'booking_cancelled'
        //      status instead of 'pending'. This is the cancel-during-send abort: the send is
        //      never made, and the row is recorded as booking_cancelled (never a false 'sent').
        //  (c) SEQP1R51 (fix for R50-1): both customer_email and customer_phone are now
        //      null/empty (an owner edit or a GDPR-style redaction landing mid-retry), so
        //      claim_booking_reminder resolved the row to the terminal 'no_contact_info'
        //      instead of 'pending'. Never a false 'sent'; never a silent forever-freeze.
        skipped++;
        continue;
      }
      // SEQP1R55 (finding R54-1): use claim_booking_reminder's OWN fresh channel, read in
      // the SAME atomic statement as the claim itself, immediately before this item is
      // rendered/sent -- NOT r.channel, which is the value that was live at the single
      // get_due_booking_reminders() snapshot taken once at the top of this whole invocation.
      // A booking that flips its reachable contact channel (email removed, phone added, or
      // vice versa) between that snapshot and this item's own claim must be routed through
      // the CURRENT channel, exactly mirroring the tz/contact freshness fixes above (SEQP1R28/
      // SEQP1R35). Fallback to the batch snapshot only guards a genuinely malformed/missing
      // RPC field (claim is untyped `any` from the RPC response), never an expected/normal
      // path: the fresh read should always be present since the same row was just confirmed
      // to exist.
      const channel: string | null = claim.channel === "email" || claim.channel === "whatsapp"
        ? claim.channel
        : (r.channel ?? null);
      if (channel !== "email" && channel !== "whatsapp") {
        // Defensive only: claim resolved to 'pending' (a genuinely retryable row) but no
        // deliverable channel is known. Should not happen given get_due_booking_reminders()'s
        // channel filter on its two normal branches plus claim_booking_reminder's own
        // no_contact guard (SEQP1R51), which together mean a 'pending' result always carries
        // a real channel today -- but a send must never be attempted without one.
        skipped++;
        continue;
      }

      const locale: "nl" | "en" = r.customer_locale === "en" ? "en" : "nl";
      // SEQP1R28 (finding R27-1): use claim_booking_reminder's OWN fresh calendar_timezone,
      // read in the SAME atomic statement as the claim itself, immediately before this item
      // is rendered/sent -- NOT r.calendar_timezone, which is the value that was live at the
      // single get_due_booking_reminders() snapshot taken once at the top of this whole
      // invocation. On a multi-item batch (a real, ordinary production condition), that
      // batch-level snapshot can go stale mid-invocation if the owner edits the calendar's
      // timezone (Availability page) while earlier items in the same batch are still being
      // sent; every later item must reflect the CURRENT value, not the batch's initial read.
      // claim_booking_reminder is called once per item, right at the moment of processing,
      // so it is the single authoritative freshness point for both status (SEQP1R13) and
      // timezone (SEQP1R28). The RPC already coalesces null/empty to Europe/Amsterdam at the
      // SQL layer; this is a second, defensive normalization at the application boundary
      // (claim is untyped `any` from the RPC response) so a malformed or missing value can
      // never silently fall through in a way that masks a real upstream data problem.
      const tz: string = typeof claim.calendar_timezone === "string" && claim.calendar_timezone.trim().length > 0
        ? claim.calendar_timezone
        : "Europe/Amsterdam";
      // SEQP1R35 (finding R34-2): use claim_booking_reminder's OWN fresh contact fields,
      // read in the SAME atomic statement as the claim itself, immediately before this item
      // is rendered/sent -- NOT r.customer_email/r.customer_phone/r.customer_name, which are
      // the values that were live at the single get_due_booking_reminders() snapshot taken
      // once at the top of this whole invocation. An owner edit to a customer's email/name
      // (a typo fix, a corrected number) landing between that snapshot and this item's actual
      // send must be picked up, exactly mirroring the calendar_timezone freshness fix above
      // (SEQP1R28) and the payment_status freshness fix (SEQP1R31) at this same choke point.
      // Fallback to the batch snapshot only guards a genuinely malformed/missing RPC field
      // (claim is untyped `any` from the RPC response), never an expected/normal path: the
      // fresh read should always be present since the same row was just confirmed to exist.
      const customerEmail: string = typeof claim.customer_email === "string" && claim.customer_email.length > 0
        ? claim.customer_email
        : r.customer_email;
      const customerPhone: string = typeof claim.customer_phone === "string" && claim.customer_phone.length > 0
        ? claim.customer_phone
        : r.customer_phone;
      const customerName: string = typeof claim.customer_name === "string" && claim.customer_name.length > 0
        ? claim.customer_name
        : r.customer_name;

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
      const refundCheck = await checkBookingRefundedAtStripe(supabase, r.booking_id);
      if (refundCheck.refunded) {
        // Stripe confirms this booking is refunded, ahead of the local webhook mirror: never
        // send, record straight to the same 'payment_refunded' terminal state SEQP1R31
        // already established (not a new state -- this is the SAME outcome, just caught
        // earlier by the authoritative source instead of the local mirror).
        failed++;
        console.warn(`[stripe-refund-check] booking ${r.booking_id} reminder ${r.reminder_number}: Stripe confirms a refund the local payment_status had not caught yet; send skipped.`);
        await supabase.rpc("record_booking_reminder_result", {
          p_booking_id: r.booking_id,
          p_reminder_number: r.reminder_number,
          p_delivered: false,
          p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
          p_failure_reason: "stripe_refund_confirmed",
        });
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
        console.error(`[stripe-refund-check] booking ${r.booking_id} reminder ${r.reminder_number}: live Stripe check errored/timed out; send skipped, bounded-retrying.`);
        await supabase.rpc("record_booking_reminder_result", {
          p_booking_id: r.booking_id,
          p_reminder_number: r.reminder_number,
          p_delivered: false,
          p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
          p_failure_reason: "stripe_check_failed",
        });
        continue;
      }

      let delivered = false;
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
          const { datum, tijd } = formatDate(r.start_time, locale, tz);
          const { subject, html } = reminderHtml(locale, customerName, r.business_name, null, datum, tijd, r.reminder_number === 2);
          // SEQP1R48 (fix for R47-1): bound the Resend call to EXTERNAL_SEND_TIMEOUT_MS
          // (well under claim_booking_reminder's 3-minute lease, SEQP1R42). Resend's SDK
          // merges its second `options` argument directly into the underlying fetch() call
          // (confirmed by reading node_modules/.deno/resend@2.0.0's resend.js this round), so
          // passing `signal` here is a genuine abort, not a cosmetic timeout. Without this, a
          // stalled Resend round-trip could still be genuinely in-flight when the lease
          // expires, letting a second invocation validly re-claim and also send the same
          // reminder (reproduced live, evidence/SEQ_P1_r47.md + r48.md). On abort, fetch
          // rejects and this falls into the catch block below exactly like any other send
          // exception, so SEQP1R45's exception-path retry accounting already applies unchanged.
          // The published resend@2.0.0 .d.ts (CreateEmailRequestOptions) only declares
          // `query`, but its JS implementation merges this whole options object straight into
          // the underlying fetch() RequestInit (confirmed by reading resend.js/emails.js this
          // round: `Object.assign({method, headers, body}, options)`), so `signal` genuinely
          // reaches fetch even though the public type doesn't declare it. Cast narrowly to the
          // SDK's own declared parameter type (not `any`) so everything else about this call
          // stays type-checked.
          const resp = await resend.emails.send({
            from: `${sanitizeFromName(r.business_name)} <noreply@bookingsassistant.com>`,
            to: [customerEmail],
            subject,
            html,
          }, { signal: AbortSignal.timeout(EXTERNAL_SEND_TIMEOUT_MS) } as Parameters<typeof resend.emails.send>[1]);
          if (resp.error) throw new Error(resp.error.message);
          delivered = true;
          email++;
        } else {
          const wa = await sendWhatsAppReminder(
            { booking_id: r.booking_id, customer_phone: customerPhone, customer_name: customerName, business_name: r.business_name, start_time: r.start_time, reminder_number: r.reminder_number, customer_locale: locale, calendar_timezone: tz },
            stubWhatsApp,
          );
          delivered = wa.delivered;
          if (delivered) whatsapp++;
          // Gated WhatsApp (delivered:false) sent nothing: eligible for bounded retry.
          else releaseClaim = true;
          if (wa.reason === "invalid_phone_format") failureReason = "invalid_phone_format";
        }
      } catch (e) {
        delivered = false;
        console.error(`Reminder mislukt voor booking ${r.booking_id} (${channel}):`, (e as any).message);
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

      if (delivered) {
        sent++;
      } else {
        failed++;
        if (!releaseClaim) continue;
      }

      // SEQP1R3/SEQP1R9: single atomic write of the outcome (code-review fix). record_
      // booking_reminder_result does `attempt_count = attempt_count + 1` evaluated against
      // the LIVE row at commit time inside Postgres, not a count read earlier in this
      // request, so concurrent invocations cannot lose an increment, and it refuses to
      // overwrite an already-terminal (sent / invalid_phone_format) row (idempotency guard
      // against a delayed/duplicate result). FAIL-CLOSED GUARANTEE: 'sent' is written ONLY
      // when delivered=true, which requires either a non-error Resend response or a genuine
      // WhatsApp send (never the gated stub path). p_failure_reason routes an unresolvable
      // phone number straight to its own 'invalid_phone_format' terminal status in this SAME
      // write, reached in one attempt (never conflated with the retry-cap-driven
      // pending_template_approval, per the P1-9-VERIFY-1 finding).
      const { data: resultRows } = await supabase.rpc("record_booking_reminder_result", {
        p_booking_id: r.booking_id,
        p_reminder_number: r.reminder_number,
        p_delivered: delivered,
        p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
        p_failure_reason: failureReason,
        // SEQP1R55: re-affirm the channel actually attempted for THIS outcome (dashboard
        // sibling fix), so booking_reminders_sent.channel reflects the real send-time channel
        // rather than being re-derived later from the booking's current, mutable contact state.
        p_channel: channel,
      });
      const result = resultRows?.[0] as { attempt_count: number; status: string } | undefined;
      if (result?.status === "invalid_phone_format") {
        console.error(`[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number} parked as invalid_phone_format; customer_phone could not be normalized, needs a human data fix (NOT a Meta template-approval wait).`);
      } else if (result?.status === "pending_template_approval") {
        console.warn(`[whatsapp-reminder] booking ${r.booking_id} reminder ${r.reminder_number} hit the ${WHATSAPP_REMINDER_MAX_ATTEMPTS}-attempt retry cap; parked as pending_template_approval.`);
      }
    }

    return new Response(JSON.stringify({ processed: reminders.length, sent, skipped, failed, email, whatsapp }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("process-booking-reminders error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
