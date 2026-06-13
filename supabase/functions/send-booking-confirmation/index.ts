import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// LR-R57: bevestigingsmail voor (web)boekingen. Web-klanten hebben geen WhatsApp-chat
// waarin de agent bevestigt, dus zonder dit krijgen ze NIETS (kernvraag 4). Wordt
// fire-and-forget aangeroepen door create-booking na een geslaagde insert.
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const DAGEN = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];

function formatNL(iso: string, tz: string): { datum: string; tijd: string } {
  try {
    const d = new Date(iso);
    const dag = DAGEN[d.getDay()];
    const datum = `${dag} ${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
    const tijd = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: tz || "Europe/Amsterdam" }).format(d);
    return { datum, tijd };
  } catch {
    return { datum: iso, tijd: "" };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, to_override } = await req.json();
    if (!booking_id) throw new Error("booking_id is verplicht");

    // 1. Boeking ophalen
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, calendar_id, service_type_id, customer_name, customer_email, start_time, end_time, service_name, status")
      .eq("id", booking_id)
      .single();
    if (bErr || !booking) throw new Error(`Boeking niet gevonden: ${bErr?.message}`);

    const to = to_override || booking.customer_email;
    if (!to) {
      return new Response(JSON.stringify({ skipped: true, reason: "geen klant-e-mailadres" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Bedrijfs- + dienstcontext uit business_overview (1 query, agent-kennis-tabel)
    const { data: bo } = await supabase
      .from("business_overview")
      .select("business_name, timezone, business_city, business_street, business_number")
      .eq("calendar_id", booking.calendar_id)
      .maybeSingle();

    let serviceName = booking.service_name as string | null;
    if (!serviceName && booking.service_type_id) {
      const { data: st } = await supabase.from("service_types").select("name").eq("id", booking.service_type_id).maybeSingle();
      serviceName = st?.name ?? null;
    }

    const businessName = bo?.business_name || "Onze zaak";
    const tz = bo?.timezone || "Europe/Amsterdam";
    const { datum, tijd } = formatNL(booking.start_time, tz);
    const adres = [bo?.business_street, bo?.business_number].filter(Boolean).join(" ") + (bo?.business_city ? `, ${bo.business_city}` : "");

    // 3. Mail versturen (geverifieerd domein bookingsassistant.com)
    const emailResp = await resend.emails.send({
      from: `${businessName} <noreply@bookingsassistant.com>`,
      to: [to],
      subject: `Bevestiging van je afspraak bij ${businessName}`,
      html: `
        <!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
          <div style="max-width:600px;margin:0 auto;background:#fff;">
            <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:36px 30px;text-align:center;">
              <h1 style="margin:0;font-size:26px;">Afspraak bevestigd ✅</h1>
              <p style="margin:8px 0 0;opacity:.9;">${businessName}</p>
            </div>
            <div style="padding:32px 30px;color:#111827;">
              <p>Hoi ${booking.customer_name || "daar"},</p>
              <p>Je afspraak is bevestigd. Hier zijn de details:</p>
              <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                ${serviceName ? `<tr><td style="padding:8px 0;color:#6b7280;">Dienst</td><td style="padding:8px 0;font-weight:600;text-align:right;">${serviceName}</td></tr>` : ""}
                <tr><td style="padding:8px 0;color:#6b7280;">Datum</td><td style="padding:8px 0;font-weight:600;text-align:right;">${datum}</td></tr>
                <tr><td style="padding:8px 0;color:#6b7280;">Tijd</td><td style="padding:8px 0;font-weight:600;text-align:right;">${tijd}</td></tr>
                ${adres.trim() && adres.trim() !== "," ? `<tr><td style="padding:8px 0;color:#6b7280;">Locatie</td><td style="padding:8px 0;font-weight:600;text-align:right;">${adres}</td></tr>` : ""}
              </table>
              <p style="color:#6b7280;font-size:14px;">Kun je niet? Neem dan tijdig contact op met ${businessName} om te annuleren of te verzetten.</p>
            </div>
            <div style="background:#f8fafc;padding:24px 30px;text-align:center;color:#9ca3af;font-size:13px;">
              <p style="margin:0;">Deze bevestiging is verstuurd namens ${businessName}.</p>
            </div>
          </div>
        </body></html>`,
    });

    if (emailResp.error) throw new Error(`Resend: ${emailResp.error.message}`);

    return new Response(JSON.stringify({ success: true, id: emailResp.data?.id, to }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-booking-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
