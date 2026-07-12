// R29 RELATIVE-DATE HINT (deterministic pre-parse of the customer's OWN raw message, run BEFORE
// the model ever sees it, to close a real production bug: a bare relative weekday reference
// ("vrijdag", "vrijdag diezelfde week") inside a long/multi-topic message can get resolved by the
// model against a STALE date already sitting in earlier conversation history (an anchoring/
// recency bug), instead of freshly computed from the real server "today" via the <kalender>
// table. R28 (full-journey agent simulation) first found this live: a 200+ word rambling message
// asking to move a booking to "vrijdag diezelfde week" got a false "day fully closed" reply for a
// Friday that genuinely had open slots. R29 reproduced it live and found the true trigger is NOT
// message length per se: even a SHORT, clean, single-sentence "vrijdag deze week" ask on the same
// thread reproduced the identical wrong date (the model echoed a date from several turns earlier
// in conversation history rather than computing fresh). The common factor in every failure is a
// BARE weekday reference with no explicit day-number, which is genuinely ambiguous for the model
// to resolve purely from prose, especially with other concrete dates already in the conversation
// to anchor on.
//
// MECHANISM: extractRelativeDayHint scans the CURRENT customer message only (never history) for
// an explicit relative-weekday phrase ("vandaag", "morgen", "overmorgen", or a bare/qualified
// weekday name, optionally with "aanstaande/komende/deze/volgende/diezelfde/dezelfde week/dag").
// If found, it independently computes the real ISO date from the real server "now" (Amsterdam),
// using the exact same "nearest upcoming occurrence, 'volgende' skips to next week" rule the
// prompt already documents for the <kalender> table (prompt.ts, "Zet ELKE relatieve datum om via
// deze lijst"). index.ts injects the result as an explicit, prominent hint in the system prompt
// FOR THIS TURN ONLY, telling the model this is the one true resolution, overriding any date
// mentioned earlier in conversation history. This is a hint/backstop, not a tool-argument
// override: the model still calls the tools itself (unchanged control flow), but it no longer has
// to freely compute (and potentially mis-anchor) the date on its own.
//
// Only fires on an EXPLICIT day-name match (no guessing on vague "binnenkort"/"snel" style
// phrasing); when nothing explicit is found, returns null and prompt.ts renders nothing extra
// (byte-identical to before this fix).
//
// R54 EXTENSION: an explicit day+month reference ("6 augustus", "6 aug", optionally +year) is
// ALSO now resolved right here, deterministically, using the real server "now" as ground truth,
// instead of being deferred entirely to the model's own arithmetic (the original R29 design).
// index.ts's <kalender> table only renders a 14-day lookahead, so any explicit date beyond that
// window had nothing for the model to read off, and it reproducibly miscomputed the ISO date
// (see FINDINGS LEDGER R53 row for the live repro: a false "already passed" claim for a real,
// bookable, 28-days-out date). This now covers explicit dates near OR far, with no dependence on
// the 14-day window, and wins priority over vandaag/morgen/weekday phrasing (the most specific
// thing the customer could have said). tools.ts already wires the resolved ISO to override
// args.date whenever it disagrees, unchanged from R29's own mechanism.
//
// dash-free of em dashes per house rule.

const NL_WEEKDAYS: Record<string, number> = {
  // JS Date.getDay(): 0=zondag .. 6=zaterdag
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
};

export interface RelativeDateHint {
  iso: string; // YYYY-MM-DD, Amsterdam-local
  label: string; // "vrijdag 10 juli" (Dutch, matches the <kalender> table's own label style)
  matchedPhrase: string; // the raw phrase that triggered this, for logging/tests
}

// Amsterdam-local YYYY-MM-DD for a given instant (mirrors buildCalendarHint's own tz handling).
function amsterdamISO(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

function amsterdamWeekday(d: Date): number {
  const label = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Europe/Amsterdam" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? d.getDay();
}

function dutchLabel(d: Date): string {
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
}

// Nearest occurrence of targetDow on/after `now` (today counts), or, when `skipWeek` is true
// ("volgende [weekday]"), the occurrence in the NEXT full week (matches prompt.ts's own rule:
// "volgende week [weekdag]" = die weekdag in de eerstvolgende hele week).
function resolveWeekday(now: Date, targetDow: number, skipWeek: boolean): Date {
  const todayIso = amsterdamISO(now);
  const [y, m, d] = todayIso.split("-").map(Number);
  const todayDow = amsterdamWeekday(now);
  let offset = (targetDow - todayDow + 7) % 7;
  if (skipWeek) offset += 7;
  return new Date(Date.UTC(y, m - 1, d + offset, 11, 0, 0)); // noon UTC, DST-safe like buildCalendarHint
}

// Scans ONLY the given text (the current customer message) for the first explicit relative-date
// phrase. First mention wins (mirrors dateOfferGuard.ts's own "first date named is the one being
// offered" convention).
const NL_MONTH_NAMES =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|" +
  "jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec";

// R54 (real bug: R53 full-journey agent simulation): an explicit "6 augustus" style day+month
// reference used to defer ENTIRELY to the model's own date arithmetic (this module only covered
// bare weekday references, R29). index.ts's <kalender> table only renders a 14-day lookahead, so
// any explicit date beyond that window had nothing for the model to read off, and Groq
// gpt-oss-20b reproducibly (3/3 live) miscomputed the ISO date backward, producing a false
// "already passed" claim for a real, bookable, future date, see FINDINGS LEDGER R53 row for the
// full live repro. Fix: resolve an explicit day+month (optionally +year) reference to a real ISO
// date deterministically, right here, using the real server "now" as ground truth, for EVERY
// explicit date (near or far), not only ones beyond the 14-day table. This removes model
// arithmetic from date resolution entirely, the same "deterministic ground truth over free model
// computation" discipline the bare-weekday hint (R29) already applies, and tools.ts already wires
// ctx.relativeDateHintISO to override args.date whenever it disagrees, so no other call site
// needs to change.
const NL_MONTHS: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maart: 3, mrt: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  augustus: 8, aug: 8,
  september: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

// Captures an explicit day+month reference in either NL word order ("6 augustus" or
// "augustus 6"), plus an optional explicit 4-digit year stated right after it ("6 augustus 2026").
const EXPLICIT_DATE_CAPTURE_RE = new RegExp(
  `\\b(?:(\\d{1,2})\\s+(${NL_MONTH_NAMES})|(${NL_MONTH_NAMES})\\s+(\\d{1,2}))\\b(?:\\s+(\\d{4}))?`,
  "i",
);

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Resolves an explicit day+month (optionally +year) reference to a real ISO date. When no year
// is stated: nearest occurrence on/after today (today itself counts), rolling into next year if
// the day+month has already passed this year, mirroring resolveWeekday's own "nearest upcoming"
// convention below. When an explicit year IS stated, it is honored literally, the customer's own
// explicit year always wins, this function never overrules it (even into the past: a real past-
// year claim should still surface as a genuine, honest "already passed" reply downstream, that is
// correct behavior, not this bug's class).
function resolveExplicitDayMonth(
  now: Date,
  day: number,
  month: number,
  explicitYear: number | null,
): { iso: string; label: string } | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const todayIso = amsterdamISO(now);
  const todayY = Number(todayIso.split("-")[0]);
  let year = explicitYear ?? todayY;
  let iso = `${year}-${pad2(month)}-${pad2(day)}`;
  if (explicitYear === null && iso < todayIso) {
    year += 1;
    iso = `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return { iso, label: dutchLabel(d) };
}

export function extractRelativeDayHint(text: string, now: Date): RelativeDateHint | null {
  const s = (text || "").toLowerCase();

  // Explicit day+month wins over everything else (vandaag/morgen/weekday phrasing): it is the
  // most specific, unambiguous thing the customer could have said, and now that it resolves to a
  // real ISO date itself (R54), there is no reason to defer to the model for it at all, near or
  // far. A defensive fallback (match found but resolution somehow fails, should not happen in
  // practice) falls through to the rest of this function rather than throwing.
  const explicitMatch = EXPLICIT_DATE_CAPTURE_RE.exec(s);
  if (explicitMatch) {
    const day = Number(explicitMatch[1] ?? explicitMatch[4]);
    const monthName = explicitMatch[2] ?? explicitMatch[3];
    const month = NL_MONTHS[monthName];
    const explicitYear = explicitMatch[5] ? Number(explicitMatch[5]) : null;
    const resolved = month ? resolveExplicitDayMonth(now, day, month, explicitYear) : null;
    if (resolved) {
      return { iso: resolved.iso, label: resolved.label, matchedPhrase: explicitMatch[0].trim() };
    }
  }

  const todayIso = amsterdamISO(now);
  if (/\bvandaag\b/.test(s)) {
    const d = new Date(`${todayIso}T12:00:00Z`);
    return { iso: todayIso, label: dutchLabel(d), matchedPhrase: "vandaag" };
  }
  if (/\bovermorgen\b/.test(s)) {
    const d = new Date(now.getTime() + 2 * 86_400_000);
    const iso = amsterdamISO(d);
    return { iso, label: dutchLabel(new Date(`${iso}T12:00:00Z`)), matchedPhrase: "overmorgen" };
  }
  if (/\bmorgen\b/.test(s)) {
    const d = new Date(now.getTime() + 1 * 86_400_000);
    const iso = amsterdamISO(d);
    return { iso, label: dutchLabel(new Date(`${iso}T12:00:00Z`)), matchedPhrase: "morgen" };
  }

  // Bare or qualified weekday name, optionally preceded by a qualifier word and optionally
  // followed by "(diezelfde/dezelfde/die) week" or "deze week". "volgende [weekday]" or
  // "[weekday] volgende week" skip to the following full week; every other qualifier (or none)
  // means the nearest upcoming occurrence, matching prompt.ts's documented rule exactly.
  const dayNames = Object.keys(NL_WEEKDAYS).join("|");
  // R82: a weekday name fused directly onto a daypart word ("dinsdagavond", "vrijdagmiddag",
  // "maandagochtend", zero space, one token) used to fall straight through this whole function
  // (the old regex required a word boundary immediately after the weekday name, so "dinsdagavond"
  // never matched dinsdag at all, only a SPACED "dinsdag avond" ever did). With no hint produced,
  // index.ts injected nothing and the model had to resolve the day entirely on its own, which is
  // the confirmed live root cause of the FINDINGS LEDGER R80 mislabel: "Code: f744eddc Hoi, ik wil
  // graag een afspraak maken bij Iris, dinsdagavond." got a reply claiming "Tuesday evening" while
  // actually offering Sunday's real slot times, DB-verified via get_available_slots_range. This is
  // a DIFFERENT failure than the R76/R77/R79 "no day named at all" shape (there is genuinely
  // nothing to hint there): here the customer DID name an explicit day, just in a fused compound
  // form this module's regex did not recognize, so the fix is a pure regex extension, not a new
  // mechanism. The optional non-capturing daypart suffix below lets the weekday match with OR
  // without a following daypart word, fused or spaced; the captured weekday group (group 3) is
  // unaffected, so date resolution (resolveWeekday) needs no changes.
  const DAYPART_SUFFIX_RE = "ochtend|voormiddag|namiddag|middag|avond|nacht";
  const re = new RegExp(
    `\\b(volgende\\s+week\\s+)?(aanstaande|komende|deze|volgende|diezelfde|dezelfde)?\\s*(${dayNames})(?:${DAYPART_SUFFIX_RE})?\\b(\\s+(diezelfde|dezelfde|die|deze)\\s+week)?(\\s+volgende\\s+week)?`,
    "i",
  );
  const m = re.exec(s);
  if (!m) return null;
  const dow = NL_WEEKDAYS[m[3]];
  if (dow === undefined) return null;
  const skipWeek = !!(m[1] || m[6] || (m[2] && m[2] === "volgende"));
  const d = resolveWeekday(now, dow, skipWeek);
  const iso = amsterdamISO(d);
  return { iso, label: dutchLabel(d), matchedPhrase: m[0].trim() };
}

// Renders the prompt-injected hint block, or "" when there is nothing to say (byte-identical
// prompt when no explicit relative-date phrase was found this turn).
export function formatRelativeDateHint(hint: RelativeDateHint | null): string {
  if (!hint) return "";
  return `\nLET OP (datumherkenning voor DIT bericht): de klant noemt hierin "${hint.matchedPhrase}". Onze eigen berekening, uitsluitend gebaseerd op de ECHTE datum van vandaag (dus NIET op een datum die eerder in dit gesprek al genoemd is), wijst naar ${hint.label} [${hint.iso}]. Gebruik voor DEZE verwijzing ALTIJD deze datum, ook als jij of de klant eerder in dit gesprek een andere datum noemde bij een vergelijkbare verwijzing: die eerdere datum was voor een ANDER moment in het gesprek en is nu niet meer relevant. Twijfel je toch, vertrouw dan deze berekening boven je eigen inschatting of boven de gespreksgeschiedenis.`;
}

// R127 (SILENT-DAY-DRIFT fix, live-reproduced R126, DB-proven: "Ik wil graag Knippen Dames boeken
// bij Sanne, woensdag om 10:00" got the normal slot offer "Schikt 10:00 of 10:30?" for the real,
// correct Wednesday; the customer's NEXT message, "Wat kost dat trouwens, en doe dan maar 10:00"
// (a mixed price-question + bare time-only confirmation, NO day repeated), got back "Ik zet
// Knippen Dames op zaterdag 18 juli 10:00 ..." -- the day silently changed from Wednesday to a
// wholly different Saturday, with zero disclosure, and the price question was also silently
// dropped). A bare time-only confirmation turn ("10:00 graag", or the R126 mixed shape) has
// nothing for extractRelativeDayHint to anchor on THIS message, so the day actually used for
// book_appointment's/get_available_slots'/reschedule_appointment's `date` argument was left
// ENTIRELY to the model's own free-form reading of the full conversation history. With several
// different dates already sitting in that history (the R126 thread had an earlier abandoned
// "donderdag 16 juli" request and a "vrijdag 14:00" combo request further back), the model can
// mis-anchor onto a stale, unrelated day -- the exact "recency/anchoring bug" class R29 already
// named and fixed for BARE WEEKDAY phrasing typed directly in the current message; this closes
// the sibling gap where the CURRENT message names no day reference at all, only a bare time.
//
// Live isolation this round (R127) found the plain single-intent shape ("Doe maar 10:00", no
// price question mixed in) does NOT reliably reproduce the drift -- the 20B model resolves the
// carried-forward day correctly from short, focused history most of the time. This is consistent
// with the R29/R54 lesson repeated throughout this file: a prompt-only nudge (or the model's own
// unaided attention) is not a GUARANTEE, only a probabilistic aid, and "the day a customer already
// established never silently changes" is exactly the class of guarantee that belongs in
// deterministic code, not in hoping the model's free-form history read holds up under load (a
// mixed-intent turn, a longer thread, or any other attention pressure).
//
// Mechanism: when the current message contains a bare clock-time reference (a time-only
// confirmation shape, e.g. "10:00" or "doe dan maar 10:00") and itself names no day
// (extractRelativeDayHint(currentText) is null, so there is nothing to override that decision),
// scan prior INBOUND messages (already topic-scoped by the caller, oldest-first, the same
// dayScanWindowTexts index.ts already builds for hasDayMentionAnywhere/rescheduleFlowActiveWithNoDay)
// from the END (most recent first) for the LAST message that named an explicit day, and carry
// that single, most-recent, deterministically-resolved day forward as this turn's hint. index.ts
// wires this into the SAME ctx.relativeDateHintISO channel extractRelativeDayHint already uses,
// so tools.ts's existing R29 enforcement (execute(), "the hint wins whenever the model's own date
// differs") applies unchanged and unconditionally overrides any date the model independently
// picked for THIS turn's date-bearing tool call -- the model no longer has to get this right on
// its own at all.
//
// Returns null (byte-identical prompt/no override) when: the current message already names its
// own day (extractRelativeDayHint wins, unchanged, this function is never consulted for that
// case); the current message has no bare clock time either (an ordinary non-confirmation turn has
// no established "the day just offered" to carry, and forcibly injecting one could WRONGLY
// override a legitimate fresh, dayless question); or no prior message in the scanned window names
// a day at all (nothing to carry forward).
const BARE_CLOCK_TIME_RE = /\b\d{1,2}[:.]\d{2}\b/;

export function extractCarriedForwardDayHint(
  currentText: string,
  priorInboundTextsOldestFirst: string[],
  now: Date,
): RelativeDateHint | null {
  if (extractRelativeDayHint(currentText, now) !== null) return null;
  if (!BARE_CLOCK_TIME_RE.test(currentText || "")) return null;
  for (let i = priorInboundTextsOldestFirst.length - 1; i >= 0; i--) {
    const hint = extractRelativeDayHint(priorInboundTextsOldestFirst[i], now);
    if (hint) return hint;
  }
  return null;
}

// Prompt-injected wording for the carried-forward case, deliberately distinct from
// formatRelativeDateHint above: that one describes a phrase the customer JUST typed ("de klant
// noemt hierin ..."), which would be FALSE here (the customer named no day this turn at all). This
// instead states plainly that no day was named this turn and names the real, most-recently-
// established day the confirmation carries forward, with the same "trust this over your own
// reading of history" closing line.
export function formatCarriedForwardDayHint(hint: RelativeDateHint | null): string {
  if (!hint) return "";
  return `\nLET OP (dag-doorloop voor DIT bericht): de klant noemt in dit bericht ZELF geen dag, alleen een tijd. Uit het gesprek blijkt de laatst vastgestelde dag "${hint.matchedPhrase}" te zijn, wat overeenkomt met ${hint.label} [${hint.iso}]. Gebruik voor DEZE bevestiging ALTIJD deze dag, nooit een andere dag die verder terug in het gesprek genoemd werd. Twijfel je toch, vertrouw dan deze berekening boven je eigen inschatting of boven de gespreksgeschiedenis.`;
}

// R93 (SILENT-TODAY-DEFAULT fix, confirmed live bug filed R92): a customer who names NO day at
// all, anywhere ("Ik wil graag een afspraak bij Milan boeken, wanneer heb je tijd?"), used to get
// slot times offered as if "today" had been silently agreed, with the assumption disclosed only
// if the customer happened to ask "welke dag is dat dan?" afterwards. This is a different failure
// shape than R80/R82 (an explicit day the regex failed to recognize): here there is genuinely
// NOTHING to hint, so extractRelativeDayHint correctly returns null, and the existing prompt-only
// "never invent vandaag/morgen" instruction (see prompt.ts, the "ONTBREEKT DE DAG" rule) proved,
// live, not reliably followed by the 20B model on this phrasing (no explicit day/time ask at all,
// just an open "wanneer heb je tijd?"). Mirrors the SAME deterministic, code-level discipline this
// module already uses for date RESOLUTION: instead of trusting the model to remember a prose rule,
// tools.ts's get_available_slots/book_appointment guards (ctx.blockForNoDayNamed) now REFUSE to
// run at all when this returns true, forcing an explicit day question, the same "refuse to guess"
// pattern serviceDisambiguationGuard.ts already established for missing-service/branch ambiguity.
//
// hasDayMentionAnywhere scans the CURRENT message plus every prior INBOUND message already loaded
// into this turn's conversation history (never outbound/agent text, which could itself contain a
// stray day word) for an explicit day reference, using the exact same extractRelativeDayHint this
// module already uses for resolution. `now` is the real server "now": for historical messages we
// only care whether a day phrase is PRESENT (a boolean), never its resolved ISO value, so reusing
// the current turn's `now` for older messages is safe and keeps this a single source of truth.
export function hasDayMentionAnywhere(
  currentText: string,
  priorInboundTexts: string[],
  now: Date,
): boolean {
  if (extractRelativeDayHint(currentText, now) !== null) return true;
  return priorInboundTexts.some((t) => extractRelativeDayHint(t, now) !== null);
}

// Refusal message forcing an explicit day question instead of a silent "today" assumption. NL
// default; index.ts/tools.ts already translate other refusal messages via the model's own
// customer-language handling for the surrounding reply, same convention as KIES_DIENST_MESSAGE.
export const VRAAG_DAG_MESSAGE =
  "De klant heeft in dit hele gesprek nog GEEN dag genoemd (geen weekdag, geen 'vandaag'/'morgen', geen datum). Neem NOOIT zelf een dag aan (ook niet 'vandaag'): vraag eerst kort en concreet op welke dag de klant de afspraak wil, bijvoorbeeld \"Op welke dag zou je de afspraak willen?\", en roep dan pas opnieuw aan zodra de klant een dag heeft genoemd.";

// R95 (RESCHEDULE-NO-DAY-STONEWALL fix): same discipline as VRAAG_DAG_MESSAGE above, worded for
// reschedule_appointment specifically (the klant already HAS a booking, so the question is which
// NEW day, never a first-time "which day do you want the appointment" phrasing that would confuse
// the existing-booking context).
export const VRAAG_DAG_RESCHEDULE_MESSAGE =
  "De klant wil verzetten maar heeft nog GEEN nieuwe dag genoemd (geen weekdag, geen 'vandaag'/'morgen', geen datum), alleen eventueel een tijdstip. Verzet NIETS en neem NOOIT zelf een dag aan: vraag eerst kort en concreet naar welke dag de klant de afspraak wil verzetten, bijvoorbeeld \"Naar welke dag wil je de afspraak verzetten?\", en roep reschedule_appointment dan pas opnieuw aan zodra de klant een dag heeft genoemd.";

// R95 (RESCHEDULE-NO-DAY-STONEWALL fix, live-reproduced R94): tools.ts's own reschedDayEstablished
// guard (see that file's reschedule_appointment case) only fires once the model actually INVOKES
// reschedule_appointment. Live-reproduced this round: the model routinely never calls ANY tool at
// all for a bare "kan ik mijn afspraak verzetten naar een ander tijdstip?" (no day named) turn,
// instead composing a prose reply that reads the request as a pure status lookup and echoes the
// EXACT get_my_appointments-shaped template ("Er staat een afspraak: <service> op <when> (op naam
// <name>)."), the identical failure shape serviceDisambiguationGuard.ts's own
// looksLikeAppointmentStatusReadout already names and guards against for the RETURNING-SERVICE
// case. This is the SAME deterministic "backstop AFTER the reply is drafted, independent of which
// tool (if any) was called this turn" pattern, applied to the reschedule-no-day case.
//
// rescheduleFlowActiveWithNoDay: true only when (a) a reschedule flow is genuinely in progress
// this turn (the CURRENT message names an explicit reschedule verb, OR a recent prior INBOUND
// message did, scoping "recent" to since the last such verb rather than the whole conversation,
// exactly like the reasoning in hasDayMentionAnywhere's own header for why reschedule needs a
// NARROWER window than book_appointment's whole-history scan: the ORIGINAL booking request almost
// always already named a day, which would otherwise make this permanently false-negative), AND
// (b) no day has been named anywhere in that same narrow window (current message + every inbound
// message from the most recent reschedule-verb turn onward).
export function rescheduleFlowActiveWithNoDay(
  currentText: string,
  priorInboundTextsOldestFirst: string[],
  now: Date,
  rescheduleVerbRe: RegExp,
): boolean {
  let sinceIndex = -1;
  for (let i = priorInboundTextsOldestFirst.length - 1; i >= 0; i--) {
    if (rescheduleVerbRe.test(priorInboundTextsOldestFirst[i])) {
      sinceIndex = i;
      break;
    }
  }
  const currentHasIntent = rescheduleVerbRe.test(currentText);
  if (sinceIndex === -1 && !currentHasIntent) return false;
  const windowTexts = sinceIndex === -1 ? [] : priorInboundTextsOldestFirst.slice(sinceIndex);
  return !hasDayMentionAnywhere(currentText, windowTexts, now);
}

// Customer-facing question this backstop rewrites the drafted reply to, when triggered. Kept
// separate from VRAAG_DAG_RESCHEDULE_MESSAGE (that one is a tool-result `message` field mixing an
// internal instruction with the question; this is the bare customer-facing sentence, same
// convention as BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE / enforceVerificationGateDisclosure's
// own customer_reply field).
export const VRAAG_DAG_RESCHEDULE_CUSTOMER_MESSAGE = "Naar welke dag wil je de afspraak verzetten?";

// Error codes a SIBLING gate on reschedule_appointment/get_available_slots can legitimately
// return this same turn, each with its own correct customer-facing question that must win over
// this backstop (identity/ambiguity/service/calendar concerns are real and take priority over the
// day question; asking "which day" on top of one of these would just be a second, confusing
// question). Deliberately does NOT include "vraag_dag" (this fix's own tools.ts guard): this fix's
// OWN live verify round found the model does NOT reliably relay that gate's `message` field into
// an actual day-question either (live-reproduced: reschedule_appointment returned vraag_dag, yet
// the model still composed the exact "Er staat een afspraak: ..." stonewall), the identical
// "prompt/tool-message-only steering does not reliably hold at this model's scale" lesson this
// whole codebase has already learned repeatedly (R102, R112, enforceReturningServiceDisclosure).
// Treating vraag_dag as "already handled" and skipping the rewrite would silently let that exact
// failure back through; this backstop must fire on EVERY vraag_dag hit too, not just tool-call-less
// turns, so it always forces the identical, correct customer-facing question regardless of whether
// the model followed the tool's own internal instruction.
const RESCHEDULE_SIBLING_GATE_ERRORS = new Set([
  "naam_verificatie_nodig",
  "meerdere_afspraken",
  "andere_dienst_verzet",
  "verzet_bevestiging_nodig",
  "meerdere_agendas",
  "dienst_onbekend",
]);

export interface RescheduleNoDayToolResult {
  name: string;
  result?: unknown;
}

export function enforceRescheduleNoDayDisclosure(
  replyText: string,
  rescheduleFlowActiveWithNoDayThisTurn: boolean,
  toolCalls: RescheduleNoDayToolResult[] = [],
): string {
  if (!replyText) return replyText;
  if (!rescheduleFlowActiveWithNoDayThisTurn) return replyText;
  // Already asks a day question (however phrased)? Trust correct model output, never clobber it.
  if (/welke dag|which day/i.test(replyText)) return replyText;
  // A sibling gate on reschedule_appointment/get_available_slots already fired this turn with its
  // OWN correct, different question (identity verification, multiple bookings, a service/calendar
  // choice), or the reschedule genuinely committed (ok:true): never override either with the day
  // question, that would fight (or contradict) the sibling gate/a real success.
  for (const tc of toolCalls) {
    if (tc.name !== "reschedule_appointment" && tc.name !== "get_available_slots" && tc.name !== "book_appointment") continue;
    const r = tc.result;
    if (!r || typeof r !== "object") continue;
    const err = (r as Record<string, unknown>).error;
    if (typeof err === "string" && RESCHEDULE_SIBLING_GATE_ERRORS.has(err)) return replyText;
    if ((r as Record<string, unknown>).ok === true) return replyText;
  }
  // Live-reproduced R95 (this fix's OWN verify round): the get_my_appointments-shaped stonewall
  // template is not the only shape this bug produces. A customer whose reschedule ask names no day
  // can also get a bare, silent slot OFFER (e.g. "19:30 past?"), the model having assumed some
  // unstated day for itself with zero disclosure, no tool call this turn carrying any of the
  // sibling-gate errors above, and no explicit day/appointment-status text either. Any reply this
  // deterministically-computed flag reaches, other than a genuine sibling gate or a real commit
  // (both already excluded above) or a reply that already asks the day, is WRONG BY CONSTRUCTION
  // (the one and only correct reply while rescheduleFlowActiveWithNoDayThisTurn holds is the day
  // question), so this rewrites unconditionally rather than pattern-matching one specific shape.
  return VRAAG_DAG_RESCHEDULE_CUSTOMER_MESSAGE;
}
