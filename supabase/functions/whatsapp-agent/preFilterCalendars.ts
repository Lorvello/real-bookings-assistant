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
export function lastMentionedCalendar(
  text: string,
  calendars: Array<{ id: string; name: string }>,
  servicesByCalendar?: Map<string, PreFilterServiceInfo[]>,
): string | null {
  const messageTokens = tokenize(text ?? "");
  if (messageTokens.length === 0) return null;
  let bestId: string | null = null;
  let bestIndex = -1;
  for (const cal of calendars) {
    const nameIdx = maxTokenMatchIndex(messageTokens, tokenize(cal.name));
    if (nameIdx > bestIndex) { bestIndex = nameIdx; bestId = cal.id; }
    const services = servicesByCalendar?.get(cal.id) ?? [];
    for (const svc of services) {
      const svcIdx = maxTokenMatchIndex(messageTokens, tokenize(svc.name));
      if (svcIdx > bestIndex) { bestIndex = svcIdx; bestId = cal.id; }
    }
  }
  return bestId;
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
