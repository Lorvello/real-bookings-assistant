// ---------------------------------------------------------------------------
// P0-1 SLOT-OFFER GUARD (the "no fabricated time" guarantee, in CODE not prompt).
//
// The two-phase preview/commit is already server-guarded (a fabricated time can never be
// BOOKED), but the PROACTIVE slot offer ("schikt 09:00 of 10:30?") was pure model prose with
// no server validation: sanitizeReply strips directives, never times. Per the BA core lesson,
// "never offer a time that isn't real" is a GUARANTEE, so it belongs in code, not trusted to a
// temp-0.2 20B model. These helpers validate every clock time the agent OFFERS against the REAL
// get_available_slots result of THIS turn (the same RPC the commit path uses), and rebuild the
// offer deterministically from the real free slots on any mismatch.
//
// Extracted from index.ts into its own module so the pure guard logic is unit-testable without
// importing index.ts (whose top-level Deno.serve would start a server). index.ts imports the
// public surface (OFFER_CONTEXT_RE, extractOfferedClockTimes, enforceSlotOffer); the test imports
// the internals too (stripHourRanges, collectTurnSlots, buildDeterministicOffer, noFreeSlotsReply)
// to prove each path deterministically. The temp-0.2 model won't reliably hallucinate on demand,
// so the rebuild path can only be proven by testing the logic directly.

import { extractClockTimes } from "./tools.ts";

export type ToolCall = { name: string; result: unknown };

// Offer-context words: used ONLY to gate the no-query nudge (force a re-query), never to mangle
// an info/recall reply. The deterministic rebuild below engages only when a slots query actually
// ran this turn, so info turns (opening hours, "your last appointment was 14:00") are never touched.
export const OFFER_CONTEXT_RE =
  /\b(vrij|beschikbaar|schikt|past het|kan (?:je|u|ik)|of\s+\d{1,2}[:.]\d{2}|available|free slot|suits?|works for you|disponible|libre|frei|verfügbar|disponibile)\b/i;

// Strip opening-hours RANGES ("09:00-17:00", "van 09:00 tot 17:00", "tussen 9:00 en 12:00") so a
// legitimate hours statement is never mistaken for a discrete slot OFFER. A list ("09:00 of 10:30
// of 14:00") uses "of"/"," and is deliberately NOT stripped: those are the offers we validate.
// dash = a hyphen or any unicode dash (en/em), matched via a char class built from escapes so the
// source carries no literal em dash (Mathieu's no-em-dash rule).
const DASH = "[-\\u2010-\\u2015]";
export function stripHourRanges(s: string): string {
  let out = ` ${s} `;
  out = out.replace(new RegExp(`\\b\\d{1,2}[:.]\\d{2}\\s*(?:${DASH}|t\\/m|tot|bis|to|until)\\s*\\d{1,2}[:.]\\d{2}\\b`, "gi"), " ");
  out = out.replace(/\btussen\s+\d{1,2}[:.]\d{2}\s+(?:en|and|et|und|y|e)\s+\d{1,2}[:.]\d{2}\b/gi, " ");
  out = out.replace(/\bvan\s+\d{1,2}\s+(?:tot|to|bis)\s+\d{1,2}\s*uur?\b/gi, " ");
  return out;
}

// Discrete clock times the reply OFFERS, normalised to HH:MM. Excludes (a) opening-hours ranges
// and (b) the clock time(s) the CUSTOMER named in this same message (the agent echoing the
// customer's requested time is not an offer, e.g. "08:00 is helaas niet vrij, wel 09:00").
export function extractOfferedClockTimes(reply: string, customerMsg: string): string[] {
  const cleaned = stripHourRanges(reply);
  const out = new Set<string>();
  const re = /\b(\d{1,2})[:.](\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const h = Number(m[1]);
    const mm = m[2];
    if (h >= 0 && h <= 23 && Number(mm) <= 59) out.add(`${String(h).padStart(2, "0")}:${mm}`);
  }
  const echoed = new Set(extractClockTimes(customerMsg));
  return [...out].filter((t) => !echoed.has(t));
}

// Collect the REAL free times surfaced by THIS turn's tool calls. Two shapes carry them:
//   get_available_slots -> { date, available_slots: [{ tijd: "HH:MM", start: ISO }] }
//   book/reschedule (niet_beschikbaar / te_vroeg) -> { available_slots: ["HH:MM", ...] }
// hadQuery = a slots query (or a slot-resolving book/reschedule) actually ran, so we have ground
// truth to validate against. byDate maps an ISO date -> its real free times (for a labelled rebuild).
export function collectTurnSlots(
  toolCalls: ToolCall[],
): { times: Set<string>; ordered: string[]; byDate: Map<string, string[]>; hadQuery: boolean } {
  const times = new Set<string>();
  const ordered: string[] = [];
  const byDate = new Map<string, string[]>();
  let hadQuery = false;
  const add = (t: string): string | null => {
    const hhmm = t.slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
    if (!times.has(hhmm)) { times.add(hhmm); ordered.push(hhmm); }
    return hhmm;
  };
  for (const tc of toolCalls) {
    if (tc.name === "get_available_slots") hadQuery = true;
    const r = tc.result as Record<string, unknown> | null;
    if (!r || typeof r !== "object") continue;
    const arr = r.available_slots;
    if (Array.isArray(arr)) {
      hadQuery = true;
      const dateLabel = typeof r.date === "string" ? r.date : null;
      const collected: string[] = [];
      for (const el of arr) {
        const raw = typeof el === "string"
          ? el
          : (el && typeof el === "object" && typeof (el as { tijd?: unknown }).tijd === "string"
            ? (el as { tijd: string }).tijd
            : null);
        if (!raw) continue;
        const hhmm = add(raw);
        if (hhmm) collected.push(hhmm);
      }
      // R22 (task_745b7fa0): get_available_slots also carries `laatste_slot`, the genuine LAST
      // free slot of the day, which the head-truncated (12-cap) available_slots list omits on a
      // full day. It comes from the SAME RPC result, so it is real ground truth: without this,
      // the guard rewrote a truthful "latest slot is 16:30" answer into an early-slots offer
      // (measured live). Dedup via add(); appended last = chronologically correct position.
      const lastSlot = (r as { laatste_slot?: unknown }).laatste_slot;
      const lastTijd = lastSlot && typeof lastSlot === "object" &&
          typeof (lastSlot as { tijd?: unknown }).tijd === "string"
        ? (lastSlot as { tijd: string }).tijd
        : null;
      if (lastTijd) {
        const hhmm = add(lastTijd);
        if (hhmm && !collected.includes(hhmm)) collected.push(hhmm);
      }
      if (dateLabel && collected.length) byDate.set(dateLabel, collected);
    }
  }
  return { times, ordered, byDate, hadQuery };
}

// NL/EN date label from an ISO date ("2026-06-29" -> "maandag 29 juni" / "Monday 29 June").
// Noon UTC keeps the date stable across the Amsterdam DST offset.
function dateLabelFromISO(iso: string, en: boolean): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return en
    ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" })
    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
}

// Deterministic, truthful slot offer built ONLY from the real free times of this turn. NL default,
// English floor for any non-Dutch customer (the same convention as deterministicPreview/Confirmation).
export function buildDeterministicOffer(byDate: Map<string, string[]>, ordered: string[], en: boolean): string {
  const dated = [...byDate.entries()].filter(([, arr]) => arr.length).slice(0, 2);
  if (dated.length > 0) {
    const body = dated
      .map(([iso, arr]) => `${en ? "on" : "op"} ${dateLabelFromISO(iso, en)}: ${arr.slice(0, 6).join(", ")}`)
      .join("; ");
    return en
      ? `These times are still free ${body}. Which one suits you?`
      : `Deze tijden zijn nog vrij ${body}. Welke schikt je?`;
  }
  const list = ordered.slice(0, 6).join(", ");
  return en
    ? `These times are still free: ${list}. Which one suits you?`
    : `Deze tijden zijn nog vrij: ${list}. Welke schikt je?`;
}

// "Queried that day, found zero free slots, yet the model offered a time" -> honest no-slots reply.
export function noFreeSlotsReply(en: boolean): string {
  return en
    ? `I don't have any free times left on that day. Would you like to try another day?`
    : `Op die dag heb ik geen vrije tijden meer. Wil je een andere dag proberen?`;
}

// R37 (bug R36a, MILAN-SLOT-FABRICATION fix, final safety net): index.ts's own P0-1 upstream
// re-query nudge (slotOfferUnbacked, "you offered a time without calling get_available_slots,
// call it now") already exists to force a grounding query before a time offer ships. But its
// accept-gate (index.ts, the retry block) only requires the retry to have SOME non-announce text,
// not an actual tool call, so a compound ask the model cannot even resolve to a real
// service_type_id/calendar_id (R36: "Manicure bij Milan", Manicure is a Bo-only service) can have
// its retry ALSO skip every tool call and simply repeat the same fabricated offer, which then gets
// silently adopted. Because no query ever ran, enforceSlotOffer's own !hadQuery early-return lets
// that fabricated offer pass straight through untouched (by design, to avoid mangling genuine
// info/recall replies that never queried in the first place). This is the final backstop: index.ts
// calls this ONLY when the upstream slotOfferUnbacked condition is STILL true against the FINAL
// result (original or retry) after the nudge/retry cycle has already had its one chance to supply
// real ground truth, so a genuine info/recall reply (which never set slotOfferUnbacked in the
// first place) is never touched.
export function noQueryGroundedReply(en: boolean): string {
  return en
    ? `I can't confirm a time for that without checking first. Which service and day would you like?`
    : `Ik kan die tijd niet bevestigen zonder dat eerst na te kijken. Welke dienst en dag bedoel je precies?`;
}

// THE guarantee: on a model-prose reply, every offered clock time must come from THIS turn's real
// get_available_slots result. Engages ONLY when a slots query ran this turn (so info/recall/opening-
// hours turns, which never query, are untouched: zero false positives). On a mismatch the offer is
// rebuilt from the real free slots; if the queried day has no free slots at all, an honest no-slots
// reply replaces the (necessarily fabricated) offer. The no-query case is handled upstream by a
// re-query nudge, never by mangling a reply that has no ground truth to check against.
export function enforceSlotOffer(
  replyText: string,
  toolCalls: ToolCall[],
  customerMsg: string,
  customerLanguage: string | null,
): string {
  const { times, ordered, byDate, hadQuery } = collectTurnSlots(toolCalls);
  if (!hadQuery) return replyText;
  const offered = extractOfferedClockTimes(replyText, customerMsg);
  if (offered.length === 0) return replyText;
  const bad = offered.filter((t) => !times.has(t));
  if (bad.length === 0) return replyText;
  const en = customerLanguage != null;
  if (times.size > 0) {
    console.warn(
      `slot-offer-guard: rebuilt offer, phantom times ${JSON.stringify(bad)} not in real slots ${JSON.stringify([...times])}`,
    );
    return buildDeterministicOffer(byDate, ordered, en);
  }
  console.warn(`slot-offer-guard: queried day has no free slots but reply offered ${JSON.stringify(offered)}`);
  return noFreeSlotsReply(en);
}
