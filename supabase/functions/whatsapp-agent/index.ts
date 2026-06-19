// whatsapp-agent — the AI WhatsApp bookings agent (port off n8n).
// Invoked by whatsapp-webhook (service-role, internal) after it has persisted the
// inbound message via process_whatsapp_message. Loads conversation history, runs a
// Gemini Flash-Lite tool-calling loop, replies via the Meta Graph API, and persists
// the outbound message.
//
// Body: { phone, calendar_id, message, contact_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { buildSystemPrompt, DEFAULT_WHATSAPP_WELCOME, type ServiceInfo } from "./prompt.ts";
import { createTools, fetchBusinessData } from "./tools.ts";
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

// Lightweight customer-language detection for a DETERMINISTIC language directive.
// gpt-5-mini reliably WRITES in a NAMED language but won't reliably DECIDE on its own to
// translate the Dutch greeting to e.g. German/French on the first turn (it does so for
// English but not consistently for others). So we detect the language server-side from the
// inbound message (high-signal stopwords + diacritics) and pass the name into the prompt.
// Returns a Dutch language name ("het Engels", …) for a CONFIDENT non-Dutch detection, else
// null (Dutch or unsure → no override; the <language>/<taal_check> rules handle those).
const LANG_WORDS: Record<string, string[]> = {
  en: ["the","you","i","to","a","for","would","like","can","could","please","want","book","appointment","hello","hi","hey","thanks","thank","my","name","is","at","on","afternoon","morning","evening","next","monday","tuesday","wednesday","thursday","friday","tomorrow","today","and","do","have","need","an","reschedule","cancel","change","move"],
  de: ["ich","möchte","gerne","einen","eine","am","um","bitte","termin","buchen","guten","tag","hallo","danke","mein","name","ist","nächsten","montag","dienstag","uhr","würde","hätte","für","und","der","die","das","nachmittag","morgen","heute","verschieben","absagen","können","kann","einen","gern"],
  fr: ["bonjour","je","voudrais","réserver","un","une","rendez","vous","lundi","mardi","après","midi","plaît","merci","mon","nom","est","pour","le","la","prochain","demain","aujourd","annuler","déplacer","heure","matin","soir","salut","aimerais"],
  es: ["hola","quiero","reservar","una","cita","lunes","martes","por","favor","gracias","mi","nombre","es","para","el","la","próximo","tarde","mañana","hoy","cancelar","cambiar","quisiera","necesito","puedo","buenas"],
  pt: ["olá","quero","reservar","um","agendamento","agendar","segunda","por","favor","obrigado","obrigada","meu","nome","para","próxima","tarde","amanhã","hoje","cancelar","remarcar","gostaria","queria","marcar","bom","dia"],
  it: ["ciao","buongiorno","vorrei","prenotare","un","appuntamento","lunedì","martedì","per","favore","grazie","mio","nome","prossimo","pomeriggio","domani","oggi","annullare","spostare","posso","ora","salve"],
  nl: ["ik","wil","wilt","graag","een","afspraak","maken","hoi","hallo","hey","bedankt","dank","mijn","naam","is","om","op","volgende","maandag","dinsdag","middag","ochtend","kan","kun","je","voor","en","morgen","vandaag","verzetten","annuleren","alsjeblieft","alstublieft"],
};
const LANG_NL_NAME: Record<string, string> = { en: "het Engels", de: "het Duits", fr: "het Frans", es: "het Spaans", pt: "het Portugees", it: "het Italiaans" };
function detectCustomerLanguage(msg: string): string | null {
  const text = (msg || "").toLowerCase();
  const tokens = new Set(text.replace(/[^\p{L}]+/gu, " ").trim().split(/\s+/).filter(Boolean));
  if (tokens.size === 0) return null;
  const scores: Record<string, number> = {};
  for (const [lang, words] of Object.entries(LANG_WORDS)) {
    let s = 0;
    for (const w of words) if (tokens.has(w)) s++;
    scores[lang] = s;
  }
  if (/[ß]/.test(text)) scores.de += 2;
  if (/[äöü]/.test(text)) scores.de += 1;
  if (/[ñ¿¡]/.test(text)) scores.es += 2;
  if (/[ãõ]/.test(text)) scores.pt += 2;
  if (/[çàèêœ]/.test(text)) scores.fr += 1;
  let best = "nl", bestScore = scores.nl ?? 0;
  for (const lang of Object.keys(LANG_WORDS)) {
    if ((scores[lang] ?? 0) > bestScore) { best = lang; bestScore = scores[lang]; }
  }
  // Confident NON-Dutch only: need >=2 signal words and a strict margin over Dutch.
  if (best === "nl" || bestScore < 2 || (scores.nl ?? 0) >= bestScore) return null;
  return LANG_NL_NAME[best] ?? null;
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

    // Fetch ALL set business info once and inject it into the system prompt every turn
    // (see prompt.ts <business_data>), so the agent always has the truth in context and
    // never answers an info question without it (which caused false "no info" + a
    // hallucinated handle). fetchBusinessData also resolves a "other" business type.
    const businessData = await fetchBusinessData(supabase, businessUserId);
    const businessType = (businessData?.business_type as string | null) ?? null;

    const { data: svcRows } = await supabase
      .from("service_types")
      .select("id, name, duration, price")
      .eq("calendar_id", calendar_id);
    const services: ServiceInfo[] = ((svcRows as Array<{ id: string; name: string; duration: number; price: number | null }>) ?? [])
      .map((s) => ({ id: s.id, name: s.name, durationMin: s.duration, price: s.price }));

    // Per-calendar custom welcome greeting (NULL → default template in prompt.ts).
    const { data: cs } = await supabase
      .from("calendar_settings")
      .select("whatsapp_welcome_message")
      .eq("calendar_id", calendar_id)
      .maybeSingle();
    const rawWelcome = (cs as { whatsapp_welcome_message?: string | null } | null)?.whatsapp_welcome_message ?? null;

    const { data: contact } = await supabase
      .from("whatsapp_contacts")
      .select("id, first_name")
      .eq("phone_number", phone)
      .maybeSingle();
    const contactId = (contact as { id?: string } | null)?.id ?? null;

    let conversationId: string | null = null;
    let convContext: Record<string, unknown> = {};
    let history: Array<{ direction: string; content: string | null }> = [];
    if (contactId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id, context")
        .eq("calendar_id", calendar_id)
        .eq("contact_id", contactId)
        .maybeSingle();
      conversationId = (conv as { id?: string } | null)?.id ?? null;
      convContext = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
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
    const businessName = (businessData?.business_name as string | null) ?? "ons bedrijf";

    // First contact = the greeting has not yet fired in this conversation. We persist a
    // durable `greeting_sent` flag in the conversation context (set after the first reply)
    // so detection does NOT depend on the outbound message being persisted+loaded into the
    // 12-message history window. This makes the welcome fire exactly ONCE even under a
    // two-rapid-messages race or a transient history-load miss. The history check is kept
    // as a backward-compatible fallback for conversations that greeted before the flag existed.
    const greetingAlreadySent = convContext.greeting_sent === true;
    const isFirstContact = !greetingAlreadySent && !history.some((m) => m.direction === "outbound");
    const welcomeMessage = (rawWelcome && rawWelcome.trim() ? rawWelcome : DEFAULT_WHATSAPP_WELCOME)
      .replace(/\{bedrijf\}/g, businessName);

    // Detect the customer's language from THIS message; fall back to the language detected
    // earlier in this conversation (so a short later message like "ok"/"ja" keeps the thread's
    // language). null = Dutch or unsure → no override (the prompt's own language rules apply).
    const detectedThisMsg = detectCustomerLanguage(String(message));
    const customerLanguage = detectedThisMsg ??
      (typeof convContext.detected_language === "string" ? convContext.detected_language : null);

    const now = new Date();
    const system = buildSystemPrompt({
      businessName,
      businessType,
      currentTimeNL: nlTime(now),
      todayISO: now.toISOString().slice(0, 10),
      customerFirstName: knownName && knownName !== "Privé" ? knownName : null,
      nameRefused: knownName === "Privé",
      lastService,
      services,
      welcomeMessage,
      isFirstContact,
      businessData,
      customerLanguage,
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

    // Cancel confirmation, detected server-side (the small model won't reliably set
    // confirmed:true on the "yes" turn). If a cancel preview from a PREVIOUS turn is still
    // pending+fresh AND this message clearly affirms (and doesn't decline/reschedule), drive
    // the commit deterministically via ctx.confirmCancel. Fail-safe: a non-affirmative reply
    // never commits, and the 15-min freshness bounds any stray-"ja" mis-fire.
    const pc = convContext.pending_cancel as { at?: number } | undefined;
    const pendingFresh = !!pc && (typeof pc.at !== "number" || (Date.now() - pc.at) < 15 * 60 * 1000);
    const msgLower = String(message).toLowerCase();
    const AFFIRM_RE = /\b(ja|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|annuleer|annuleren|cancel|klopt|inderdaad|verwijder|akkoord)\b/i;
    const NEGATE_RE = /\b(nee|neen|no|niet|liever niet|toch niet|verzet|verzetten|reschedule|verplaats|hou|houd|behoud|laat maar|ander|andere|nieuwe tijd)\b/i;
    const confirmCancel = pendingFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower);

    // --- Run the agent ---
    const { decls, execute } = createTools(supabase, { calendarId: calendar_id, phone, businessUserId, conversationId, confirmCancel });
    let result = await runAgent({ system, contents, tools: decls, execute, maxSteps: 6, temperature: 0.2 });

    // Safety net for "announce-then-stop": gpt-5-mini sometimes emits a mid-action filler
    // ("ik check even / momentje / one moment / ich prüfe …") and ends the turn WITHOUT
    // calling a tool, which stalls the conversation. If this turn made no tool call, reads
    // like such a filler, and asks nothing, nudge the model once to actually perform it.
    const ANNOUNCE_RE = /\b(check(ing)?|checken|zoek(en)?|moment(je|o|ito)?|even geduld|regel het|ga (ik )?(even )?(kijken|checken|zoeken|na)|kijk even|let me (check|see|find)|one moment|hold on|ich (check|prüfe|schaue|sehe)|einen moment|je (vérifie|regarde|cherche)|un instant|un momento)\b/i;
    // "action" tools = the ones that should follow an action-announcement. Calling only
    // update_lead (saving a name) and THEN announcing "ik zoek even" is still a stall.
    const ACTION_TOOLS = new Set(["get_available_slots", "book_appointment", "cancel_appointment", "reschedule_appointment"]);
    const calledAction = result.toolCalls.some((t) => ACTION_TOOLS.has(t.name));
    const looksLikeStall = !calledAction &&
      !!result.text && ANNOUNCE_RE.test(result.text) && !result.text.includes("?");

    // Cancel-preview-by-talking: the customer asked to cancel but the model produced
    // the confirm question in prose WITHOUT calling cancel_appointment, so no
    // pending_cancel marker was set -> the customer's next "yes" re-previews instead
    // of committing (they must confirm twice). Two-phase cancel is server-driven, so
    // the marker MUST exist: force the preview tool. Skipped on a decline (NEGATE_RE)
    // and on the confirmation turn (pendingFresh) so it never double-fires.
    const calledCancel = result.toolCalls.some((t) => t.name === "cancel_appointment");
    const cancelIntent = /\b(annuleer|annuleren|cancel|annuler|annulla|annullare|stornier|afzeggen|cancelar)\b/i.test(msgLower);
    const cancelPreviewMissed = cancelIntent && !calledCancel && !pendingFresh && !NEGATE_RE.test(msgLower);

    // Confirm-then-stall: the customer gives a bare affirmation ("ja", "ja graag") to an
    // action the model proposed (typically a reschedule it offered to do), but the model
    // asks ANOTHER question / only re-checks availability instead of calling the MUTATING
    // tool -> the action never executes and the customer must repeat themselves. Nudge once
    // to perform it. Note: calling get_available_slots (a READ) does NOT count as doing the
    // action, so this fires even when calledAction is true. All mutating tools are
    // server-guarded (book refuses a double, reschedule re-validates, cancel previews), so a
    // stray nudge can never produce a wrong outcome.
    const MUTATION_TOOLS = new Set(["book_appointment", "cancel_appointment", "reschedule_appointment"]);
    // A mutation only "counts" if it SUCCEEDED. The model sometimes calls book_appointment on
    // a reschedule-confirm turn; the duplicate guard refuses it (no double-book) but the
    // reschedule never happens — so an ERRORED mutation must NOT suppress the nudge.
    const isErr = (r: unknown) => !!r && typeof r === "object" && "error" in (r as Record<string, unknown>);
    const succeededMutation = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result));
    const bareAffirm = /^\s*(ja|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|klopt|akkoord|is goed)\b/i.test(msgLower) && !NEGATE_RE.test(msgLower);
    const confirmStall = !succeededMutation && bareAffirm && !cancelPreviewMissed && !confirmCancel &&
      !!result.text && result.text.includes("?");

    if (looksLikeStall || cancelPreviewMissed || confirmStall) {
      const nudgeText = cancelPreviewMissed
        ? "[systeem] De klant wil annuleren maar je riep cancel_appointment niet aan. Roep NU cancel_appointment aan (ZONDER confirmed) om de exacte afspraak terug te lezen en om bevestiging te vragen — beschrijf de annulering nooit in tekst zonder de tool aan te roepen."
        : confirmStall
        ? "[systeem] De klant bevestigde de zojuist voorgestelde actie. Voer 'm NU uit met de juiste tool (meestal reschedule_appointment naar het EXACTE tijdstip dat jij net voorstelde of dat de klant noemde — herbereken de tijd NIET zelf, gebruik letterlijk dat tijdstip; anders book_appointment of cancel_appointment). Stel geen extra vraag en kondig niets aan — antwoord met het resultaat."
        : "[systeem] Je kondigde een actie aan maar voerde 'm niet uit en riep geen tool aan. Voer de actie NU uit: roep direct de juiste tool aan (get_available_slots / book_appointment / reschedule_appointment / cancel_appointment) en antwoord met het resultaat, in de taal van de klant. Stuur geen 'ik check even'-bericht.";
      const nudged: Content[] = [
        ...contents,
        { role: "model", parts: [{ text: result.text }] },
        { role: "user", parts: [{ text: nudgeText }] },
      ];
      const retry = await runAgent({ system, contents: nudged, tools: decls, execute, maxSteps: 6, temperature: 0.2 });
      // For confirmStall, only adopt the retry if it actually performed a mutation (else keep
      // the original); for the other cases, adopt on any tool call or a non-filler reply.
      const accept = !!retry.text && (
        confirmStall
          ? retry.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result))
          : (retry.toolCalls.length > 0 || !ANNOUNCE_RE.test(retry.text))
      );
      if (accept) {
        result = retry;
      }
    }

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
      // Durably mark that the welcome has fired so it never repeats on later turns,
      // independent of message-history loading. Also persist the detected language so a
      // later short message inherits the thread's language. Merge into context (don't clobber).
      const ctxUpdate: Record<string, unknown> = {};
      if (isFirstContact && !greetingAlreadySent) ctxUpdate.greeting_sent = true;
      if (detectedThisMsg && detectedThisMsg !== convContext.detected_language) {
        ctxUpdate.detected_language = detectedThisMsg;
      }
      if (Object.keys(ctxUpdate).length > 0) {
        await supabase
          .from("whatsapp_conversations")
          .update({ context: { ...convContext, ...ctxUpdate } })
          .eq("id", conversationId);
      }
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
