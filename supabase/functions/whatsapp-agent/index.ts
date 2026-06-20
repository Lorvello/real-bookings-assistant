// whatsapp-agent — the AI WhatsApp bookings agent (port off n8n).
// Invoked by whatsapp-webhook (service-role, internal) after it has persisted the
// inbound message via process_whatsapp_message. Loads conversation history, runs a
// Gemini Flash-Lite tool-calling loop, replies via the Meta Graph API, and persists
// the outbound message.
//
// Body: { phone, calendar_id, message, contact_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { buildSystemPrompt, DEFAULT_WHATSAPP_WELCOME, type ServiceInfo } from "./prompt.ts";
import { createTools, fetchBusinessData, getCalendarWeeklyHours } from "./tools.ts";
import { runAgent, type Content } from "./llm.ts";
import { sendWhatsAppText } from "../_shared/whatsappSend.ts";
import { sanitizeReply } from "../_shared/sanitizeReply.ts";

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

// Deterministic concrete-date calendar for the next 14 days, built server-side from the
// business's opening hours. The model reads the date + open/closed off this table instead
// of computing a relative date ("aanstaande zondag") or deciding "is that day open?" itself
// (both failed live: it asked "welke zondag bedoel je?" and offered a closed Sunday). This
// removes the date reasoning from the model entirely.
function buildCalendarHint(now: Date, byDay: Record<string, { open: boolean; start?: string; end?: string }> | null): string | null {
  if (!byDay) return null;
  const tz = "Europe/Amsterdam";
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD in Amsterdam
  const [y, m, d] = todayStr.split("-").map(Number);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const lines: string[] = [];
  for (let i = 0; i < 14; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 11, 0, 0)); // 11:00 UTC = mid-day Amsterdam (date-safe across DST)
    const dutchDay = cap(dt.toLocaleDateString("nl-NL", { weekday: "long", timeZone: tz }));
    const label = dt.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
    const iso = dt.toLocaleDateString("en-CA", { timeZone: tz });
    const st = byDay[dutchDay];
    const status = st?.open ? `open ${st.start}-${st.end}` : "GESLOTEN";
    const mark = i === 0 ? " (vandaag)" : i === 1 ? " (morgen)" : "";
    lines.push(`- ${label} [${iso}]: ${status}${mark}`);
  }
  return lines.join("\n");
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
  es: ["hola","quiero","reservar","una","cita","lunes","martes","por","favor","gracias","mi","nombre","es","para","el","la","próximo","tarde","mañana","hoy","cancelar","cambiar","quisiera","necesito","puedo","buenas","cuanto","cuesta","corte","pelo","precio","abris","abren","abre","cuando","donde","hora","horas","gustaria","peluqueria","quisiera"],
  pt: ["olá","quero","reservar","um","agendamento","agendar","segunda","por","favor","obrigado","obrigada","meu","nome","para","próxima","tarde","amanhã","hoje","cancelar","remarcar","gostaria","queria","marcar","bom","dia","quanto","custa","corte","cabelo","preço","horas","quando","onde","você","sim","não","abrem","abre","fazer","cabeleireiro","marcação"],
  it: ["ciao","buongiorno","vorrei","prenotare","un","appuntamento","lunedì","martedì","per","favore","grazie","mio","nome","prossimo","pomeriggio","domani","oggi","annullare","spostare","posso","ora","salve","quanto","costa","taglio","capelli","quando","dove","aperto","orario","quanto","barbiere"],
  nl: ["ik","wil","wilt","graag","een","afspraak","maken","hoi","hallo","hey","bedankt","dank","mijn","naam","is","om","op","volgende","maandag","dinsdag","middag","ochtend","kan","kun","je","voor","en","morgen","vandaag","verzetten","annuleren","alsjeblieft","alstublieft"],
};
const LANG_NL_NAME: Record<string, string> = { en: "het Engels", de: "het Duits", fr: "het Frans", es: "het Spaans", pt: "het Portugees", it: "het Italiaans" };
function detectCustomerLanguage(msg: string): string | null {
  const text = (msg || "").toLowerCase();
  // Strip diacritics for word matching so casual accent-less typing still scores ("ola"≈"olá",
  // "manana"≈"mañana", "preco"≈"preço"). The accent SIGNAL checks below still use the raw text.
  const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const tokens = new Set(strip(text).replace(/[^\p{L}]+/gu, " ").trim().split(/\s+/).filter(Boolean));
  if (tokens.size === 0) return null;
  const scores: Record<string, number> = {};
  for (const [lang, words] of Object.entries(LANG_WORDS)) {
    let s = 0;
    for (const w of words) if (tokens.has(strip(w))) s++;
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
    // Latency: these reads were sequential (~8 round-trips ≈ 250-400ms of pure wait).
    // They are now batched into 3 dependency phases so independent reads run in parallel.
    // Phase 1 — everything that needs only (calendar_id, phone):
    const [calRes, svcRes, csRes, contactRes, lastBRes, weeklyHours] = await Promise.all([
      supabase.from("calendars").select("user_id").eq("id", calendar_id).maybeSingle(),
      supabase.from("service_types").select("id, name, duration, price, description").eq("calendar_id", calendar_id),
      supabase.from("calendar_settings").select("whatsapp_welcome_message").eq("calendar_id", calendar_id).maybeSingle(),
      // NOTE: whatsapp_contacts is GLOBALLY UNIQUE by phone_number (no calendar_id column),
      // so first_name here is cross-tenant — the per-(calendar_id, phone) name scoping that
      // kills the R3 bleed is handled separately via conversation context (see knownName below).
      supabase.from("whatsapp_contacts").select("id, first_name").eq("phone_number", phone).maybeSingle(),
      supabase.from("bookings").select("start_time, service_types(name)")
        .eq("customer_phone", phone).eq("calendar_id", calendar_id)
        .order("start_time", { ascending: false }).limit(1).maybeSingle(),
      // Bookable weekly hours for THIS calendar (availability_rules) — the SAME source slots use.
      // Drives both the spoken opening hours AND the concrete-date calendar, so the agent never
      // says a day is open/closed differently from what it can actually book. In parallel, no
      // added latency. Independent of (user_id, contact_id) so it belongs in this phase.
      getCalendarWeeklyHours(supabase, calendar_id),
    ]);

    const cal = calRes.data;
    const businessUserId = (cal as { user_id?: string } | null)?.user_id ?? "";

    const services: ServiceInfo[] = ((svcRes.data as Array<{ id: string; name: string; duration: number; price: number | null; description: string | null }>) ?? [])
      .map((s) => ({ id: s.id, name: s.name, durationMin: s.duration, price: s.price, description: s.description }));

    // Per-calendar custom welcome greeting (NULL → default template in prompt.ts).
    const rawWelcome = (csRes.data as { whatsapp_welcome_message?: string | null } | null)?.whatsapp_welcome_message ?? null;

    const contact = contactRes.data;
    const contactId = (contact as { id?: string } | null)?.id ?? null;

    // Returning customer's last service (for "same as last time?" verification),
    // scoped to THIS calendar (a customer's history at another business is irrelevant here).
    const lastService = (lastBRes.data as { service_types?: { name?: string } } | null)?.service_types?.name ?? null;

    // Phase 2 — reads that depend on phase 1 (business data needs user_id; conversation
    // needs contact_id). Independent of each other → run in parallel.
    const [businessData, conv] = await Promise.all([
      // Fetch ALL set business info once and inject it into the system prompt every turn
      // (see prompt.ts <business_data>), so the agent always has the truth in context and
      // never answers an info question without it (which caused false "no info" + a
      // hallucinated handle). fetchBusinessData also resolves a "other" business type.
      fetchBusinessData(supabase, businessUserId),
      contactId
        ? supabase.from("whatsapp_conversations").select("id, context")
            .eq("calendar_id", calendar_id).eq("contact_id", contactId).maybeSingle()
            .then((r) => r.data as { id?: string; context?: Record<string, unknown> } | null)
        : Promise.resolve(null),
    ]);
    const businessType = (businessData?.business_type as string | null) ?? null;

    const conversationId: string | null = (conv as { id?: string } | null)?.id ?? null;
    const convContext: Record<string, unknown> = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};

    // Phase 3 — message history (needs conversation_id).
    let history: Array<{ direction: string; content: string | null }> = [];
    if (conversationId) {
      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("direction, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(12);
      history = ((msgs as Array<{ direction: string; content: string | null; created_at: string }>) ?? []).reverse();
    }

    // Booking name, scoped per (calendar_id, phone) to KILL the R3 cross-tenant name bleed:
    // the source of truth is THIS conversation's context (booking_name / name_refused),
    // never the globally-unique whatsapp_contacts row (which any business can overwrite).
    // Default for a fresh conversation = the WhatsApp profile display name (contact_name,
    // a customer-level value, so safe), which the agent confirms at booking instead of
    // pestering for a name mid-flow.
    const scopedName = typeof convContext.booking_name === "string" && convContext.booking_name.trim()
      ? convContext.booking_name.trim() : null;
    const scopedRefused = convContext.name_refused === true;
    const waName = contact_name && contact_name !== "Privé" ? String(contact_name).trim() : null;
    const knownName = scopedRefused ? "Privé" : (scopedName ?? waName ?? null);
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
    // Single source of truth for opening hours = the BOOKABLE schedule of THIS calendar
    // (availability_rules, via getCalendarWeeklyHours). Override the spoken hours that
    // fetchBusinessData derived from the separate, often-stale business_overview.calendars[0]
    // JSON, and build the concrete-date <kalender> from the same source — so "what the agent
    // says is open" always equals "what it can actually book". Fall back to the old struct only
    // if this calendar has no availability schedule at all.
    if (weeklyHours?.text && businessData) businessData.opening_hours = weeklyHours.text;
    const openingStruct = weeklyHours?.byDay ??
      ((businessData?.opening_hours_struct as Record<string, { open: boolean; start?: string; end?: string }> | null) ?? null);
    const calendarHint = buildCalendarHint(now, openingStruct);
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
      calendarHint,
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
    // Affirmation across the agent's languages (NL/EN/DE/FR/ES/PT/IT). Only consulted when a
    // proposal is already pending (confirmCancel/confirmBook), so a short "oui"/"sí"/"sim" in
    // that context is a confirmation, not ambiguous. (FR "oui" was missing → French confirms stalled.)
    const AFFIRM_RE = /\b(ja|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|annuleer|annuleren|cancel|klopt|inderdaad|verwijder|akkoord|oui|ouais|sí|sì|si|sim|certo|claro|perfetto|parfait|genau|gerne|bitte)\b/i;
    const NEGATE_RE = /\b(nee|neen|no|niet|liever niet|toch niet|verzet|verzetten|reschedule|verplaats|hou|houd|behoud|laat maar|ander|andere|nieuwe tijd)\b/i;
    // A hypothetical / policy QUESTION that merely contains a cancel word ("krijg ik geld terug als ik
    // annuleer?", "wat is het annuleringsbeleid?", "wat als ik afzeg?") must NEVER arm or commit a real
    // cancellation — it's an info question, answered from <business_data>. Without this, asking about the
    // refund policy armed a cancel and the next "ja" destroyed the booking (adversarial finding).
    const cancelPolicyQuestion = /\b(beleid|policy|terugbetaling|terug ?betaald|geld terug|refund|kosten|hoeveel|als ik|wat als|stel dat|wat gebeurt|hoe zit het|wanneer kan ik)\b/i.test(msgLower);
    const confirmCancel = pendingFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelPolicyQuestion;

    // Booking confirmation, detected server-side (mirrors confirmCancel). A NEW booking is
    // two-phase: the first book_appointment call only PREVIEWS (stores a pending_booking
    // proposal, NO insert), so an accidental immediate booking is impossible and the customer
    // can correct the name/time first. When a fresh proposal exists AND the customer affirms
    // (and isn't cancelling), drive the COMMIT deterministically via ctx.confirmBook — the
    // commit uses the SERVER-STORED exact start_time, which also kills the model's
    // time-reconstruction bug (it once booked 12:00 for a confirmed 10:00).
    const pbk = convContext.pending_booking as { at?: number } | undefined;
    const pendingBookFresh = !!pbk && (typeof pbk.at !== "number" || (Date.now() - pbk.at) < 15 * 60 * 1000);
    const cancelWord = /\b(annuleer|annuleren|cancel|afzeggen)\b/i.test(msgLower);
    const confirmBook = pendingBookFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelWord && !confirmCancel;

    // --- Run the agent ---
    const { decls, execute } = createTools(supabase, { calendarId: calendar_id, phone, businessUserId, conversationId, confirmCancel, confirmBook, userMessage: String(message) });
    let result = await runAgent({ system, contents, tools: decls, execute, maxSteps: 6, temperature: 0.2 });

    // Safety net for "announce-then-stop": gpt-5-mini sometimes emits a mid-action filler
    // ("ik check even / momentje / one moment / ich prüfe …") and ends the turn WITHOUT
    // calling a tool, which stalls the conversation. If this turn made no tool call, reads
    // like such a filler, and asks nothing, nudge the model once to actually perform it.
    const ANNOUNCE_RE = /\b(check(ing)?|checken|zoek(en)?|moment(je|o|ito)?|even geduld|regel (het|even|dat|meteen)|ga (ik )?(even )?(kijken|checken|zoeken|na)|kijk even|ik (kijk|check|controleer|haal|roep|regel)\b|even (kijken|checken|ophalen|oproepen|opvragen)|geef me (even|één|een|\d)|seconde|(tijden|beschikbaarheid)[\w\s]{0,15}(op|na)|let me (check|see|find)|one (moment|second)|hold on|ich (check|prüfe|schaue|sehe)|einen moment|je (vérifie|regarde|cherche)|un instant|un momento)\b/i;
    // A stall = the model ANNOUNCED a filler but didn't actually ACT. "Acting" = calling a
    // MUTATION/preview tool (book/cancel/reschedule). Calling only a READ (get_available_slots
    // / get_business_data) and then saying "ik regel even / geef me een seconde" WITHOUT
    // proceeding to the preview IS a stall (it offset the whole booking flow live).
    const calledMutationTool = result.toolCalls.some((t) =>
      t.name === "book_appointment" || t.name === "cancel_appointment" || t.name === "reschedule_appointment");
    const looksLikeStall = !calledMutationTool &&
      !!result.text && ANNOUNCE_RE.test(result.text) && !result.text.includes("?");

    // Cancel-preview-by-talking: the customer asked to cancel but the model produced
    // the confirm question in prose WITHOUT calling cancel_appointment, so no
    // pending_cancel marker was set -> the customer's next "yes" re-previews instead
    // of committing (they must confirm twice). Two-phase cancel is server-driven, so
    // the marker MUST exist: force the preview tool. Skipped on a decline (NEGATE_RE)
    // and on the confirmation turn (pendingFresh) so it never double-fires.
    const calledCancel = result.toolCalls.some((t) => t.name === "cancel_appointment");
    const cancelIntent = /\b(annuleer|annuleren|cancel|annuler|annulla|annullare|stornier|afzeggen|cancelar)\b/i.test(msgLower) && !cancelPolicyQuestion;
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
    // reschedule never happens — so an ERRORED mutation must NOT suppress the nudge. A PREVIEW
    // (needs_confirmation: book/cancel awaiting confirm) is likewise NOT a completed mutation.
    const isErr = (r: unknown) => !!r && typeof r === "object" &&
      ("error" in (r as Record<string, unknown>) || "needs_confirmation" in (r as Record<string, unknown>));
    const succeededMutation = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result));
    const bareAffirm = /^\s*(ja|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|klopt|akkoord|is goed|oui|ouais|sí|sì|si|sim|certo|claro|perfetto|parfait)\b/i.test(msgLower) && !NEGATE_RE.test(msgLower);
    const confirmStall = !succeededMutation && bareAffirm && !cancelPreviewMissed && !confirmCancel &&
      !!result.text && result.text.includes("?");

    // Book-preview-by-talking (mirrors cancelPreviewMissed): the model NARRATED a new-booking
    // preview ("ik zet/boek een afspraak ... klopt dat?") but did NOT call book_appointment, so
    // no pending_booking proposal exists and the customer's next "ja" has nothing to commit.
    // Force the preview tool. Scoped so it never fires on a reschedule, a cancel, or when a
    // proposal already exists / a booking was already committed this turn.
    const calledBook = result.toolCalls.some((t) => t.name === "book_appointment");
    const bookPreviewLang = /\b(ik (zet|boek|plan|reserveer)\b|zal ik .{0,25}(boeken|inplannen|reserveren)|ik (boek|plan|reserveer) (je|het|'t|een|de))/i;
    // Prefix match (no trailing \b) so conjugations match too: "verzet", "verzetten", "verzette",
    // "verschuiven", "verplaatsen". A trailing \b made it miss "verzetten" (the form the model uses).
    const reschedLang = /\b(verzet|verschuif|verplaats|schuif|reschedule|opschuif|verschoven|reschedul)/i;
    const bookPreviewMissed = !calledMutationTool && !calledBook && !!result.text &&
      bookPreviewLang.test(result.text) && !reschedLang.test(result.text) &&
      !pendingBookFresh && !cancelIntent && !confirmCancel;

    // Reschedule-announce-by-talking: the model says it will move the appointment to a CONCRETE new
    // time but doesn't call reschedule_appointment (it treats the move as needing a separate "oké?"
    // confirm). Goal: a clear new time IS the confirmation → ONE mutating call. So when the model's
    // text announces a reschedule to a concrete time/date yet no mutation ran, nudge it to actually
    // perform it. Gated on a concrete time/date in the text so a legit "naar wanneer?" never fires.
    const concreteWhenInText = /(\b\d{1,2}[:.]\d{2}\b|\bom \d{1,2}\b|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|morgen|overmorgen|monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i;
    const reschedStall = !calledMutationTool && !!result.text &&
      reschedLang.test(result.text) && concreteWhenInText.test(result.text) &&
      !cancelIntent && !confirmCancel && !confirmStall && !bookPreviewMissed;

    if (looksLikeStall || cancelPreviewMissed || confirmStall || bookPreviewMissed || reschedStall) {
      const nudgeText = reschedStall
        ? "[systeem] Je beschreef een verzetting naar een concrete tijd maar riep reschedule_appointment niet aan, dus er is NIETS verzet. Roep NU reschedule_appointment aan met date (YYYY-MM-DD) + time (HH:MM) van die nieuwe tijd. De genoemde tijd is de bevestiging: vraag niet om 'oké?' of 'klopt dat?', verzet meteen en antwoord met het resultaat ('Gedaan, je staat nu op ...')."
        : bookPreviewMissed
        ? "[systeem] Je beschreef een boeking maar riep book_appointment niet aan, dus er is nog NIETS gereserveerd. Roep NU book_appointment aan (stap 1 / preview) met de dienst, date (YYYY-MM-DD) + time (HH:MM) en de naam, zodat de afspraak echt wordt voorbereid. Beschrijf een boeking nooit zonder de tool aan te roepen."
        : cancelPreviewMissed
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
        (confirmStall || reschedStall)
          ? retry.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result))
          : (retry.toolCalls.length > 0 || !ANNOUNCE_RE.test(retry.text))
      );
      if (accept) {
        result = retry;
      }
    }

    // Deterministic outbound hygiene: strip em-dashes etc. (the "written by AI" tell) so it
    // never depends on the model obeying the prompt rule. Applied once → used for BOTH the
    // WhatsApp send and the persisted transcript so they always match.
    const reply = sanitizeReply(result.text || "") ||
      "Sorry, daar ging even iets mis. Kun je het nog een keer sturen? 🙏";

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
        // CRITICAL: merge onto a FRESH read, not the turn-START convContext. The tools wrote
        // to context DURING this turn (pending_booking / pending_cancel / booking_name); using
        // the stale snapshot here clobbered those — e.g. a first-contact booking preview's
        // pending_booking was wiped by this greeting_sent write, so the next "ja" re-previewed
        // instead of committing. Re-read so this only ADDS greeting_sent/detected_language.
        const { data: freshConv } = await supabase
          .from("whatsapp_conversations").select("context").eq("id", conversationId).maybeSingle();
        const latestCtx = ((freshConv as { context?: Record<string, unknown> } | null)?.context) ?? convContext;
        await supabase
          .from("whatsapp_conversations")
          .update({ context: { ...latestCtx, ...ctxUpdate } })
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
