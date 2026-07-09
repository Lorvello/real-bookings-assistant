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
