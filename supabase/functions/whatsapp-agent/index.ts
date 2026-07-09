// whatsapp-agent — the AI WhatsApp bookings agent (port off n8n).
// Invoked by whatsapp-webhook (service-role, internal) after it has persisted the
// inbound message via process_whatsapp_message. Loads conversation history, runs a
// Gemini Flash-Lite tool-calling loop, replies via the Meta Graph API, and persists
// the outbound message.
//
// Body: { phone, calendar_id, message, contact_name? }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { buildSystemPrompt, DEFAULT_WHATSAPP_WELCOME, type ServiceInfo } from "./prompt.ts";
import { createTools, fetchBusinessData, formatCancellationPolicyNL, formatHoursNL, getCalendarDateOverrides, getCalendarPolicy, getCalendarWeeklyHours, nlWhen } from "./tools.ts";
import { classifyHardConfirm } from "./hardConfirmGate.ts";
import { enforceSlotOffer, extractOfferedClockTimes, noQueryGroundedReply, OFFER_CONTEXT_RE } from "./slotOfferGuard.ts";
import { buildDeterministicDateAlternatives, extractOfferedDates, noNearbyOpenDateReply } from "./dateOfferGuard.ts";
import { extractRelativeDayHint, formatRelativeDateHint } from "./relativeDateHint.ts";
import { enforceNoFalseConfirmation, noFalseConfirmReply } from "./confirmationGuard.ts";
import { enforceRefundPolicy } from "./refundGuard.ts";
import { enforceAppointmentNameDisclosure, identityVerificationResolved, mentionsOwnAppointmentClaim, enforceVerificationGateDisclosure, enforceExistingAppointmentDisclosure, enforceRescheduleAmbiguityDisclosure, messageNamesPendingBookOwner, type AppointmentForDisclosure } from "./identityDisambiguationGuard.ts";
import { enforcePriceClaim } from "./priceGuard.ts";
import { enforceNoPolicyHallucination } from "./policyClaimGuard.ts";
import { enforceNoOwnerEscalationClaim, noOwnerEscalationReply } from "./ownerEscalationGuard.ts";
import { classifyOwnerEscalationClaimRobust } from "./ownerEscalationClassifier.ts";
import { buildGroundingSummary, classifyBusinessDataGroundingRobust, noUngroundedClaimReply } from "./businessDataGuard.ts";
import { classifyRefundDisposition } from "./refundClassifier.ts";
import { neutralizeForbiddenAvailabilityWords } from "./forbiddenWordGuard.ts";
import { shouldBlockForMissingServiceChoice, shouldBlockForAmbiguousBranch, findDistinctServiceForReschedule, shouldBlockReturningServiceDefault, mentionsAnyServiceName, enforceReturningServiceDisclosure, mentionsDistinguishing, type RecencyWindowMessage, type RecencyWindowDirection } from "./serviceDisambiguationGuard.ts";
import { computePendingBookInterveningExchange } from "./pendingBookGuard.ts";
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

// R28 (T3-LATENCY-PAYOFF): run the outbound WhatsApp send (and its dependent DB writes)
// AFTER this function's own HTTP response is returned. R27-verify's instrumentation found
// the synchronous `await sendWhatsAppText` cost 526-765ms on EVERY payoff/commit turn, on
// top of the genuine LLM-call chain, keeping the <3s warm p50 gate open. Meta delivery is
// inherently async already (single/double ticks arrive independently via webhook), so the
// customer-facing "turn is done" signal for gate purposes is this function's own response,
// not Meta's accept of the POST. Same helper as `whatsapp-webhook/index.ts` (proven in
// production there): `EdgeRuntime.waitUntil` keeps the isolate alive for the background
// promise so it is not killed the instant the response is written; falls back to bare
// fire-and-forget with `.catch()` logging if the runtime ever lacks it. Errors inside the
// background promise are always caught and logged server-side, never thrown into the void.
function runInBackground(p: Promise<unknown>): void {
  const er = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } }).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(p.catch((e) => console.error("bg task error:", e)));
  else p.catch((e) => console.error("bg task error:", e));
}

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
// WEEKLYHOURS-IGNORES-OVERRIDES (R38): dateOverrides is an OPTIONAL per-exact-date map
// (from getCalendarDateOverrides, keyed "YYYY-MM-DD") applied on top of the recurring
// day-of-week byDay status, so a one-off availability_overrides row (holiday-hours,
// special closure) is reflected in this table instead of silently invisible. Semantics
// mirror get_available_slots exactly: an override with isAvailable=false always wins
// (closed even on a recurring-open day); isAvailable=true with explicit start/end
// replaces the day's window; isAvailable=true with no times has no effect (falls back
// to the recurring status). Absent map / no row for a date = unchanged prior behaviour.
function buildCalendarHint(
  now: Date,
  byDay: Record<string, { open: boolean; start?: string; end?: string }> | null,
  includeStatus = true,
  dateOverrides?: Record<string, { isAvailable: boolean; start?: string; end?: string }>,
): string | null {
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
      const ov = dateOverrides?.[iso];
      let status: string;
      if (ov && !ov.isAvailable) {
        status = "GESLOTEN";
      } else if (ov && ov.isAvailable && ov.start && ov.end) {
        status = `open ${ov.start}-${ov.end}`;
      } else {
        status = st?.open ? `open ${st.start}-${st.end}` : "GESLOTEN";
      }
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
// R11 (round 11, bug B fix): format a REAL, DB-sourced installment split into customer-facing
// text. Only ever called with data book_appointment itself read from service_installment_configs
// at preview time (tools.ts); never invents or infers a percentage/amount, matching this file's
// existing "deterministic template over model prose" discipline for price/name disclosure.
function money(n: number): string {
  return `€${n.toFixed(2).replace(/\.00$/, "")}`;
}

function formatInstallmentSplit(
  info: { price: number | null; parts?: Array<{ percentage: number; timing: string; hours?: number }>; fixedDepositAmount?: number } | null | undefined,
  en: boolean,
): string | null {
  if (!info) return null;
  const timingText = (timing: string, hours?: number) => {
    if (timing === "now") return en ? "now" : "nu";
    if (timing === "appointment") return en ? "at the appointment" : "bij de afspraak";
    if (timing === "hours_after") return en ? `${hours ?? "a few"}h after booking` : `${hours ?? "een paar"} uur na het boeken`;
    return timing;
  };
  if (typeof info.fixedDepositAmount === "number") {
    return en
      ? `a deposit of ${money(info.fixedDepositAmount)} now, the rest at the appointment`
      : `een aanbetaling van ${money(info.fixedDepositAmount)} nu, de rest bij de afspraak`;
  }
  if (info.parts && info.parts.length > 0) {
    const segs = info.parts.map((p) => {
      const amt = typeof info.price === "number" ? ` (${money(Math.round(info.price * p.percentage) / 100)})` : "";
      return `${p.percentage}% ${timingText(p.timing, p.hours)}${amt}`;
    });
    return segs.join(", ");
  }
  return null;
}

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
  // R11 (round 11, bug B fix): append the real, DB-sourced installment split (if this service has
  // one enabled and payment is required) to the preview, so the customer sees the actual payment
  // terms and total price BEFORE confirming, never silently skipped past into a payment attempt.
  const splitText = formatInstallmentSplit(pv.installment, en);
  const splitSentence = splitText
    ? (en
      ? ` Payment: ${splitText}${typeof pv.installment?.price === "number" ? ` (total ${money(pv.installment.price)})` : ""}.`
      : ` Betaling: ${splitText}${typeof pv.installment?.price === "number" ? ` (totaal ${money(pv.installment.price)})` : ""}.`)
    : "";
  if (en) {
    const head = svc ? `I'll put you down for ${svc} on ${when}` : `I'll put you down for ${when}`;
    return (name ? `${head} in the name of ${name}. Is that correct?` : `${head}. Is that correct?`) + splitSentence;
  }
  const head = svc ? `Ik zet ${svc} op ${when}` : `Ik zet je op ${when}`;
  return (name ? `${head} op naam ${name}, klopt dat?` : `${head}, klopt dat?`) + splitSentence;
}

// R20 (SILENT-DROP-ON-COMPOUND-REQUEST fix, full-journey simulation R19/R20). Root cause: on a
// successful book_appointment PREVIEW, deterministicPreview above UNCONDITIONALLY overrides the
// model's own prose with a template that only ever renders the ONE previewed service. A prompt-only
// instruction to "mention the second service" (tried first this round) has ZERO effect here, since
// the model's prose is discarded regardless of what it said -- this was live-reproduced twice after
// the prompt-only fix was deployed (both re-tests still silently dropped the second service). Real
// fix has to live at the template layer: independently detect, from the RAW customer message, any
// OTHER configured service (a different one than what was just previewed) that this compound-request
// business's customer named in the SAME message, and deterministically APPEND an honest "one at a
// time" acknowledgement naming it, so the customer is never left with a second request that vanished
// with no trace. Only engages in multi-calendar mode (>=2 calendars in calendarsForPrompt); a
// single-calendar business has no "second service" concept this guard needs to protect. Reuses
// serviceDisambiguationGuard.ts's own mentionsDistinguishing primitive (same word-level match used
// throughout this codebase for "did the customer name X"), so behaviour is consistent with every
// sibling guard, not a new ad-hoc heuristic.
function findUnacknowledgedSecondService(
  calendarsForPrompt: Array<{ name: string; services: Array<{ name: string }> }> | null,
  previewedServiceName: string | null,
  rawMessage: string,
): { serviceName: string; personOrLocation: string } | null {
  if (!calendarsForPrompt || calendarsForPrompt.length < 2 || !rawMessage.trim()) return null;
  const prevNorm = (previewedServiceName ?? "").trim().toLowerCase();
  const excludeWords = new Set(prevNorm.split(/\s+/).filter((w) => w.length >= 3));
  for (const cal of calendarsForPrompt) {
    for (const svc of cal.services) {
      const name = (svc.name ?? "").trim();
      if (!name) continue;
      if (name.toLowerCase() === prevNorm) continue; // this IS the service that was just previewed
      if (mentionsDistinguishing(rawMessage, name, excludeWords)) {
        return { serviceName: name, personOrLocation: cal.name };
      }
    }
  }
  return null;
}

function appendSecondServiceAck(
  previewText: string,
  second: { serviceName: string; personOrLocation: string } | null,
  customerLanguage: string | null,
): string {
  if (!second) return previewText;
  const en = customerLanguage != null;
  return previewText + (en
    ? ` By the way, I can only schedule one appointment at a time; as soon as this one is confirmed, I'll help you book ${second.serviceName} at ${second.personOrLocation} right after.`
    : ` Ik kan trouwens maar één afspraak tegelijk inplannen; zodra deze bevestigd is, plan ik meteen ook ${second.serviceName} bij ${second.personOrLocation} in.`);
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
  knownSelfName?: string | null,
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
    // R110 (IDEMPOTENT-REBOOK-DISCLOSURE-BYPASS fix): book_appointment's own ok:true result now
    // carries customer_name whenever the tool result is an ALREADY-COMMITTED slot echo (a fresh
    // preview never sets it; see tools.ts's R110 comment on the idempotent-hit branch). This is the
    // SAME disclosure test isRealName/nameMismatch already run everywhere else in this codebase
    // (identityDisambiguationGuard.ts): a real, distinct customer_name that differs from the
    // CURRENT speaker's own knownSelfName means this turn's speaker is not who the booking is
    // actually under, so the reply must say whose booking it is instead of a bare "Gelukt!" that
    // reads as if it belongs to whoever is texting right now. Mirrors cancel/reschedule's own R102
    // customer_name-in-reply pattern exactly; this was the ONE mutation-commit reply path that
    // never ran any disclosure check at all (deterministicConfirmation/isCommittedMutation bypassed
    // enforceAppointmentNameDisclosure/enforceNoFalseConfirmation entirely, since neither is ever
    // called on this template branch).
    const bookName = typeof book.customer_name === "string" && book.customer_name.trim() ? book.customer_name.trim() : null;
    const selfMatches = !bookName || (typeof knownSelfName === "string" && knownSelfName.trim() &&
      knownSelfName.trim().toLowerCase() === bookName.toLowerCase());
    // R130 (PRICE-INTEGRITY fix): book_appointment's own commit re-reads service_types.price
    // FRESH at commit time (never the stale preview-time value) and snapshots it onto the
    // booking row; when that commit-time price genuinely differs from what the preview showed
    // the customer, tools.ts sets price_changed:true + new_price/previous_price on the result.
    // Mirrors the SAME "deterministic reply-honesty over free model prose" discipline this
    // codebase already applies to identity disclosure (R102/R103's customer_name-in-reply,
    // enforceAppointmentNameDisclosure) -- a price change is at least as safety-relevant as a
    // name mismatch, and prompt-only instructions have already proven unreliable for this class
    // of "must always disclose X" requirement at this model's scale, so this is templated here
    // rather than left to the model to remember to mention. Prefixed onto EVERY branch below
    // (payment-link, cross-identity, and the common clean confirm) so the disclosure can never
    // be silently dropped by whichever branch happens to also apply this turn.
    const priceNote = book.price_changed === true && typeof book.new_price === "number" && typeof book.previous_price === "number"
      ? (en
        ? `Note: the price for this service has changed since the earlier preview (was €${book.previous_price}, now €${book.new_price}); you've been booked at the CURRENT price. `
        : `Let op: de prijs van deze dienst is gewijzigd sinds de eerdere preview (was €${book.previous_price}, is nu €${book.new_price}); je bent geboekt tegen de HUIDIGE prijs. `)
      : "";
    if (book.payment_url) {
      return en
        ? `${priceNote}Your spot is reserved for ${bookWhen}. Please complete the payment here to confirm: ${book.payment_url}`
        : `${priceNote}Je plek is gereserveerd voor ${bookWhen}. Rond de betaling af via deze link om te bevestigen: ${book.payment_url}`;
    }
    if (bookName && !selfMatches) {
      return en
        ? `${priceNote}That appointment for ${bookWhen} is already booked, under the name ${bookName}. 🎉`
        : `${priceNote}Die afspraak voor ${bookWhen} staat al geboekt, op naam van ${bookName}. 🎉`;
    }
    return en
      ? `${priceNote}Done! You're booked for ${bookWhen}. 🎉`
      : `${priceNote}Gelukt! Je staat genoteerd voor ${bookWhen}. 🎉`;
  }
  const resched = okResult("reschedule_appointment");
  if (resched?.rescheduled?.to) {
    const reWhen = en ? enWhen(resched.rescheduled.to_start_time, resched.rescheduled.to) : resched.rescheduled.to;
    // R48: a multi-calendar reschedule may also have switched staff/location (new_agenda set
    // only when it actually changed calendar). Mention it here too, so this Groq-empty-text
    // fallback path stays as complete as the model's own normal composed reply.
    const newAgenda = typeof resched.new_agenda === "string" ? resched.new_agenda : null;
    // R103 (GAP 1 fix): reschedule_appointment's own ok:true result ALREADY carries
    // rescheduled.customer_name whenever a real, distinct name is on file (see tools.ts's own
    // R102 comment near its reschedule commit), specifically so this final reply can name whose
    // appointment it is instead of a generic "je afspraak". This function is the SAME deterministic,
    // code-level template that ALWAYS overrides the model's own text on a committed turn (index.ts's
    // `committed` branch calls this unconditionally), so the name was previously being silently
    // dropped here even though the data was already present and the identity-verification QUESTION
    // one turn earlier correctly named it. Mirrors the enforceAppointmentNameDisclosure backstop
    // pattern (deterministic rewrite from real data, not a prompt instruction) rather than trusting
    // the model to re-state a name it never even sees rendered into this template.
    const reName = typeof resched.rescheduled.customer_name === "string" && resched.rescheduled.customer_name.trim()
      ? resched.rescheduled.customer_name.trim()
      : null;
    if (newAgenda) {
      return en
        ? (reName ? `Done, ${reName}'s appointment is now on ${reWhen} with ${newAgenda}.` : `Done, your appointment is now on ${reWhen} with ${newAgenda}.`)
        : (reName ? `Gedaan, de afspraak van ${reName} staat nu op ${reWhen} bij ${newAgenda}.` : `Gedaan, je afspraak staat nu op ${reWhen} bij ${newAgenda}.`);
    }
    return en
      ? (reName ? `Done, ${reName}'s appointment is now on ${reWhen}.` : `Done, your appointment is now on ${reWhen}.`)
      : (reName ? `Gedaan, de afspraak van ${reName} staat nu op ${reWhen}.` : `Gedaan, je afspraak staat nu op ${reWhen}.`);
  }
  const cancel = okResult("cancel_appointment");
  if (cancel?.cancelled) {
    // R103 (GAP 1 fix, same reasoning as reschedule above): cancel_appointment's own ok:true result
    // already carries cancelled.customer_name (tools.ts's own R102 comment near its cancel commit),
    // added specifically so this reply could disclose it; this template simply never read the field.
    const cancelName = typeof cancel.cancelled.customer_name === "string" && cancel.cancelled.customer_name.trim()
      ? cancel.cancelled.customer_name.trim()
      : null;
    return en
      ? (cancelName ? `Done, ${cancelName}'s appointment has been cancelled.` : `Done, your appointment has been cancelled.`)
      : (cancelName ? `Gedaan, de afspraak van ${cancelName} is geannuleerd.` : `Gedaan, je afspraak is geannuleerd.`);
  }
  // R40: update_booking_name commit. no_change (name was already that) is deliberately NOT
  // handled here: it never satisfies isCommittedMutation (no r.renamed), so stopOnToolResult
  // never fires for it and the model composes that reply normally, same as any other tool result
  // that isn't a genuine commit.
  const renamed = okResult("update_booking_name");
  if (renamed?.renamed) {
    return en
      ? `Done, the name on your appointment (${renamed.renamed.when}) is now ${renamed.renamed.new_name}.`
      : `Gedaan, de naam op je afspraak (${renamed.renamed.when}) is nu ${renamed.renamed.new_name}.`;
  }
  // R118 (GAP 2 fix): update_lead's own booking_renamed:true commit (a post-commit name-correction
  // it detected and propagated to the real booking row, see tools.ts). Deliberately generic (no
  // stored "when"/old-name fields on this result shape, unlike update_booking_name's own renamed
  // object), but this is still a genuine committed mutation, so it gets the SAME deterministic,
  // code-templated reply guarantee as every other commit here, never left to free model prose.
  const leadRename = okResult("update_lead");
  if (leadRename?.booking_renamed === true) {
    const newName = typeof leadRename.new_name === "string" && leadRename.new_name.trim() ? leadRename.new_name.trim() : null;
    return en
      ? (newName ? `Got it, your appointment is now under the name ${newName}.` : `Got it, your appointment is now under the name you just gave.`)
      : (newName ? `Gelukt, je afspraak staat nu op naam van ${newName}.` : `Gelukt, je afspraak staat nu op de naam die je net gaf.`);
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
// R40: update_booking_name commit carries ok:true + renamed (mirrors cancel's ok:true + cancelled
// shape); its own no-op short-circuit (ok:true + no_change, no DB write) is deliberately EXCLUDED
// here (same reasoning as a PREVIEW: nothing was committed, so it must not stop the loop early or
// be treated as a succeeded mutation downstream).
function isCommittedMutation(name: string, result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, any>;
  if (r.ok !== true) return false;
  if (name === "book_appointment") return true;
  if (name === "cancel_appointment") return !!r.cancelled;
  if (name === "reschedule_appointment") return !!(r.rescheduled && r.rescheduled.to);
  if (name === "update_booking_name") return !!r.renamed;
  // R118 (GAP 2 fix): update_lead's own NEW booking_renamed:true shape (tools.ts) is a genuine
  // committed mutation on an EXISTING booking row too (a post-commit name-correction that update_lead
  // detected and propagated), same "real DB write happened" bar as update_booking_name's own renamed
  // field, so it must be recognized here identically for stopOnToolResult/deterministicConfirmation
  // to template an honest reply instead of falling through to (or being stripped by) the model-prose
  // guard below.
  if (name === "update_lead") return r.booking_renamed === true;
  return false;
}

// R96 (PHANTOM-SUCCESS-ZERO-MUTATION fix, NEW-1, structural backstop). `deterministicConfirmation`
// ALREADY templates the customer-facing success line directly FROM this turn's own tool-call
// result (never from free model prose) whenever `isCommittedMutation` is true, and
// `enforceNoFalseConfirmation` ALREADY strips a hallucinated claim on the model-prose branch when
// NO mutation committed at all. Both are sound for the cases this codebase's own architecture can
// trace. This function is the belt-and-suspenders THIRD layer the loop's own doctrine calls for on
// a booking-integrity finding of this severity (mirrors R61's `isCommittedMutation`-keyed design,
// "verify the claimed outcome matches the real outcome" applied one level deeper): it extracts the
// row identity (booking_id) THIS TURN's committed mutation actually claims, so the caller can
// cross-check it against a real DB row before ever shipping the reply, closing the gap even if a
// FUTURE change to the retry/adoption logic, a provider-format quirk, or an as-yet-unknown model
// failure mode ever produced a `committed===true` match whose underlying tool result did not
// correspond to a real row (the exact "told success, zero DB trace" shape NEW-1 described). Returns
// null when no committed mutation exists this turn (nothing to verify) or the tool result carries
// no identifiable booking_id (update_booking_name's rename result has no booking_id field, so it is
// out of scope for this check; its own hardConfirm/ambiguousConfirm/cleanlyConfirmed gate stack is
// unaffected and unchanged).
function committedMutationBookingId(toolCalls: { name: string; result: unknown }[]): string | null {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (!isCommittedMutation(t.name, t.result)) continue;
    const r = t.result as Record<string, unknown>;
    if (typeof r.booking_id === "string" && r.booking_id) return r.booking_id;
  }
  return null;
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
  // IUX R61: hoisted so the catch block below can best-effort release any confirm-burst claim
  // this request is holding if the turn throws mid-flight (e.g. the model's own tool-call
  // validation error, a known ~1/3-of-book-commit-turns gpt-oss-20b failure mode per FQ-B-ERRLEAK
  // above) BEFORE reaching the normal post-hoc release site, so a thrown turn does not needlessly
  // hold the claim for the full 20s TTL when the real outcome (no commit happened) is already
  // knowable at the moment of the throw. Same hoisting pattern as phoneForFallback/fallbackMessage.
  let bookClaimIdForFallback: string | undefined;
  let cancelClaimIdForFallback: string | undefined;
  // R22 (full-journey sim loop, sev-1 finding): the graceful fallback reply sent from the catch
  // block below was never persisted to `whatsapp_messages`, so a thrown turn (e.g. the gpt-oss-20b
  // malformed-tool-call-name 400 documented at LLM_CALL_TIMEOUT_MS above) is invisible to every
  // DB-based verification path (this loop's own method, any future support/audit query), even
  // though the customer's WhatsApp thread DOES receive the apology text. Hoisted so the catch can
  // insert it once conversationId is known.
  let conversationIdForFallback: string | null = null;

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

    // WEEKLYHOURS-IGNORES-OVERRIDES (R38): the SAME 14-day window buildCalendarHint renders
    // below, computed here (Amsterdam-local, DST-safe via the same 11:00 UTC mid-day trick
    // buildCalendarHint itself uses) so the override fetch below is bounded and cheap, no
    // added round-trip (same Promise.all phase-1 batch).
    const hintTodayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
    const [hintY, hintM, hintD] = hintTodayStr.split("-").map(Number);
    const hintFromISO = hintTodayStr;
    const hintToISO = new Date(Date.UTC(hintY, hintM - 1, hintD + 13, 11, 0, 0))
      .toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });

    // --- Load context (own loader; get_conversation_context RPC is buggy) ---
    // Latency: these reads were sequential (~8 round-trips ≈ 250-400ms of pure wait).
    // They are now batched into 3 dependency phases so independent reads run in parallel.
    // Phase 1 — everything that needs only (calendar_id, phone):
    const [calRes, svcRes, csRes, contactRes, lastBRes, weeklyHours, psRes, dateOverrides, upcomingBRes] = await Promise.all([
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
      // WEEKLYHOURS-IGNORES-OVERRIDES (R38): per-exact-date overrides for the SAME 14-day
      // window buildCalendarHint renders, so the concrete-date <kalender> table (the model's
      // literal per-date source of truth, no tool call) reflects a one-off override instead
      // of silently falling back to the recurring day-of-week status. Independent of
      // (user_id, contact_id), belongs in this phase.
      getCalendarDateOverrides(supabase, calendar_id, hintFromISO, hintToISO),
      // R96 (RESCHEDULE-HIJACK fix, R95-1): the customer's own NEXT UPCOMING booking on this
      // calendar (scoped exactly like tools.ts's resolveTarget's own single-calendar case; the
      // rare multi-calendar cross-calendar case is covered too since findDistinctServiceForReschedule
      // only needs the LIKELY target's current service name to detect a mismatch, and a wrong guess
      // here only ever fails safe -- see the guard module's own false-positive-safety reasoning).
      // Independent of (user_id, contact_id), belongs in this phase; single extra indexed read.
      supabase.from("bookings").select("service_types(name)")
        .eq("customer_phone", phone).eq("calendar_id", calendar_id)
        .in("status", ["confirmed", "pending"]).gt("start_time", new Date().toISOString())
        .order("start_time", { ascending: true }).limit(1).maybeSingle(),
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

    // R120 (BOOK-COMMIT-FIRST-MESSAGE-FALSE-POSITIVE fix, see identityDisambiguationGuard.ts's
    // crossIdentityBookRisk for the full root-cause/design reasoning): does THIS phone have ANY
    // real booking on file anywhere in the owner's calendar allowlist (any status, any time)?
    // Scoped exactly like tools.ts's resolveTarget() (phone + the whole calendars allowlist, never
    // just the single entry calendar_id, so a customer known on a DIFFERENT one of the owner's
    // calendars still correctly counts as a genuine prior identity). This is the ONLY new query
    // this fix adds (a single indexed head-count check, `limit(1)` + `head:true`, cheapest
    // possible existence check); every other read in this function is unchanged. Used ONLY to
    // distinguish "a genuine other identity could already be on file for this phone" (any prior
    // booking, even cancelled/expired, is proof someone has used this phone with this business
    // before) from "this is this phone's first-ever contact" (nothing to be in conflict with).
    const { count: priorBookingCount } = await supabase
      .from("bookings").select("id", { count: "exact", head: true })
      .eq("customer_phone", phone).in("calendar_id", calendars.map((c) => c.id));
    const priorRealBookingExists = (priorBookingCount ?? 0) > 0;

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
    conversationIdForFallback = conversationId;
    const convContext: Record<string, unknown> = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};

    // Phase 3, message history (needs conversation_id).
    // R97 (T3-LATENCY fix): this 12-row both-directions fetch and R96's own 6-row both-directions
    // recency fetch further below used to be TWO separate sequential `whatsapp_messages`
    // round-trips per turn, on EVERY turn (not just rare commit turns), for the same
    // conversation_id, same columns, same DESC order, the 6-row window being a strict subset of
    // this 12-row one. That 2nd, R96-added round-trip is a likely driver of the p50 regression
    // this round investigates (evidence/IUX_r96_verify.md LATENCY section). Fetch ONCE here
    // (12 rows, both directions) and derive R96's 6-row view from this same in-memory result
    // below, zero extra round-trip, identical data either consumer would have seen before.
    // R71's OWN separate 40-row inbound-only query further below is deliberately left as its own
    // round-trip (not folded in here): its row-count semantics (40 INBOUND rows, which can span
    // more than 40 total rows in a conversation with interleaved outbound messages) are not a
    // strict subset of this 12-row fetch, and changing them risks silently weakening R71/R72's
    // guard behavior, which this round must not touch.
    // R119 (id added): the row's own `id` (uuid PK) is now selected alongside the existing
    // columns so pendingBookInterveningExchange below can identify "this turn's own message"
    // by ROW IDENTITY instead of by text equality (see that gate's own comment for the full
    // reasoning). Zero extra round-trip (same query, one more column); every other consumer of
    // sharedMsgsDesc/sharedMsgsAsc/history ignores the new field.
    let sharedMsgsDesc: Array<{ id: string; direction: string; content: string | null; created_at: string; meta_timestamp: string | null }> = [];
    if (conversationId) {
      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, content, created_at, meta_timestamp")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(12);
      sharedMsgsDesc = (msgs as Array<{ id: string; direction: string; content: string | null; created_at: string; meta_timestamp: string | null }>) ?? [];
    }
    // IUX R100 (F-R79-2 fix): sharedMsgsDesc is fetched in created_at (DB insert) order, which
    // is what a flaky connection or two fast customer messages can scramble relative to the
    // customer's true send order (Meta's own message.timestamp, now persisted as
    // meta_timestamp). Detect true out-of-order arrival: walking oldest-to-newest by created_at,
    // if any inbound row's own meta_timestamp is EARLIER than the meta_timestamp of the row
    // immediately before it, that row was actually sent earlier than it was inserted, a clear
    // out-of-order signal. When that happens (and only then), re-sort this small window by
    // meta_timestamp (rows with no meta_timestamp keep their created_at position via a stable
    // sort key equal to their own created_at) so the LLM sees the customer's true intended
    // order instead of DB-arrival order. In the overwhelming common case (in-order delivery, or
    // rows predating this fix with meta_timestamp NULL) no divergence is found and the order is
    // byte-identical to before this change.
    const ascByCreatedAt = sharedMsgsDesc.slice().reverse();
    // Walk oldest-to-newest by created_at, tracking the LAST KNOWN meta_timestamp seen so far
    // (skipping rows with no meta_timestamp, e.g. outbound rows or rows predating this fix,
    // rather than only comparing strictly-adjacent rows). This correctly catches an out-of-order
    // inbound row even when an outbound row without a meta_timestamp sits between it and the
    // last real inbound timestamp in created_at order (the exact live shape: msg2 inbound, then
    // an outbound reply with no meta_timestamp, then msg1 inbound arriving out of true order).
    let outOfOrderDetected = false;
    let lastKnownTs: number | null = null;
    for (const row of ascByCreatedAt) {
      if (!row.meta_timestamp) continue;
      const curTs = new Date(row.meta_timestamp).getTime();
      if (lastKnownTs !== null && curTs < lastKnownTs) {
        outOfOrderDetected = true;
        break;
      }
      lastKnownTs = curTs;
    }
    // IMPORTANT: re-sort ONLY the ORDER of this already-fixed 12-row set, never change WHICH
    // rows are in it. An earlier version of this fix re-sorted THEN sliced the last N rows,
    // which could let a row with a stale meta_timestamp (e.g. the CURRENT turn's own
    // just-inserted message, delayed in true send-time but newest by created_at) sort to the
    // front and fall OUT of a trailing slice, silently evicting it from the window, a strictly
    // worse regression than the bug this fix targets. Sorting in place on the fixed-size array
    // (same 12 elements, same downstream .slice(-6) origin below) guarantees the row-SET is
    // always identical to pre-fix behavior; only the sequence within it can change.
    const sharedMsgsAsc = outOfOrderDetected
      ? ascByCreatedAt.slice().sort((a, b) => {
        const aKey = new Date(a.meta_timestamp ?? a.created_at).getTime();
        const bKey = new Date(b.meta_timestamp ?? b.created_at).getTime();
        return aKey - bKey;
      })
      : ascByCreatedAt;
    if (outOfOrderDetected) {
      console.log(`R100 out-of-order arrival detected (conversation ${conversationId}), re-sorted window by meta_timestamp.`);
    }
    const history: Array<{ direction: string; content: string | null }> = sharedMsgsAsc;

    // R71 (R70-3 fix): compute once per turn whether the customer has EVER named a specific
    // service or a specific calendar/branch, ANYWHERE in this conversation, + this turn's
    // message. Deliberately queries a WIDER inbound-only window (40 messages) than the model's
    // own 12-message context window above: a real receptionist remembers what a customer said
    // much earlier in a long conversation, and this guard re-asking a service the customer
    // already gave 7+ turns ago (outside the 12-message/~6-turn context window) would itself be a
    // false-positive regression, live-reproduced this round on a 13-turn conversation before this
    // wider, dedicated query was added. Cheap (2 columns, inbound-only, no join) and independent
    // of the LLM context-window cost/latency tradeoff, so it does not touch the model's own
    // context construction above. See serviceDisambiguationGuard.ts for the full reasoning
    // (server-side gate, prompt-only steering did not reliably close this against the live model).
    let inboundTexts: string[] = [String(message ?? "")];
    if (conversationId && isMultiCalendar) {
      const { data: inboundMsgs } = await supabase
        .from("whatsapp_messages")
        .select("content")
        .eq("conversation_id", conversationId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(40);
      inboundTexts = [
        ...((inboundMsgs as Array<{ content: string | null }> | null) ?? []).map((m) => m.content ?? ""),
        String(message ?? ""),
      ];
    }
    const blockForMissingServiceChoice = isMultiCalendar && calendarsForPrompt
      ? shouldBlockForMissingServiceChoice({ calendars: calendarsForPrompt, inboundTexts })
      : false;
    // R72 (SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT fix): the sibling condition, same guard
    // module, same wide inbound history. Fires when the customer HAS named a real service that
    // exists at 2+ calendars with a genuinely different price/duration and no branch has been
    // named yet (the prompt-only "same service, multiple branches" rule proved flaky against the
    // live model; see serviceDisambiguationGuard.ts header). Never true at the same time as
    // blockForMissingServiceChoice by construction (that one requires NO service named; this one
    // requires a service IS named), but computed independently so tools.ts can check either.
    const blockForAmbiguousBranch = isMultiCalendar && calendarsForPrompt
      ? shouldBlockForAmbiguousBranch({ calendars: calendarsForPrompt, inboundTexts })
      : false;

    // R111 (RETURNING-SERVICE-DEFAULT-BLEED fix, closes R107-RETURNING-DEFAULT-BLEED): runs for
    // EVERY tenant (single- or multi-calendar), since the finding was reproduced on a
    // single-calendar fixture. `allServiceNamesForReturning` covers both shapes: single-calendar's
    // own `services` list, plus every per-calendar service in multi-calendar mode (mirrors
    // `allServiceNamesForReschedule` below). `returningServiceConfirmed` is a durable
    // conversation-context marker, set below (this block) once the customer resolves the
    // assumption either by naming a service themselves OR by affirming our own disclosure
    // question (tracked via a `pending_returning_service_confirm` marker, mirroring the
    // pending_*_verification convention used throughout this codebase), so the guard fires AT
    // MOST once per conversation.
    const allServiceNamesForReturning = calendarsForPrompt
      ? calendarsForPrompt.flatMap((c) => c.services.map((s) => s.name))
      : services.map((s) => s.name);
    const returningServiceConfirmed = convContext.returning_service_confirmed === true;
    // R118 (STALE-SERVICE-DEFAULT-OVERRIDE fix, closes full-journey-simulation R23): a small,
    // deliberately bounded window of the most recent customer messages (reuses `inboundTexts`,
    // R71's own wide inbound-only fetch when available, else just this turn's own message for a
    // single-calendar tenant where no such fetch happens). Passed to the guard so an explicit
    // service named a couple of turns ago in THIS same thread still counts as resolved even if the
    // durable `returning_service_confirmed` context marker (set below, a separate DB round-trip)
    // did not persist in time for this turn's read. See serviceDisambiguationGuard.ts for the full
    // root-cause writeup.
    const recentInboundTextsForReturning = inboundTexts.slice(0, 4);
    const blockForReturningServiceDefault = shouldBlockReturningServiceDefault({
      lastService,
      currentMessage: String(message ?? ""),
      allServiceNames: allServiceNamesForReturning,
      returningServiceConfirmed,
      recentInboundTexts: recentInboundTextsForReturning,
    });
    // Store the pending-confirm marker the FIRST time this turn's guard fires (fresh, i.e. not
    // already set), so a subsequent bare "ja"/"klopt" reply (no service named) can be recognized
    // as answering OUR OWN disclosure question (see the AFFIRM_RE-based resolution further below).
    // Cheap best-effort write; never blocks the turn on failure.
    if (blockForReturningServiceDefault && conversationId && !convContext.pending_returning_service_confirm) {
      await supabase.from("whatsapp_conversations")
        .update({ context: { ...convContext, pending_returning_service_confirm: { at: Date.now() } } })
        .eq("id", conversationId);
    }
    // The customer's CURRENT message names a real configured service on ANY turn (not just while
    // the guard is actively blocking, e.g. their very first message already names it): persist
    // returning_service_confirmed now so a later, unrelated bare follow-up in this same
    // conversation never re-triggers the guard. No-op when already set or not a returning customer.
    if (lastService && !returningServiceConfirmed && conversationId &&
        mentionsAnyServiceName(String(message ?? ""), allServiceNamesForReturning)) {
      await supabase.from("whatsapp_conversations")
        .update({ context: { ...convContext, returning_service_confirmed: true } })
        .eq("id", conversationId);
    }

    // R96 (RESCHEDULE-HIJACK fix, R95-1): a SMALL, deliberately narrow recency window (this
    // turn's message + the last few messages BOTH directions), unlike the wide 40-message
    // inbound-only window above (which is multi-calendar-only and answers a different question:
    // "has a service EVER been named in this whole conversation"). This guard asks a
    // recency-sensitive question ("did the customer JUST now name a different service than their
    // existing booking"), so a stale mention from many turns ago must not leak in (see
    // serviceDisambiguationGuard.ts's own false-positive reasoning). Runs for EVERY tenant
    // (single- or multi-calendar), since R95-1 was reproduced on a single-calendar tenant.
    // R96-SELFTEST GAP (found by this round's OWN post-fix live testing, evidence/IUX_r96.md
    // section 2): an inbound-ONLY window missed the case where a short disambiguation
    // back-and-forth ("wil je de Speciale Afspraak voor dezelfde persoon of iemand anders?" ->
    // "zelfde persoon") means the customer's OWN words no longer repeat the distinct service's
    // name, even though the conversation is clearly still about it. Fix: include BOTH directions
    // (the agent's own immediately-preceding question already names the service under
    // discussion, exactly the antecedent a real receptionist would remember) and widen the
    // window from 3 to 6 messages so a short multi-turn disambiguation exchange survives it.
    // Still cheap (1 column, tiny limit, no join).
    // R97 (T3-LATENCY fix): derived from `sharedMsgsDesc` (the 12-row both-directions fetch above)
    // instead of its own dedicated 6-row round-trip, this round's 6-row need being a strict subset
    // (same conversation_id, same DESC order, same columns available). Zero extra query.
    // R98 STRUCTURAL FIX: this window is now built as DIRECTION-TAGGED rows
    // (`RecencyWindowMessage[]`), not a flat `string[]`, so `findDistinctServiceForReschedule`
    // can never again lose track of which message came from the customer vs the agent (the exact
    // bug R97-verify found: the guard's own break condition treated an agent reply as if the
    // customer said it). Every row's `direction` is carried straight from the DB query below,
    // never inferred or defaulted.
    let recentMessages: RecencyWindowMessage[] = [{ direction: "inbound", content: String(message ?? "") }];
    if (conversationId) {
      // R97 (DOUBLE-COUNTED-CURRENT-MESSAGE fix): process_whatsapp_message (the real webhook path,
      // and this loop's own RPC-then-invoke testpad pattern) INSERTS the current turn's inbound row
      // BEFORE invoking this function, so the newest row this window already IS the current
      // message. Manually appending `message` again after that duplicated it, shrinking the
      // effective window by one real prior message and evicting exactly the message that mattered
      // most in an availability-conflict-retry shape (evidence/IUX_r96_verify.md). A DIRECT invoke
      // of this function that skips the RPC (the step-card's OTHER documented testpad shape) never
      // persists the inbound row at all, so the current message would be genuinely absent from the
      // fetch in that case. Handle both correctly without guessing which path produced this call:
      // only append the current message when the window's own newest row is not ALREADY that same
      // inbound text (textual identity, not array-position, so it is correct regardless of which
      // call pattern produced this request). "Newest" here is always by created_at (raw
      // sharedMsgsDesc), never by the R100 meta_timestamp re-sort below: the current message was
      // JUST inserted, so it is always the true latest INSERT regardless of its own send-time.
      const newestByCreatedAt = sharedMsgsDesc[0];
      const newestIsCurrentInbound = !!newestByCreatedAt && newestByCreatedAt.direction === "inbound" && (newestByCreatedAt.content ?? "") === String(message ?? "");
      // IUX R100 (F-R79-2 fix): select the SAME 6-row SET the pre-fix code selected (the 6
      // newest by created_at, i.e. ascByCreatedAt's own last 6, byte-identical to the old
      // sharedMsgsDesc.slice(0,6) selection), THEN re-sort only WITHIN that fixed subset by
      // meta_timestamp when a divergence exists inside it specifically. Deliberately does NOT
      // reuse sharedMsgsAsc's own global re-sort-then-slice: re-sorting the full 12-row set
      // before slicing the last 6 could push a row with a stale meta_timestamp (e.g. the
      // CURRENT turn's own just-inserted message, delayed in true send-time but newest by
      // created_at) out of the trailing window entirely, silently evicting it, a worse
      // regression than the bug this fix targets. Selecting the set by created_at first and
      // reordering second guarantees the row-SET is always identical to pre-fix behavior; only
      // the sequence within it can change.
      const rowsByCreatedAt = ascByCreatedAt.slice(-6);
      let windowOutOfOrder = false;
      let windowLastKnownTs: number | null = null;
      for (const row of rowsByCreatedAt) {
        if (!row.meta_timestamp) continue;
        const curTs = new Date(row.meta_timestamp).getTime();
        if (windowLastKnownTs !== null && curTs < windowLastKnownTs) {
          windowOutOfOrder = true;
          break;
        }
        windowLastKnownTs = curTs;
      }
      const rowsAsc = windowOutOfOrder
        ? rowsByCreatedAt.slice().sort((a, b) => {
          const aKey = new Date(a.meta_timestamp ?? a.created_at).getTime();
          const bKey = new Date(b.meta_timestamp ?? b.created_at).getTime();
          return aKey - bKey;
        })
        : rowsByCreatedAt;
      const priorMessages: RecencyWindowMessage[] = rowsAsc.map((m) => ({
        direction: (m.direction === "inbound" ? "inbound" : "outbound") as RecencyWindowDirection,
        content: m.content ?? "",
      }));
      recentMessages = newestIsCurrentInbound
        ? priorMessages
        : [...priorMessages, { direction: "inbound", content: String(message ?? "") }];
    }
    // allServiceNames: every distinct configured service name reachable this turn. Single-calendar
    // (the common case) → this calendar's own <services>; multi-calendar → the whole <kalenders>
    // allowlist (a customer's existing booking could be on any of the owner's calendars).
    const allServiceNamesForReschedule = isMultiCalendar && calendarsForPrompt
      ? calendarsForPrompt.flatMap((c) => c.services.map((s) => s.name))
      : services.map((s) => s.name);
    const upcomingBookingServiceName =
      (upcomingBRes.data as { service_types?: { name?: string } } | null)?.service_types?.name ?? null;
    const distinctServiceForReschedule = allServiceNamesForReschedule.length > 1
      ? findDistinctServiceForReschedule({
        allServiceNames: allServiceNamesForReschedule,
        currentServiceName: upcomingBookingServiceName,
        recentMessages,
        modelSuppliedServiceId: false, // re-checked per-call against args.service_type_id in tools.ts
      })
      : null;

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
    // R29: deterministic pre-parse of the CURRENT customer message for a bare relative-weekday
    // reference ("vrijdag", "vrijdag diezelfde week"), computed fresh from the real server "now",
    // never from conversation history. See relativeDateHint.ts header for the full bug this
    // closes (R28: long/rambling message with an unnumbered weekday got resolved against a STALE
    // date already sitting in earlier conversation history instead of the real today).
    const relativeDateHint = extractRelativeDayHint(String(message ?? ""), now);
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
      // R82-VERIFY-1 fix (FAKE-DEPOSIT-RATIONALE): paymentActuallyRequired mirrors tools.ts's
      // OWN authoritative gate for "does this calendar actually collect up-front payment"
      // (secure_payments_enabled AND payment_required_for_booking, see the book_appointment
      // guard in tools.ts). Root cause found live on a fresh fixture tenant with BOTH flags
      // false (no deposit/payment configured at all): allowed_payment_timing defaults to
      // ["pay_now"] and payment_deadline_hours defaults to 24 on EVERY payment_settings row
      // (set at calendar-creation time), independent of whether payment collection is switched
      // on. The derived-sentence branch below used to read ONLY allowed_payment_timing/
      // payment_deadline_hours, so it asserted "Betaling gaat vooraf online... binnen 24 uur"
      // into businessData.refund_policy as if it were REAL ground truth even on a tenant that
      // never enabled payments. businessDataGuard.ts's classifier then (correctly, given what
      // it was told) scored the model's "we vragen een aanbetaling omdat..." reply as GROUNDED,
      // since the fabricated-sounding claim was, per the summary it was handed, actually
      // present in business_data. This was never a classifier/prompt gap: the ground truth
      // itself was wrong upstream. Fix: gate the entire derived-timing sentence on
      // paymentActuallyRequired, the same authoritative flag pair tools.ts's booking gate uses,
      // so "payment upfront required" is only ever asserted when it is actually true.
      const paymentActuallyRequired = !!(ps?.secure_payments_enabled && ps?.payment_required_for_booking);
      if (hasManualRefund) {
        // A hand-written refund policy always wins, used verbatim.
        businessData.refund_policy = (manualRefund as string).trim();
        refundDisposition = classifyRefundDisposition(manualRefund as string);
      } else if (ps && paymentActuallyRequired) {
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
      // When payment is NOT actually required (the common trial/free-tier default state), no
      // refund/payment-timing line is injected at all: businessData.refund_policy stays unset,
      // so any reply asserting an upfront-payment/deposit requirement or rationale is correctly
      // judged UNGROUNDED by businessDataGuard.ts's classifier against real ground truth.
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
    // R38: dateOverrides applies a same-window availability_overrides row on top of the
    // recurring status, only meaningful in single-calendar (includeStatus) mode; harmless to
    // pass unconditionally since buildCalendarHint ignores it when includeStatus is false.
    const calendarHint = buildCalendarHint(now, openingStruct, !isMultiCalendar, dateOverrides);

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
      relativeDateHintText: formatRelativeDateHint(relativeDateHint),
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
    // R151 (WHATSAPP_E2E_TEST_INFRA Item 6, live-reproduced): NEGATE_RE's "verzet|verzetten|
    // reschedule|verplaats" tokens exist to catch a customer saying "ik wil liever verzetten"
    // INSTEAD OF confirming a CANCEL (a genuine reject-the-cancel-offer-a-reschedule-instead
    // signal). Reused unchanged for confirmRescheduleVerification (the reschedule flow's OWN
    // cross-identity confirm gate), those exact words are simply the normal Dutch verb for the
    // very action being confirmed: a customer naturally completing "Ja klopt, dat is de afspraak
    // van [naam], verzet die naar 14:30" (live-reproduced, evidence/WHATSAPP_E2E_r7.md turns 4-5)
    // trips NEGATE_RE on "verzet" and can never satisfy confirmRescheduleVerification, an
    // unresolvable deadlock structurally identical to R150's, just a different signal. Scoped
    // narrowly: only drops the reschedule-verb tokens, keeps every other negate signal (nee/niet/
    // hou/andere/nieuwe tijd) fully intact, since those remain valid "actually, wait" signals even
    // inside a reschedule confirmation. Used ONLY by confirmRescheduleVerification below.
    const NEGATE_RE_FOR_RESCHEDULE_VERIFICATION = /\b(nee|neen|no|niet|liever niet|toch niet|hou|houd|behoud|laat maar|ander|andere|nieuwe tijd)\b/i;
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
    // R27 (AFFIRM-CONFIRM-COVERAGE-GAP-UNLESS, sev-2): "tenzij"/"unless" is a DIFFERENT connective
    // shape than "zolang"/"mits" (those state the condition FOR proceeding; "tenzij"/"unless"
    // states the condition AGAINST proceeding / for an alternative instead), so it was never
    // covered by the R25 pattern. R26-verify DB-proved this live: "Ja annuleer maar, tenzij
    // jullie toch nog een gratis alternatief hebben" committed the cancel without addressing the
    // stated condition, bypassing both this regex layer AND the model's own
    // only_confirming_previous attestation (R26). NL: "tenzij" (unless), "behalve als" (except
    // if). EN: "unless", "except if". "tenzij dat" is matched by the same \b(tenzij)\b entry
    // (word-boundary already covers the trailing "dat").
    const CONDITIONAL_RE =
      /\b(zolang|mits|tenzij)\b|op\s+voorwaarde\s+dat|behalve\s+als|as\s+long\s+as|provided\s+(that\b|\w)|assuming\b|on\s+the\s+condition\s+that|\bunless\b|except\s+if/i;
    // R30 (AFFIRM-CONFIRM-VAGUE-PREFERENCE, sev-2): a 6th ambiguity category, the 6th recurrence
    // of the same regex-enumeration-misses-a-phrasing pattern (R25 conditional/name, R26
    // service-correction path, R27 "tenzij"). "Klopt helemaal, maar ik heb toch liever iets
    // anders" pairs an affirm word with a VAGUE, non-specific preference-for-something-else: no
    // day/time word (not a time-shift), no price word, no "?", no hedge word ("eigenlijk" etc,
    // this uses "toch liever" instead), no conditional connective. DB-proven live (R29-verify +
    // this round's own fresh repro, phones 31600140006/07 + 31600150001/02): the original
    // unconfirmed slot committed anyway despite the customer explicitly stating they'd prefer
    // something else. Root-cause investigation this round (see evidence/IUX_r30.md §2) found this
    // ALSO slipped past the R26 model-attestation layer (only_confirming_previous came back
    // `true`, a false attestation, log-proven), because that instruction's own wording enumerates
    // categories ("andere tijd/dag, vraag, voorwaarde, andere naam, correctie") that a vague
    // "iets anders" doesn't cleanly match either; see R30's prompt.ts/tools.ts changes for the
    // structural half of this fix. This regex is the defense-in-depth half: NL "liever" (prefer),
    // "toch liever"/"eigenlijk liever" (would actually rather), "iets anders"/"iets rustigers"-
    // style vague alternative, "wacht liever" would already be caught by HEDGE_RE ("wacht"). EN
    // "actually prefer", "rather have", "something else", "would rather". Deliberately NOT
    // matched to a first-time preference statement's risk: this signal is only ever consulted
    // by confirmBook/confirmCancel (both require pendingBookFresh/pendingFresh, i.e. an existing
    // fresh preview) and by tools.ts's `committing`/cancel-commit gates (both require
    // `pendingBook?.start_time`/`pending?.start_time` to already exist), so a bare first-time
    // "ik heb liever de ochtend" with no pending proposal never reaches this gate at all,
    // regardless of what this regex matches (verified live, see evidence).
    const VAGUE_PREFERENCE_RE =
      /\b(liever)\b|\biets\s+anders\b|\biets\s+(anders\w*|rustiger\w*|later\w*|vroeger\w*)\b|would\s+rather|actually\s+prefer|\bprefer\s+something\s+else\b|\brather\s+have\b|\bsomething\s+else\b/i;
    // R31 (AFFIRM-CONFIRM-HONESTLY-NOT-WHAT-I-HAD-IN-MIND, sev-2): a 7th ambiguity category, the
    // 8th recurrence of the same regex-enumeration-misses-a-phrasing pattern (R25 conditional/
    // name, R26 service-correction path, R27 "tenzij", R30 vague-preference). "Yes correct, but
    // that's honestly not really what I had in mind" pairs an affirm word with an open-ended
    // REJECTION/dissatisfaction statement: no day/time word, no price word, no "?", no hedge word,
    // no conditional connective, no VAGUE_PREFERENCE_RE trigger (no "liever"/"iets anders"/
    // "something else"/"rather have"/"prefer" at all). DB-proven live (R30-verify + this round's
    // own fresh repro, phones 31600170004/07 + 31600180001/02): the original unconfirmed slot
    // committed anyway despite the customer explicitly stating the result was not what they
    // wanted. Root-cause investigation this round (see evidence/IUX_r31.md section 2) found this
    // is NOT a model-attestation miss (the model itself correctly declined to attest cleanliness
    // on the primary turn); it is the SERVER's own confirmBook (driven by this same regex gap)
    // forcing a stall-retry nudge that overrides the model's correct judgment. Closing the regex
    // gap here is therefore sufficient to close this exact case (see index.ts's bookCommitMissed/
    // nudge-text hardening below for the defense-in-depth half). NL: "toch niet" (not after all),
    // "niet wat ik wilde/zocht/bedoelde/verwachtte", "niet wat ik in gedachten had", "niet wat ik
    // voor ogen had", "dat bedoelde ik niet", "van gedachten veranderd". EN: "not what I had in
    // mind", "not really what I wanted/meant", "that's not it", "changed my mind", "not quite
    // what I". Deliberately NOT matched to a first-time rejection-then-restate risk: this signal
    // is only ever consulted by confirmBook/confirmCancel (both require pendingBookFresh/
    // pendingFresh, i.e. an existing fresh preview) and by tools.ts's committing/cancel-commit
    // gates (both require pendingBook?.start_time/pending?.start_time to already exist), so a
    // bare first-time "dat is niet wat ik zocht, ik wil eigenlijk..." with no pending proposal
    // never reaches this gate at all, regardless of what this regex matches (same structural
    // proof R30 relied on for VAGUE_PREFERENCE_RE; verified live, see evidence).
    const REJECTION_RE =
      /\bniet\s+wat\s+ik\s+(wilde|zocht|bedoelde|verwachtte|in\s+gedachten\s+had)\b|\bniet\s+helemaal\s+wat\s+ik\b|\btoch\s+niet\b|\bdat\s+bedoelde\s+ik\s+niet\b|\bniet\s+wat\s+ik\s+voor\s+ogen\s+had\b|\bvan\s+gedachten\s+veranderd\b|\bnot\s+(really\s+)?what\s+i\s+(had\s+in\s+mind|wanted|meant|expected)\b|\bthat'?s?\s+not\s+(it|really\s+it)\b|\bnot\s+really\s+what\s+i\s+(wanted|meant)\b|\bchanged\s+my\s+mind\b|\bnot\s+quite\s+what\s+i\b/i;
    const notCleanConfirm = (raw: string) =>
      DAY_OR_TIME_SHIFT_RE.test(raw) || PRICE_QUESTION_RE.test(raw) || raw.includes("?") || HEDGE_RE.test(raw) ||
      CONDITIONAL_RE.test(raw) || VAGUE_PREFERENCE_RE.test(raw) || REJECTION_RE.test(raw);
    // R24 (AFFIRM-CONFIRM-FALSEPOS, second commit path): this signal is ALSO threaded into
    // ctx.ambiguousConfirm below (see createTools call) so tools.ts can gate the model's own
    // self-issued args.confirmed the same way, not just the server-forced confirmBook/
    // confirmCancel computed from it right below. R23 only fixed the latter; R24 closes the former.
    const ambiguousConfirm = notCleanConfirm(msgLower);
    // R150 (WHATSAPP_E2E_TEST_INFRA Item 6, live-reproduced on the real production agent): a
    // customer resolving an identity-verification marker (pending_cancel_verification /
    // pending_reschedule_verification, the GEDEELD TELEFOONNUMMER cross-identity safety flow) who
    // naturally restates the EXISTING appointment's day/time as proof of which one they mean, e.g.
    // "Ja, annuleer de afspraak van Test Klant E2E op vrijdag 10 juli 09:00, dat is 'm echt" (this
    // exact message, evidence/WHATSAPP_E2E_r6.md turns 9-11), satisfies identityVerificationResolved
    // (it explicitly names the target) but was blocked anyway purely by DAY_OR_TIME_SHIFT_RE inside
    // ambiguousConfirm, an UNRESOLVABLE structural deadlock: identityVerificationResolved's own
    // design (see identityDisambiguationGuard.ts) is satisfied by naming the person, but the most
    // natural, complete way a real customer answers "which appointment do you mean" is to name BOTH
    // the person AND its day/time, and any day/time mention at all trips DAY_OR_TIME_SHIFT_RE
    // regardless of whether it names a NEW time or restates the SAME already-pending one. That
    // shift-detection concern exists to protect a FRESH, not-yet-committed preview from a customer
    // silently getting the OLD time committed when they actually asked for a different one
    // (confirmBook/confirmCancel's own gate, R23-R31); it does not apply to an identity-verification
    // confirm, which is not previewing a time at all, only resolving WHOSE existing appointment this
    // is. The model still runs on this turn with full conversation context regardless of this flag,
    // so a genuine new target time (for reschedule) is still supplied by the model's own tool-call
    // args, unaffected. Scoped narrowly to ONLY the day/time-shift signal; every other ambiguity
    // category (price question, hedge, conditional, vague preference, open rejection, a trailing
    // "?") still fully applies, since those remain valid reasons to withhold a commit even during
    // identity verification. Used ONLY by confirmCancelVerification/confirmRescheduleVerification
    // below (the two gates actually reproduced as stuck); confirmBookVerification is left on the
    // full ambiguousConfirm (a booking negotiation can genuinely still be mid-time-negotiation
    // during its own identity check) and confirmRenameVerification has no day/time dimension to it
    // at all, so neither was touched.
    const ambiguousConfirmForVerification = (raw: string) =>
      PRICE_QUESTION_RE.test(raw) || raw.includes("?") || HEDGE_RE.test(raw) ||
      CONDITIONAL_RE.test(raw) || VAGUE_PREFERENCE_RE.test(raw) || REJECTION_RE.test(raw);
    // R111 (RETURNING-SERVICE-DEFAULT-BLEED fix, marker resolution): the guard above
    // (blockForReturningServiceDefault) already covers "the customer's OWN current message names a
    // service" as a same-turn resolution. This second path resolves the OTHER way the disclosure
    // question gets answered: a bare, clean affirm ("ja", "klopt", "yes") to OUR OWN just-asked
    // "ik ga uit van dezelfde dienst als de vorige keer, X, klopt dat?" question, tracked via a
    // `pending_returning_service_confirm` marker (set in tools.ts's kies_dienst-style refusal,
    // mirroring the pending_cancel/pending_*_verification convention). A clean affirm (AFFIRM_RE,
    // not NEGATE_RE, not ambiguousConfirm) marks the assumption CONFIRMED; a clear negate/ambiguous
    // reply leaves it unresolved so the guard fires again next turn with the model free to ask
    // again or the customer free to name the correct service. Persisted immediately (not deferred
    // to the tool layer) so `returningServiceConfirmed` above already reflects it if this exact
    // turn also happens to re-enter the guard for any reason.
    const prsc = convContext.pending_returning_service_confirm as { at?: number } | undefined;
    const prscFresh = !!prsc && (typeof prsc.at !== "number" || (Date.now() - prsc.at) < 15 * 60 * 1000);
    const returningServiceJustConfirmedByAffirm = prscFresh && !returningServiceConfirmed &&
      AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm;
    if (returningServiceJustConfirmedByAffirm && conversationId) {
      const { pending_returning_service_confirm: _dropPRSC, ...restPRSC } = convContext;
      await supabase.from("whatsapp_conversations")
        .update({ context: { ...restPRSC, returning_service_confirmed: true } })
        .eq("id", conversationId);
    }
    // This turn's EFFECTIVE block decision, incorporating a same-turn affirm resolution (computed
    // above, after AFFIRM_RE/NEGATE_RE/ambiguousConfirm became available) on top of the earlier
    // same-turn service-mention resolution already folded into blockForReturningServiceDefault.
    const blockForReturningServiceDefaultEffective = blockForReturningServiceDefault && !returningServiceJustConfirmedByAffirm;
    // R96 (SILENT-DROP-ON-MULTI-SERVICE fix, follow-up hardening after this round's own live
    // testing, evidence/IUX_r96.md section 6): the "vorige_boeking_nog_open" guard (tools.ts)
    // originally relied ONLY on the model self-setting args.abandon_previous_preview:true, but a
    // live repro (phone 316000003432/433) showed the small model reliably fails to discover/use
    // that brand-new parameter even when the tool's own error message spells it out by name,
    // instead retrying with the wrong tool (cancel_appointment) or omitting the flag, getting
    // stuck in the SAME refusal turn after turn. Per this loop's own doctrine (a high-stakes
    // tool-choice decision the model gets wrong needs a DETERMINISTIC server-side signal, not a
    // new prompt/schema field the model must reliably discover), this mirrors confirmBook's own
    // AFFIRM_RE-based detection: a customer message that explicitly says to drop/forget/skip the
    // earlier preview is detected here, from the RAW message, independent of whether the model's
    // own args ever set the flag. NL: "laat maar vervallen/zitten", "vergeet die/de vorige maar",
    // "sla die over", "die hoeft niet meer". EN: "let it lapse/go", "forget the previous one",
    // "skip that one", "never mind the first one", "drop the other one". Deliberately does NOT
    // require an affirm word (a customer may say this standalone), and is only ever CONSULTED by
    // tools.ts's own guard when a genuine pending_booking for a DIFFERENT service already exists,
    // so it can never fire on an unrelated message that merely happens to contain "vergeet"/
    // "forget" in some other context (the guard's own precondition, not this regex, is the safety
    // boundary here, matching every other confirm* signal's own design in this file).
    const ABANDON_PREVIOUS_PREVIEW_RE =
      /\b(laat\s+(?:die|de|het)?\s*(?:vorige|eerste)?\s*(?:maar\s+)?(?:vervallen|zitten|schieten)|vergeet\s+(?:die|de)\s+(?:vorige|eerste)\s+maar|sla\s+(?:die|de)\s+(?:vorige|eerste)?\s*(?:maar\s+)?over|die\s+hoeft\s+niet\s+meer|let\s+it\s+(?:lapse|go)|forget\s+the\s+(?:previous|first|other)\s+one|skip\s+that\s+one|never\s?mind\s+the\s+(?:first|previous|other)\s+one|drop\s+the\s+(?:other|first|previous)\s+one)\b/i;
    const abandonPreviousPreview = ABANDON_PREVIOUS_PREVIEW_RE.test(msgLower);
    // R32 (2nd AFFIRM-CONFIRM taste-fork): the THIRD, purely structural gate. Computed here,
    // before the LLM ever runs, from the RAW (not lowercased/pre-processed) customer message via
    // ./hardConfirmGate.ts, which does its own bounded normalization. Deliberately independent of
    // ambiguousConfirm/AFFIRM_RE above: those are content-classification (enumerate the ways a
    // message can be UNCLEAR); this is membership-classification (is the message a member of a
    // small, finite, human-auditable list of ways to be CLEAR). See evidence/IUX_r32.md section 2.
    // hardConfirm=true only for an exact/curated-pleasantry clean "yes"; hardReject=true mirrors
    // for a clean "no". Neither implies confirmCancel/confirmBook below (those still require a
    // FRESH pending proposal to exist); this signal only ever GATES a commit, never triggers one.
    // R5 fix (sev-1, FULL_JOURNEY_AGENT_SIMULATION R4 finding): a message carrying a leading
    // "Code: XXXXXXXX" tracking-code token (required on every turn for a customer whose phone
    // collides with another owner's owner_test_phone, see gateLogic.ts's ambiguous-history fix)
    // used to never hard-confirm, since classifyHardConfirm's normalization did not strip it. Fixed
    // inside hardConfirmGate.ts's own normalizeForHardConfirm (single source of truth, unit-tested
    // there), not here, so `message` itself stays untouched for msgLower/AFFIRM_RE/the LLM prompt.
    const hardVerdict = classifyHardConfirm(message);
    const hardConfirm = hardVerdict === "confirm";
    const confirmCancel = pendingFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelPolicyQuestion && !ambiguousConfirm;

    // R40 (update_booking_name): same deterministic server-side detection as confirmCancel, for
    // the SAME reason it exists there. Live testing this round found the small model unreliably
    // re-previews update_booking_name on a bare "ja klopt" turn INSTEAD of confirming a pending
    // rename that genuinely predates this turn (a fresh HTTP request, own pending_rename read from
    // context on prior-turn history), the same "small model can't reliably self-issue confirmed:
    // true" gap R22-era confirmBook/confirmCancel were built to close. Without a server force, the
    // confirmStall retry mechanism's own self-write-chain guard (mirrors R36) then correctly
    // refuses to let the retry confirm a preview the PRIMARY call itself just (re-)wrote this same
    // turn, so the customer's genuine confirmation from a real prior turn never lands. Mirrors
    // confirmCancel exactly: same 15-min freshness window reasoning, same AFFIRM_RE/NEGATE_RE/
    // ambiguousConfirm gating (a rename-policy-question equivalent doesn't exist, so no extra
    // exclusion needed beyond the shared ambiguousConfirm layer).
    const pr = convContext.pending_rename as { at?: number } | undefined;
    const pendingRenameFresh = !!pr && (typeof pr.at !== "number" || (Date.now() - pr.at) < 15 * 60 * 1000);
    const confirmRename = pendingRenameFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm;

    // R76 (RENAME-HIJACK-CROSSTHIRDPARTY fix): SAME deterministic server-detection pattern as
    // confirmRename directly above, keyed off a SEPARATE pending_rename_verification marker
    // update_booking_name's own cross-identity guard writes (tools.ts). Kept as its own marker
    // (not reusing pending_rename) because the two answer DIFFERENT questions: pending_rename asks
    // "do you confirm this exact rename", pending_rename_verification asks "is this really the
    // booking/person you meant" (a customer could in principle be mid-flow on one while a stale
    // instance of the other still lingers, and conflating them would let an affirm meant for one
    // question silently release the other). ambiguousConfirm is still ANDed in (same false-positive
    // protection: a day/time-shift, price question, trailing "?", or hedge word never counts as a
    // clean affirm here either, exact same reasoning as every sibling confirm* signal in this file).
    const prv = convContext.pending_rename_verification as { at?: number } | undefined;
    const pendingRenameVerificationFresh = !!prv && (typeof prv.at !== "number" || (Date.now() - prv.at) < 15 * 60 * 1000);
    const confirmRenameVerification = pendingRenameVerificationFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm;

    // R102 (shared-phone identity fix, generalizes R76's cross-identity verification to
    // cancel_appointment + reschedule_appointment, see identityDisambiguationGuard.ts header for
    // the full R101 root-cause reasoning): SAME deterministic server-detection pattern as
    // confirmRenameVerification directly above, keyed off cancel_appointment's own
    // pending_cancel_verification / reschedule_appointment's own pending_reschedule_verification
    // markers (tools.ts). Only the customer's OWN raw reply to OUR verification question can
    // release either guard, never the model's own judgement.
    //
    // R109 (MARKER-RELEASE-HAS-NO-SPEAKER-IDENTITY-CHECK fix): AFFIRM_RE/NEGATE_RE/ambiguousConfirm
    // alone answer "is this an affirming message", never "is it the SAME identity conflict already
    // resolved, or does it still need resolving". Live-reproduced: a SECOND bare "ja" from the exact
    // same wrong speaker (zero new information) used to silently release the marker. Each release
    // now ALSO requires identityVerificationResolved against the marker's OWN stored target name,
    // re-checked against THIS turn's raw message and THIS turn's current knownName (see
    // identityDisambiguationGuard.ts's doc comment for the full mechanism). A bare repeated affirm
    // can never satisfy this; the customer must actually name the target person, or the real owner
    // must be the one now recognized as speaking.
    const pcv = convContext.pending_cancel_verification as { current_name?: string | null; at?: number } | undefined;
    const pendingCancelVerificationFresh = !!pcv && (typeof pcv.at !== "number" || (Date.now() - pcv.at) < 15 * 60 * 1000);
    const confirmCancelVerification = pendingCancelVerificationFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirmForVerification(msgLower) &&
      identityVerificationResolved(pcv?.current_name ?? null, knownName, String(message));

    const prsv = convContext.pending_reschedule_verification as { current_name?: string | null; at?: number } | undefined;
    const pendingRescheduleVerificationFresh = !!prsv && (typeof prsv.at !== "number" || (Date.now() - prsv.at) < 15 * 60 * 1000);
    const confirmRescheduleVerification = pendingRescheduleVerificationFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE_FOR_RESCHEDULE_VERIFICATION.test(msgLower) && !ambiguousConfirmForVerification(msgLower) &&
      identityVerificationResolved(prsv?.current_name ?? null, knownName, String(message));

    // R118 (GAP 1, RESCHEDULE-SELF-CONFIRM-FRAGMENTATION-EXPLOIT fix): SAME deterministic
    // server-detection pattern as confirmRescheduleVerification directly above, keyed off
    // reschedule_appointment's own NEW pending_reschedule_confirm marker (tools.ts, a SEPARATE
    // marker from pending_reschedule_verification: that one guards cross-identity risk, this one
    // guards intent ambiguity after an open cancel-or-reschedule fork question). Only the
    // customer's OWN raw reply to OUR ambiguity-confirmation question can release this guard,
    // never the model's own judgement. Also requires ctx.hardConfirm (the same third, structural,
    // finite-allow-list gate every other commit-driving flag in this codebase requires), so a
    // vague/hedged/conditional reply to OUR OWN question can never silently release the gate
    // either, same safety bar as confirmBook/confirmCancel/confirmRename.
    const prc = convContext.pending_reschedule_confirm as { booking_id?: string; at?: number } | undefined;
    const pendingRescheduleConfirmFresh = !!prc && (typeof prc.at !== "number" || (Date.now() - prc.at) < 15 * 60 * 1000);
    const confirmRescheduleAmbiguity = pendingRescheduleConfirmFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm;

    // R107 (BOOK-COMMIT-IDENTITY-GAP fix): SAME deterministic server-detection pattern as
    // confirmCancelVerification/confirmRescheduleVerification directly above, keyed off
    // book_appointment's own pending_book_verification marker (tools.ts). Only the customer's OWN
    // raw reply to OUR cross-identity verification question is allowed to release this guard.
    // R109: same identityVerificationResolved requirement as above, closing the identical gap on
    // book_appointment's own marker (live-reproduced: a second bare "ja" silently committed the
    // preview under the stale wrong name here too).
    const pbv = convContext.pending_book_verification as { customer_name?: string | null; at?: number } | undefined;
    const pendingBookVerificationFresh = !!pbv && (typeof pbv.at !== "number" || (Date.now() - pbv.at) < 15 * 60 * 1000);
    const confirmBookVerification = pendingBookVerificationFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm &&
      identityVerificationResolved(pbv?.customer_name ?? null, knownName, String(message));

    // Booking confirmation, detected server-side (mirrors confirmCancel). A NEW booking is
    // two-phase: the first book_appointment call only PREVIEWS (stores a pending_booking
    // proposal, NO insert), so an accidental immediate booking is impossible and the customer
    // can correct the name/time first. When a fresh proposal exists AND the customer affirms
    // (and isn't cancelling), drive the COMMIT deterministically via ctx.confirmBook — the
    // commit uses the SERVER-STORED exact start_time, which also kills the model's
    // time-reconstruction bug (it once booked 12:00 for a confirmed 10:00).
    const pbk = convContext.pending_booking as
      { at?: number; service_type_id?: string; start_time?: string; end_time?: string; calendar_id?: string; customer_name?: string | null } | undefined;
    const pendingBookFresh = !!pbk && (typeof pbk.at !== "number" || (Date.now() - pbk.at) < 15 * 60 * 1000);
    const cancelWord = /\b(annuleer|annuleren|cancel|afzeggen)\b/i.test(msgLower);
    // R120 (BOOK-COMMIT-FIRST-MESSAGE-FALSE-POSITIVE fix, continued, closes the SECOND half of the
    // catch-22 identityDisambiguationGuard.ts's messageNamesPendingBookOwner documents): on the
    // common NEVER-at-risk path (no naam_verificatie_nodig marker ever fires), a customer who
    // bundles their own confirmation with their own name in the SAME message ("Ja, echt boeken voor
    // Chris") still fails ctx.hardConfirm's finite bare-affirm allow-list on the extra content and
    // falls through to an avoidable re-preview (live-reproduced on the S6 testpad, phone
    // 31600001703). SAME cleanliness bar as every other confirm* signal here (AFFIRM_RE/!NEGATE_RE/
    // !ambiguousConfirm, plus pendingBookFresh so this can never fire without a real fresh preview
    // to confirm), PLUS the customer's raw message must explicitly name the SAME person the
    // still-pending preview already has. Threaded through as its own ctx flag so tools.ts's commit
    // gate can accept it as an alternative to ctx.hardConfirm, exactly parallel to how
    // confirmBookVerification is threaded through for the marker case.
    const confirmBookOwnerRestated = pendingBookFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !ambiguousConfirm &&
      messageNamesPendingBookOwner(pbk?.customer_name ?? null, String(message));
    // R118 (GAP 3, PENDING-BOOKING-NO-EXPIRY fix, live-reproduced on the S6 testpad): a booking
    // preview is offered, the customer asks something unrelated in between, gets an answer, then
    // sends an unrelated LATER "Ja" (plausibly meaning something else entirely, e.g. "yes, good to
    // know") which silently committed the old, stale, possibly-abandoned preview, with no
    // re-confirmation of what was actually being confirmed. The pre-existing 15-minute TTL
    // (pendingBookFresh above) only checks raw elapsed TIME, never whether anything unrelated
    // happened in between, so a customer chatting normally for several turns inside that same
    // 15-minute window could still have a stray "ja" silently commit an old, abandoned proposal.
    //
    // FIX: detect a genuine INTERVENING exchange, i.e. at least one OTHER inbound customer message
    // strictly between the preview being stored (pbk.at) and this turn's own message, using the
    // SAME 12-message history window already fetched above (sharedMsgsAsc), zero extra round-trip.
    // When such an intervening message exists, a bare affirm alone is no longer sufficient: the
    // gate additionally requires this turn's message to itself reference the pending proposal (a
    // day/time/service mention, reusing the SAME DAY_OR_TIME_SHIFT_RE signal already defined above
    // for ambiguousConfirm, since that regex already recognizes exactly this content), so the
    // customer re-states enough of what they are confirming for a mismatch to be catchable. A bare
    // "ja" with NOTHING confirming the specific proposal, after a genuine intervening exchange, no
    // longer silently commits; the model instead re-surfaces the pending proposal and asks the
    // customer to confirm it explicitly (safer than guessing what an isolated "ja" meant).
    //
    // R119 (REPEATED-WORD-INTERVENING-EXCLUSION fix, see pendingBookGuard.ts's own header for the
    // full live-reproduced root-cause reasoning): the original R118 exclusion used TEXT EQUALITY
    // to skip "this turn's own row", which a REPEATED affirmation (e.g. two separate "ja"s, one a
    // genuine intervening reply, one the later stale confirm) could exploit to hide the real
    // intervening message. Fixed by identifying "this turn's own row" by ROW IDENTITY (its `id`,
    // via sharedMsgsDesc[0] -- the same signal R97 already established as reliable for this exact
    // purpose) instead of by content. Extracted into its own module (mirrors confirmationGuard.ts /
    // identityDisambiguationGuard.ts) so the pure logic is unit-testable without importing index.ts.
    const currentMessageRowId = sharedMsgsDesc[0]?.id ?? null;
    const pendingBookAtMs = typeof pbk?.at === "number" ? pbk.at : null;
    const pendingBookInterveningExchange = pendingBookFresh &&
      computePendingBookInterveningExchange(sharedMsgsAsc, pendingBookAtMs, currentMessageRowId);
    // R23: same ambiguousConfirm gate as confirmCancel (see its comment above for the 3 repro
    // shapes and the design reasoning). A day/time-shift mention, a price question, a trailing "?",
    // or a hedge word means this is NOT a clean confirmation of the exact previewed slot.
    // R32: deliberately NOT additionally gated on hardConfirm here. confirmBook/confirmCancel drive
    // more than the commit itself (bookCommitMissed/cancelCommitMissed nudges, the race-loss
    // pre-check below); tools.ts's actual commit code independently AND-requires ctx.hardConfirm
    // === true regardless of this flag's value, so safety does not depend on this line. Leaving it
    // as-is keeps the existing nudge/re-preview UX behavior unchanged for messages the regex layer
    // considers clean but the hard gate does not yet recognize (e.g. a brand-new genuine-confirm
    // phrasing not on the curated allow-list): the model still gets a normal turn and can still
    // re-preview/answer, it simply cannot commit until hardConfirm agrees. See section 6b below for
    // the measured smooth-UX-rate tradeoff this choice implies.
    // R118: pendingBookInterveningExchange additionally requires the message to restate a
    // day/time reference (DAY_OR_TIME_SHIFT_RE) when a genuine intervening exchange happened, so a
    // bare, context-free "ja" after chatting about something else never silently commits a stale
    // proposal. The common, honest flow (preview immediately followed by a clean "ja", no
    // intervening exchange) is completely unaffected: pendingBookInterveningExchange is false
    // there, so this extra requirement never engages.
    const confirmBook = pendingBookFresh && AFFIRM_RE.test(msgLower) && !NEGATE_RE.test(msgLower) && !cancelWord && !confirmCancel && !ambiguousConfirm &&
      (!pendingBookInterveningExchange || DAY_OR_TIME_SHIFT_RE.test(msgLower));

    // IUX R58 (WHATSAPP-DUPLICATE-CONFIRM-BURST): cross-request idempotency CLAIM, taken BEFORE
    // the race-loss pre-check and BEFORE the LLM turn. Root cause (R56/R56-verify): near-
    // simultaneous/rapid-fire confirms for the SAME phone's SAME pending_booking each independently
    // pass raceLostPreCheck below (none has committed yet) and each run a full LLM turn, so a
    // losing sibling either sends a false-positive "Gelukt!" or, rarer, self-corrects via a
    // reschedule_appointment call that silently lands on the WRONG time. bookedThisTurn (tools.ts)
    // is per-HTTP-request-local and cannot see a sibling request; raceLostPreCheck and the DB
    // exclusion constraint both check "is the slot free," never "did I, this exact proposal,
    // already get claimed by a sibling." Fix: an atomic DB-level claim scoped to
    // (phone, calendar_id, pending_booking.at) via claim_whatsapp_confirm (20s TTL, self-healing).
    // Only the FIRST concurrent request for this exact proposal wins the claim and proceeds; every
    // sibling gets an immediate deterministic "already processing" reply with NO LLM turn and NO
    // commit/reschedule attempt of its own.
    //
    // IUX R61 (structural fix, replaces R59+R60's pre-turn release heuristics; mandated by the
    // orchestrator after R58->R59->R60 each traded one pre-turn-classification gap for a different,
    // narrower one -- AFFIRM_RE-only -> hardConfirm-vs-confirmBook mismatch -> hardConfirm-vs-
    // AFFIRM_RE over-hold, see _INFINITE_UX_STATE.md WHATSAPP-DUPLICATE-CONFIRM-BURST /
    // HARD-CONFIRM-RELEASE-OVERHOLD-GAP). The root problem across all 3 prior release conditions
    // (`!confirmBook`, then `!hardConfirm`) was the SAME shape: each GUESSES, from the inbound
    // message's wording alone and BEFORE the LLM turn runs, whether this request will end up
    // committing. That guess can only ever be a proxy for the true fact ("did this turn's tool
    // calls actually commit a mutation"), and every proxy tried so far has had its own edge cases
    // where the guess and the model's real turn-outcome disagree in either direction (a duplicate
    // commit when the guess said "won't commit", or an over-hold when the guess said "will commit"
    // but the turn never does). Eliminating the guess entirely closes the whole class by
    // construction: the claim is taken here (unchanged), but is no longer released anywhere in
    // this pre-LLM block. It is held for the FULL duration of this turn's processing (primary
    // runAgent call + any stall-retry) and released exactly ONCE, post-hoc, right before the reply
    // is sent (see the single release call after the retry-adopt block below), keyed off
    // `isCommittedMutation` applied to `result.toolCalls` -- the SAME deterministic function
    // tools.ts's actual commit gate and this file's own `committed`/reply-templating logic already
    // trust as the authoritative "did a real commit happen" fact. This is not "release only on
    // commit": it releases the SAME way regardless of whether the winning turn committed, previewed,
    // answered a question, or errored, because by the time we know the outcome we no longer need to
    // ask "should this claim still block a sibling" -- either the mutation landed (so a duplicate
    // sibling attempt for the SAME proposal is caught by tools.ts's OWN commit gate / the
    // bookings_no_overlap constraint / bookedThisTurn, and pending_booking is cleared, so nothing
    // is lost by freeing the claim key) or it did not (so there is no reason left to hold the key
    // at all). The `won === false` short-circuit below is UNCHANGED (still the same deterministic
    // "already processing" reply, still zero LLM steps for a genuine duplicate concurrent request).
    let confirmBurstLost = false;
    let bookClaimId: string | undefined;
    if (pendingBookFresh && pbk?.at != null) {
      const claimCalendarId = pbk.calendar_id ?? calendar_id;
      const claimProposalAt = new Date(pbk.at).toISOString();
      const { data: claimRows, error: claimErr } = await supabase.rpc("claim_whatsapp_confirm", {
        p_phone: phone,
        p_calendar_id: claimCalendarId,
        p_proposal_at: claimProposalAt,
        p_ttl_seconds: 20,
      });
      const claimRow = Array.isArray(claimRows) ? claimRows[0] as { won?: boolean; claim_id?: string } | undefined : undefined;
      const won = claimRow?.won;
      if (!claimErr && won === false) {
        confirmBurstLost = true;
      } else if (!claimErr && won === true && claimRow?.claim_id) {
        // Held (not released) here by design; released post-hoc below once this turn's real
        // outcome is known. Missing/malformed pbk.at or an RPC error fails OPEN (no claim id
        // captured -> nothing to release later, matching the pre-existing fail-open posture: this
        // can only ever make the burst race safer, never introduce a new way to block or corrupt a
        // real booking).
        bookClaimId = claimRow.claim_id;
        bookClaimIdForFallback = claimRow.claim_id;
      }
    }
    if (confirmBurstLost) {
      const alreadyProcessingReply = customerLanguage != null
        ? "Got it, I'm already processing your confirmation, one moment please."
        : "Ik ben je bevestiging al aan het verwerken, één moment geduld.";
      const send = await sendWhatsAppText(phone, alreadyProcessingReply);
      if (conversationId) {
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          message_id: send.messageId ?? `agent-${now.getTime()}`,
          direction: "outbound",
          message_type: "text",
          content: alreadyProcessingReply,
          status: send.ok ? "sent" : "failed",
        });
      }
      return new Response(
        JSON.stringify({ ok: true, reply: alreadyProcessingReply, sent: send.ok, steps: 0, toolCalls: [], confirm_burst_lost: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // IUX R59 (WHATSAPP-CANCEL-DUPLICATE-BURST): the SAME idempotency-claim mechanism, applied to
    // the cancel path. `confirmCancel` is structurally identical to `confirmBook` (same freshness-
    // window gate, same AFFIRM_RE/NEGATE_RE/ambiguousConfirm shape) but R58 left it completely
    // unprotected; R58-verify reproduced a duplicate "Gedaan, je afspraak is geannuleerd." burst
    // (1/2 own trials) and this round re-reproduced it fresh (1/1, first attempt). Mirrors the
    // book-path design exactly, scoped to (phone, calendar_id, pending_cancel.at) instead of
    // pending_booking.at -- a SEPARATE claim key namespace from the book claim above (a customer
    // could in principle have both a fresh pending_booking AND a fresh pending_cancel from earlier
    // in the same conversation; keying on the cancel's own `at` timestamp keeps the two claim
    // families independent, they can never collide on the same claim_key since book/cancel proposal
    // timestamps are independent clocks). Gated on `pendingFresh` alone (not `confirmCancel`), same
    // "take on any message, release if not a clean confirm" shape as the book-path fix above, so a
    // genuine non-confirm message during a pending cancellation (e.g. "wat kost annuleren?", already
    // excluded from confirmCancel via cancelPolicyQuestion) is never blocked either.
    // IUX R61 (structural fix, mirrors the book-path block above): the claim is taken here
    // unchanged, but no longer released via any pre-turn wording guess (`!confirmCancel` in R59,
    // `!hardConfirm` in R60). Held for the full turn duration, released post-hoc below alongside
    // the book-path claim, keyed off this turn's actual `isCommittedMutation` outcome.
    let confirmCancelBurstLost = false;
    let cancelClaimId: string | undefined;
    if (pendingFresh && pc?.at != null) {
      const cancelClaimProposalAt = new Date(pc.at).toISOString();
      const { data: cancelClaimRows, error: cancelClaimErr } = await supabase.rpc("claim_whatsapp_confirm", {
        p_phone: phone,
        p_calendar_id: calendar_id,
        p_proposal_at: cancelClaimProposalAt,
        p_ttl_seconds: 20,
      });
      const cancelClaimRow = Array.isArray(cancelClaimRows) ? cancelClaimRows[0] as { won?: boolean; claim_id?: string } | undefined : undefined;
      const wonCancel = cancelClaimRow?.won;
      if (!cancelClaimErr && wonCancel === false) {
        confirmCancelBurstLost = true;
      } else if (!cancelClaimErr && wonCancel === true && cancelClaimRow?.claim_id) {
        cancelClaimId = cancelClaimRow.claim_id;
        cancelClaimIdForFallback = cancelClaimRow.claim_id;
      }
    }
    if (confirmCancelBurstLost) {
      const alreadyProcessingCancelReply = customerLanguage != null
        ? "Got it, I'm already processing your cancellation, one moment please."
        : "Ik ben je annulering al aan het verwerken, één moment geduld.";
      const send = await sendWhatsAppText(phone, alreadyProcessingCancelReply);
      if (conversationId) {
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          message_id: send.messageId ?? `agent-${now.getTime()}`,
          direction: "outbound",
          message_type: "text",
          content: alreadyProcessingCancelReply,
          status: send.ok ? "sent" : "failed",
        });
      }
      return new Response(
        JSON.stringify({ ok: true, reply: alreadyProcessingCancelReply, sent: send.ok, steps: 0, toolCalls: [], confirm_cancel_burst_lost: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      // IUX R61: this request holds the book claim (taken above) but is about to short-circuit
      // return WITHOUT ever reaching the primary runAgent call / the post-hoc release site below.
      // Release it here explicitly so a race-loss reply never leaves a live claim sitting until
      // TTL self-heal for no reason (the outcome -- lost the race, no commit attempted by THIS
      // request -- is already fully known at this point).
      if (bookClaimId) {
        const { error: raceLossReleaseErr } = await supabase.rpc("release_whatsapp_confirm_claim", { p_claim_id: bookClaimId });
        if (raceLossReleaseErr) console.error("release_whatsapp_confirm_claim (book, race-loss) error (fails open, TTL self-heals):", raceLossReleaseErr);
      }
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
    // R36 (PHANTOM-BOOKING-SELFCHAIN): no new field needed here. tools.ts's own closure (created
    // ONCE per HTTP request right here, reused across the primary AND any bookCommitMissed/
    // confirmStall retry runAgent call below) now tracks its own preview writes internally and
    // refuses to commit a pending_booking/pending_cancel it JUST wrote itself this turn.
    // R102 (shared-phone identity fix): knownName is the SAME tenant-scoped "name of whoever is
    // texting" signal book_appointment already defaults the booking name to (scopedName from
    // convContext.booking_name via update_lead, else the WhatsApp profile display name). Threaded
    // through as knownSelfName so cancel/reschedule's cross-identity guard can detect when a
    // resolved target booking's own name differs from what THIS speaker has said about themselves.
    const { decls, execute } = createTools(supabase, { calendarId: calendar_id, calendars, serviceCalendarMap, phone, businessUserId, conversationId, confirmCancel, confirmBook, confirmRename, confirmRenameVerification, confirmCancelVerification, confirmRescheduleVerification, confirmRescheduleAmbiguity: confirmRescheduleAmbiguity && hardConfirm === true, confirmBookVerification, knownSelfName: knownName, ambiguousConfirm, ambiguousConfirmForVerification: ambiguousConfirmForVerification(msgLower), hardConfirm, userMessage: String(message), relativeDateHintISO: relativeDateHint?.iso ?? null, customerLocale: customerLanguage != null ? "en" : "nl", blockForMissingServiceChoice, blockForAmbiguousBranch, distinctServiceForReschedule, abandonPreviousPreview, blockForReturningServiceDefault: blockForReturningServiceDefaultEffective, lastServiceForReturningDefault: lastService, allServiceNamesForAmbiguity: allServiceNamesForReturning, pendingBookInterveningExchange, messageRestatesDayTime: DAY_OR_TIME_SHIFT_RE.test(msgLower), priorRealBookingExists, confirmBookOwnerRestated });
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
    // R40: update_booking_name added, same "mutating tool, server-guarded two-phase commit"
    // reasoning as the other three (its own commit gate requires only_confirming_previous===true
    // AND !ambiguousConfirm AND hardConfirm===true AND a stored pending_rename, see tools.ts).
    const MUTATION_TOOLS = new Set(["book_appointment", "cancel_appointment", "reschedule_appointment", "update_booking_name"]);
    // A mutation only "counts" if it SUCCEEDED. The model sometimes calls book_appointment on
    // a reschedule-confirm turn; the duplicate guard refuses it (no double-book) but the
    // reschedule never happens — so an ERRORED mutation must NOT suppress the nudge. A PREVIEW
    // (needs_confirmation: book/cancel awaiting confirm) is likewise NOT a completed mutation.
    const isErr = (r: unknown) => !!r && typeof r === "object" &&
      ("error" in (r as Record<string, unknown>) || "needs_confirmation" in (r as Record<string, unknown>));
    const succeededMutation = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result));
    // R29 (T3-LATENCY-PAYOFF, confirmStall root-cause): bareAffirm is a PREFIX match on the
    // customer's whole message ("Klopt, maar kan het ook een uur later?" starts with "Klopt" so
    // it matches), not "the message is ONLY an affirmation". Before this fix, confirmStall fired
    // on that exact shape even though the customer's message is CHANGING the request (a
    // time-shift, a price question, a name correction, a conditional), not confirming a stalled
    // proposal: a false-trigger measured at ~100% on that specific shape in a fresh repro batch
    // (7/7 log-confirmed fires, all accepted=false, i.e. the wasted 2-3-step retry never even
    // helped, the model correctly re-asked/re-offered on its own, the retry was pure overhead).
    // Fix: reuse ambiguousConfirm/notCleanConfirm (line 823-830), the SAME proven-safe signal
    // R23-R27 already use to gate confirmBook/confirmCancel against this identical ambiguity
    // class (day/time-shift, price question, trailing "?", hedge words, conditionals). This does
    // NOT weaken the guarantee confirmStall protects (a genuine bare "ja"/"klopt" to a stalled
    // proposal, with nothing else in the message, still fires exactly as before, ambiguousConfirm
    // is false on a clean "Ja" or "Klopt"). It only stops the nudge-and-retry from firing on
    // messages that were never a clean confirmation in the first place, where the model's own
    // "which one?" follow-up was already the CORRECT behavior.
    const bareAffirm = /^\s*(ja|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|doe maar|klopt|akkoord|is goed|oui|ouais|sí|sì|si|sim|certo|claro|perfetto|parfait)\b/i.test(msgLower) && !NEGATE_RE.test(msgLower);
    const confirmStall = !succeededMutation && bareAffirm && !ambiguousConfirm && !cancelPreviewMissed && !confirmCancel &&
      !!result.text && result.text.includes("?");

    // Cancel-commit-missed: the customer AFFIRMED a pending cancel (server-detected confirmCancel)
    // but no successful cancel ran this turn — the model narrated "geannuleerd" WITHOUT calling the
    // tool, falsely telling the customer the slot is freed while the booking stays live (round-6
    // BLOCKER, intermittent in the multi-booking path). Force the cancel via a nudge. The two-phase
    // commit re-resolves the SERVER-stored pending_cancel, so a nudge can only ever cancel the
    // correct booking, never the wrong one.
    // R120 (MILDER-SYMPTOM fix, cancel side): ALSO widened to confirmCancelVerification, mirroring
    // bookCommitMissed's own widening (identityDisambiguationGuard.ts / tools.ts's cancelVerifiedBypass
    // has the full root-cause reasoning). Live-reproduced: once cancel's own naam_verificatie_nodig
    // fires, a resolving reply naming the target ("Ja, echt annuleren voor Erik") needs the SAME
    // forcing nudge as any other missed commit, since tools.ts's own gate no longer depends on the
    // model's args.confirmed/only_confirming_previous attestation for this path, but the tool still
    // needs to be CALLED at least once for that gate to run.
    const cancelCommitMissed = (confirmCancel || confirmCancelVerification) && !succeededMutation;

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
    const slotTakenOnCommit = (confirmBook || confirmBookVerification || confirmBookOwnerRestated) && result.toolCalls.some(
      (t) => t.name === "book_appointment" && !!t.result && typeof t.result === "object" &&
        BOOK_RACE_LOSS_ERRORS.has(String((t.result as Record<string, unknown>).error)));
    // R11 (round 11, DUPLICATE-BOOKING-ON-PAYMENT-SETUP-FAILURE fix, bug A of the full-journey
    // simulation loop): live-reproduced (R7/R8/R10 evidence, re-verified this round on ALL 3
    // payment-required calendars, not installment-specific as first scoped) that a confirmBook
    // turn whose book_appointment call ALREADY inserted a real `bookings` row and then genuinely
    // failed at the (external) payment-link-minting step returns `error: "payment_setup_failed"`
    // -- tools.ts's own payment branch already self-cancels that row before returning the error
    // (see tools.ts, the two `status: "cancelled"` updates right before both
    // `payment_setup_failed` returns), so nothing is actually "missing" here, a booking WAS made
    // and the failure was correctly handled and disclosed. But `succeededMutation` only counts a
    // tool call with NO `error` field as success, so this errored-but-already-handled call still
    // left `succeededMutation` false, `slotTakenOnCommit` false (payment_setup_failed is not a
    // BOOK_RACE_LOSS_ERRORS member), and `bookCommitMissed` fired, forcing the retry mechanism to
    // re-invoke book_appointment. Since the payment failure path never calls clearPendingBook()
    // (the stored proposal is deliberately left in place so the customer can re-confirm and retry
    // payment later), the forced retry's book_appointment call re-commits the SAME still-pending
    // proposal, inserting a SECOND, near-identical `bookings` row (same calendar/service/time),
    // which then ALSO fails the same payment step and self-cancels -- exactly the "two
    // near-duplicate rows created ~2 seconds apart, both status=cancelled" shape found on Milan
    // (R8), Bo (R10), AND Sanne (re-verified live this round, `ea6a5360.../e4e43fe0...`, R7 had
    // only reported the second of the pair, mis-scoping this as installment-specific). The
    // retry's own reply is never even shown to the customer (the accept-gate at the bottom of
    // this stall-retry block requires `!isErr(t.result)`, and the retry's book_appointment call
    // errors the same way, so `accept` stays false and `result` stays the primary) -- the retry's
    // ONLY effect was a silently orphaned duplicate DB row, no customer-visible symptom, which is
    // exactly why this went undetected until this loop's DB-level verification. Fix: mirror
    // slotTakenOnCommit's exact pattern, excluding this specific, already-fully-handled failure
    // from bookCommitMissed so no pointless (and duplicating) retry is forced; the customer
    // already got the correct, honest "kon de betaling niet instellen" reply from the primary
    // turn, retrying the insert can never fix a missing Stripe Connect account anyway.
    const paymentSetupFailedOnCommit = (confirmBook || confirmBookVerification || confirmBookOwnerRestated) && result.toolCalls.some(
      (t) => t.name === "book_appointment" && !!t.result && typeof t.result === "object" &&
        String((t.result as Record<string, unknown>).error) === "payment_setup_failed");
    // R120 (BOOK-COMMIT-FIRST-MESSAGE-FALSE-POSITIVE fix, continued, model-attestation-reliability
    // half): live-reproduced on the S6 testpad (phone 31600001716) that even AFTER tools.ts's own
    // gate correctly accepts ctx.confirmBookVerification/ctx.confirmBookOwnerRestated as an
    // alternative to ctx.hardConfirm (identityDisambiguationGuard.ts's crossIdentityBookVerification
    // Bypass/messageNamesPendingBookOwner), the model itself does not reliably re-issue the
    // book_appointment tool call with confirmed:true on the turn that resolves a naam_verificatie_
    // nodig question: it re-drafts a fresh preview instead (the exact "small model doesn't reliably
    // re-issue the tool call with the right commit-attestation fields" risk this round's own task
    // description called out). bookCommitMissed's retry-nudge mechanism already exists for exactly
    // this class of failure (confirmBook), but was never widened to the TWO NEW server-computed
    // signals this round adds, so a genuine, already-server-verified resolution of the identity
    // question silently fell back to an infinite re-preview loop with NO forcing nudge at all. This
    // is pure ADDITIVE widening of the SAME existing mechanism, not a new one: the nudge text below
    // still only ever forces the SAME deterministic, server-stored-slot commit tools.ts's own gate
    // already independently re-verifies, so this can never force a wrong or premature booking, only
    // a booking that was already safe to make.
    const bookCommitMissed = (confirmBook || confirmBookVerification || confirmBookOwnerRestated) && !succeededMutation && !slotTakenOnCommit && !paymentSetupFailedOnCommit;

    // R40: Rename-commit-missed (mirrors cancelCommitMissed exactly). The customer AFFIRMED a
    // pending name-change (server-detected confirmRename) but no rename SUCCEEDED this turn (the
    // model re-previewed instead of committing, the exact live-repro'd failure mode this round).
    // Force the commit via a nudge. The two-phase commit re-resolves the SERVER-stored
    // pending_rename, so a nudge can only ever rename the correct booking to the correct
    // already-previewed name, never a model-reconstructed one.
    const renameCommitMissed = confirmRename && !succeededMutation;

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

    if (looksLikeStall || cancelPreviewMissed || confirmStall || bookPreviewMissed || reschedStall || cancelCommitMissed || bookCommitMissed || renameCommitMissed || emptyNoAction || slotOfferUnbacked) {
      // T3-LATENCY-RETRY follow-up (R22): the stall-retry DOUBLES the turn's sequential LLM
      // round-trips, and when accepted, `result = retry` makes the primary call's step count
      // invisible in the response. Log which heuristic fired + both step counts so tail-latency
      // turns are diagnosable from the function logs. Log-only, no behavior change.
      const nudgeReason =
        cancelCommitMissed ? "cancelCommitMissed" : bookCommitMissed ? "bookCommitMissed" :
        renameCommitMissed ? "renameCommitMissed" :
        reschedStall ? "reschedStall" : bookPreviewMissed ? "bookPreviewMissed" :
        cancelPreviewMissed ? "cancelPreviewMissed" : confirmStall ? "confirmStall" :
        emptyNoAction ? "emptyNoAction" : slotOfferUnbacked ? "slotOfferUnbacked" : "looksLikeStall";
      // R31 (AFFIRM-CONFIRM-HONESTLY-NOT-WHAT-I-HAD-IN-MIND): the cancelCommitMissed/
      // bookCommitMissed/confirmStall nudge texts used to assert "het systeem heeft de
      // bevestiging al als schoon herkend" (the system already recognized this confirmation as
      // clean), which is misleading: that server-side signal (confirmBook/confirmCancel) is
      // itself just this same regex layer's own belief, not an independent truth, so telling the
      // model it is already settled actively overrode the model's own (in this round's repro,
      // CORRECT) judgment on the retry turn. Reworded to instead instruct the model to make its
      // OWN honest only_confirming_previous judgment on THIS retry call, same as any other
      // book/cancel commit call, so a future regex gap on a new phrasing degrades to "the model
      // still gets a fair, unbiased chance to say false" instead of "the nudge tells it the
      // answer is already true." Safe by construction, unchanged: tools.ts still requires
      // args.only_confirming_previous === true AND !ctx.ambiguousConfirm AND a stored
      // pendingBook/pending to ever commit (tools.ts's committing/cancel-commit gates), so this
      // wording change can only ever make a wrong commit LESS likely, never more.
      // R120 (MILDER-SYMPTOM fix, cancel side): a DEDICATED nudge for confirmCancelVerification,
      // parallel to book's own dedicated branch above, so the model is told explicitly that the
      // name in this turn's message IS the resolution, not new doubt to re-litigate.
      const nudgeText = confirmCancelVerification
        ? "[systeem] De klant heeft zojuist bevestigd dat de afspraak echt van de genoemde naam is en geannuleerd moet worden (dit is server-side al geverifieerd, de naam in het bericht is de bevestiging, GEEN nieuwe twijfel), maar je hebt cancel_appointment niet (geslaagd) aangeroepen, dus er is nog NIETS geannuleerd. Roep NU cancel_appointment aan met confirmed:true EN only_confirming_previous:true, in DEZELFDE aanroep. Vraag niets extra's, verifieer de naam niet nogmaals, en zeg NOOIT dat er geannuleerd is voordat de tool 'ok' teruggaf."
        : cancelCommitMissed
        ? "[systeem] De klant bevestigde dat de zojuist voorgestelde afspraak geannuleerd mag worden, maar je hebt cancel_appointment niet (geslaagd) aangeroepen, dus er is NIETS geannuleerd. Roep NU cancel_appointment aan met confirmed:true. Beoordeel only_confirming_previous zelf, opnieuw, op BETEKENIS: true ALLEEN als het laatste klantbericht ECHT en UITSLUITEND een kale bevestiging is zonder enige andere inhoud, false zodra er ENIG signaal in zit dat de klant iets anders wil (andere tijd, vraag, voorwaarde, twijfel, afwijzing/ontevredenheid in welke vorm dan ook). Twijfel je: false, dan vraagt het systeem gewoon nogmaals. Antwoord met het resultaat. Zeg NOOIT dat een afspraak geannuleerd is zonder de tool aan te roepen."
        : renameCommitMissed
        ? "[systeem] De klant bevestigde de zojuist voorgestelde naamswijziging op de afspraak, maar je hebt update_booking_name niet (geslaagd) aangeroepen, dus de naam is nog NIET gewijzigd. Roep NU update_booking_name aan met BEIDE velden confirmed:true EN only_confirming_previous samen in DEZELFDE aanroep. Beoordeel only_confirming_previous zelf, opnieuw, op BETEKENIS: true ALLEEN als het laatste klantbericht ECHT en UITSLUITEND een kale bevestiging is zonder enige andere inhoud, false zodra er ENIG signaal in zit dat de klant iets anders wil. Twijfel je: false, dan vraagt het systeem gewoon nogmaals. Geef new_name NIET opnieuw door: het systeem gebruikt de in de preview opgeslagen naam. Antwoord met het resultaat."
        // R120 (BOOK-COMMIT-FIRST-MESSAGE-FALSE-POSITIVE fix, model-attestation-reliability half,
        // continued): a DEDICATED nudge text for the confirmBookVerification/confirmBookOwnerRestated
        // shape, deliberately WITHOUT the generic bookCommitMissed text's "andere naam" caveat below.
        // Live-reproduced on the S6 testpad (phone 31600001718): reusing the generic text here
        // actively backfires, because that text explicitly instructs the model to treat ANY name
        // mention as a signal only_confirming_previous should be false ("andere naam" in its own
        // caveat list) -- exactly backwards for THIS specific shape, where the customer naming the
        // target person IS the confirmation signal (it is what resolved the naam_verificatie_nodig
        // question in the first place), not a contradiction of it. NOTE: tools.ts's own committing
        // gate (identityDisambiguationGuard.ts's crossIdentityBookVerificationBypass /
        // messageNamesPendingBookOwner, wired as ctx.confirmBookVerification/confirmBookOwnerRestated)
        // no longer actually REQUIRES args.confirmed/only_confirming_previous from the model on this
        // exact path at all (live-tested: even this dedicated nudge text did not reliably land the
        // model's own attestation 3 retries running, so the commit gate was made fully deterministic
        // instead, per this codebase's own established doctrine that prompt-only steering does not
        // hold at this model's scale). This nudge text is kept purely as a DEFENSIVE retry-trigger
        // for the shape where the model calls NO tool at all this turn (book_appointment still needs
        // to be CALLED at least once for the server-side gate to ever run); asking it to also set
        // confirmed:true/only_confirming_previous:true is harmless (server ignores both on this path)
        // and gives a clear, safe instruction if the model happens to comply.
        : (confirmBookVerification || confirmBookOwnerRestated)
        ? "[systeem] De klant heeft zojuist bevestigd dat de afspraak echt voor de genoemde naam geboekt moet worden (dit is server-side al geverifieerd, de naam in het bericht is de bevestiging, GEEN nieuwe twijfel), maar je hebt book_appointment niet (geslaagd) aangeroepen, dus er is nog NIETS geboekt. Roep NU book_appointment aan met confirmed:true EN only_confirming_previous:true, in DEZELFDE aanroep. Geef customer_name NIET opnieuw door: het systeem gebruikt de al opgeslagen naam uit de preview. Vraag niets extra's, verifieer de naam niet nogmaals, en zeg NOOIT dat er geboekt is voordat de tool 'ok' teruggaf."
        : bookCommitMissed
        ? "[systeem] De klant bevestigde de zojuist voorgestelde afspraak, maar je hebt book_appointment niet (geslaagd) aangeroepen, dus er is nog NIETS geboekt. Roep NU book_appointment aan met confirmed:true. Beoordeel only_confirming_previous zelf, opnieuw, op BETEKENIS: true ALLEEN als het laatste klantbericht ECHT en UITSLUITEND een kale bevestiging is zonder enige andere inhoud, false zodra er ENIG signaal in zit dat de klant iets anders wil (andere tijd/dag, vraag, voorwaarde, andere naam, twijfel, of een afwijzing/ontevredenheid in welke vorm dan ook, ook als er geen concreet alternatief genoemd wordt). Twijfel je: false, dan vraagt het systeem gewoon nogmaals, veiliger dan verkeerd boeken. Het systeem gebruikt bij confirmed:true het in de preview opgeslagen tijdslot: geef de datum of tijd NIET opnieuw door en bereken niets na. Vraag niets extra's en zeg NOOIT dat er geboekt is voordat de tool 'ok' teruggaf."
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
        ? "[systeem] De klant bevestigde de zojuist voorgestelde actie. Voer 'm NU uit met de juiste tool (meestal reschedule_appointment naar het EXACTE tijdstip dat jij net voorstelde of dat de klant noemde; herbereken de tijd NIET zelf, gebruik letterlijk dat tijdstip; anders book_appointment, cancel_appointment of update_booking_name). Heb je deze beurt al een preview gedaan met book_appointment of update_booking_name, roep DIEZELFDE tool dan opnieuw aan met confirmed:true (en bij update_booking_name ook only_confirming_previous:true, in DEZELFDE aanroep), en beoordeel only_confirming_previous zelf, opnieuw, op BETEKENIS: true ALLEEN als het laatste klantbericht ECHT en UITSLUITEND een kale bevestiging is zonder enige andere inhoud, false zodra er ENIG signaal in zit dat de klant iets anders wil (het systeem gebruikt exact het opgeslagen tijdslot/de opgeslagen naam; NIET nogmaals zonder confirmed aanroepen, dat maakt alleen weer een preview). Stel geen extra vraag en kondig niets aan: antwoord met het resultaat."
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
        (confirmStall || reschedStall || cancelCommitMissed || bookCommitMissed || renameCommitMissed)
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

    // R37 (bug R36a, MILAN-SLOT-FABRICATION fix, final safety net): the slotOfferUnbacked nudge
    // above exists to force a real get_available_slots call before a time offer ships, but its own
    // accept-gate only requires SOME non-announce text back, not an actual tool call -- a compound
    // ask the model cannot even resolve to a real service_type_id (R36: "Manicure bij Milan",
    // Manicure is a Bo-only service) can have its retry ALSO skip every tool call and just repeat
    // the same fabricated offer, which then gets silently adopted. Since no query ever ran,
    // enforceSlotOffer's own !hadQuery early-return (by design, so genuine info/recall replies are
    // never mangled) lets that fabricated offer pass straight through untouched. Close the gap here:
    // re-check the SAME slotOfferUnbacked condition against the FINAL result (original or retry)
    // after the nudge/retry cycle has already had its one chance to supply real ground truth; if it
    // is STILL true, refuse to ship the fabricated offer, ask honestly instead. Gated on
    // slotOfferUnbacked itself (computed above from the PRIMARY turn only), so a turn that never
    // looked like an unbacked slot offer in the first place is never touched.
    if (slotOfferUnbacked) {
      const finalCalledSlots = result.toolCalls.some((t) => t.name === "get_available_slots");
      const finalCalledMutation = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name));
      const finalOfferedTimes = extractOfferedClockTimes(result.text || "", String(message));
      const stillUnbacked = !finalCalledSlots && !finalCalledMutation && finalOfferedTimes.length > 0 &&
        OFFER_CONTEXT_RE.test(result.text || "");
      if (stillUnbacked) {
        console.warn(
          `slot-offer-guard: no-query safety net fired, phantom times ${JSON.stringify(finalOfferedTimes)} with zero grounding tool call even after retry`,
        );
        result = { ...result, text: noQueryGroundedReply(customerLanguage != null) };
      }
    }

    // IUX R61 (WHATSAPP-DUPLICATE-CONFIRM-BURST, structural fix, single post-hoc release site for
    // BOTH the book-claim and cancel-claim held above): `result` is now final (primary turn, or the
    // adopted stall-retry) and its real outcome is knowable via the SAME deterministic
    // `isCommittedMutation` check the commit-templating logic just below also relies on -- no
    // pre-turn wording guess involved. Release whichever claim(s) this request is holding
    // UNCONDITIONALLY here, regardless of whether this turn committed, previewed, answered a
    // question, or errored: once the real outcome is known there is no remaining reason to hold the
    // key. A genuine commit already clears pending_booking/pending_cancel via tools.ts, so a
    // late-arriving sibling for the SAME proposal can no longer even re-derive a matching claim key
    // (pendingBookFresh/pendingFresh will no longer see that proposal); a non-commit outcome means
    // the proposal is still live and a subsequent genuine confirm attempt (this same customer's next
    // message, or a sibling that arrives after this response) must be free to claim immediately, not
    // wait out the 20s TTL. Released BY ROW ID (never by key), so this can never delete a different,
    // newer claim generation for the same key (mirrors R59/R60's own release-by-id safety property).
    // Best-effort: a release RPC error here fails open (logged, not thrown) -- the 20s TTL self-heals
    // any claim this call could not clear, matching every prior round's fail-open posture.
    if (bookClaimId) {
      const { error: bookReleaseErr } = await supabase.rpc("release_whatsapp_confirm_claim", { p_claim_id: bookClaimId });
      if (bookReleaseErr) console.error("release_whatsapp_confirm_claim (book, post-hoc) error (fails open, TTL self-heals):", bookReleaseErr);
    }
    if (cancelClaimId) {
      const { error: cancelReleaseErr } = await supabase.rpc("release_whatsapp_confirm_claim", { p_claim_id: cancelClaimId });
      if (cancelReleaseErr) console.error("release_whatsapp_confirm_claim (cancel, post-hoc) error (fails open, TTL self-heals):", cancelReleaseErr);
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
      replyText = deterministicConfirmation(result.toolCalls, customerLanguage, knownName) || replyText;
      // R96 (PHANTOM-SUCCESS-ZERO-MUTATION fix, NEW-1): verify the claimed commit against a real
      // row in the database THIS SAME TURN, before the reply ships. Single cheap indexed lookup
      // (id + status only), only ever runs on an already-rare commit turn (never on the far more
      // common preview/info turns), so the latency budget (<3s gate) is unaffected in practice.
      // Fails CLOSED: a missing/errored/cancelled row means the reply is rewritten to an honest
      // "let me sort that out" line rather than ever shipping an unverified success claim,
      // regardless of what produced the mismatch (this is deliberately a structural backstop, not
      // a diagnosis of one specific root cause, matching R61's own belt-and-suspenders posture).
      const verifyId = committedMutationBookingId(result.toolCalls);
      if (verifyId) {
        // R97 (sibling gap, cancel_appointment now carries booking_id too): a cancellation's OWN
        // correct post-mutation status IS "cancelled", so the book/reschedule expectation
        // (status !== "cancelled" means ok) would incorrectly flag every real, successful
        // cancellation as a phantom and rewrite it to a false "let me sort that out" reply -- the
        // exact inverse defect. Branch the expected status on which tool actually committed this
        // turn: a cancel commit is verified as real when the row exists AND is cancelled; a
        // book/reschedule commit is verified as real when the row exists AND is NOT cancelled.
        const cancelCommitted = result.toolCalls.some((t) => t.name === "cancel_appointment" && isCommittedMutation(t.name, t.result));
        const { data: verifyRow } = await supabase
          .from("bookings").select("id, status").eq("id", verifyId).maybeSingle();
        const status = (verifyRow as { status?: string } | null)?.status;
        const rowOk = !!verifyRow && (cancelCommitted ? status === "cancelled" : status !== "cancelled");
        if (!rowOk) {
          console.error(`[phantom-success-guard] commit claimed but no matching live row for booking_id=${verifyId} (expected cancelled=${cancelCommitted}); rewriting to honest reply`);
          replyText = noFalseConfirmReply(customerLanguage);
        }
      }
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
        // R20: never silently drop a second, distinct service the customer named in the SAME
        // message as the one that just got previewed (see findUnacknowledgedSecondService above
        // for the full root-cause writeup). Only engages in multi-calendar mode; single-calendar
        // businesses have no second calendar/service to lose track of.
        let previewedServiceName: string | null = null;
        for (let i = result.toolCalls.length - 1; i >= 0; i--) {
          const t = result.toolCalls[i];
          if (t.name === "book_appointment" && t.result && typeof t.result === "object" && (t.result as Record<string, unknown>).needs_confirmation === true) {
            const p = (t.result as Record<string, any>).proposal as { service?: string | null } | undefined;
            previewedServiceName = p?.service ?? null;
            break;
          }
        }
        const secondService = isMultiCalendar
          ? findUnacknowledgedSecondService(calendarsForPrompt, previewedServiceName, String(message))
          : null;
        replyText = appendSecondServiceAck(preview, secondService, customerLanguage);
      } else if (!replyText) {
        const finalSucceeded = result.toolCalls.some((t) => MUTATION_TOOLS.has(t.name) && !isErr(t.result));
        if (finalSucceeded) replyText = deterministicConfirmation(result.toolCalls, customerLanguage, knownName) || "";
      } else {
        // P0-1: model-prose reply (not a committed mutation, not a server-templated preview).
        // Enforce the "no fabricated time" guarantee: any clock time the reply OFFERS must come
        // from THIS turn's real get_available_slots result, else rebuild the offer from the real
        // free slots. No-ops on info/recall turns (no slots query ran), so it only ever touches a
        // reply that proposes times while a query gave ground truth to check them against.
        replyText = enforceSlotOffer(replyText, result.toolCalls, String(message), customerLanguage);
        // R18 DATE-OFFER GUARD (dateOfferGuard.ts): the sibling gap slotOfferGuard structurally
        // cannot cover, an offered ALTERNATIVE DAY rather than a clock time. R17 live-reproduced:
        // book_appointment/reschedule_appointment declined a fully-closed day (empty
        // available_slots, e.g. a vacation override) and the model free-invented "woensdag 22
        // juli" as an alternative, itself ALSO inside the same closed window (RPC-verified). Only
        // engages when THIS turn actually had a day-fully-closed decline (real ground truth to
        // check against exists), so info/recall turns and normal slot-taken turns are untouched.
        const dayClosedCall = [...result.toolCalls].reverse().find((t) => {
          const r = t.result as Record<string, unknown> | null;
          if (!r || typeof r !== "object") return false;
          if ((t.name === "book_appointment" || t.name === "reschedule_appointment") && r.error === "niet_beschikbaar") {
            return Array.isArray(r.available_slots) && r.available_slots.length === 0;
          }
          if (t.name === "get_available_slots") return r.count === 0;
          return false;
        });
        if (dayClosedCall) {
          const dcArgs = (dayClosedCall as { args?: Record<string, unknown> }).args ?? {};
          const declinedDate = typeof dcArgs.date === "string" ? dcArgs.date : null;
          const serviceId = typeof dcArgs.service_type_id === "string" ? dcArgs.service_type_id : null;
          const todayISO = now.toISOString().slice(0, 10);
          const offered = declinedDate ? extractOfferedDates(replyText, todayISO, declinedDate) : [];
          if (serviceId && offered.length > 0) {
            const targetCalendarId = serviceCalendarMap?.[serviceId] ?? calendar_id;
            const checkDate = async (iso: string): Promise<boolean> => {
              const { data } = await supabase.rpc("get_available_slots", {
                p_calendar_id: targetCalendarId, p_service_type_id: serviceId, p_date: iso,
              });
              return ((data as Array<{ is_available: boolean }>) ?? []).some((s) => s.is_available);
            };
            const checks = await Promise.all(offered.slice(0, 3).map((iso) => checkDate(iso)));
            const anyFabricated = checks.some((ok) => !ok);
            if (anyFabricated) {
              console.warn(
                `date-offer-guard: rebuilt date offer, phantom dates ${JSON.stringify(offered)} not real per get_available_slots for calendar=${targetCalendarId} service=${serviceId}`,
              );
              const realOpen: string[] = [];
              if (declinedDate) {
                for (let i = 1; i <= 10 && realOpen.length < 2; i++) {
                  const d = new Date(`${declinedDate}T12:00:00Z`);
                  d.setUTCDate(d.getUTCDate() + i);
                  const iso = d.toISOString().slice(0, 10);
                  if (await checkDate(iso)) realOpen.push(iso);
                }
              }
              const en = customerLanguage != null;
              replyText = realOpen.length > 0 ? buildDeterministicDateAlternatives(realOpen, en) : noNearbyOpenDateReply(en);
            }
          }
        }
        // F-014: "no hallucinated booking-confirmation" guarantee. A prompt-injected user (a forged
        // TOOL_RESULT:{create_booking:confirmed} string, a "[systeem] geboekt!" paste) can coax the
        // 20B model into claiming "your appointment is confirmed!" with ZERO tool calls and ZERO DB
        // row. We are in the prose `else` branch (no committed mutation this turn, no server preview),
        // so ANY done-state booking/cancel/reschedule claim here is necessarily false: strip it and
        // reply honestly. A real successful commit goes through the `committed` branch above (and
        // deterministicConfirmation), so the legit confirmation path is never reached here.
        replyText = enforceNoFalseConfirmation(replyText, result.toolCalls, customerLanguage);
        // R102 (shared-phone identity fix, deterministic disclosure backstop, see
        // identityDisambiguationGuard.ts header): get_my_appointments is a read-only lookup, so a
        // MISSED disclosure here cannot itself mutate data, but it is the exact R101-1 trigger
        // shape (a customer shown a DIFFERENT real person's booking as if it were their own with
        // zero name disclosure). Live-tested this round: the model's own prompt-guided disclosure
        // was UNRELIABLE for a single-booking result (it repeatedly still said "je afspraak"
        // despite the tool result carrying customer_name + guidance), so this is rewritten here
        // deterministically, mirroring enforceRefundPolicy/enforcePriceClaim below. No-op unless a
        // get_my_appointments call actually ran this turn with a real, undisclosed name mismatch.
        const lastAppointmentsResult = result.toolCalls.filter((t) => t.name === "get_my_appointments").pop()?.result as
          { appointments?: AppointmentForDisclosure[] } | undefined;
        if (lastAppointmentsResult?.appointments) {
          replyText = enforceAppointmentNameDisclosure(replyText, lastAppointmentsResult.appointments, customerLanguage);
        } else if (mentionsOwnAppointmentClaim(replyText)) {
          // R107 (NO-FRESH-TOOL-CALL coverage gap fix): the model answered a possessive-booking-
          // shaped reply ("je staat op maandag...", "your appointment is...") WITHOUT calling
          // get_my_appointments this turn at all, most often a follow-up answered purely from its
          // own prior-turn context memory ("en hoe laat ook alweer?"). The disclosure mechanism
          // above only ever sees THIS turn's fresh tool result, so on a memory-only turn it was
          // structurally never invoked, independent of whether a real name mismatch exists. Fix:
          // on exactly this shape, re-run the SAME cheap upcoming-bookings lookup
          // get_my_appointments itself does (scoped to phone + the owner's calendar allowlist,
          // confirmed/pending, future-only, capped) and feed it through the identical deterministic
          // rewrite. No-op (byte-identical reply) whenever that lookup finds nothing or nothing
          // carries a real, distinct name, i.e. the common non-shared-phone case is unaffected;
          // this only ever fires extra disclosure, never extra silence.
          const { data: fallbackRows } = await supabase
            .from("bookings")
            .select("start_time, service_types(name), customer_name")
            .eq("customer_phone", phone)
            .in("calendar_id", calendars.map((c) => c.id))
            .in("status", ["confirmed", "pending"])
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(5);
          const fallbackAppointments = ((fallbackRows as Array<{ start_time: string; service_types?: { name?: string } | null; customer_name?: string | null }>) ?? [])
            .map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), customer_name: b.customer_name }));
          if (fallbackAppointments.length > 0) {
            replyText = enforceAppointmentNameDisclosure(replyText, fallbackAppointments, customerLanguage);
          }
        }
        // R112 (GATE-FIRST-TRIGGER-WRONG-TEXT fix, closes R107-GATE-FIRST-TRIGGER-WRONG-TEXT): the
        // cross-identity naam_verificatie_nodig gate (book/cancel/reschedule/rename) ALWAYS blocks
        // the mutation server-side; this only guarantees the CUSTOMER-FACING TEXT on that turn is
        // the intended disclosure-and-confirm question, deterministically, instead of trusting the
        // model to relay it (which live testing showed sometimes drifts into an unrelated
        // non-sequitur refusal). No-op unless a tool call this turn actually returned
        // naam_verificatie_nodig AND the drafted reply fails to disclose the target name.
        replyText = enforceVerificationGateDisclosure(replyText, result.toolCalls);
        // R37 (bug R36b fix): same gate-first-trigger-wrong-text pattern, for book_appointment's
        // DUPLICATE GUARD (error: "bestaande_afspraak"). Live-reproduced: the model paraphrased the
        // tool's real conflicting date into a WRONG date (the customer's own just-requested date
        // instead of the real existing booking's date). No-op unless this turn actually returned
        // bestaande_afspraak AND the drafted reply's date does not match the real existing_start_time.
        replyText = enforceExistingAppointmentDisclosure(replyText, result.toolCalls);
        // R118 (GAP 1 fix): same gate-first-trigger-wrong-text pattern, for reschedule_appointment's
        // NEW verzet_bevestiging_nodig ambiguity gate (a SEPARATE gate from naam_verificatie_nodig
        // above: this one guards intent ambiguity, not cross-identity).
        replyText = enforceRescheduleAmbiguityDisclosure(replyText, result.toolCalls);
        // R113 (RETURNING-SERVICE-TOOL-CALL-GATE-ONLY fix, closes R111-verify's own reported gap):
        // `blockForReturningServiceDefaultEffective` only ever produces a disclosure via tools.ts
        // when the model actually attempts get_available_slots/book_appointment and gets refused.
        // Live-reproduced: a bare returning-customer request ("ik wil weer een afspraak inplannen",
        // "hoi, ik wil een afspraak") routinely makes the model compose a reply with ZERO tool
        // calls at all (e.g. it answers as a get_my_appointments-style status lookup, or asks a
        // generic "welke dienst?" without ever naming the assumed last service), so the gated tool
        // call this guarantee depended on never happens. This runs regardless of which (if any)
        // tool calls happened this turn, closing the exact gap the tool-call-only gate leaves open
        // (see serviceDisambiguationGuard.ts's own header for the full root-cause + safety notes).
        replyText = enforceReturningServiceDisclosure(replyText, blockForReturningServiceDefaultEffective, lastService, allServiceNamesForReturning);
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
        // P12-HALLUCINATED-LOYALTY-POLICY / P12-CONFIRMED-FALSE-SOCIAL-PROOF-DISCOUNT (IUX R62/R64):
        // no discount/loyalty/coupon/promo mechanism exists anywhere in this schema (information_schema
        // grep, R62-verify), so ANY claim asserting a concrete discount/loyalty MECHANISM (a percentage,
        // a visit-tier, a stamp-card, an eligibility condition), or confirming a customer's fabricated
        // discount premise as true, is categorically false. Narrow, high-confidence pattern match
        // (defense-in-depth under the prompt-level "never invent a discount mechanism" reinforcement);
        // see policyClaimGuard.ts header for why a narrower guard was chosen over a broad classifier.
        // userMessage (R64-verify residual close) unlocks the anaphoric "die regeling" dodge check;
        // see looksLikeAnaphoricPolicyConfirmation in policyClaimGuard.ts.
        replyText = enforceNoPolicyHallucination(replyText, customerLanguage, String(message));
        // P12-FABRICATED-OWNER-ESCALATION (IUX R62-verify/R64): no owner-notify/escalate/human-handoff
        // tool exists anywhere in tools.ts, so ANY claim that the agent contacted, is contacting, or
        // received a response from a human owner is categorically false (unlike the policy guard above,
        // this can be a HARD categorical block since no code path can ever make the claim true). Rewrite
        // to an honest "I can't reach them myself, here's how you can" reply using the real contact info.
        const ownerPhone = typeof businessData?.business_phone === "string" ? (businessData.business_phone as string) : null;
        const ownerEmail = typeof businessData?.business_email === "string" ? (businessData.business_email as string) : null;
        const replyBeforeOwnerGuard = replyText;
        replyText = enforceNoOwnerEscalationClaim(replyText, customerLanguage, ownerPhone, ownerEmail);
        // OWNERESCALATION-VERBLIST-BRITTLE structural fix (IUX R66): the regex guard above is a
        // closed shape (verb stems + subject/auxiliary skeleton) that R64-verify and R65-verify BOTH
        // independently proved incomplete against idiom/metaphor/passive-voice paraphrases (see
        // ownerEscalationClassifier.ts header + IUX_r66.md for the full reasoning + regression bank).
        // SECOND PASS: a narrow, single-purpose classification call judges the SAME replyText's
        // MEANING rather than its wording. Skipped when the regex guard already rewrote replyText to
        // the fixed safe-fallback template (that string is a reviewed constant, never model output,
        // so it can never itself be a false claim -- no need to spend a network round-trip on it).
        //
        // P12 FAMILY GENERALIZED GUARD (IUX R94, businessDataGuard.ts): rather than adding a 6th/7th/
        // 8th narrow shape-specific guard for each newly-found hallucination topic (fake deposit
        // rationale, fee-legitimization, fake refund-policy invention, active-override contradiction,
        // all found R82), a single BROAD classification pass judges the SAME replyText against a
        // compact real business_data summary: "does this claim assert a policy/fee/discount/refund/
        // fact NOT actually supported by business_data". Fired in PARALLEL with the owner-escalation
        // classifier above (Promise.all, wall-clock bounded by the slower of the two, not their sum)
        // whenever EITHER of them still has real classification work to do (i.e. whenever the regex
        // guard has not already rewritten replyText to its fixed fallback template). See
        // businessDataGuard.ts header for the full design rationale.
        const skipOwnerClassifier = replyText !== replyBeforeOwnerGuard;
        const replyBeforeGroundingGuard = replyText;
        // R18: in multi-calendar mode, `priceCheckServices` is the FLAT cross-calendar merge
        // (every service on every calendar, used correctly by enforcePriceClaim above, which only
        // needs "is this a real euro amount for SOME service"). Passing that same flat list here
        // as the top-level `services` field would erase per-calendar attribution and defeat the
        // fix below: a service that only actually exists on Milan's calendar would read as
        // "grounded" for a claim about Sanne's menu too. Multi-calendar mode relies solely on
        // `calendarsForPrompt`'s own per-calendar `services` (now included in the summary, see
        // businessDataGuard.ts); single-calendar mode is unaffected (still passes its one real list).
        const groundingSummary = buildGroundingSummary({
          businessData,
          services: calendarsForPrompt ? undefined : priceCheckServices,
          refundDisposition,
          calendars: calendarsForPrompt,
        });
        const [ownerClf, groundingClf] = await Promise.all([
          skipOwnerClassifier
            ? Promise.resolve(null)
            : classifyOwnerEscalationClaimRobust(replyText, Deno.env.get("GROQ_API_KEY")),
          classifyBusinessDataGroundingRobust(replyText, groundingSummary, Deno.env.get("GROQ_API_KEY")),
        ]);
        if (ownerClf) {
          console.log(
            `owner-escalation-classifier: reason=${ownerClf.reason} latencyMs=${ownerClf.latencyMs} isEscalationClaim=${ownerClf.isEscalationClaim} votes=${JSON.stringify(ownerClf.votes)} tieBreakerFired=${ownerClf.tieBreakerFired}`,
          );
          if (ownerClf.isEscalationClaim) {
            replyText = noOwnerEscalationReply(customerLanguage, ownerPhone, ownerEmail);
            console.warn(
              `owner-escalation-classifier: rewrote a fabricated owner-contact claim missed by the regex guard:`,
              JSON.stringify(replyBeforeOwnerGuard),
            );
          }
        }
        console.log(
          `business-data-guard: reason=${groundingClf.reason} latencyMs=${groundingClf.latencyMs} isUngroundedClaim=${groundingClf.isUngroundedClaim} votes=${JSON.stringify(groundingClf.votes)}`,
        );
        // Only rewrite for the grounding guard if NEITHER the regex owner-escalation guard NOR the
        // owner-escalation classifier already rewrote this turn (either of those rewrites is a more
        // specific/severe category AND is itself always a reviewed, grounded-safe constant, so
        // re-rewriting on top of either would be pointless at best; found + fixed during R94's own
        // code-review pass: checking replyText === replyBeforeGroundingGuard alone missed the case
        // where the REGEX guard, not the classifier, had already fired before this block ran).
        if (groundingClf.isUngroundedClaim && replyText === replyBeforeGroundingGuard && !skipOwnerClassifier) {
          console.warn(
            `business-data-guard: rewrote an ungrounded business-fact/policy claim:`,
            JSON.stringify(replyBeforeGroundingGuard),
          );
          replyText = noUngroundedClaimReply(customerLanguage, ownerPhone, ownerEmail);
        }
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
    // R28 (T3-LATENCY-PAYOFF): the Graph API send + its dependent DB writes (outbound message
    // row, greeting/language context merge) no longer block the HTTP response. They run in
    // `runInBackground` (EdgeRuntime.waitUntil), so the turn's wall-clock (what the <3s gate
    // measures) stops paying the 526-765ms Graph API round-trip R27-verify measured on every
    // turn. A send failure is still fully observable: `sendWhatsAppText` already logs
    // `console.error` internally on a non-ok response, and the persisted `whatsapp_messages`
    // row still gets `status:'failed'` (same as before) so it is visible via a DB query, not
    // silently lost. Added: a dedicated `[bg-send-failed]` log line here (grep-able,
    // distinguishes "the send genuinely failed" from an unrelated background-task error) since
    // the response body can no longer report `sent:true/false` truthfully (the send has not
    // happened yet when the response is written). The DB booking/cancel commit itself is
    // UNCONDITIONAL on send success both before and after this change (the insert already
    // happened earlier in the tool-call path, long before this block); this change only moves
    // WHEN the confirmation text is dispatched relative to the response, never whether the
    // underlying mutation succeeded.
    const replyForBg = reply;
    const conversationIdForBg = conversationId;
    const phoneForBg = phone;
    const nowForBg = now;
    const isFirstContactForBg = isFirstContact;
    const greetingAlreadySentForBg = greetingAlreadySent;
    const detectedThisMsgForBg = detectedThisMsg;
    const convContextForBg = convContext;
    runInBackground((async () => {
      const send = await sendWhatsAppText(phoneForBg, replyForBg);
      if (!send.ok) {
        console.error("[bg-send-failed]", JSON.stringify({ phone: phoneForBg, conversationId: conversationIdForBg, error: send.error, status: send.status }));
      }
      if (conversationIdForBg) {
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationIdForBg,
          message_id: send.messageId ?? `agent-${nowForBg.getTime()}`,
          direction: "outbound",
          message_type: "text",
          content: replyForBg,
          status: send.ok ? "sent" : "failed",
        });
        // Durably mark that the welcome has fired so it never repeats on later turns,
        // independent of message-history loading. Also persist the detected language so a
        // later short message inherits the thread's language. Merge into context (don't clobber).
        const ctxUpdate: Record<string, unknown> = {};
        if (isFirstContactForBg && !greetingAlreadySentForBg) ctxUpdate.greeting_sent = true;
        if (detectedThisMsgForBg && detectedThisMsgForBg !== convContextForBg.detected_language) {
          ctxUpdate.detected_language = detectedThisMsgForBg;
        }
        if (Object.keys(ctxUpdate).length > 0) {
          // CRITICAL: merge onto a FRESH read, not the turn-START convContext. The tools wrote
          // to context DURING this turn (pending_booking / pending_cancel / booking_name); using
          // the stale snapshot here clobbered those, e.g. a first-contact booking preview's
          // pending_booking was wiped by this greeting_sent write, so the next "ja" re-previewed
          // instead of committing. Re-read so this only ADDS greeting_sent/detected_language.
          const { data: freshConv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", conversationIdForBg).maybeSingle();
          const latestCtx = ((freshConv as { context?: Record<string, unknown> } | null)?.context) ?? convContextForBg;
          await supabase
            .from("whatsapp_conversations")
            .update({ context: { ...latestCtx, ...ctxUpdate } })
            .eq("id", conversationIdForBg);
        }
      }
    })());

    return new Response(
      JSON.stringify({
        ok: true,
        reply,
        sent: null,
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
    // IUX R61: best-effort release of any confirm-burst claim held at throw-time. The turn threw
    // before reaching the normal post-hoc release site, so without this the claim would otherwise
    // sit until the 20s TTL self-heals purely because of an error, not because holding it longer
    // was ever intentional. Release-by-id is a harmless no-op if the row is already gone (e.g. the
    // throw happened AFTER the normal release already ran); never throws itself, never blocks the
    // fallback reply below.
    if (bookClaimIdForFallback) {
      try {
        await supabase.rpc("release_whatsapp_confirm_claim", { p_claim_id: bookClaimIdForFallback });
      } catch (_) { /* best-effort only, TTL self-heals regardless */ }
    }
    if (cancelClaimIdForFallback) {
      try {
        await supabase.rpc("release_whatsapp_confirm_claim", { p_claim_id: cancelClaimIdForFallback });
      } catch (_) { /* best-effort only, TTL self-heals regardless */ }
    }
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
    // R22 (full-journey sim loop): persist the fallback so it is visible to any DB-based
    // verification/audit, same as every normal outbound reply. Best-effort only, never throws,
    // never blocks the leak-free response below.
    if (fallbackSent && conversationIdForFallback) {
      try {
        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationIdForFallback,
          message_id: `agent-fallback-${Date.now()}`,
          direction: "outbound",
          message_type: "text",
          content: fallbackReply,
          status: "sent",
        });
      } catch (_) { /* best-effort only */ }
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
