import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { formatDate, reminderHtml } from "./reminderBody.ts";

// LR-R95 + E1/E2/E4: reminder-engine. Door pg_cron (via pg_net) periodiek aangeroepen
// (zie 20260630191000_E1_schedule_process_booking_reminders_cron.sql): haalt de due
// reminders op (get_due_booking_reminders), kiest per boeking een kanaal (email of
// WhatsApp), stuurt de herinnering en legt 'm vast in booking_reminders_sent.
// Claim-then-send + unique constraint voorkomen dubbel sturen, ook bij overlappende runs.
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

// E-2: route a WhatsApp-origin booking (phone, no email) to a WhatsApp reminder.
// The LIVE Meta template send is a human-gate (a business-initiated message outside the
// 24h customer-care window needs an APPROVED template). Until that template is approved
// and wired, this returns delivered:false so the reminder is NOT marked sent (it is
// retried on a later run, not silently lost). In TEST, x-test-stub-whatsapp lets the
// harness assert the routing + dedup without contacting Meta.
async function sendWhatsAppReminder(
  r: { customer_phone: string; customer_name: string; business_name: string; start_time: string; reminder_number: number; customer_locale: "nl" | "en" },
  stub: boolean,
): Promise<{ delivered: boolean; stubbed: boolean; reason?: string }> {
  if (stub) {
    // TEST-only: prove the branch was taken without sending. Treated as deliverable so the
    // claim-then-send dedup path is exercised end-to-end.
    console.log(`[whatsapp-reminder][stub] would send reminder ${r.reminder_number} to ${r.customer_phone} (${r.customer_locale})`);
    return { delivered: true, stubbed: true };
  }
  // HUMAN-GATE: approved Meta template + WHATSAPP_ACCESS_TOKEN send not yet wired here.
  // Fail closed: do not mark sent.
  console.warn(`[whatsapp-reminder] Meta template send is gated; booking reminder ${r.reminder_number} for ${r.customer_phone} left for retry.`);
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

      // Claim-then-send: insert eerst de dedup-rij. Lukt dat niet (al geclaimd door een
      // andere run), dan skippen we: geen dubbele herinnering.
      const { error: claimErr } = await supabase
        .from("booking_reminders_sent")
        .insert({ booking_id: r.booking_id, reminder_number: r.reminder_number });
      if (claimErr) { skipped++; continue; }

      const locale: "nl" | "en" = r.customer_locale === "en" ? "en" : "nl";
      let delivered = false;
      // releaseClaim = "no message left the building, so it is safe to drop the claim and
      // retry later". We ONLY release when delivery was deterministically NOT attempted
      // (WhatsApp Meta send still gated -> nothing sent). For an EMAIL exception we KEEP the
      // claim: a Resend call may have actually gone out before the error surfaced, and
      // re-sending would spam the customer. Original LR-R95 policy: prefer a missed reminder
      // over a double one. Net effect of E-2: WhatsApp bookings are retried (not lost),
      // email send-failures are not double-sent.
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
            { customer_phone: r.customer_phone, customer_name: r.customer_name, business_name: r.business_name, start_time: r.start_time, reminder_number: r.reminder_number, customer_locale: locale },
            stubWhatsApp,
          );
          delivered = wa.delivered;
          if (delivered) whatsapp++;
          // Gated WhatsApp (delivered:false) sent nothing, so release the claim for retry
          // once the Meta template is wired.
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
        if (releaseClaim) {
          // Niets verstuurd (WhatsApp nog gated): verwijder de claim zodat een latere run
          // 'm opnieuw oppakt (E-2: niet markeren als verstuurd als geen kanaal afleverde).
          await supabase
            .from("booking_reminders_sent")
            .delete()
            .eq("booking_id", r.booking_id)
            .eq("reminder_number", r.reminder_number);
        }
        // Email-exception: claim BLIJFT staan (mogelijk al verstuurd) -> geen dubbele mail.
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
