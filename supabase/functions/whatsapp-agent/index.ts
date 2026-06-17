// whatsapp-agent — the AI WhatsApp bookings agent (port off n8n).
// Invoked by whatsapp-webhook (service-role, internal) after it has persisted the
// inbound message via process_whatsapp_message. Loads conversation history, runs a
// Gemini Flash-Lite tool-calling loop, replies via the Meta Graph API, and persists
// the outbound message.
//
// Body: { phone, calendar_id, message, contact_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { buildSystemPrompt, type ServiceInfo } from "./prompt.ts";
import { createTools } from "./tools.ts";
import { runAgent, type Content } from "./llm.ts";
import { sendWhatsAppText } from "../_shared/whatsappSend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function nlTime(d: Date): string {
  const tz = "Europe/Amsterdam";
  const time = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const day = d.toLocaleDateString("nl-NL", { weekday: "long", timeZone: tz });
  const month = d.toLocaleDateString("nl-NL", { month: "long", timeZone: tz });
  return `${time} ${day} ${month} ${d.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { phone, calendar_id, message, contact_name } = await req.json();
    if (!phone || !calendar_id || !message) {
      return new Response(JSON.stringify({ error: "phone, calendar_id, message vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // --- Load context (own loader; get_conversation_context RPC is buggy) ---
    const { data: cal } = await supabase.from("calendars").select("user_id").eq("id", calendar_id).maybeSingle();
    const businessUserId = (cal as { user_id?: string } | null)?.user_id ?? "";

    const { data: biz } = await supabase
      .from("business_overview_v2")
      .select("business_name, business_type")
      .eq("user_id", businessUserId)
      .maybeSingle();

    const { data: svcRows } = await supabase
      .from("service_types")
      .select("id, name, duration, price")
      .eq("calendar_id", calendar_id);
    const services: ServiceInfo[] = ((svcRows as Array<{ id: string; name: string; duration: number; price: number | null }>) ?? [])
      .map((s) => ({ id: s.id, name: s.name, durationMin: s.duration, price: s.price }));

    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("id, first_name")
      .eq("phone_number", phone)
      .maybeSingle();
    const contactId = (contact as { id?: string } | null)?.id ?? null;

    let conversationId: string | null = null;
    let history: Array<{ direction: string; content: string | null }> = [];
    if (contactId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("calendar_id", calendar_id)
        .eq("contact_id", contactId)
        .maybeSingle();
      conversationId = (conv as { id?: string } | null)?.id ?? null;
      if (conversationId) {
        const { data: msgs } = await supabase
          .from("whatsapp_messages")
          .select("direction, content, created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: false })
          .limit(12);
        history = ((msgs as Array<{ direction: string; content: string | null; created_at: string }>) ?? []).reverse();
      }
    }

    // Returning customer's last service (for "same as last time?" verification)
    const { data: lastB } = await supabase
      .from("bookings")
      .select("start_time, service_types(name)")
      .eq("customer_phone", phone)
      .order("start_time", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastService = (lastB as { service_types?: { name?: string } } | null)?.service_types?.name ?? null;

    const knownName = (contact as { first_name?: string } | null)?.first_name ?? contact_name ?? null;
    const now = new Date();
    const system = buildSystemPrompt({
      businessName: (biz as { business_name?: string } | null)?.business_name ?? "ons bedrijf",
      businessType: (biz as { business_type?: string } | null)?.business_type ?? null,
      currentTimeNL: nlTime(now),
      todayISO: now.toISOString().slice(0, 10),
      customerFirstName: knownName && knownName !== "Privé" ? knownName : null,
      nameRefused: knownName === "Privé",
      lastService,
      services,
    });

    // Build conversation turns. History already ends with the current inbound message
    // (persisted by the webhook). Fallback: seed with the message param if empty.
    const contents: Content[] = history
      .map((m): Content => ({
        role: m.direction === "outbound" ? "model" : "user",
        parts: [{ text: m.content ?? "" }],
      }))
      .filter((c) => (c.parts[0] as { text: string }).text.length > 0);
    if (!contents.some((c) => c.role === "user")) {
      contents.push({ role: "user", parts: [{ text: String(message) }] });
    }

    // --- Run the agent ---
    const { decls, execute } = createTools(supabase, { calendarId: calendar_id, phone, businessUserId });
    const result = await runAgent({ system, contents, tools: decls, execute, maxSteps: 6, temperature: 0.4 });
    const reply = result.text || "Sorry, daar ging even iets mis. Kun je het nog een keer sturen? 🙏";

    // --- Reply + persist outbound ---
    const send = await sendWhatsAppText(phone, reply);
    if (conversationId) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        message_id: send.messageId ?? `agent-${now.getTime()}`,
        direction: "outbound",
        message_type: "text",
        content: reply,
        status: send.ok ? "sent" : "failed",
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reply,
        sent: send.ok,
        steps: result.steps,
        toolCalls: result.toolCalls.map((t) => t.name),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("whatsapp-agent error:", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
