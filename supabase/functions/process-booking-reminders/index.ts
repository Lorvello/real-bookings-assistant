import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// LR-R95: reminder-engine. Door pg_cron (via pg_net) periodiek aangeroepen: haalt de
// due reminders op (get_due_booking_reminders), stuurt per stuk een herinneringsmail
// en legt 'm vast in booking_reminders_sent. Claim-then-send + unique constraint
// voorkomen dubbel sturen, ook bij overlappende runs. DORMANT tot de cron-job is
// ingeschakeld (zie migratie-commentaar) — niets stuurt automatisch tot dan.
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const DAGEN = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];

function formatNL(iso: string, tz = "Europe/Amsterdam"): { datum: string; tijd: string } {
  try {
    const d = new Date(iso);
    const datum = `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
    const tijd = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
    return { datum, tijd };
  } catch {
    return { datum: iso, tijd: "" };
  }
}

function reminderHtml(name: string, business: string, service: string | null, datum: string, tijd: string, second: boolean) {
  const kop = second ? "Tot zo!" : "Herinnering aan je afspraak";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:36px 30px;text-align:center;">
        <h1 style="margin:0;font-size:24px;">${kop} ⏰</h1>
        <p style="margin:8px 0 0;opacity:.9;">${business}</p>
      </div>
      <div style="padding:32px 30px;color:#111827;">
        <p>Hoi ${name || "daar"},</p>
        <p>Dit is een herinnering aan je aankomende afspraak:</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          ${service ? `<tr><td style="padding:8px 0;color:#6b7280;">Dienst</td><td style="padding:8px 0;font-weight:600;text-align:right;">${service}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">Datum</td><td style="padding:8px 0;font-weight:600;text-align:right;">${datum}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">Tijd</td><td style="padding:8px 0;font-weight:600;text-align:right;">${tijd}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px;">Kun je niet? Neem dan tijdig contact op met ${business} om te annuleren of te verzetten.</p>
      </div>
      <div style="background:#f8fafc;padding:24px 30px;text-align:center;color:#9ca3af;font-size:13px;">
        <p style="margin:0;">Deze herinnering is verstuurd namens ${business}.</p>
      </div>
    </div>
  </body></html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Alleen de cron-job (via pg_net) mag dit draaien — het stuurt klant-mails. Zelfde
  // gedeelde-secret-patroon als whatsapp-payment-handler (x-internal-secret).
  const expectedSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!expectedSecret || req.headers.get("x-internal-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const onlyBookingId: string | undefined = body?.booking_id; // optioneel: scope voor veilig testen

    const { data: due, error } = await supabase.rpc("get_due_booking_reminders");
    if (error) throw new Error(`RPC: ${error.message}`);

    let reminders = (due || []) as Array<any>;
    if (onlyBookingId) reminders = reminders.filter((r) => r.booking_id === onlyBookingId);

    let sent = 0, skipped = 0, failed = 0;
    for (const r of reminders) {
      // Claim-then-send: insert eerst de dedup-rij. Lukt dat niet (al geclaimd door
      // een andere run), dan skippen we -> geen dubbele mail.
      const { error: claimErr } = await supabase
        .from("booking_reminders_sent")
        .insert({ booking_id: r.booking_id, reminder_number: r.reminder_number });
      if (claimErr) { skipped++; continue; }

      try {
        const { datum, tijd } = formatNL(r.start_time);
        const resp = await resend.emails.send({
          from: `${r.business_name} <noreply@bookingsassistant.com>`,
          to: [r.customer_email],
          subject: `Herinnering: je afspraak bij ${r.business_name}`,
          html: reminderHtml(r.customer_name, r.business_name, null, datum, tijd, r.reminder_number === 2),
        });
        if (resp.error) throw new Error(resp.error.message);
        sent++;
      } catch (e) {
        failed++;
        console.error(`Reminder-mail mislukt voor booking ${r.booking_id}:`, (e as any).message);
        // De claim blijft staan -> geen retry (acceptabel: liever een gemiste reminder
        // dan een dubbele/spam-mail).
      }
    }

    return new Response(JSON.stringify({ processed: reminders.length, sent, skipped, failed }), {
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
