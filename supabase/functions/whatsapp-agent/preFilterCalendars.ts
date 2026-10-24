// TRACK G5 (R45): deterministic keyword pre-filter for the <kalenders> two-phase redesign
// (DESIGN_KALENDERS_TWO_PHASE_G3.md, cleared for implementation by G4's adversarial review with
// ONE required fix folded in, see below). Zero LLM calls, reads ONLY the current turn's raw
// message text (never conversation history), mirrors relativeDateHint.ts's own current-turn-only
// discipline for the same stale-thread-memory reason (R23/R32).
//
// G4 FINDING (ROUNDS R44), FIXED HERE: the design's own section 2 specified plain substring
// (`.includes()`) matching. G4 traced a real wrong-narrowing gap: this fixture has a calendar
// named "Bo" (2 letters), and the Dutch verb "boeken" (to book) contains "bo" as a literal
// prefix. A message as ordinary as "ik wil een afspraak boeken" would substring-match calendar
// "Bo" and, being the ONLY match, spuriously narrow candidateIds to {Bo} alone, silently hiding
// Sanne/Milan/Iris on what should be a vague_intent-shaped fail-open turn. This is a general
// defect (any short employee/location name that happens to be a common-word prefix), not specific
// to this fixture's data.
//
// FIX: word-boundary (token-based) matching for CALENDAR names specifically, per G4's own
// scoping ("the fix should specifically target short calendar/employee NAMES, not service
// names... multi-word Dutch service names like 'Knippen + Stylen', 'Gelnagels' are long enough
// that stray substring collisions are unlikely"). A calendar name is only counted as a match if
// it appears as a WHOLE token (single-word names) or as a contiguous token sequence (multi-word
// names) in the current turn's text, never as a substring inside a larger word ("boeken" tokenizes
// to one token, "boeken", never equal to the token "bo"). Service names keep the design's
// original substring match (still adequate for this codebase's real service names, per G4's own
// check of `service_types`), so a customer typing just "Knippen" still correctly matches both
// "Knippen Dames" and "Knippen + Stylen" without needing the full service name verbatim.
//
// dash-free of em dashes per house rule.

export interface PreFilterServiceInfo {
  name: string;
}

export interface PreFilterResult {
  candidateIds: Set<string>;
  matched: boolean; // true iff 1+ calendar matched (i.e. NOT the fail-open-to-all branch)
}

// Lowercase, strip diacritics. Matches this directory's own established convention exactly
// (identityDisambiguationGuard.ts's normName: `.normalize("NFD").replace(/[\u0300-\u036f]/g, "")`),
// the escaped combining-diacritical-marks Unicode range, not a raw literal char-class.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Tokenize on anything that is not a letter/digit, so punctuation ("boeken?", "Bo," "Bo!") never
// glues a name to an adjacent word and never prevents a real match either.
function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
}

// True iff `nameTokens` (the normalized, tokenized name, 1+ tokens) occurs as a CONTIGUOUS
// subsequence of `messageTokens` (the normalized, tokenized current-turn message). This is the
// word-boundary-aware replacement for the design's original `.includes()` substring check: a
// single-token name like "bo" only matches a token that is EXACTLY "bo", never a token that
// merely CONTAINS "bo" as a substring ("boeken" tokenizes to one token, "boeken", which is never
// equal to "bo").
function containsNameTokens(messageTokens: string[], nameTokens: string[]): boolean {
  if (nameTokens.length === 0) return false;
  for (let i = 0; i + nameTokens.length <= messageTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < nameTokens.length; j++) {
      if (messageTokens[i + j] !== nameTokens[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Deterministic, zero-LLM-call pre-filter (Phase A.5 of the two-phase <kalenders> redesign).
 * Reads ONLY currentTurnMessageText (never history, by design, see header).
 *
 * - Exactly one calendar matches (by its own name, or one of its services' names, as whole
 *   token(s), not substring) -> candidateIds = {that one}.
 * - 2+ calendars match -> candidateIds = {all matched}, never narrowed further (preserves the F1
 *   disambiguating-question shape and every multi_service_confused close, per the design's
 *   section 3).
 * - Zero calendars match -> fail OPEN, candidateIds = {all calendar ids} (preserves vague_intent
 *   fail-open safety, the single most important guarantee in the whole design).
 */
export function resolveCandidateCalendarIds(
  currentTurnMessageText: string,
  calendars: Array<{ id: string; name: string }>,
  servicesByCalendar: Map<string, PreFilterServiceInfo[]>,
): PreFilterResult {
  const allIds = new Set(calendars.map((c) => c.id));
  const messageTokens = tokenize(currentTurnMessageText ?? "");

  if (messageTokens.length === 0) {
    return { candidateIds: allIds, matched: false };
  }

  const normalizedMessage = normalize(currentTurnMessageText ?? "");
  const matchedIds = new Set<string>();
  for (const cal of calendars) {
    // Calendar/employee name: strict word-boundary (whole-token) match, the G4 fix.
    let isMatch = containsNameTokens(messageTokens, tokenize(cal.name));
    if (!isMatch) {
      // Service name: substring match (design's original v1 approach), scoped safe by G4
      // because real service names in this codebase are multi-word/long enough.
      const services = servicesByCalendar.get(cal.id) ?? [];
      for (const svc of services) {
        const normalizedSvc = normalize(svc.name);
        if (normalizedSvc.length > 0 && normalizedMessage.includes(normalizedSvc)) { isMatch = true; break; }
      }
    }
    if (isMatch) matchedIds.add(cal.id);
  }

  if (matchedIds.size === 0) {
    return { candidateIds: allIds, matched: false };
  }
  return { candidateIds: matchedIds, matched: true };
}

// R98 (DAY/INTENT TOPIC-BLEED fix): hasDayMentionAnywhere (relativeDateHint.ts) and, downstream of
// it, rescheduleFlowActiveWithNoDay, used to scan the WHOLE shared conversation for a day mention
// or a reschedule verb with no awareness of a mid-conversation TOPIC SWITCH to a different
// calendar/service. Live-confirmed R97: a day named earlier for Iris's reschedule ("zondag 2
// augustus") falsely satisfied a totally unrelated fresh Bo booking's own day requirement (silent
// slot offer, the R92/R93 silent-default class reopened), and Iris's reschedule VERB
// ("verzetten") bled into a plain "boeken" request on Bo (wrong-flavored clarifying question:
// "Naar welke dag wil je de afspraak verzetten?" for a brand-new booking).
//
// Largest start TOKEN INDEX at which `nameTokens` occurs as a contiguous subsequence of
// `messageTokens`, or -1 if it never occurs. Shared position measure for both calendar-name and
// service-name matches below (both are tokenized the same way, so their positions are directly
// comparable on the same scale, unlike mixing token index with raw character offset).
function maxTokenMatchIndex(messageTokens: string[], nameTokens: string[]): number {
  if (nameTokens.length === 0) return -1;
  let best = -1;
  for (let i = 0; i + nameTokens.length <= messageTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < nameTokens.length; j++) {
      if (messageTokens[i + j] !== nameTokens[j]) { ok = false; break; }
    }
    if (ok && i > best) best = i;
  }
  return best;
}

// R98 (live-verify fix): real calendar names in this codebase routinely carry a descriptive
// parenthetical suffix ("Bo (Nagels)", "Milan (Kleuren)", "Iris (Weekend)", "Sanne (Knippen)"),
// live-confirmed this round. A customer naming the calendar always says only the PRIMARY name
// ("bij Bo boeken"), never the full "Bo (Nagels)" string, so tokenizing the whole raw name and
// requiring it as one contiguous sequence (as maxTokenMatchIndex above does for services) NEVER
// matches a real customer message for any calendar with such a suffix, silently defeating
// lastMentionedCalendar's whole purpose. Strip a trailing "(...)" suffix before tokenizing a
// CALENDAR name specifically (never a service name: service names are the substance of what the
// customer is booking and are said in full, e.g. "Knippen + Stylen", so they keep the exact,
// unstripped match above).
function primaryCalendarNameTokens(name: string): string[] {
  return tokenize(name.replace(/\s*\([^)]*\)\s*$/, ""));
}

// lastMentionedCalendar: which calendar is this text actually ABOUT? Checks BOTH the calendar's
// own NAME (word-boundary match) and its SERVICES' names (also word-boundary/token match here,
// deliberately NOT resolveCandidateCalendarIds's plain-substring service match above: token
// matching gives a comparable position for services and calendar names alike, needed for the
// "last mentioned wins" comparison below). A live topic (e.g. a reschedule conversation) is
// routinely carried by the SERVICE name alone for several turns ("Kan mijn Knippen + Stylen
// afspraak... verzet worden?") without the calendar's own name ("Iris") ever being repeated;
// servicesByCalendar lets this function recognize that as still being about Iris. Optional: when
// omitted (or a calendar has no known services), only the calendar name itself is checked.
//
// Returns the calendar whose name OR a service of its own occurs LATEST (by token position) in
// the text, or null when neither ever occurs. "Last mentioned wins" specifically because a
// customer naming two calendars/services in one message is, empirically (both live-confirmed
// cases this round), naming the OLD one only to rule it out and the NEW one as the actual ask
// ("Los van de Iris-afspraak: ik wil ook graag een nieuwe afspraak bij Bo boeken..." names Iris
// first, Bo last, and Bo is unambiguously what this turn is about).
// R84 live probe on staging (2026-10-24): the calendars this text ASKS FOR by name, in calendar
// order, each at most once: the name right after "bij", "naar", "with" or "at" ("knippen bij Sanne",
// "kan ik naar Iris", "with Sanne"). A name that is ruled out does not count: "niet bij", "niet meer
// bij", "ipv bij", "in plaats van bij", "behalve bij", "instead of with", "not with", always directly
// before ITS OWN "bij"/"naar" (full30/original11 S19: "kan ik ipv bij bram naar iris?" asks for Iris,
// and the "ipv" of Bram must not rule out Iris). A name said
// for another reason ("Sanne is ziek, wie heeft er plek?") does not count either, and service names
// never count here, unlike lastMentionedCalendar below: this answers "which person or place did the
// customer ask for".
const REQUEST_WORDS = ["bij", "naar", "met", "with", "at"];
const JOIN_WORDS = ["of", "en", "or", "and"];
const RULE_OUT_WORDS = ["niet", "geen", "not", "no", "ipv", "behalve", "zonder", "except", "without"];
// tokens[p] is the request word; is the phrase right before it a rule-out? Round 5 adds a past visit
// ("vorige keer was ik bij Sanne", "laatst bij Sanne"): that names who it WAS, not who it should be.
// Round 7: also "ik was vorige week bij Sanne" and "last week with Sanne" ("I was told to book with
// Sanne" still asks for Sanne).
function ruledOut(tokens: string[], p: number): boolean {
  const before = (n: number) => tokens.slice(Math.max(0, p - n), p).join(" ");
  return RULE_OUT_WORDS.includes(tokens[p - 1] ?? "") ||
    /^(?:niet|geen|not|no) (?:meer|langer|more|longer)$/.test(before(2)) ||
    before(3) === "in plaats van" || before(2) === "instead of" ||
    /\b(?:vorige (?:keer|week|maand)|last (?:time|week|month)|laatst|was ik|ik was|i was at|i went to)\b/.test(before(4));
}

// Round 5: an explicit "no preference" ends any earlier request for a staff member. Round 6: only
// when it is about WHO ("maakt niet uit bij wie", "geen voorkeur voor een kapper", "wie dan ook",
// "anyone"); "het maakt niet uit hoe laat" or "geen voorkeur voor de tijd" is about the time and
// keeps the request. index.ts also ignores it when the same message asks for someone.
// Round 7: asking for someone else or for whoever has room ends the request as well ("iemand anders
// is ook goed", "een andere kapper", "wie heeft er vrijdag plek?"); booking FOR someone else does not.
export function noStaffPreference(text: string): boolean {
  return /\b(?:maakt (?:het )?(?:mij |me )?niet uit (?:bij wie|wie|welke (?:medewerker|kapper|stylist|collega|behandelaar))|wie dan ook|geen voorkeur (?:voor )?(?:een |de |welke )?(?:medewerker|kapper|stylist|collega|behandelaar|persoon|wie)|doesn['’]?t matter who|no preference (?:for|on) (?:who|staff|stylist|barber)|anyone is fine|whoever is free)\b/i
    .test(normalize(text ?? "")) ||
    /(?<!\bvoor )\biemand anders\b(?! mee\b)|\b(?:een )?andere? (?:medewerker|kapper|stylist|collega|behandelaar)\b|\bwie (?:heeft|is) er (?:\S+ ){0,3}(?:plek|tijd|ruimte|vrij)\b|(?<!\bfor )\b(?:someone|somebody|anyone) else\b(?! (?:along|with)\b)|\bwho(?:['’]?s| is| has) (?:\S+ )?(?:free|available|time|room)\b/i
      .test(normalize(text ?? ""));
}
export function calendarsRequestedIn(text: string, calendars: Array<{ id: string; name: string }>): string[] {
  const tokens = tokenize(text ?? "");
  if (tokens.length === 0) return [];
  // Where each requested name ends, so a name joined to it ("bij Sanne of Bo") counts as well.
  const requestedEnds = new Set<number>();
  const at = (name: string[], i: number) => name.every((t, j) => tokens[i + j] === t);
  const requested = new Set<string>();
  for (const cal of calendars) {
    const name = primaryCalendarNameTokens(cal.name);
    if (name.length === 0) continue;
    for (let i = 1; i + name.length <= tokens.length; i++) {
      // "bij voorkeur Sanne" asks for Sanne too.
      const p = tokens[i - 1] === "voorkeur" && tokens[i - 2] === "bij" ? i - 2 : i - 1;
      if (!REQUEST_WORDS.includes(tokens[p]) || ruledOut(tokens, p) || !at(name, i)) continue;
      // Round 5: "ik kom met Iris mee" is a companion, and "bij Iris geweest" a past visit.
      const after = tokens[i + name.length] ?? "";
      if ((tokens[p] === "met" && after === "mee") || ["geweest", "gezeten"].includes(after)) continue;
      requested.add(cal.id);
      requestedEnds.add(i + name.length - 1);
    }
  }
  // Rounds 4 and 5: "bij Sanne of Bo" and "bij Sanne, Bo of Iris" ask for any of them, so the staff
  // check must see every name of the list (joined by of/en/or/and, or by a comma, which tokenizing
  // drops so the names sit side by side).
  let grew = true;
  while (grew) {
    grew = false;
    for (const cal of calendars) {
      const name = primaryCalendarNameTokens(cal.name);
      if (name.length === 0 || requested.has(cal.id)) continue;
      for (let i = 1; i + name.length <= tokens.length; i++) {
        const joined = JOIN_WORDS.includes(tokens[i - 1]) ? requestedEnds.has(i - 2) : requestedEnds.has(i - 1);
        if (joined && at(name, i)) {
          requested.add(cal.id);
          requestedEnds.add(i + name.length - 1);
          grew = true;
          break;
        }
      }
    }
  }
  return calendars.filter((cal) => requested.has(cal.id)).map((cal) => cal.id);
}

// Round 7 (review round 6): a calendar named WITHOUT "bij", "naar" or "with" ("doe maar Bo", "Bo is ook
// goed", "Sanne niet, Bo wel"), with the same exclusions as a request: a rule-out right before it ("niet
// Bo", "ipv Bo", "vorige keer was ik Bo"), "niet" right after it ("Bo niet"), "met Bo mee" and "Bo
// geweest". A name after a request word belongs to calendarsRequestedIn and is left out here.
// Round 8 (review round 7): only with a choice word right next to it ("doe maar Bo", "liever Bo", "ok Bo",
// "Bo graag", "Bo is ook goed", "Bo wel"), and never the customer's own name. A sign-off ("vrijdag om
// 14:00, groetjes Sanne", "14:00 - Sanne"), a name answer ("Sanne") and a name used in another sense
// ("Bo zei dat het vrijdag kon") choose nobody.
const BARE_CHOICE_BEFORE = ["maar", "liever", "gewoon", "toch", "ok", "oke", "okay", "prima", "graag", "rather", "prefer"];
const BARE_CHOICE_AFTER = ["graag", "dan", "then", "please", "pls", "wel", "works"];
function calendarsChosenBareIn(text: string, calendars: Array<{ id: string; name: string }>, customerNames: string[] = []): string[] {
  const tokens = tokenize(text ?? "");
  const own = new Set(customerNames.flatMap((n) => tokenize(n ?? "")));
  const named = new Set<string>();
  for (const cal of calendars) {
    const name = primaryCalendarNameTokens(cal.name);
    if (name.length === 0 || name.every((t) => own.has(t))) continue;
    for (let i = 0; i + name.length <= tokens.length; i++) {
      if (!name.every((t, j) => tokens[i + j] === t)) continue;
      const before = tokens[i - 1] ?? "";
      const after = tokens.slice(i + name.length, i + name.length + 3);
      if (REQUEST_WORDS.includes(before) || (before === "voorkeur" && tokens[i - 2] === "bij")) continue;
      if (ruledOut(tokens, i) || ["niet", "not", "mee", "geweest", "gezeten"].includes(after[0] ?? "")) continue;
      const chosen = BARE_CHOICE_BEFORE.includes(before) || BARE_CHOICE_AFTER.includes(after[0] ?? "") ||
        (after[0] === "is" && /^(?:(?:ook|also) )?(?:goed|prima|fine|ok|oke|beter|better|top)\b/.test(after.slice(1).join(" ")));
      if (chosen) named.add(cal.id);
    }
  }
  return calendars.filter((cal) => named.has(cal.id)).map((cal) => cal.id);
}

// Rounds 4 to 8: the staff member the customer asks for over the topic, messages oldest first and the
// current one last (index.ts passes at most three earlier ones). The latest message that asks for
// someone by name decides and an explicit "no preference" ends the request. Round 8: choosing another
// staff member without "bij" ("ik wil graag bij Sanne", then "doe maar Bo") ENDS the request as well; it
// never points the check at the new name, so a misread name can switch the check off but can never push
// the booking towards the wrong person. A bare name never starts a request on its own. customerNames:
// the customer's own names (booking name, WhatsApp profile name), which never count as a choice.
export function staffRequestOverTopic(
  texts: string[],
  calendars: Array<{ id: string; name: string }>,
  customerNames: string[] = [],
): string[] {
  let asked: string[] = [];
  for (const text of texts) {
    const requested = calendarsRequestedIn(text, calendars);
    if (requested.length) {
      asked = requested;
    } else if (noStaffPreference(text)) {
      asked = [];
    } else if (asked.length && calendarsChosenBareIn(text, calendars, customerNames).some((id) => !asked.includes(id))) {
      asked = [];
    }
  }
  return asked;
}

export function lastMentionedCalendar(
  text: string,
  calendars: Array<{ id: string; name: string }>,
  servicesByCalendar?: Map<string, PreFilterServiceInfo[]>,
): string | null {
  const messageTokens = tokenize(text ?? "");
  if (messageTokens.length === 0) return null;
  // R84 (24-10-2026): at the same position the longer name wins ("Knippen + Stylen" of Iris over the
  // "Knippen" that Bo also offers). Before this, "Kan mijn Knippen + Stylen afspraak verzet worden?" read
  // as Bo in Salon Sanne, so a later Bo request looked like the same topic and Iris's day could leak in.
  // Otherwise unchanged: a later mention wins, and a name several calendars share still reads as the first
  // of them (review of round 9: treating it as all of them let new requests pass as the same topic).
  let bestId: string | null = null;
  let bestIndex = -1;
  let bestLength = 0;
  const consider = (index: number, length: number, id: string) => {
    if (index > bestIndex || (index >= 0 && index === bestIndex && length > bestLength)) {
      bestIndex = index;
      bestLength = length;
      bestId = id;
    }
  };
  for (const cal of calendars) {
    const nameTokens = primaryCalendarNameTokens(cal.name);
    consider(maxTokenMatchIndex(messageTokens, nameTokens), nameTokens.length, cal.id);
    const services = servicesByCalendar?.get(cal.id) ?? [];
    for (const svc of services) {
      const svcTokens = tokenize(svc.name);
      consider(maxTokenMatchIndex(messageTokens, svcTokens), svcTokens.length, cal.id);
    }
  }
  return bestId;
}

// R101 (SINGLE-CANDIDATE-DISAMBIGUATION-ASK fix, live-reproduced R96/R100): resolveCandidateCalendarIds
// above already correctly narrows candidateIds to exactly ONE calendar when the customer's current-turn
// message names a service that genuinely exists on only one calendar (or names that calendar directly),
// even in a multi-calendar business. Until this fix, that narrowing was used ONLY to prune the prompt's
// per-calendar info block (the `collapsed` flag on calendarsForPrompt in index.ts), never to hard-suppress
// a disambiguation question - so the model, still SEEING the other calendars' names in the (collapsed)
// <kalenders> list, routinely asked "Bij welke locatie wil je [dienst] plannen?" anyway (live-reproduced
// verbatim on "Ik wil graag een nieuwe afspraak bij Iris boeken voor Bruidskapsel..." even though
// Bruidskapsel exists ONLY on Iris's calendar - confirmed via a direct service_types query, exactly one
// row). prompt.ts's own line ~303 ("Wordt de gevraagde dienst maar door ÉÉN persoon/locatie aangeboden?
// Dan is de keuze al duidelijk... vraag niets extra.") is a prompt-only instruction, the same failure
// class R93/R95's day-guard fixes already found unreliable at this model's scale. This closes it the
// same way: a deterministic, code-level backstop that rewrites the FINAL drafted reply, independent of
// which (if any) tool was called this turn, same pattern as enforceReturningServiceDisclosure /
// enforceRescheduleNoDayDisclosure.
//
// Detection of "this reply IS a location-disambiguation question" is intentionally broad (any of the
// common Dutch/English phrasings this codebase's own prompt.ts instructs the model to use for a GENUINE
// multi-location ambiguity, e.g. "bij wie/waar wil je de afspraak?", "Bij welke locatie...?", "welke
// medewerker/vestiging...?", "which location/provider/stylist..."), since the whole point of this guard
// is to catch the model asking that SHAPE of question even though, for THIS turn's narrowed candidate
// set, there is no real ambiguity left to ask about.
const LOCATION_DISAMBIGUATION_QUESTION_RE =
  /\b(bij wie|bij welke|welke locatie|welke vestiging|welke medewerker|welke stylist|which location|which provider|which stylist|which staff member|which branch)\b.*\?/i;

/**
 * Reply-rewrite backstop (R101). No-op unless `singleCandidateCalendarName` is non-null (i.e. this
 * turn's resolveCandidateCalendarIds narrowed to exactly one calendar for the service/location named)
 * AND the drafted reply matches the location-disambiguation question shape. When both hold, the
 * question is discarded: there is no real ambiguity left to ask about, so the reply is rewritten to
 * acknowledge the single calendar and invite the customer to continue, without fabricating any booking
 * outcome (no slot/time is invented here; a real tool call still resolves that on a subsequent turn).
 */
export function enforceNoRedundantLocationAsk(
  replyText: string,
  singleCandidateCalendarName: string | null,
): string {
  if (!replyText) return replyText;
  if (!singleCandidateCalendarName) return replyText;
  if (!LOCATION_DISAMBIGUATION_QUESTION_RE.test(replyText)) return replyText;
  return `Dat kan bij ${singleCandidateCalendarName}, dus die keuze staat al vast. Een moment, ik ga verder met je afspraak.`;
}

// scopeToCurrentTopicWindow: the actual trim applied to the "prior inbound texts" window before
// it reaches hasDayMentionAnywhere / rescheduleFlowActiveWithNoDay. Single-calendar tenants
// (calendars.length <= 1) are always returned unchanged: there is no second calendar to switch
// to, so this bug class cannot occur there, and behavior must stay byte-identical (matches every
// other isMultiCalendar-gated fix in this codebase).
//
// Detection: does the CURRENT text clearly name one calendar or its service (lastMentionedCalendar,
// servicesByCalendar-aware)? If not (a followup with no calendar/service name, e.g. "wat kost dat?"
// or "kan het naar dinsdag 19:00"), there is no switch signal at all, keep the FULL window,
// unchanged from before this fix (a real continuation of the SAME flow must still be able to see
// its own earlier day/verb mentions). If it does, walk the prior inbound texts NEWEST-FIRST to
// find the most recent one that also clearly names one calendar/service. If that calendar differs
// from the current one, this turn is a genuine topic switch onto a different calendar/service:
// return an EMPTY window, so the day-scan and reschedule-verb-scan start completely fresh at this
// message, carrying nothing over from the old flow. If it is the SAME calendar (or no prior
// message ever named one), this is a continuation, not a switch: return the full window, unchanged.
export function scopeToCurrentTopicWindow(
  currentText: string,
  priorInboundTextsOldestFirst: string[],
  calendars: Array<{ id: string; name: string }>,
  servicesByCalendar?: Map<string, PreFilterServiceInfo[]>,
): string[] {
  if (calendars.length <= 1) return priorInboundTextsOldestFirst;
  const currentCal = lastMentionedCalendar(currentText, calendars, servicesByCalendar);
  if (currentCal === null) return priorInboundTextsOldestFirst;
  // R98 (live-verify fix): the real webhook path inserts THIS turn's own inbound row into
  // whatsapp_messages BEFORE invoking this agent (see index.ts's own "newestIsCurrentInbound"
  // dedup a few hundred lines below, the same established shape), so the newest entry in
  // priorInboundTextsOldestFirst can already BE a duplicate of currentText. Live-reproduced this
  // round: without this skip, the "most recently named calendar" search below found the DUPLICATE
  // of the current message itself, which trivially matched currentCal, so a genuine topic switch
  // was never detected (recentCal === currentCal by definition of comparing a text against
  // itself). Skip that duplicate here (textual identity, matching the established convention)
  // before searching for the real prior turn's own most recently named calendar.
  const historyTexts = priorInboundTextsOldestFirst.length > 0 &&
      priorInboundTextsOldestFirst[priorInboundTextsOldestFirst.length - 1] === currentText
    ? priorInboundTextsOldestFirst.slice(0, -1)
    : priorInboundTextsOldestFirst;
  let recentCal: string | null = null;
  for (let i = historyTexts.length - 1; i >= 0; i--) {
    recentCal = lastMentionedCalendar(historyTexts[i], calendars, servicesByCalendar);
    if (recentCal !== null) break;
  }
  if (recentCal !== null && recentCal !== currentCal) return [];
  return priorInboundTextsOldestFirst;
}
