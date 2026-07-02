// whatsapp-agent — the AI WhatsApp bookings agent (port off n8n).
// Invoked by whatsapp-webhook (service-role, internal) after it has persisted the
// inbound message via process_whatsapp_message. Loads conversation history, runs a
// Gemini Flash-Lite tool-calling loop, replies via the Meta Graph API, and persists
// the outbound message.
//
// Body: { phone, calendar_id, message, contact_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { buildSystemPrompt, DEFAULT_WHATSAPP_WELCOME, type ServiceInfo } from "./prompt.ts";
import { createTools, fetchBusinessData, formatCancellationPolicyNL, formatHoursNL, getCalendarPolicy, getCalendarWeeklyHours } from "./tools.ts";
import { enforceSlotOffer, extractOfferedClockTimes, OFFER_CONTEXT_RE } from "./slotOfferGuard.ts";
import { enforceNoFalseConfirmation } from "./confirmationGuard.ts";
import { enforceRefundPolicy } from "./refundGuard.ts";
import { enforcePriceClaim } from "./priceGuard.ts";
import { classifyRefundDisposition } from "./refundClassifier.ts";
import { neutralizeForbiddenAvailabilityWords } from "./forbiddenWordGuard.ts";
import { runAgent, type Content } from "./llm.ts";
import { sendWhatsAppText } from "../_shared/whatsappSend.ts";
import { sanitizeReply, countCustomerQuestions } from "../_shared/sanitizeReply.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Module-scope service-role client (B2 latency quick-win). Created ONCE per warm isolate
// instead of per invoke, so a warm request reuses the client + its kept-alive HTTP/TLS
// connections (the keep-warm cron holds the isolate warm, so this stays hot between calls).
// Safe to share: it is a stateless SERVICE-ROLE client (no per-request auth/session state to
// leak between customers). createClient itself opens no socket (the first query does), so this
// adds no cold-start cost and the keep-warm ping still early-returns before any query runs.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function nlTime(d: Date): string {
  const tz = "Europe/Amsterdam";
  const time = d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const day = d.toLocaleDateString("nl-NL", { weekday: "long", timeZone: tz });
  const month = d.toLocaleDateString("nl-NL", { month: "long", timeZone: tz });
  return `${time} ${day} ${month} ${d.getFullYear()}`;
}

// AS-3-V1 refund-policy classifier (classifyRefundDisposition) was extracted to ./refundClassifier.ts
// so it is unit-testable and the AS-Z-guard backstop can verify the full chain "owner policy ->
// disposition -> guard rewrite". Imported above; behaviour is byte-identical to the prior inline copy.

// Deterministic concrete-date calendar for the next 14 days, built server-side from the
// business's opening hours. The model reads the date + open/closed off this table instead
// of computing a relative date ("aanstaande zondag") or deciding "is that day open?" itself
// (both failed live: it asked "welke zondag bedoel je?" and offered a closed Sunday). This
// removes the date reasoning from the model entirely.
// includeStatus=true (single-calendar): each row carries the authoritative open/closed of THE
// one calendar, so the model reads "is that day open?" straight off the table. includeStatus=false
// (P1-2, MULTI-calendar): the table is a status-LESS date->ISO->weekday map only. Open/closed
// differs per staff/location and lives in <kalenders>, so the shared table must not assert an
// entry-centric open/closed the model could echo for the whole business or a non-entry agenda
// (the "Maandag is open" claim was entry-calendar-centric: true for the entry calendar, wrong for
// another agenda closed that day). Stripping the status removes the structural seduction at the
// source instead of repeatedly warning the model against it.
function buildCalendarHint(now: Date, byDay: Record<string, { open: boolean; start?: string; end?: string }> | null, includeStatus = true): string | null {
  if (!byDay) return null;
  const tz = "Europe/Amsterdam";
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD in Amsterdam
  const [y, m, d] = todayStr.split("-").map(Number);
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const lines: string[] = [];
  for (let i = 0; i < 14; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 11, 0, 0)); // 11:00 UTC = mid-day Amsterdam (date-safe across DST)
    const label = dt.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
    const iso = dt.toLocaleDateString("en-CA", { timeZone: tz });
    const mark = i === 0 ? " (vandaag)" : i === 1 ? " (morgen)" : "";
    if (includeStatus) {
      const dutchDay = cap(dt.toLocaleDateString("nl-NL", { weekday: "long", timeZone: tz }));
      const st = byDay[dutchDay];
      const status = st?.open ? `open ${st.start}-${st.end}` : "GESLOTEN";
      lines.push(`- ${label} [${iso}]: ${status}${mark}`);
    } else {
      lines.push(`- ${label} [${iso}]${mark}`);
    }
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

// Re-render an ISO instant in English (same Europe/Amsterdam tz) so a non-Dutch customer never
// reads a Dutch date inside an English sentence ("booked for dinsdag 30 juni"). The tool's `when`
// fields are always Dutch (nlWhen); this localizes from the canonical ISO the tool result carries.
// Shared by deterministicConfirmation (commit) and deterministicPreview (preview read-back).
function enWhen(iso: string | undefined, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" });
  return `${date} ${time}`;
}

// ITEM 12: deterministic two-phase-booking PREVIEW read-back. The COMMIT already reuses the
// server-stored slot, but the customer-facing preview ("...klopt dat?") was model prose: a 20B
// model misreads the <kalender> and echoes a divergent weekday for the SAME stored slot, so the
// customer confirms "donderdag 25 juni" while the stored slot is "dinsdag 30 juni" -> wrong-DB-state
// on commit. Mirror deterministicConfirmation: template the read-back from the SERVER proposal so
// the date shown == the slot stored == the slot committed. Fires only on a successful preview
// (book_appointment -> needs_confirmation + proposal); errors / niet_beschikbaar (the ITEM 5
// two-slot offer) carry no proposal and stay model-generated. NL default, English floor for any
// non-Dutch customer (the same floor the shipped commit confirmation uses).
function deterministicPreview(
  toolCalls: { name: string; result: unknown }[],
  customerLanguage: string | null,
): string | null {
  let pv: Record<string, any> | null = null;
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (
      t.name === "book_appointment" && t.result && typeof t.result === "object" &&
      (t.result as Record<string, unknown>).needs_confirmation === true &&
      (t.result as Record<string, unknown>).proposal
    ) {
      pv = t.result as Record<string, any>;
      break;
    }
  }
  if (!pv) return null;
  const p = pv.proposal as { service?: string | null; when?: string; customer_name?: string | null };
  const en = customerLanguage != null;
  const when = en ? enWhen(pv.start_time, p.when ?? "") : (p.when ?? "");
  if (!when) return null;
  // Service is an owner-configured proper noun: never translated, only included if present.
  const svc = (p.service ?? "").trim();
  const name = (p.customer_name ?? "").trim() || null;
  if (en) {
    const head = svc ? `I'll put you down for ${svc} on ${when}` : `I'll put you down for ${when}`;
    return name ? `${head} in the name of ${name}. Is that correct?` : `${head}. Is that correct?`;
  }
  const head = svc ? `Ik zet ${svc} op ${when}` : `Ik zet je op ${when}`;
  return name ? `${head} op naam ${name}, klopt dat?` : `${head}, klopt dat?`;
}

// ---------------------------------------------------------------------------
// P0-1 slot-offer guard (the "no fabricated time" guarantee) lives in ./slotOfferGuard.ts,
// extracted so its pure logic is unit-testable. Imported above; wired into reply-assembly
// below (enforceSlotOffer) + the no-query re-query nudge (extractOfferedClockTimes / OFFER_CONTEXT_RE).

// gpt-oss-20b intermittently returns EMPTY text after a SUCCESSFUL commit tool call (~40% of
// commit turns observed): the booking/reschedule/cancel went through (DB correct) but the model
// emitted no final message, so the customer got the generic "Sorry, iets mis" fallback, telling
// them it failed when it did not (the A2-WATCH issue). When the model gave no text but a mutation
// SUCCEEDED this turn, build a deterministic confirmation from the tool result instead. The action
// already happened, so this touches no gate. NL by default; English for any non-Dutch customer
// (the universal floor; the model normally writes the customer's language, this is the rare
// fallback). `when` is the tool's already-formatted local time.
function deterministicConfirmation(
  toolCalls: { name: string; result: unknown }[],
  customerLanguage: string | null,
): string | null {
  const okResult = (name: string): Record<string, any> | null => {
    for (let i = toolCalls.length - 1; i >= 0; i--) {
      const t = toolCalls[i];
      if (t.name === name && t.result && typeof t.result === "object" && (t.result as Record<string, unknown>).ok === true) {
        return t.result as Record<string, any>;
      }
    }
    return null;
  };
  const en = customerLanguage != null; // a non-Dutch language was detected -> English floor
  const book = okResult("book_appointment");
  if (book) {
    const bookWhen = en ? enWhen(book.start_time, book.when) : book.when;
    if (book.payment_url) {
      return en
        ? `Your spot is reserved for ${bookWhen}. Please complete the payment here to confirm: ${book.payment_url}`
        : `Je plek is gereserveerd voor ${bookWhen}. Rond de betaling af via deze link om te bevestigen: ${book.payment_url}`;
    }
    return en ? `Done! You're booked for ${bookWhen}. 🎉` : `Gelukt! Je staat genoteerd voor ${bookWhen}. 🎉`;
  }
  const resched = okResult("reschedule_appointment");
  if (resched?.rescheduled?.to) {
    const reWhen = en ? enWhen(resched.rescheduled.to_start_time, resched.rescheduled.to) : resched.rescheduled.to;
    return en
      ? `Done, your appointment is now on ${reWhen}.`
      : `Gedaan, je afspraak staat nu op ${reWhen}.`;
  }
  const cancel = okResult("cancel_appointment");
  if (cancel?.cancelled) {
    return en ? `Done, your appointment has been cancelled.` : `Gedaan, je afspraak is geannuleerd.`;
  }
  return null;
}

// FQ-3 concurrency loser reply (guarantee-in-code, the refundGuard/deterministicConfirmation
// pattern). When two end-clients confirm the SAME slot at once, the DB bookings_no_overlap exclusion
// constraint lets exactly ONE insert win (no double-book is structurally impossible). The LOSER's
// book_appointment COMMIT returns one of BOOK_RACE_LOSS_ERRORS:
//   "slot_taken"      = the tight 23P01 exclusion-constraint race (both inserts passed validation
//                        and collided at the constraint).
//   "niet_beschikbaar" = the COMMON case: the winner's row landed first, so the loser's pre-insert
//                        validate_booking_security now fails.
//   "dag_vol"          = the winner reached the max/day cap in between.
// All three, on a CONFIRMED commit, mean "the slot you just confirmed is gone." Without this the
// loser's customer-facing reply was model-improvised prose ("Wat is je naam?", reproduced reliably)
// = a confusing / misleading message. The honest reply is a hard correctness claim the end-client is
// told, so it belongs in CODE, not the 20B model's text. Template it deterministically (EN floor + NL
// default, the same `customerLanguage != null` convention as deterministicConfirmation/Preview): tell
// the truth and offer another time. The error carries no proposal, so we never echo a now-invalid
// time. Gated on the COMMIT turn so a first-PREVIEW "that time isn't free, here are alternatives"
// (also "niet_beschikbaar") stays model-driven and helpful.
const BOOK_RACE_LOSS_ERRORS = new Set(["slot_taken", "niet_beschikbaar", "dag_vol"]);
function deterministicSlotTaken(
  toolCalls: { name: string; result: unknown }[],
  customerLanguage: string | null,
  isCommitTurn: boolean,
): string | null {
  // Only on the commit turn: on a first PREVIEW turn, "niet_beschikbaar" means "pick another time"
  // and the model's helpful alternatives offer is correct, so we never override it there.
  if (!isCommitTurn) return null;
  const lost = toolCalls.some(
    (t) => t.name === "book_appointment" && !!t.result && typeof t.result === "object" &&
      BOOK_RACE_LOSS_ERRORS.has(String((t.result as Record<string, unknown>).error)),
  );
  if (!lost) return null;
  const en = customerLanguage != null; // a non-Dutch language was detected -> English floor
  return en
    ? "Sorry, that time was just taken by someone else, so I couldn't book it. Shall I look for another time for you?"
    : "Sorry, dat tijdstip is net door iemand anders geboekt, dus het lukte niet meer. Zal ik een ander moment voor je zoeken?";
}

// B1 (2e-LLM-call collapse): a mutation tool result that represents a COMPLETED commit, exactly
// the set deterministicConfirmation() can template. Used to (a) stop the agent loop right after a
// successful book/cancel/reschedule so the compose model-call (call 2) never runs (~2-2.5s saved),
// and (b) force the deterministic confirmation as the PRIMARY reply on committed turns. A PREVIEW
// returns needs_confirmation (no ok:true) and is excluded, so two-phase preview turns stay
// model-generated. Book commit / pay-and-book / same-turn already_booked carry ok:true; cancel
// commit carries ok:true + cancelled; reschedule commit carries ok:true + rescheduled.to.
function isCommittedMutation(name: string, result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, any>;
  if (r.ok !== true) return false;
  if (name === "book_appointment") return true;
  if (name === "cancel_appointment") return !!r.cancelled;
  if (name === "reschedule_appointment") return !!(r.rescheduled && r.rescheduled.to);
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Keep-warm ping (pg_cron, every few min). Return BEFORE parsing the body,
  // loading context or calling the LLM, so a scheduled ping keeps this function's
  // isolate + module graph warm at ~zero cost (no Groq call, no DB read). Without
  // this, the first real message after an idle gap pays a deep cold start (the
  // agent ran 5.3s cold vs ~2.4s warm in measurement). The ping still passes the
  // gateway's verify_jwt via the public anon key (see the cron migration).
  if (req.headers.get("x-keep-warm") === "1") {
    return new Response("warm", { status: 200, headers: corsHeaders });
  }

  // Hoisted so the catch can send the customer a graceful fallback instead of leaving them
  // hanging: the inbound message is already recorded + the webhook already 200'd Meta, so a
  // thrown agent run would otherwise silently drop the message (Meta won't retry).
  let phoneForFallback: string | null = null;
  // FQ-B-ERRLEAK: the raw inbound text, hoisted so the catch can language-detect the graceful
  // fallback even when the throw happened mid-run (after the message was parsed).
  let fallbackMessage: string | null = null;

  try {
    const { phone, calendar_id, message, contact_name } = await req.json();
    if (!phone || !calendar_id || !message) {
      return new Response(JSON.stringify({ error: "phone, calendar_id, message vereist" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    phoneForFallback = phone;
    fallbackMessage = String(message);

    // --- Load context (own loader; get_conversation_context RPC is buggy) ---
    // Latency: these reads were sequential (~8 round-trips ≈ 250-400ms of pure wait).
    // They are now batched into 3 dependency phases so independent reads run in parallel.
    // Phase 1 — everything that needs only (calendar_id, phone):
    const [calRes, svcRes, csRes, contactRes, lastBRes, weeklyHours, psRes] = await Promise.all([
      supabase.from("calendars").select("user_id").eq("id", calendar_id).maybeSingle(),
      // Only ACTIVE, non-deleted services — otherwise a service the owner removed/deactivated
      // in the dashboard stays in <services> and the agent keeps offering + booking it via
      // WhatsApp (deletion sets is_active=false + is_deleted=true; deactivation sets is_active=false).
      // supply_type (X3b-2): so the prompt can mark a remote/digital service AFSTAND/DIGITAAL and
      // ask the customer's country + VAT-ID for cross-border VAT. in_person (the default + every
      // production service today) → no marker, conversation unchanged.
      supabase.from("service_types").select("id, name, duration, price, description, supply_type")
        .eq("calendar_id", calendar_id).eq("is_active", true).or("is_deleted.is.null,is_deleted.eq.false"),
      // whatsapp_welcome_message = the custom greeting; allow_cancellations +
      // cancellation_deadline_hours are the SAME structured policy the agent ENFORCES
      // (getCalendarPolicy in tools.ts), pulled here so we can also inject a human-readable
      // version into <business_data> below — so the agent can ANSWER "wat is jullie
      // annuleringsbeleid?" instead of only enforcing it silently.
      supabase.from("calendar_settings")
        .select("whatsapp_welcome_message, allow_cancellations, cancellation_deadline_hours, booking_window_days, minimum_notice_hours")
        .eq("calendar_id", calendar_id).maybeSingle(),
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
      // Pay&Book policy of THIS calendar (the same payment_settings row the book-gate reads in
      // tools.ts). Read live every turn (NOT via the bo_v2 cache: bo_v2 is per-USER while this
      // is per-CALENDAR, and a cache would risk the known stale-cache bug-class). Lets the agent
      // ANSWER refund / payment-deadline / payment-timing questions from the CURRENT Pay&Book
      // value the owner set, instead of only the AI-kennis users.cancellation_policy field.
      supabase.from("payment_settings")
        .select("refund_policy_text, payment_deadline_hours, allowed_payment_timing, secure_payments_enabled, payment_required_for_booking")
        .eq("calendar_id", calendar_id).maybeSingle(),
    ]);

    const cal = calRes.data;
    const businessUserId = (cal as { user_id?: string } | null)?.user_id ?? "";

    const services: ServiceInfo[] = ((svcRes.data as Array<{ id: string; name: string; duration: number; price: number | null; description: string | null; supply_type: string | null }>) ?? [])
      .map((s) => ({ id: s.id, name: s.name, durationMin: s.duration, price: s.price, description: s.description, supplyType: s.supply_type }));

    // Per-calendar custom welcome greeting (NULL → default template in prompt.ts).
    const rawWelcome = (csRes.data as { whatsapp_welcome_message?: string | null } | null)?.whatsapp_welcome_message ?? null;

    const contact = contactRes.data;
    const contactId = (contact as { id?: string } | null)?.id ?? null;

    // Returning customer's last service (for "same as last time?" verification),
    // scoped to THIS calendar (a customer's history at another business is irrelevant here).
    const lastService = (lastBRes.data as { service_types?: { name?: string } } | null)?.service_types?.name ?? null;

    // Phase 2: reads that depend on phase 1 (business data needs user_id; conversation
    // needs contact_id). Independent of each other → run in parallel.
    const [businessData, conv, calSetRes] = await Promise.all([
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
      // A2 multi-calendar: the FULL active calendar-set of THIS owner (staff/location).
      // The inbound webhook routed the customer to ONE entry calendar (calendar_id), but a
      // multi-calendar business needs the agent to read the whole set, disambiguate, and
      // book in the RIGHT one. This set is the SERVER-SIDE ALLOWLIST: every booking/cancel/
      // reschedule target is resolved from it, so the model can never reach another owner's
      // calendar (no cross-leak). default-first + name for stable indexing; cap 5.
      businessUserId
        ? supabase.from("calendars").select("id, name")
            .eq("user_id", businessUserId).eq("is_active", true)
            .or("is_deleted.is.null,is_deleted.eq.false")
            .order("is_default", { ascending: false }).order("name", { ascending: true })
            .limit(5)
        : Promise.resolve({ data: null }),
    ]);
    const businessType = (businessData?.business_type as string | null) ?? null;

    // Build the calendar allowlist (always ≥1: at minimum the entry calendar). Guarantee the
    // entry calendar is present even if the set query somehow misses it (race / just-created).
    const calRows = ((calSetRes as { data?: Array<{ id: string; name: string | null }> | null })?.data) ?? [];
    const calendars: Array<{ id: string; name: string }> = calRows
      .map((c) => ({ id: c.id, name: (c.name ?? "").trim() || "Agenda" }));
    if (!calendars.some((c) => c.id === calendar_id)) {
      calendars.unshift({ id: calendar_id, name: "Agenda" });
    }
    const isMultiCalendar = calendars.length > 1;

    // Per-calendar services for the prompt's <kalenders> block, ONLY when multi-calendar
    // (single-calendar path stays byte-identical: zero extra queries, no block). One query
    // for the whole set; service UUIDs differ per calendar so the agent picks the right one.
    let calendarsForPrompt: Array<{ index: number; name: string; services: ServiceInfo[] }> | null = null;
    // ITEM2: serviceId -> calendarId for the whole allowlist, so the tools route a booking to the
    // right staff/location calendar from the chosen service alone (no "which agenda?" turn). Built
    // from the SAME per-calendar service query, zero extra round-trip; only in multi-calendar mode.
    let serviceCalendarMap: Record<string, string> | undefined;
    if (isMultiCalendar) {
      const ids = calendars.map((c) => c.id);
      const { data: setSvc } = await supabase
        .from("service_types").select("id, name, duration, price, description, calendar_id, supply_type")
        .in("calendar_id", ids).eq("is_active", true).or("is_deleted.is.null,is_deleted.eq.false");
      const byCal = new Map<string, ServiceInfo[]>();
      serviceCalendarMap = {};
      for (const s of ((setSvc as Array<{ id: string; name: string; duration: number; price: number | null; description: string | null; calendar_id: string; supply_type: string | null }>) ?? [])) {
        const arr = byCal.get(s.calendar_id) ?? [];
        arr.push({ id: s.id, name: s.name, durationMin: s.duration, price: s.price, description: s.description, supplyType: s.supply_type });
        byCal.set(s.calendar_id, arr);
        serviceCalendarMap[s.id] = s.calendar_id;
      }
      // A4: per-calendar opening hours. Hours differ per staff/location, so each <kalenders>
      // entry carries its OWN bookable weekly hours (same availability_rules source as
      // get_available_slots → spoken hours match what that agenda can actually book). Reuse the
      // entry calendar's already-fetched schedule (weeklyHours); fetch the others in parallel.
      const hoursByCal = new Map<string, string | null>([[calendar_id, weeklyHours?.text ?? null]]);
      const otherCals = calendars.filter((c) => c.id !== calendar_id);
      const otherHours = await Promise.all(otherCals.map((c) => getCalendarWeeklyHours(supabase, c.id)));
      otherCals.forEach((c, i) => hoursByCal.set(c.id, otherHours[i]?.text ?? null));
      // T3-A1 (R7): per-calendar cancellation policy, same pattern as openingHours above, so the
      // model can correctly answer a question about a NAMED DIFFERENT calendar's policy (the
      // <business_data> override further below only ever resolves to the CUSTOMER'S OWN upcoming
      // booking, never an arbitrary named calendar; both are needed for the two different
      // question shapes). One getCalendarPolicy call per calendar in the allowlist (max 5, the
      // same allowlist size cap as the services query above), reusing the same exported helpers
      // R6 added for the own-booking case. Only runs in multi-calendar mode, so single-calendar
      // tenants pay zero added cost, identical gating to the rest of this block.
      // businessName is derived further below in this function; use the same source
      // (businessData.business_name) directly here since that const is not yet in scope.
      const businessNameForPolicy = (businessData?.business_name as string | null) ?? "ons bedrijf";
      const policyByCal = await Promise.all(calendars.map((c) => getCalendarPolicy(supabase, c.id)));
      const policyTextByCal = new Map<string, string | null>(
        calendars.map((c, i) => {
          const p = policyByCal[i];
          const text = !p.allowCancellations
            ? `Annuleren of verzetten via deze assistent is niet mogelijk; neem daarvoor rechtstreeks contact op met ${businessNameForPolicy}.`
            : formatCancellationPolicyNL(p);
          return [c.id, text];
        }),
      );
      calendarsForPrompt = calendars.map((c, i) => ({ index: i + 1, name: c.name, services: byCal.get(c.id) ?? [], openingHours: hoursByCal.get(c.id) ?? null, cancellationPolicy: policyTextByCal.get(c.id) ?? null }));
    }

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
    // JSON, and build the concrete-date <kalender> from the same source, so "what the agent
    // says is open" always equals "what it can actually book". Fall back to the old struct only
    // if this calendar has no availability schedule at all.
    // A4: in MULTI-calendar mode hours differ per agenda, so a single generic "openingstijden"
    // line would assert one wrong "the" hours. Drop it here and surface per-agenda hours in
    // <kalenders> (calendarsForPrompt.openingHours) instead. Single-calendar = unchanged.
    if (businessData) {
      if (isMultiCalendar) delete businessData.opening_hours;
      else if (weeklyHours?.text) businessData.opening_hours = weeklyHours.text;
    }

    // AS-2: Pay&Book refund / payment-timing ANSWER inject. The Pay&Book settings tab saves
    // refund_policy_text / payment_deadline_hours / allowed_payment_timing to payment_settings,
    // but the agent never read them, so an owner who set a refund policy there got an agent that
    // could not answer it (it only knew users.cancellation_policy from the AI-kennis tab, a
    // DIFFERENT field). Project the CURRENT Pay&Book value into <business_data>.refund_policy so
    // the agent honours it. Source-of-truth split (kept coherent, never contradictory):
    //   - refund_policy (Pay&Book) is authoritative for REFUND / payment-deadline / payment-timing,
    //   - cancellation_policy (AI-kennis / structured deadline) covers free-cancellation TIMING.
    // The owner's hand-written refund_policy_text always wins; otherwise we describe the payment
    // timing + deadline from the same structured settings. Read live per turn (no cache).
    // AS-3-V1: this inject now runs BEFORE the cancellation derive (it used to run after) so the
    // cancellation derive can disambiguate its "kosteloos annuleren" line when a NO-REFUND refund
    // policy coexists. The 20B model otherwise conflated free-cancel timing (no fee) with a
    // money-back promise on vague phrasing ("krijg ik geld terug bij annuleren?").
    let refundDisposition: "granted" | "denied" | "unknown" = "unknown";
    if (businessData) {
      const ps = psRes.data as {
        refund_policy_text?: string | null;
        payment_deadline_hours?: number | string | null;
        allowed_payment_timing?: unknown;
        secure_payments_enabled?: boolean | null;
        payment_required_for_booking?: boolean | null;
      } | null;
      const manualRefund = ps?.refund_policy_text;
      const hasManualRefund = typeof manualRefund === "string" && manualRefund.trim();
      if (hasManualRefund) {
        // A hand-written refund policy always wins, used verbatim.
        businessData.refund_policy = (manualRefund as string).trim();
        refundDisposition = classifyRefundDisposition(manualRefund as string);
      } else if (ps) {
        // Derive a human sentence from the structured Pay&Book settings. allowed_payment_timing
        // is a jsonb array of: pay_now (vooruit/online), pay_on_site (op locatie). Only describe
        // a deadline when up-front online payment is actually offered (pay_now present).
        const timing = Array.isArray(ps.allowed_payment_timing)
          ? (ps.allowed_payment_timing as unknown[]).map((t) => String(t))
          : [];
        const offersPayNow = timing.includes("pay_now");
        const offersOnSite = timing.includes("pay_on_site");
        const rawDeadline = ps.payment_deadline_hours;
        const deadlineH = rawDeadline == null ? null : Number(rawDeadline);
        const parts: string[] = [];
        if (offersPayNow && offersOnSite) {
          parts.push("Je kunt vooraf online betalen of op locatie bij je afspraak.");
        } else if (offersPayNow) {
          parts.push("Betaling gaat vooraf online.");
        } else if (offersOnSite) {
          parts.push("Je betaalt op locatie bij je afspraak.");
        }
        if (offersPayNow && deadlineH != null && Number.isFinite(deadlineH) && deadlineH > 0) {
          parts.push(`Een online vooruitbetaling moet binnen ${formatHoursNL(deadlineH)} na het boeken voldaan zijn, anders kan de reservering vervallen.`);
        }
        // Only set refund_policy when we actually have something to say (avoid an empty line).
        if (parts.length) businessData.refund_policy = parts.join(" ");
        // Derived path only describes payment TIMING, never the refund OUTCOME, so disposition
        // stays "unknown": the prompt then sends a refund question to direct contact rather than
        // letting the model guess a money-back outcome from the timing sentence.
      }
    }

    // Cancellation/reschedule policy ANSWER inject. The agent already ENFORCES the deadline
    // (getCalendarPolicy in tools.ts gates BOTH cancel and reschedule on
    // cancellation_deadline_hours), but it could not EXPLAIN it: the free-text <business_data>
    // field `cancellation_policy` is NULL for most tenants (incl. Lorvello), so a customer
    // asking "wat is jullie annuleringsbeleid?" got an honest but unhelpful "dat weet ik niet".
    // Derive a human sentence from the SAME structured settings and inject it, ONLY when no
    // manual free-text policy is set (a hand-written policy always wins). Mirrors
    // getCalendarPolicy's null-defaults exactly (allowCancellations ?? true, deadline ?? null).
    const cs = csRes.data as {
      allow_cancellations?: boolean | null;
      cancellation_deadline_hours?: number | string | null;
      booking_window_days?: number | string | null;
      minimum_notice_hours?: number | string | null;
    } | null;
    const hasManualCancellationPolicy = typeof businessData?.cancellation_policy === "string" &&
      (businessData.cancellation_policy as string).trim().length > 0;
    if (businessData && !hasManualCancellationPolicy) {
      const allowCancel = cs?.allow_cancellations ?? true;
      // PostgREST returns numeric as a string ("24.00"); Number() converts to 24 so the
      // sentence reads "24 uur", not "24.00 uur".
      const rawDeadline = cs?.cancellation_deadline_hours;
      const deadlineH = rawDeadline == null ? null : Number(rawDeadline);
      // AS-3-V1: when a NO-REFUND refund policy coexists, the derived "kosteloos annuleren"
      // line is the conflation surface (the 20B model read "kosteloos" = no cancellation fee
      // as "geld terug" = money-back). Append an explicit clause that free cancellation is
      // about the cancellation fee, NOT a refund of any prepayment, so the data the model sees
      // can no longer be misread as a refund promise. Only when the refund policy clearly says
      // no refund (refundDisposition "denied"); behaviour unchanged otherwise.
      const refundClarifier = refundDisposition === "denied"
        ? " Let op: kosteloos annuleren betekent dat er geen annuleringskosten zijn, NIET dat een vooruitbetaling wordt terugbetaald (zie het terugbetaalbeleid)."
        : "";
      businessData.cancellation_policy = !allowCancel
        ? `Annuleren of verzetten via deze assistent is niet mogelijk; neem daarvoor rechtstreeks contact op met ${businessName}.`
        : deadlineH != null && Number.isFinite(deadlineH) && deadlineH > 0
        ? `Je kunt je afspraak tot ${formatHoursNL(deadlineH)} van tevoren kosteloos annuleren of verzetten via WhatsApp; daarna kan dat niet meer via de assistent.${refundClarifier}`
        : `Je kunt je afspraak op elk moment vóór de starttijd kosteloos annuleren of verzetten via WhatsApp.${refundClarifier}`;

      // T3-A1: the sentence above is derived from the ENTRY calendar's settings only. In a
      // MULTI-calendar business a customer's actual upcoming booking may live in a DIFFERENT
      // calendar with its OWN cancellation deadline. cancel_appointment's own tool result already
      // fixes the in-flow case (injects the booking's own calendar policy once that tool runs),
      // but the model sometimes answers a combined "cancel this + what's the deadline" message
      // straight from <business_data> without calling the tool (prompt.ts deliberately routes a
      // bare policy question away from cancel_appointment). So when this customer has EXACTLY ONE
      // identifiable upcoming booking anywhere in the owner's allowlist, override the sentence
      // with THAT booking's own calendar policy, so the spoken answer is correct however the
      // model reaches it. Ambiguous (2+ upcoming bookings) or none found: keep the entry-calendar
      // sentence as the best available generic answer (mirrors cancel_appointment's own
      // "meerdere_afspraken" disambiguation, which this text-only inject does not replicate, to
      // stay scoped to composing the policy TEXT, not the tool's disambiguation flow).
      if (isMultiCalendar && calendars.length > 1) {
        const { data: upcoming } = await supabase
          .from("bookings")
          .select("calendar_id")
          .eq("customer_phone", phone)
          .in("calendar_id", calendars.map((c) => c.id))
          .in("status", ["confirmed", "pending"])
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(2);
        const rows = (upcoming as Array<{ calendar_id: string }> | null) ?? [];
        if (rows.length === 1 && rows[0].calendar_id !== calendar_id) {
          const ownPolicy = await getCalendarPolicy(supabase, rows[0].calendar_id);
          businessData.cancellation_policy = !ownPolicy.allowCancellations
            ? `Annuleren of verzetten via deze assistent is niet mogelijk; neem daarvoor rechtstreeks contact op met ${businessName}.`
            : `${formatCancellationPolicyNL(ownPolicy)}${refundClarifier}`;
        }
      }
    }
    const openingStruct = weeklyHours?.byDay ??
      ((businessData?.opening_hours_struct as Record<string, { open: boolean; start?: string; end?: string }> | null) ?? null);
    // P1-2: single-calendar -> the table carries the one calendar's open/closed (authoritative).
    // Multi-calendar -> status-less date map only; per-agenda open/closed comes from <kalenders>.
    const calendarHint = buildCalendarHint(now, openingStruct, !isMultiCalendar);

    // Booking horizon for the prompt: how far ahead this calendar accepts bookings
    // (booking_window_days). Without this the model called a far-future date "al voorbij"
    // (wrong + confusing); now it knows the horizon and refuses correctly with "zo ver
    // vooruit kan ik nog niet". Backs the server-side guard in tools.ts (isBeyondWindowNL).
    const rawWin = cs?.booking_window_days;
    const winNum = rawWin == null ? NaN : Number(rawWin);
    const bookingWindowDays = Number.isFinite(winNum) && winNum > 0 ? winNum : null;
    let bookingHorizonISO: string | null = null;
    let bookingHorizonNL: string | null = null;
    if (bookingWindowDays != null) {
      const hz = new Date(now.getTime() + bookingWindowDays * 86400000);
      bookingHorizonISO = hz.toISOString().slice(0, 10);
      bookingHorizonNL = hz.toLocaleDateString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Amsterdam",
      });
    }
    // Minimum advance notice (minimum_notice_hours). get_available_slots ENFORCES it
    // (slots inside now+notice come back is_available=false, so resolveSlotForTime refuses a
    // too-soon time), but the agent could neither warn nor EXPLAIN it: the <kalender> shows
    // today as "open" and a refused near-term time read as a plain "niet beschikbaar". Inject
    // the notice + the earliest bookable moment so the agent stops promising too-soon slots and
    // can say "we hebben minimaal X uur van tevoren nodig". Default NULL→24 to mirror the RPC's
    // COALESCE(...,24) — NOT the dashboard's misleading display default of 1 — so what the agent
    // says always matches what the slot RPC actually enforces.
    const rawNotice = cs?.minimum_notice_hours;
    const noticeNum = rawNotice == null ? 24 : Number(rawNotice);
    const minimumNoticeHours = Number.isFinite(noticeNum) && noticeNum > 0 ? noticeNum : null;
    let earliestBookingNL: string | null = null;
    if (minimumNoticeHours != null) {
      const earliest = new Date(now.getTime() + minimumNoticeHours * 3_600_000);
      earliestBookingNL = earliest.toLocaleString("nl-NL", {
        weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
        timeZone: "Europe/Amsterdam",
      });
    }
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
      bookingWindowDays,
      bookingHorizonISO,
      bookingHorizonNL,
      minimumNoticeHours,
      earliestBookingNL,
      calendars: calendarsForPrompt,
      refundDisposition,
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
    // Boundaries are Unicode-aware lookarounds, NOT \b: V8's \b is ASCII-only, so a trailing \b
    // after an accented vowel (sí/sì/oké) never matched and ES/IT "sí"/"sì" confirms silently
    // stalled with 0 DB-row (R8 repro "sí, está bien"). \p{L}\p{N} + the u flag treat accented
    // letters as word chars, so the boundary holds while "simpel"/"klaar"/"jasmijn" stay excluded.
    const AFFIRM_RE = /(?<![\p{L}\p{N}])(ja|jaha|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|annuleer|annuleren|cancel|klopt|inderdaad|verwijder|akkoord|oui|ouais|volontiers|sí|si|claro|vale|perfecto|sì|certo|esatto|perfetto|sim|perfeito|parfait|genau|gerne|bitte|klar|passt)(?![\p{L}\p{N}])/iu;
    const NEGATE_RE = /\b(nee|neen|no|niet|liever niet|toch niet|verzet|verzetten|reschedule|verplaats|hou|houd|behoud|laat maar|ander|andere|nieuwe tijd)\b/i;
    // A hypothetical / policy QUESTION that merely contains a cancel word ("krijg ik geld terug als ik
    // annuleer?", "wat is het annuleringsbeleid?", "wat als ik afzeg?") must NEVER arm or commit a real
    // cancellation, it's an info question, answered from <business_data>. Without this, asking about the
    // refund policy armed a cancel and the next "ja" destroyed the booking (adversarial finding).
    const cancelPolicyQuestion = /\b(beleid|policy|terugbetaling|terug ?betaald|geld terug|refund|kosten|hoeveel|als ik|wat als|stel dat|wat gebeurt|hoe zit het|wanneer kan ik)\b/i.test(msgLower);
    // R23 (AFFIRM-CONFIRM-FALSEPOS, sev-2): AFFIRM_RE/NEGATE_RE are pure keyword regexes with ZERO
    // check that an affirmative word genuinely means "yes, commit exactly what was just previewed".
    // R22-verify reproduced 3 live false-positive commits, all sharing one shape: the message pairs
    // an affirm word with EXTRA content that changes or questions the previewed deal, which neither
    // regex was ever designed to see:
    //   (a) "Ja klopt, kan het ook een uur later?" committed the OLD time instead of clarifying
    //       (a relative time-shift request: "uur later/eerder", "later/eerder", or any clock time).
    //   (b) "Oke wacht, hoeveel kost dat ook alweer?" committed instead of answering a PRICE
    //       question (reusing priceGuard's PRICE_INTENT_RE wording).
    //   (c) "Sure, sorry ik bedoelde eigenlijk maandag" committed the previewed (wrong) day instead
    //       of correcting to the day the customer just named.
    // Design choice (documented per the run-spec): rather than trying to enumerate every possible
    // qualifier, treat ANY of (a) a day-of-week/relative-time-shift mention, (b) a price question,
    // (c) a trailing "?" (the message itself asks something), or (d) a handful of hedge words that
    // signal "wait/actually/but" as evidence the "yes" is NOT a clean, unconditional confirmation of
    // the exact previewed slot. This mirrors the SAME "?" signal index.ts already uses elsewhere in
    // this file to detect an unresolved question (confirmStall, FUTURE_OR_OFFER_RE in
    // confirmationGuard.ts), so it is a proven-safe pattern in this codebase, not a new invention.
    // A clean confirmation ("Ja", "Klopt!", "Prima, tot dan") never matches any of these, so the fast
    // legitimate path is untouched. When this fires, confirmBook/confirmCancel simply stay false and
    // the model runs normally (it sees the pending proposal via context and typically re-previews or
    // answers the question); a clarifying turn is safer than a wrong commit.
    const DAY_OR_TIME_SHIFT_RE =
      /\b(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag|monday|tuesday|wednesday|thursday|friday|saturday|sunday|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b|\b\d{1,2}[:.]\d{2}\b|\b(uur|hour|stunde|heure)\s*(later|eerder|earlier|vroeger|voor|na)\b|\b(later|eerder|earlier|vroeger)\b/i;
    const PRICE_QUESTION_RE =
      /\b(kost|kosten|kostte|prijs|prijzen|tarief|tarieven|hoeveel|how\s+much|price|priced|costs?|cost|rate|charge|fee)\b/i;
    const HEDGE_RE = /\b(wacht|momentje|trouwens|eigenlijk|bedoelde|bedoel|meant|actually|wait|sorry)\b/i;
    // R25 (AFFIRM-CONFIRM-COVERAGE-GAP-CONDITIONAL, sev-2): a 5th ambiguity category, found by
    // R24-verify. A message can pair an affirm word with a CONDITION/hypothetical rather than an
    // unconditional yes, for example "Klopt, annuleer maar zolang het gratis is" or "Klopt, zolang
    // mijn vriend Noud ook nog een plekje kan krijgen". None of the 4 existing categories catch
    // this (no day/time word, "gratis" is not in PRICE_QUESTION_RE, no trailing "?", no hedge
    // word), so it committed/cancelled immediately without the agent ever addressing the stated
    // condition. NL: "zolang" (as long as), "mits" (provided that), "op voorwaarde dat" (on
    // condition that). EN: "as long as", "provided (that)", "assuming", "on the condition that".
    const CONDITIONAL_RE =
      /\b(zolang|mits)\b|op\s+voorwaarde\s+dat|as\s+long\s+as|provided\s+(that\b|\w)|assuming\b|on\s+the\s+condition\s+that/i;
    const notCleanConfirm = (raw: string) =>
      DAY_OR_TIME_SHIFT_RE.test(raw) || PRICE_QUESTION_RE.test(raw) || raw.includes("?") || HEDGE_RE.test(raw) ||
      CONDITIONAL_RE.test(raw);
    // R24 (AFFIRM-CONFIRM-FALSEPOS, second commit path): this signal is ALSO threaded into
    // ctx.ambiguousConfirm below (see createTools call) so tools.ts can gate the model's own
    // self-issued args.confirmed the same way, not just the server-forced confirmBook/
    // confirmCancel computed from it right below. R23 only fixed the latter; R24 closes the former.
    const ambiguousConfirm = notCleanConfirm(msgLower);
    const confirmCancel = pendingFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelPolicyQuestion && !ambiguousConfirm;

    // Booking confirmation, detected server-side (mirrors confirmCancel). A NEW booking is
    // two-phase: the first book_appointment call only PREVIEWS (stores a pending_booking
    // proposal, NO insert), so an accidental immediate booking is impossible and the customer
    // can correct the name/time first. When a fresh proposal exists AND the customer affirms
    // (and isn't cancelling), drive the COMMIT deterministically via ctx.confirmBook — the
    // commit uses the SERVER-STORED exact start_time, which also kills the model's
    // time-reconstruction bug (it once booked 12:00 for a confirmed 10:00).
    const pbk = convContext.pending_booking as
      { at?: number; service_type_id?: string; start_time?: string; end_time?: string; calendar_id?: string } | undefined;
    const pendingBookFresh = !!pbk && (typeof pbk.at !== "number" || (Date.now() - pbk.at) < 15 * 60 * 1000);
    const cancelWord = /\b(annuleer|annuleren|cancel|afzeggen)\b/i.test(msgLower);
    // R23: same ambiguousConfirm gate as confirmCancel (see its comment above for the 3 repro
    // shapes and the design reasoning). A day/time-shift mention, a price question, a trailing "?",
    // or a hedge word means this is NOT a clean confirmation of the exact previewed slot.
    const confirmBook = pendingBookFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelWord && !confirmCancel && !ambiguousConfirm;

    // FQ-3 (ATTEMPT 2): SERVER-SIDE, MODEL-INDEPENDENT race-loss pre-check (the guarantee-in-code
    // pattern). FQ-3 attempt-1 (deterministicSlotTaken) only fired when the 20B model itself called
    // book_appointment on the loser commit turn and got a BOOK_RACE_LOSS_ERROR. The verifier proved
    // the live model almost never reaches that state on the loser turn (it diverts: asks "Welke
    // dienst?", re-queries slots, etc.), so the loser kept getting confusing prose. Fix: the SERVER
    // already knows the previewed slot (the stored pending_booking). On a server-detected confirmBook,
    // authoritatively RE-CHECK that slot's freeness via the SAME validate_booking_security RPC the
    // commit uses, BEFORE running the agent. If it is no longer free, the customer lost the race: the
    // honest reply is templated deterministically (deterministicSlotTaken) and the agent run is skipped
    // entirely. Model-independent (the model cannot narrate around a short-circuit) and adds LESS
    // latency than a full turn (one RPC, then return). The DB no-double-book guarantee is untouched:
    // this only changes the loser's WORDS, never whether a row is written (the winner's row already
    // exists; we never insert here). A null/error from the RPC means "treat as still free" and fall
    // through to the normal flow (fail-open: never block a legitimate commit on a transient RPC error).
    // Only when the slot is provably gone (valid === false) do we short-circuit.
    let raceLostPreCheck = false;
    if (confirmBook && pbk?.start_time && pbk?.end_time && pbk?.service_type_id) {
      const preCalId = pbk.calendar_id ?? calendar_id;
      const { data: stillValid, error: preErr } = await supabase.rpc("validate_booking_security", {
        p_calendar_id: preCalId,
        p_service_type_id: pbk.service_type_id,
        p_start_time: pbk.start_time,
        p_end_time: pbk.end_time,
        p_customer_email: null,
      });
      // valid === false means the winner's row already occupies this slot (or it otherwise became
      // unbookable). true / null / error means fall through and let the normal commit flow run.
      if (!preErr && stillValid === false) raceLostPreCheck = true;
    }
    if (raceLostPreCheck) {
      const slotTakenReply = sanitizeReply(
        deterministicSlotTaken(
          [{ name: "book_appointment", result: { error: "niet_beschikbaar" } }],
          customerLanguage,
          true,
        ) ?? "",
      ) || "Sorry, dat tijdstip is net door iemand anders geboekt. Zal ik een ander moment voor je zoeken?";
      // Clear the stale pending_booking so a follow-up "ja" cannot re-trigger a doomed commit.
      if (conversationId) {
        const { pending_booking: _drop, ...restCtx } = convContext;
        await supabase.from("whatsapp_conversations").update({ context: restCtx }).eq("id", conversationId);
      }
      const send = await sendWhatsAppText(phone, slotTakenReply);
      if (conversationId) {
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          message_id: send.messageId ?? `agent-${now.getTime()}`,
          direction: "outbound",
          message_type: "text",
          content: slotTakenReply,
          status: send.ok ? "sent" : "failed",
        });
      }
      return new Response(
        JSON.stringify({ ok: true, reply: slotTakenReply, sent: send.ok, steps: 0, toolCalls: [], race_lost: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // --- Run the agent ---
    // R24 (AFFIRM-CONFIRM-FALSEPOS, second commit path): thread ambiguousConfirm through so
    // tools.ts can gate the model's own args.confirmed the same way confirmBook/confirmCancel
    // are already gated above, not just the server-forced arm.
    const { decls, execute } = createTools(supabase, { calendarId: calendar_id, calendars, serviceCalendarMap, phone, businessUserId, conversationId, confirmCancel, confirmBook, ambiguousConfirm, userMessage: String(message), customerLocale: customerLanguage != null ? "en" : "nl" });
    // B1: stopOnToolResult ends the loop right after a successful book/cancel/reschedule COMMIT, so
    // the model's compose call (call 2) is skipped on the primary turn (the ~2-2.5s win + removes the
    // ~40% preview-prose drift on commit turns; the reply is templated deterministically below).
    // R22 (T3-LATENCY-RETRY tail): the stall-retry now gets the SAME short-circuit (its accept-gate
    // no longer needs retry.text on a committed mutation, see retryCommitted below).
    let result = await runAgent({ system, contents, tools: decls, execute, maxSteps: 6, temperature: 0.2, stopOnToolResult: isCommittedMutation });

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

    // Cancel-commit-missed: the customer AFFIRMED a pending cancel (server-detected confirmCancel)
    // but no successful cancel ran this turn — the model narrated "geannuleerd" WITHOUT calling the
    // tool, falsely telling the customer the slot is freed while the booking stays live (round-6
    // BLOCKER, intermittent in the multi-booking path). Force the cancel via a nudge. The two-phase
    // commit re-resolves the SERVER-stored pending_cancel, so a nudge can only ever cancel the
    // correct booking, never the wrong one.
    const cancelCommitMissed = confirmCancel && !succeededMutation;

    // ITEM 12, Book-commit-missed (mirrors cancelCommitMissed): the customer AFFIRMED a fresh
    // pending booking (server-detected confirmBook) but no booking SUCCEEDED this turn. The model
    // either narrated "geboekt" without committing, asked another question, or re-ran a PREVIEW
    // instead of the commit (the C383 failure: a valid slot affirmed with "ja", yet the date was
    // lost and no row was written). Force the commit. book_appointment with confirmBook reuses the
    // SERVER-stored pending_booking slot, so the nudge can only ever book the exact previewed slot,
    // never a model-reconstructed (possibly wrong) date.
    // FQ-3 concurrency: a confirmed-commit turn whose book_appointment lost the previewed slot to a
    // concurrent booking (any of BOOK_RACE_LOSS_ERRORS). The DB bookings_no_overlap constraint already
    // guaranteed no double-book, but it is an ERRORED mutation, so succeededMutation stays false and
    // bookCommitMissed would fire, re-running the doomed commit (which fails again) and leaving the
    // model to improvise a confused reply ("Wat is je naam?", reproduced reliably). Suppress the
    // pointless nudge here; reply-assembly then templates an honest reply (deterministicSlotTaken),
    // so the no-double-book guarantee in code is matched by a clean customer-facing outcome.
    const slotTakenOnCommit = confirmBook && result.toolCalls.some(
      (t) => t.name === "book_appointment" && !!t.result && typeof t.result === "object" &&
        BOOK_RACE_LOSS_ERRORS.has(String((t.result as Record<string, unknown>).error)));
    const bookCommitMissed = confirmBook && !succeededMutation && !slotTakenOnCommit;

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

    // Empty-turn-no-action: the model returned NO text AND no successful mutation, e.g. a
    // reschedule-to-a-closed-day request where gpt-oss-20b sometimes emits nothing, so the
    // customer got the generic error fallback with no guidance. Nudge it once to actually
    // answer. Empty text AFTER a successful mutation is handled deterministically later, so
    // this targets only the no-success case. Excludes cancelCommitMissed (handled above).
    const emptyNoAction = !(result.text || "").trim() && !succeededMutation && !cancelCommitMissed;

    // P0-1: the reply OFFERS concrete clock times but the model called NO get_available_slots this
    // turn (and no book/reschedule that resolved real slots) -> the offer has zero server backing.
    // Nudge it to query first, so the deterministic guard in reply-assembly then has ground truth to
    // validate against. Gated on offer-context + actually-offered times (ranges/echoes excluded), so
    // info, recall and opening-hours replies never trigger it. !calledMutationTool excludes preview/
    // commit turns (those carry their own real slots / deterministic templating).
    const calledSlots = result.toolCalls.some((t) => t.name === "get_available_slots");
    const offeredTimesPrimary = extractOfferedClockTimes(result.text || "", String(message));
    const slotOfferUnbacked = !calledMutationTool && !calledSlots && offeredTimesPrimary.length > 0 &&
      OFFER_CONTEXT_RE.test(result.text || "");

    if (looksLikeStall || cancelPreviewMissed || confirmStall || bookPreviewMissed || reschedStall || cancelCommitMissed || bookCommitMissed || emptyNoAction || slotOfferUnbacked) {
      // T3-LATENCY-RETRY follow-up (R22): the stall-retry DOUBLES the turn's sequential LLM
      // round-trips, and when accepted, `result = retry` makes the primary call's step count
      // invisible in the response. Log which heuristic fired + both step counts so tail-latency
      // turns are diagnosable from the function logs. Log-only, no behavior change.
      const nudgeReason =
        cancelCommitMissed ? "cancelCommitMissed" : bookCommitMissed ? "bookCommitMissed" :
        reschedStall ? "reschedStall" : bookPreviewMissed ? "bookPreviewMissed" :
        cancelPreviewMissed ? "cancelPreviewMissed" : confirmStall ? "confirmStall" :
        emptyNoAction ? "emptyNoAction" : slotOfferUnbacked ? "slotOfferUnbacked" : "looksLikeStall";
      const nudgeText = cancelCommitMissed
        ? "[systeem] De klant bevestigde dat de zojuist voorgestelde afspraak geannuleerd mag worden, maar je hebt cancel_appointment niet (geslaagd) aangeroepen, dus er is NIETS geannuleerd. Roep NU cancel_appointment aan met confirmed:true om 'm echt te annuleren, en antwoord met het resultaat. Zeg NOOIT dat een afspraak geannuleerd is zonder de tool aan te roepen."
        : bookCommitMissed
        ? "[systeem] De klant bevestigde de zojuist voorgestelde afspraak, maar je hebt book_appointment niet (geslaagd) aangeroepen, dus er is nog NIETS geboekt. Roep NU book_appointment aan met confirmed:true om 'm echt te boeken. Het systeem gebruikt het in de preview opgeslagen tijdslot: geef de datum of tijd NIET opnieuw door en bereken niets na. Vraag niets extra's en zeg NOOIT dat er geboekt is voordat de tool 'ok' teruggaf."
        : reschedStall
        ? "[systeem] Je beschreef een verzetting naar een concrete tijd maar riep reschedule_appointment niet aan, dus er is NIETS verzet. Roep NU reschedule_appointment aan met date (YYYY-MM-DD) + time (HH:MM) van die nieuwe tijd. De genoemde tijd is de bevestiging: vraag niet om 'oké?' of 'klopt dat?', verzet meteen en antwoord met het resultaat ('Gedaan, je staat nu op ...')."
        : bookPreviewMissed
        ? "[systeem] Je beschreef een boeking maar riep book_appointment niet aan, dus er is nog NIETS gereserveerd. Roep NU book_appointment aan (stap 1 / preview) met de dienst, date (YYYY-MM-DD) + time (HH:MM) en de naam, zodat de afspraak echt wordt voorbereid. Beschrijf een boeking nooit zonder de tool aan te roepen."
        : cancelPreviewMissed
        ? "[systeem] De klant wil annuleren maar je riep cancel_appointment niet aan. Roep NU cancel_appointment aan (ZONDER confirmed) om de exacte afspraak terug te lezen en om bevestiging te vragen — beschrijf de annulering nooit in tekst zonder de tool aan te roepen."
        : confirmStall
        // R22 (tail): the "confirmed:true" sentence below kills a measured live flail where this
        // retry called book_appointment WITHOUT confirmed 3-6x in a row (each call just re-previews,
        // burning a full LLM round-trip + tool exec per call, then the whole retry gets discarded).
        // Safe by construction: tools.ts only commits when a server-stored pending_booking exists
        // (committing = confirmed && pendingBook, tools.ts ~917), so a stray confirmed:true can
        // never book anything except the exact previewed slot; without a preview it just previews.
        ? "[systeem] De klant bevestigde de zojuist voorgestelde actie. Voer 'm NU uit met de juiste tool (meestal reschedule_appointment naar het EXACTE tijdstip dat jij net voorstelde of dat de klant noemde; herbereken de tijd NIET zelf, gebruik letterlijk dat tijdstip; anders book_appointment of cancel_appointment). Heb je deze beurt al een boekings-preview met book_appointment gedaan, roep book_appointment dan opnieuw aan met ALLEEN confirmed:true (het systeem boekt exact het opgeslagen tijdslot; NIET nogmaals zonder confirmed aanroepen, dat maakt alleen weer een preview). Stel geen extra vraag en kondig niets aan: antwoord met het resultaat."
        : emptyNoAction
        ? "[systeem] Je gaf GEEN antwoord aan de klant. Beantwoord hun LAATSTE bericht kort en behulpzaam in hun taal: roep de juiste tool aan (get_available_slots / book_appointment / reschedule_appointment / cancel_appointment) als er een actie nodig is, of leg kort uit wat er kan. Vraagt de klant een dag die GESLOTEN is (zie <kalender>/<kalenders>), zeg dat dan eerlijk, noem de openingstijden en bied een open dag aan. Stuur nooit een lege of generieke foutmelding."
        : slotOfferUnbacked
        ? "[systeem] Je noemde concrete tijden zonder get_available_slots deze beurt aan te roepen. Verzin NOOIT zelf tijden. Roep NU get_available_slots aan voor de juiste dienst + datum (en bij meerdere agenda's de juiste calendar_index) en bied ALLEEN de tijden uit dat resultaat aan. Weet je de dienst of de dag nog niet, vraag die dan kort in plaats van een tijd te noemen."
        : "[systeem] Je kondigde een actie aan maar voerde 'm niet uit en riep geen tool aan. Voer de actie NU uit: roep direct de juiste tool aan (get_available_slots / book_appointment / reschedule_appointment / cancel_appointment) en antwoord met het resultaat, in de taal van de klant. Stuur geen 'ik check even'-bericht.";
      const nudged: Content[] = [
        ...contents,
        { role: "model", parts: [{ text: result.text }] },
        { role: "user", parts: [{ text: nudgeText }] },
      ];
      // T3-LATENCY-RETRY tail fix (R22). Two scoped, latency-only changes, no heuristic-decision
      // change:
      // (1) maxSteps 6 -> 3. The nudge asks for ONE concrete action; every ACCEPTED retry in the
      //     R22 log sample committed at step 0-1. The pathological case (measured live: a
      //     confirmStall retry re-PREVIEWING book_appointment 6x in a row without ever committing,
      //     then being discarded by the accept-gate) burned 6 sequential LLM calls + 6 tool execs
      //     for nothing, stretching the turn to 7-11s. 3 steps still covers the longest legitimate
      //     retry (read -> mutation -> compose); a retry that flails past that was NEVER accepted.
      // (2) stopOnToolResult: a retry that COMMITS skips its compose call, exactly like the
      //     primary (B1); reply-assembly below templates the confirmation deterministically from
      //     the tool result, so the composed prose was dead weight (~0.15-1.7s/turn).
      const retry = await runAgent({ system, contents: nudged, tools: decls, execute, maxSteps: 3, temperature: 0.2, stopOnToolResult: isCommittedMutation });
      // FQ-3 (ATTEMPT 2), secondary catch: the bookCommitMissed forced retry can ITSELF lose the
      // race (its book_appointment returns a BOOK_RACE_LOSS_ERROR). The normal accept-gate below
      // (MUTATION && !isErr) treats that errored mutation as "not done" and DISCARDS the retry, so
      // result.toolCalls never carries the race-loss and deterministicSlotTaken (which reads them)
      // returns null, leaving the model's confused prose. So when the retry lost the slot on a
      // confirmBook turn, ADOPT it anyway: result.toolCalls then carries the race-loss and
      // reply-assembly templates the honest reply. (The server-side pre-check above already catches
      // the dominant case before the agent runs; this covers a race that lands DURING the turn.)
      const retryRaceLost = (bookCommitMissed || confirmBook) && retry.toolCalls.some(
        (t) => t.name === "book_appointment" && !!t.result && typeof t.result === "object" &&
          BOOK_RACE_LOSS_ERRORS.has(String((t.result as Record<string, unknown>).error)));
      // For confirmStall, only adopt the retry if it actually performed a mutation (else keep
      // the original); for the other cases, adopt on any tool call or a non-filler reply.
      // R22: a COMMITTED retry is adopted unconditionally, text or no text. With stopOnToolResult
      // above, a committed retry returns empty text BY DESIGN (reply-assembly templates it via
      // deterministicConfirmation, the same path as a committed primary). This also closes a
      // latent pre-existing hazard: a retry whose mutation had ALREADY LANDED in the DB but whose
      // text came back empty used to be DISCARDED, leaving the customer a reply inconsistent with
      // the database. All previously-accepted retries remain accepted (the old conditions are
      // kept verbatim below).
      const retryCommitted = retry.toolCalls.some((t) => isCommittedMutation(t.name, t.result));
      const accept = retryRaceLost || retryCommitted || (!!retry.text && (
        (confirmStall || reschedStall || cancelCommitMissed || bookCommitMissed)
          ? retry.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result))
          : (retry.toolCalls.length > 0 || !ANNOUNCE_RE.test(retry.text))
      ));
      console.log(
        `[stall-retry] reason=${nudgeReason} accepted=${accept} primary_steps=${result.steps}` +
        ` retry_steps=${retry.steps} primary_tools=${result.toolCalls.map((t) => t.name).join(",") || "-"}` +
        ` retry_tools=${retry.toolCalls.map((t) => t.name).join(",") || "-"}`,
      );
      if (accept) {
        result = retry;
      }
    }

    // B1: on a turn that COMMITTED a book/cancel/reschedule, the confirmation is deterministic
    // (NL/EN template from the tool result). The PRIMARY runAgent call already skipped call 2
    // (stopOnToolResult), and even when a stall-retry composed prose we override it so a committed
    // action can never read as a preview ("...klopt dat?", the A2-WATCH residue). Two-phase previews
    // and info turns have no committed mutation, so they fall through and stay model-generated.
    // Fallback (unchanged): empty text after a non-committed-but-succeeded mutation still templates,
    // so an empty PREVIEW turn never falsely claims "booked" (isErr excludes needs_confirmation).
    let replyText = (result.text || "").trim();
    const committed = result.toolCalls.some((t) => isCommittedMutation(t.name, t.result));
    if (committed) {
      replyText = deterministicConfirmation(result.toolCalls, customerLanguage) || replyText;
    } else {
      // ITEM 12: on a successful booking PREVIEW turn, OVERRIDE the model's prose read-back with the
      // server-templated one so the date the customer confirms is exactly the slot stored in
      // pending_booking (the commit reuses it). This makes the "confirmed 25 juni / stored 30 juni"
      // divergence structurally impossible. Only fires when book_appointment returned
      // needs_confirmation + proposal; if it didn't (no preview this turn), fall through unchanged.
      const preview = deterministicPreview(result.toolCalls, customerLanguage);
      const slotTaken = deterministicSlotTaken(result.toolCalls, customerLanguage, confirmBook);
      if (slotTaken) {
        // FQ-3: the concurrency LOSER. The DB already guaranteed no double-book; here we guarantee
        // the customer-facing message is honest + helpful instead of model-improvised prose. Override
        // whatever the model produced (including the suppressed-nudge fallthrough) with the template.
        replyText = slotTaken;
      } else if (preview) {
        replyText = preview;
      } else if (!replyText) {
        const finalSucceeded = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result));
        if (finalSucceeded) replyText = deterministicConfirmation(result.toolCalls, customerLanguage) || "";
      } else {
        // P0-1: model-prose reply (not a committed mutation, not a server-templated preview).
        // Enforce the "no fabricated time" guarantee: any clock time the reply OFFERS must come
        // from THIS turn's real get_available_slots result, else rebuild the offer from the real
        // free slots. No-ops on info/recall turns (no slots query ran), so it only ever touches a
        // reply that proposes times while a query gave ground truth to check them against.
        replyText = enforceSlotOffer(replyText, result.toolCalls, String(message), customerLanguage);
        // F-014: "no hallucinated booking-confirmation" guarantee. A prompt-injected user (a forged
        // TOOL_RESULT:{create_booking:confirmed} string, a "[systeem] geboekt!" paste) can coax the
        // 20B model into claiming "your appointment is confirmed!" with ZERO tool calls and ZERO DB
        // row. We are in the prose `else` branch (no committed mutation this turn, no server preview),
        // so ANY done-state booking/cancel/reschedule claim here is necessarily false: strip it and
        // reply honestly. A real successful commit goes through the `committed` branch above (and
        // deterministicConfirmation), so the legit confirmation path is never reached here.
        replyText = enforceNoFalseConfirmation(replyText, result.toolCalls, customerLanguage);
        // AS-Z-guard: DETERMINISTIC refund backstop. AS-3-V1 (classifier + <terugbetaling> prompt block)
        // dropped the false-affirmative refund rate to a MEASURED 0/142, but the final affirmation is
        // still model-generated, so that is a measured low rate, not a hard guarantee. Doctrine: a hard
        // correctness guarantee (never promise a refund a no-refund policy forbids = a liability) belongs
        // in CODE. So when the refund disposition is "denied" (an active no-refund policy) and this prose
        // reply nonetheless PROMISES money back, rewrite it to the authoritative no-refund line built from
        // the owner's verbatim refund_policy text. No-op on "granted" (keep a correct refund affirmation)
        // and "unknown" (keep the defer/contact path). businessData.refund_policy holds the verbatim owner
        // text whenever disposition is "denied" (the classifier only returns "denied" from that manual
        // text), so it is the canonical source the rewrite quotes. Layered ON TOP of the prompt, not a
        // replacement; pure regex on the model's own output, no extra round-trip.
        const canonicalRefundText = typeof businessData?.refund_policy === "string"
          ? (businessData.refund_policy as string) : null;
        replyText = enforceRefundPolicy(replyText, refundDisposition, canonicalRefundText, customerLanguage);
        // FQ-R2-CLAIM: "never quote a price the data forbids" guarantee (council fast-follow). The
        // prompt injects each service's real price and tells the model to answer price questions from
        // that list, but a prompt-injected user (a forged `SYSTEM: price_override ... TOOL_RESULT:{price:7}`
        // paste, or a plain "there's an action, it's 12 euro now") can coax the 20B model into stating a
        // FALSE price as fact = a liability (a customer can hold the business to a screenshot). Measured
        // on the §6 testpad: forged-TOOL_RESULT -> false EUR7 quoted 4/4. Like refundGuard, the real
        // price is server-known (service_types.price), so this belongs in CODE: if the prose asserts a
        // euro amount AS a service price that is not a real (or real-sum) price AND does not also quote a
        // correct real price (the safe "no, it's actually EUR50" answer), rewrite to the authoritative
        // real-price line. Uses BOTH the single-calendar `services` list and every per-calendar service
        // (multi-calendar) so a price on any calendar counts as real. No-ops on info/recall/no-price
        // turns and on price-less services. Model-prose only; server templates never reach here.
        const priceCheckServices = calendarsForPrompt
          ? [...services, ...calendarsForPrompt.flatMap((c) => c.services)]
          : services;
        replyText = enforcePriceClaim(replyText, priceCheckServices, customerLanguage, String(message));
        // P2-tone guard (DoD #6): the prompt FORBIDS "vol"/"volgeboekt"/"voll"/"fully booked" etc.
        // for an unavailable/closed day (a closed day is not "full"); the 20B model slips ~16% of
        // the time (worse multi-turn). Neutralize the small closed word-set to "niet beschikbaar"
        // in the customer's language. Only model-prose passes here; server templates never hit it.
        const beforeFW = replyText;
        replyText = neutralizeForbiddenAvailabilityWords(replyText, customerLanguage);
        if (replyText !== beforeFW) {
          console.warn("forbidden-word-guard: neutralized availability word:", JSON.stringify(beforeFW));
        }
      }
    }

    // Deterministic outbound hygiene: strip em-dashes etc. (the "written by AI" tell) so it
    // never depends on the model obeying the prompt rule. Applied once, used for BOTH the
    // WhatsApp send and the persisted transcript so they always match.
    const reply = sanitizeReply(replyText) ||
      "Sorry, daar ging even iets mis. Kun je het nog een keer sturen? 🙏";

    // One-question-per-turn discipline (ITEM 4): the prompt (<role>/<booking_flow>) asks for
    // exactly one clear next step per turn, but a 20B/temp-0.2 model does not always hold it
    // (persona-probe: it bundled service + day/time + staff into one message). Flag, never
    // rewrite, a reply that stacks two or more questions: a tone slip is not a wrong-DB-state,
    // so mangling a legit binary offer ("om 10:00 of 14:00?") would be worse than the slip.
    // The warn makes the slip visible in the edge logs and provable on the testpad (defense-in-depth).
    const questionCount = countCustomerQuestions(reply);
    if (questionCount >= 2) {
      console.warn(
        `one-question-guardrail: reply stacks ${questionCount} questions (expected 1):`,
        JSON.stringify(reply),
      );
    }

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
    // FQ-B-ERRLEAK (sev-2): the real error is logged SERVER-SIDE ONLY. It must NEVER reach the
    // end-client. The previous code returned `{error: String(e.message)}` in the response BODY,
    // which leaked the raw "LLM 400: {tool call validation failed ... missing 'customer_name'}"
    // (and the tool schema) to any caller that reads the body (the §6 testpad, and the customer
    // path if the body is ever surfaced). gpt-oss-20b reliably throws that on a book_appointment
    // with missing params (~1/3 of book-commit turns). Now: log the detail here, send the customer
    // a localized graceful fallback (the same graceful reply they already got over WhatsApp), and
    // return ONLY a generic, leak-free body. No internal error string, no schema, no stack ever
    // crosses the boundary to the end-client.
    console.error("whatsapp-agent error:", e);
    // Localize the fallback best-effort from the raw inbound (we may have thrown before
    // customerLanguage was computed). null => Dutch default.
    let fallbackLang: string | null = null;
    try {
      fallbackLang = detectCustomerLanguage(String(fallbackMessage ?? ""));
    } catch (_) { /* detection must never throw the catch */ }
    const fallbackReply = sanitizeReply(
      fallbackLang != null
        ? "Sorry, something went wrong on our side. Please send your message again in a moment and I'll help you further."
        : "Sorry, er ging even iets mis aan onze kant. Stuur je bericht zo nog een keer, dan help ik je verder.",
    );
    // Best-effort: send the fallback so a thrown run never leaves the customer in silence (the
    // inbound is already recorded + Meta already 200'd, so it won't be retried). Never throws.
    let fallbackSent = false;
    if (phoneForFallback) {
      try {
        const s = await sendWhatsAppText(phoneForFallback, fallbackReply);
        fallbackSent = !!s.ok;
      } catch (_) { /* swallow: keep the response leak-free regardless */ }
    }
    // Leak-free body: a generic code + the SAME graceful reply the customer saw. The raw error
    // stays in the server logs only. Status 200 because we DID handle the turn (the customer got a
    // coherent reply); a non-leaking generic 200 is safer than echoing a 500 with internal detail.
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", reply: fallbackReply, sent: fallbackSent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
