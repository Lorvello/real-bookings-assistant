import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { formatDate, reminderHtml } from "./reminderBody.ts";

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

// E-2: route a WhatsApp-origin booking (phone, no email) to a WhatsApp reminder.
// The LIVE Meta template send is a human-gate (a business-initiated message outside the
// 24h customer-care window needs an APPROVED template). Until that template is approved
// and wired, this returns delivered:false so the reminder is NOT marked sent (it is
// retried on a later run, not silently lost). In TEST, x-test-stub-whatsapp lets the
// harness assert the routing + dedup without contacting Meta.
async function sendWhatsAppReminder(
  r: { booking_id: string; customer_phone: string; customer_name: string; business_name: string; start_time: string; reminder_number: number; customer_locale: "nl" | "en" },
  stub: boolean,
): Promise<{ delivered: boolean; stubbed: boolean; reason?: string }> {
  if (stub) {
    // TEST-only: prove the branch was taken without sending. Treated as deliverable so the
    // claim-then-send dedup path is exercised end-to-end. Log the booking_id (UUID), never
    // the customer phone number (PII), matching this fn's logging discipline.
    console.log(`[whatsapp-reminder][stub] would send reminder ${r.reminder_number} for booking ${r.booking_id} (${r.customer_locale})`);
    return { delivered: true, stubbed: true };
  }
  // HUMAN-GATE: approved Meta template + WHATSAPP_ACCESS_TOKEN send not yet wired here.
  // Fail closed: do not mark sent. Log the booking_id (UUID), never the phone (PII).
  console.warn(`[whatsapp-reminder] Meta template send is gated; booking reminder ${r.reminder_number} for booking ${r.booking_id} left for retry.`);
  return { delivered: false, stubbed: false, reason: "meta_template_gated" };
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
      const channel: string | null = r.channel ?? null;
      if (channel !== "email" && channel !== "whatsapp") {
        // No reachable channel: never claim, never mark sent. Defensive; the RPC already
        // excludes these.
        skipped++;
        continue;
      }

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
      const claim = claimRows[0] as { attempt_count: number; status: string };
      if (claim.status !== "pending") {
        // Defensive: a concurrent invocation already resolved this row to a terminal
        // status (sent / pending_template_approval) between the RPC read and get_due_
        // booking_reminders()'s snapshot. Do not attempt delivery again.
        skipped++;
        continue;
      }

      const locale: "nl" | "en" = r.customer_locale === "en" ? "en" : "nl";
      let delivered = false;
      // releaseClaim = "no message left the building, so the claim should stay retryable
      // rather than being treated as a possible-send". We ONLY take this path when
      // delivery was deterministically NOT attempted (WhatsApp Meta send still gated ->
      // nothing sent). For an EMAIL exception we treat it as a real attempt too: a Resend
      // call may have actually gone out before the error surfaced, and re-sending would
      // spam the customer. Original LR-R95 policy: prefer a missed reminder over a double
      // one. Net effect: WhatsApp bookings are retried up to the cap (not lost, not
      // retried forever), email send-failures are not double-sent.
      let releaseClaim = false;
      try {
        if (channel === "email") {
          const { datum, tijd } = formatDate(r.start_time, locale);
          const { subject, html } = reminderHtml(locale, r.customer_name, r.business_name, null, datum, tijd, r.reminder_number === 2);
          const resp = await resend.emails.send({
            from: `${r.business_name} <noreply@bookingsassistant.com>`,
            to: [r.customer_email],
            subject,
            html,
          });
          if (resp.error) throw new Error(resp.error.message);
          delivered = true;
          email++;
        } else {
          const wa = await sendWhatsAppReminder(
            { booking_id: r.booking_id, customer_phone: r.customer_phone, customer_name: r.customer_name, business_name: r.business_name, start_time: r.start_time, reminder_number: r.reminder_number, customer_locale: locale },
            stubWhatsApp,
          );
          delivered = wa.delivered;
          if (delivered) whatsapp++;
          // Gated WhatsApp (delivered:false) sent nothing: eligible for bounded retry.
          else releaseClaim = true;
        }
      } catch (e) {
        delivered = false;
        console.error(`Reminder mislukt voor booking ${r.booking_id} (${channel}):`, (e as any).message);
      }

      if (delivered) {
        sent++;
      } else {
        failed++;
        // Email-exception (not releaseClaim): claim BLIJFT staan als 'pending' zonder cap
        // (mogelijk al verstuurd) -> geen dubbele mail; email failures are not the
        // Meta-gate cohort the retry cap targets and are expected to be transient/rare.
        // Skip the result-write entirely so attempt_count/status stay exactly as claimed.
        if (!releaseClaim) continue;
      }

      // SEQP1R3: single atomic write of the outcome (code-review fix). record_booking_
      // reminder_result does `attempt_count = attempt_count + 1` evaluated against the
      // LIVE row at commit time inside Postgres, not a count read earlier in this request,
      // so concurrent invocations cannot lose an increment, and it refuses to overwrite an
      // already-'sent' row (idempotency guard against a delayed/duplicate result).
      // FAIL-CLOSED GUARANTEE: 'sent' is written ONLY when delivered=true, which requires
      // either a non-error Resend response or a genuine WhatsApp send (never the gated
      // stub path).
      const { data: resultRows } = await supabase.rpc("record_booking_reminder_result", {
        p_booking_id: r.booking_id,
        p_reminder_number: r.reminder_number,
        p_delivered: delivered,
        p_max_attempts: WHATSAPP_REMINDER_MAX_ATTEMPTS,
      });
      const result = resultRows?.[0] as { attempt_count: number; status: string } | undefined;
      if (result?.status === "pending_template_approval") {
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
