// MONITORING/ALERTS ITEM 3 (see launch-ready-loop/MONITORING_ALERTS_DESIGN.md, Item 1's approved
// design, and launch-ready-loop/GOAL_PROMPT_BA_MONITORING_ALERTS.md's backlog).
//
// Detection-only for two proven silent-failure classes from the closed testing loop:
//   1. date_mismatch (R127 class): the final reply TEXT names a different date than the one a
//      committing book_appointment/reschedule_appointment call actually wrote to `bookings`.
//   2. thread_hijack (R130 class): a reply is built against a different identity/booking than the
//      one that owns the current conversation's phone number.
//
// STRICTLY ADDITIVE / READ-ONLY. Every exported detector here is a pure function (or a single
// read-only select for Check B) that only ever produces a candidate alert row. index.ts is
// responsible for wrapping every call site in try/catch and firing the INSERT fire-and-forget,
// AFTER the real reply text/tool results already exist. Nothing in this file may throw in a way
// that reaches the caller uncaught, alter any argument, or touch the customer-facing reply.
//
// DEVIATION FROM THE DESIGN DOC (documented, not silently patched): section 2's Check B pseudocode
// assumed a `bookings.contact_id` column. The live schema (checked via the Supabase Management API
// `/database/query` endpoint during this round) has no such column - `bookings` is scoped by
// `customer_phone` only, matching identityDisambiguationGuard.ts's own header note ("phone number
// is the SOLE identity key end-to-end, no attendee-name field anywhere in the schema"). Check B
// below therefore compares `bookings.customer_phone` against the CURRENT conversation's own phone
// (the same value already used everywhere else in this codebase as the identity key), which is the
// mechanically correct equivalent of the design's intent on the schema that actually exists.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { isRealName } from "./identityDisambiguationGuard.ts";

// ---------------------------------------------------------------------------
// Shared small types
// ---------------------------------------------------------------------------

export interface MonitoringToolCall {
  name: string;
  result: unknown;
}

// ---------------------------------------------------------------------------
// Class 1: date mismatch
// ---------------------------------------------------------------------------

const MUTATION_DATE_TOOLS = new Set(["book_appointment", "reschedule_appointment"]);

export interface CommittedBookingDate {
  bookingId: string;
  iso: string; // YYYY-MM-DD, Europe/Amsterdam
}

function dateOnlyAmsterdam(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

// Mirrors tools.ts's own result shapes exactly (see book_appointment's `start_time` and
// reschedule_appointment's `rescheduled.to_start_time`, both confirmed against tools.ts). Reads
// ONLY already-returned tool result fields, no re-computation. Exported so index.ts can also use
// it for the pg_cron sweep's hint-persistence write (see section 3 of the design), independent of
// whether detectDateMismatch itself found a mismatch this turn.
export function findCommittedBookingDate(toolCalls: MonitoringToolCall[]): CommittedBookingDate | null {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (!MUTATION_DATE_TOOLS.has(t.name)) continue;
    const r = t.result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.ok !== true || typeof rec.booking_id !== "string") continue;
    let startTime: unknown = rec.start_time; // book_appointment
    if (typeof startTime !== "string" && rec.rescheduled && typeof rec.rescheduled === "object") {
      startTime = (rec.rescheduled as Record<string, unknown>).to_start_time; // reschedule_appointment
    }
    if (typeof startTime !== "string") continue;
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) continue;
    return { bookingId: rec.booking_id, iso: dateOnlyAmsterdam(d) };
  }
  return null;
}

// Deterministic, mechanical regex date extraction from the OUTBOUND reply text. Deliberately
// duplicated rather than importing relativeDateHint.ts's internal (non-exported) primitives -
// this codebase's own established convention (see identityDisambiguationGuard.ts's isRealName
// header: "kept independent/duplicated on purpose, matching every other guard module's
// independence, no cross-file coupling"). No AI judgment: same NL day/month/weekday literals,
// same "nearest forward occurrence" rule as relativeDateHint.ts uses for the inbound message.
const NL_MONTH_NAMES =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december";
const NL_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};
const EXPLICIT_DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${NL_MONTH_NAMES})(?:\\s+(\\d{4}))?\\b`, "i");
const NL_WEEKDAYS: Record<string, number> = {
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
};
const NL_WEEKDAY_RE = new RegExp(`\\b(${Object.keys(NL_WEEKDAYS).join("|")})\\b`, "i");

// R9 GAP 1 FIX (see _BA_MONITORING_ALERTS_STATE.md R9 finding 1): index.ts's enWhen() (~line 145)
// renders EVERY committed-mutation confirmation in English whenever customerLanguage != null (15+
// call sites, deterministicConfirmation/deterministicPreview's own `en` flag), in the exact shape
// "Tuesday 15 July 14:00" (en-GB toLocaleDateString weekday:long/day:numeric/month:long, no comma,
// then HH:MM 24h). The Dutch-only regexes above never matched that shape, so detectDateMismatch
// was structurally blind for every English customer. Deliberately duplicated (not merged into one
// combined regex) to keep the NL and EN literal tables independently readable/auditable, matching
// this file's own established "kept independent/duplicated on purpose" convention (see header).
const EN_MONTH_NAMES =
  "january|february|march|april|may|june|july|august|september|october|november|december";
const EN_MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};
const EXPLICIT_DATE_RE_EN = new RegExp(`\\b(\\d{1,2})\\s+(${EN_MONTH_NAMES})(?:\\s+(\\d{4}))?\\b`, "i");
const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};
const EN_WEEKDAY_RE = new RegExp(`\\b(${Object.keys(EN_WEEKDAYS).join("|")})\\b`, "i");

function inferYear(now: Date, month: number, day: number): number {
  const y = now.getFullYear();
  const candidate = new Date(y, month, day, 12);
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  // A date that already lies more than a day in the past this year is almost certainly next year's
  // occurrence (mirrors relativeDateHint.ts's own forward-only convention for bare mentions).
  if (candidate.getTime() < todayNoon.getTime() - 24 * 3600 * 1000) return y + 1;
  return y;
}

export function extractDateFromReplyText(text: string | null | undefined, now: Date): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\bvandaag\b/.test(t) || /\btoday\b/.test(t)) return dateOnlyAmsterdam(now);
  if (
    (/\bmorgen\b/.test(t) && !/\bovermorgen\b/.test(t)) ||
    (/\btomorrow\b/.test(t))
  ) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return dateOnlyAmsterdam(d);
  }
  const explicit = t.match(EXPLICIT_DATE_RE) ?? t.match(EXPLICIT_DATE_RE_EN);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const monthKey = explicit[2];
    const month = NL_MONTHS[monthKey] ?? EN_MONTHS[monthKey];
    if (month !== undefined && day >= 1 && day <= 31) {
      const year = explicit[3] ? parseInt(explicit[3], 10) : inferYear(now, month, day);
      return dateOnlyAmsterdam(new Date(year, month, day, 12));
    }
  }
  const wm = t.match(NL_WEEKDAY_RE) ?? t.match(EN_WEEKDAY_RE);
  if (wm) {
    const key = wm[1].toLowerCase();
    const targetDow = NL_WEEKDAYS[key] ?? EN_WEEKDAYS[key];
    const d = new Date(now);
    const curDow = d.getDay();
    let delta = (targetDow - curDow + 7) % 7;
    if (delta === 0) delta = 7; // a weekday NAMED in a reply always reads as the next occurrence
    d.setDate(d.getDate() + delta);
    return dateOnlyAmsterdam(d);
  }
  return null;
}

export interface DateMismatchTurnCtx {
  toolCalls: MonitoringToolCall[];
  finalReplyText: string;
  relativeDateHintISO: string | null;
  matchedPhrase: string | null;
  now: Date;
}

export interface DateMismatchAlert {
  failure_class: "date_mismatch";
  established_iso: string | null;
  committed_iso: string;
  reply_iso: string;
  matched_phrase: string | null;
  booking_id: string;
}

// Section 1 of the design, mechanical: compare the deterministic hint (if any fired this turn),
// the tool result's own committed date, and a regex re-scan of the OUTBOUND reply. No LLM call.
export function detectDateMismatch(ctx: DateMismatchTurnCtx): DateMismatchAlert | null {
  const committed = findCommittedBookingDate(ctx.toolCalls);
  if (!committed) return null; // nothing actually booked/changed this turn
  const replyISO = extractDateFromReplyText(ctx.finalReplyText, ctx.now);
  if (!replyISO) return null; // reply names no date at all, nothing to compare
  if (replyISO === committed.iso) return null;
  return {
    failure_class: "date_mismatch",
    established_iso: ctx.relativeDateHintISO ?? committed.iso,
    committed_iso: committed.iso,
    reply_iso: replyISO,
    matched_phrase: ctx.relativeDateHintISO ? ctx.matchedPhrase : null,
    booking_id: committed.bookingId,
  };
}

// ---------------------------------------------------------------------------
// Class 2: wrong-thread hijack
// ---------------------------------------------------------------------------

function normalizeNameForCompare(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export interface ThreadHijackNameMismatchTurnCtx {
  toolCalls: MonitoringToolCall[];
  knownSelfName: string | null | undefined;
  // R7 FIX: the final customer-facing reply for this turn. Optional/nullable so existing
  // mechanism-level callers (Item 5/6 proofs, older tests) that never populate it keep their prior
  // behavior (an empty reply never matches CONFIRMATION_REQUEST_RE, so the alert still fires).
  finalReplyText?: string | null;
}

export interface ThreadHijackNameMismatchAlert {
  failure_class: "thread_hijack_name_mismatch";
  stated_name: string;
  actual_name: string;
}

const MUTATION_OWNER_TOOLS = new Set(["book_appointment", "reschedule_appointment", "cancel_appointment"]);

// R7 FALSE-POSITIVE FIX (see _BA_MONITORING_ALERTS_STATE.md R7 finding + orchestrator verify):
// the naam_verificatie_nodig gate firing is the R130 fix WORKING correctly (it always blocks the
// mutation server-side), not the bug. tools.ts's own `customer_reply` field on all 5
// naam_verificatie_nodig call sites always composes a disclosure-and-confirm QUESTION, but the
// model is free to paraphrase it (enforceVerificationGateDisclosure only force-rewrites when the
// model's own text drops the target name entirely, see identityDisambiguationGuard.ts). A live
// replay during this fix's own re-verification surfaced one such paraphrase the first, narrower
// version of this regex missed ("Wil je die echt annuleren? Typ de naam terug..."), so the pattern
// below is deliberately two-part and broader: ANY of the recurring Dutch confirmation-question
// markers this codebase's own customer_reply templates use, combined with the reply actually being
// phrased as a question (containing "?"). Both must hold - a bare "?" alone is not enough (would
// swallow real proceeded-and-asked-something-else replies), and a keyword without "?" is not enough
// either (would swallow a statement that merely mentions "klopt" without asking anything).
const CONFIRMATION_KEYWORDS_RE =
  /\bklopt\b|\bbevestig\b|\bwil je\b|\bmoet dit\b|\btyp\b|\bof toch\b|\bof blijft\b|\bof bedoelde je\b/i;

// R9 GAP 2 FIX (see _BA_MONITORING_ALERTS_STATE.md R9 finding 2): the Dutch-only regex above
// reintroduces the exact R7 false-positive bug for English customers - naam_verificatie_nodig's
// `customer_reply` template is Dutch source text (tools.ts), but the model paraphrases/translates
// it into English whenever customerLanguage != null (the same "model free to paraphrase" fact R7's
// own fix comment already documents for Dutch). No single locked English customer_reply string
// exists anywhere in tools.ts/identityDisambiguationGuard.ts to duplicate byte-for-byte (checked
// both files during this fix), so this pattern is the same kind of broad-but-scoped keyword set
// the Dutch one already is: the recurring English confirmation-question markers a translated
// disclose-and-confirm question realistically uses, still gated by isConfirmationRequest's own
// "?" requirement below so a bare keyword mention without an actual question never matches.
//
// R11 GAP B FIX (adversarial round found: "should i", "is this", "does this" are generic
// conversational fragments that can appear in an unrelated trailing question the model stacks
// onto a reply - see index.ts's own ITEM 4 comment ~line 3273, which documents this model's real,
// observed tendency to bundle 2+ questions into one reply, e.g. "...service + day/time + staff
// into one message"). A hijack reply that never properly asks for confirmation but happens to
// stack an unrelated "is this a good time?" or "should I also check Tuesday?" question would have
// false-suppressed a REAL hijack alert under the old set. Tightened to mirror the Dutch set's own
// domain specificity (klopt/bevestig/wil je/moet dit/typ/of toch/of blijft/of bedoelde je are all
// booking-confirmation vocabulary, not generic conversational fragments): dropped the three bare
// generic fragments outright, and narrowed "is this"/"is that" to the specific confirmation-framing
// phrase "is this/that correct/right" (mirrors the Dutch "Klopt het dat..." semantics) and "type
// back" to "type the/your name back" (mirrors the Dutch "Typ ter bevestiging de naam terug..."
// instruction verbatim in tools.ts's own customer_reply templates, e.g. line 1898/2769/3291/3477/
// 4542). "confirm"/"would you like"/"please confirm"/"or did you mean" kept as-is - already
// domain-specific enough (a stacked unrelated question is very unlikely to contain "would you
// like" or "or did you mean" by coincidence, unlike the three removed fragments).
const CONFIRMATION_KEYWORDS_RE_EN =
  /\bconfirm\b|\bwould you like\b|\bor did you mean\b|\btype (?:the |your )?name back\b|\bis (?:this|that) (?:correct|right)\b/i;
function isConfirmationRequest(replyText: string): boolean {
  return replyText.includes("?") &&
    (CONFIRMATION_KEYWORDS_RE.test(replyText) || CONFIRMATION_KEYWORDS_RE_EN.test(replyText));
}

// Check A: surfaces the SAME "naam_verificatie_nodig" gate signal
// enforceVerificationGateDisclosure (identityDisambiguationGuard.ts) already consumes to build the
// disclosure sentence - zero new logic, this only ALSO writes the signal to monitoring_alerts.
// `current_name` on that gate result is the real owner name on the target booking; the stated
// identity is whatever this conversation already established (ctx.knownSelfName, the same value
// createTools receives as `knownSelfName`).
export function detectThreadHijackNameMismatch(
  ctx: ThreadHijackNameMismatchTurnCtx,
): ThreadHijackNameMismatchAlert | null {
  if (!isRealName(ctx.knownSelfName)) return null;
  for (let i = ctx.toolCalls.length - 1; i >= 0; i--) {
    const r = ctx.toolCalls[i].result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.error !== "naam_verificatie_nodig") continue;
    const actual = rec.current_name;
    if (!isRealName(actual)) return null;
    const statedName = String(ctx.knownSelfName);
    const actualName = String(actual);
    if (normalizeNameForCompare(statedName) === normalizeNameForCompare(actualName)) return null;
    // R7 FIX: only the actual R130 bug shape alerts - either (a) a mutation tool reports ok:true
    // LATER in this same turn despite this unresolved gate (the hijack actually completing anyway),
    // or (b) the final reply does NOT match the gate's own confirmation-request phrasing (proceeding
    // /disclosing silently instead of asking). A reply that DOES ask for confirmation is the gate
    // working as designed and must never alert.
    const mutationSucceededAfterGate = ctx.toolCalls.slice(i + 1).some((t) => {
      if (!MUTATION_OWNER_TOOLS.has(t.name)) return false;
      const rr = t.result;
      return !!rr && typeof rr === "object" && (rr as Record<string, unknown>).ok === true;
    });
    if (!mutationSucceededAfterGate && isConfirmationRequest(ctx.finalReplyText ?? "")) {
      return null; // gate fired and the reply properly asked for confirmation - benign, not a hijack
    }
    return { failure_class: "thread_hijack_name_mismatch", stated_name: statedName, actual_name: actualName };
  }
  return null;
}

// R9 GAP 3 FIX (see _BA_MONITORING_ALERTS_STATE.md R9 finding 3): Check A only inspects a
// MUTATION tool's own `error: naam_verificatie_nodig` field; Check B only inspects a MUTATION
// tool's own `ok: true` field. get_my_appointments is READ-ONLY (tools.ts: "NO side effects") and
// was never inspected by either check, yet it carries the exact same cross-identity signal Check A
// surfaces: R102's own fix (identityDisambiguationGuard.ts / tools.ts get_my_appointments) already
// deliberately discloses a booking's stored customer_name in the reply whenever it differs from
// ctx.knownSelfName, precisely so a shared-phone customer never silently reads someone else's
// appointment as "jouw afspraak". That disclosure is correct, designed behavior, not itself a bug -
// but until now a hijack surfaced ONLY through that read-only channel (no mutation call this turn,
// so Check A/B never even run) had zero monitoring visibility. Mirrors Check A: zero new judgment,
// only surfaces the SAME cross-identity signal get_my_appointments' own result already carries.
// Gated on isRealName(knownSelfName) (same bar Check A uses) so the extremely common "self name not
// established yet" first-turn shape (get_my_appointments called before any name is known) never
// fires - that is normal conversation flow, not a mismatch, and firing on it would flood
// monitoring_alerts with noise unrelated to any hijack.
const READ_ONLY_APPOINTMENT_TOOLS = new Set(["get_my_appointments"]);

// R11 GAP A FIX (adversarial round found: Check C fired on the correctly-designed shared-phone
// disclosure, not just a hijack - see tools.ts's own "GEDEELD NUMMER" rule, referenced 15+ times:
// "staat een afspraak op een ANDERE naam dan de huidige klant, presenteer die dan ALTIJD als 'de
// afspraak van [naam]', nooit als 'jouw afspraak'"). A mismatched customer_name inside a
// get_my_appointments result is NORMAL, everyday, correct behavior whenever 2+ bookings share a
// phone number - it is only the R130-shaped bug when the agent's own reply fails to properly
// attribute the disclosed name (i.e. presents the other person's booking as if it were the current
// customer's own). Mirrors Check A's own `finalReplyText`-gated shape (R7/R8 fix): the raw tool
// result alone is never enough to alert, the reply's own attribution must ALSO be checked.
// `replyProperlyAttributesDisclosedName` is deliberately a small mechanical substring check (the
// disclosed name appearing anywhere in the reply, normalized for case/diacritics) rather than a
// strict phrase match on "de afspraak van [naam]" - the model paraphrases (same fact R7/R8/R9
// already documented for the Dutch and English confirmation wording), so requiring the exact
// locked phrase would just reintroduce a narrower version of the same false-positive class this
// fix exists to close. If the disclosed name is named anywhere in the reply, that is the agent
// correctly surfacing whose booking it is (the GEDEELD NUMMER design working as intended); if the
// name never appears at all, the booking was presented without attribution - the actual hijack
// shape. `finalReplyText` is optional/nullable, matching Check A's own established convention
// (ThreadHijackNameMismatchTurnCtx): a missing/empty reply never attributes anything, so older
// mechanism-level callers that never populate it keep firing exactly as before.
// R13 FIX (see _BA_MONITORING_ALERTS_STATE.md R13 finding): the raw `.includes()` substring check
// above was unanchored in both directions. False-negative: a short disclosed name like "An" is a
// substring of many unrelated Dutch words (e.g. "maandag" contains "an"), so a genuine silent
// hijack with zero real attribution could get wrongly marked as "properly attributed" and the
// alert suppressed - defeating the whole point of the check. False-positive: a multi-part stored
// name like "Anna de Vries" that the agent naturally shortens to just "Anna" in a correctly-
// attributed reply wouldn't match the full string, wrongly flagging a benign GEDEELD NUMMER
// disclosure (reopening the exact R11/R12 false-positive bug). Fix: tokenize disclosedName on
// whitespace, require at least one token of length >= 3 (long enough to not be pure filler like
// "de"/"a") to appear in replyText as a whole word via a word-boundary regex - "Anna de Vries"
// matches on the "anna" token appearing as a standalone word ("...van Anna..."), "An" produces no
// token >= 3 chars so it never spuriously matches inside "maandag". Same normalization
// (normalizeNameForCompare) as the rest of this file, so case/diacritics still don't matter.
// Mirrors identityDisambiguationGuard.ts's own containsWholeWord (kept independent/duplicated on
// purpose, matching every other guard module's independence, no cross-file coupling): unicode-
// aware word-boundary check via lookaround rather than `\b` (which only understands ASCII word
// chars and would misbehave on names with residual non-ASCII characters).
// R15 FIX (see _BA_MONITORING_ALERTS_STATE.md R15 finding): R14's word-boundary match closed R13's
// substring-collision class, but R15 found a collision ONE LEVEL UP - a short real Dutch first name
// can itself be an ordinary Dutch word. Concretely "Wil" (a real first name, >=3 chars, passes the
// length filter) is also the modal verb "wil" ("wants"). A bare hijack reply with zero real
// attribution, e.g. "Wil je deze bevestigen?", has the word "wil" appear as a genuine standalone
// word, so the old word-boundary-only check would wrongly mark it as properly attributed and
// suppress a real alert.
// This is the third refinement on this exact function (R11: raw substring, R14: word-boundary,
// R15/this fix: word-boundary still not enough), so instead of special-casing "wil" (which would
// only defer the same bug to the next coincidental name/common-word pair, e.g. a future customer
// named "Al" or "Ben") this changes the check's SHAPE: instead of asking "does the disclosed name
// appear anywhere as a whole word", it asks "does the disclosed name appear in an actual ATTRIBUTION
// POSITION" - immediately preceded (allowing a couple of filler words) by one of the real
// possessive/attribution markers this codebase's own instructions and templates use for this exact
// disclosure sentence: Dutch "van" (tools.ts's GEDEELD NUMMER rule, line 963: "presenteer die dan
// ALTIJD als 'de afspraak van [naam]'"; also literally used in the customer_reply templates, e.g.
// lines 1898/1900/3291/3477/4542: "staat op naam van ${name}") and "voor" (the booking-preview
// confirm template, line 1897: "geboekt worden voor ${name}"), plus the English equivalents "of"/
// "for" for replies composed in English (no single locked English template exists for this specific
// disclosure - same fact R9/R10 already documented for the other Check C/A wording - so these two
// markers are kept generic on purpose, mirroring their Dutch counterparts). A bare name mention with
// no attribution marker in front of it (e.g. "Wil je...", where "Wil" opens the sentence with
// nothing preceding it) no longer counts as attribution. This also fixes a second, related shape the
// old check could never catch: a reply that misattributes on purpose, e.g. "Wil, dit is jouw
// afspraak" (the name IS mentioned, but framed as "jouw" - the actual R130 hijack shape) - the name
// still has no attribution marker in front of it, so it correctly still fires.
// R17 FIX (see _BA_MONITORING_ALERTS_STATE.md R17 finding): R16's 3-token lookback let ANY
// occurrence of a marker within 3 tokens before the name count as attribution, without checking
// the marker actually grammatically governs the name. Confirmed real: "Zal ik dit voor je
// bevestigen, Sophie?" is a completely generic customer-service sentence with zero real
// attribution, yet "voor" sits at distance 3 from "Sophie" and wrongly suppressed a genuine
// hijack alert. This is the 4th refinement of this exact function (R11 substring, R12 substring,
// R14 word-boundary, R16 attribution-position with slack). Rather than another lookback-tuning
// pass, this tightens the rule's SHAPE to zero slack: the marker must be the token IMMEDIATELY
// before the name (distance 1), e.g. "van Wil"/"voor Wil"/"of Wil"/"for Wil" - not "voor je
// bevestigen, Sophie" where filler words sit between the marker and the name. Verified against
// every existing Check C fixture in monitoringAlerts.test.ts (R11/R13/R15 sections): every real
// attribution shape in this codebase's own templates ("de afspraak van ${name}", "op naam van
// ${name}", "geboekt worden voor ${name}") already places the marker directly adjacent to the
// name with no filler word between, so zero-slack does not reopen any prior round's fixture.
const ATTRIBUTION_MARKERS = new Set(["van", "voor", "of", "for"]);

function nameIsAttributedInReply(normalizedReply: string, nameToken: string): boolean {
  // Strip residual leading/trailing punctuation per token (e.g. "Wil?" / "(Wil)" / "Wil,") so
  // position-based comparison still recognizes the name; normalizedReply is already lowercased/
  // diacritic-stripped by normalizeNameForCompare, so nameToken (same normalization) compares
  // case/diacritic-insensitively.
  const tokens = normalizedReply
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""));
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] !== nameToken) continue;
    const idx = i - 1;
    if (idx < 0) continue;
    if (ATTRIBUTION_MARKERS.has(tokens[idx])) return true;
  }
  return false;
}

function replyProperlyAttributesDisclosedName(
  replyText: string | null | undefined,
  disclosedName: string,
): boolean {
  if (!replyText) return false;
  const normalizedReply = normalizeNameForCompare(replyText);
  const tokens = normalizeNameForCompare(disclosedName)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.some((t) => nameIsAttributedInReply(normalizedReply, t));
}

export interface ThreadHijackReadOnlyDisclosureTurnCtx {
  toolCalls: MonitoringToolCall[];
  knownSelfName: string | null | undefined;
  // R11 GAP A FIX: see the block comment above `replyProperlyAttributesDisclosedName`.
  finalReplyText?: string | null;
}

export interface ThreadHijackReadOnlyDisclosureAlert {
  failure_class: "thread_hijack_readonly_disclosure";
  known_self_name: string;
  disclosed_name: string;
}

export function detectThreadHijackReadOnlyDisclosure(
  ctx: ThreadHijackReadOnlyDisclosureTurnCtx,
): ThreadHijackReadOnlyDisclosureAlert | null {
  if (!isRealName(ctx.knownSelfName)) return null;
  const selfName = String(ctx.knownSelfName);
  for (const t of ctx.toolCalls) {
    if (!READ_ONLY_APPOINTMENT_TOOLS.has(t.name)) continue;
    const r = t.result;
    if (!r || typeof r !== "object") continue;
    const appts = (r as Record<string, unknown>).appointments;
    if (!Array.isArray(appts)) continue;
    for (const a of appts) {
      if (!a || typeof a !== "object") continue;
      const name = (a as Record<string, unknown>).customer_name;
      if (!isRealName(name)) continue;
      const nameStr = String(name);
      if (normalizeNameForCompare(nameStr) === normalizeNameForCompare(selfName)) continue;
      // R11 GAP A FIX: the reply DID properly attribute the disclosed name (the GEDEELD NUMMER
      // design working as intended, e.g. "de afspraak van R112ProofX") - benign, never alert.
      if (replyProperlyAttributesDisclosedName(ctx.finalReplyText, nameStr)) continue;
      return {
        failure_class: "thread_hijack_readonly_disclosure",
        known_self_name: selfName,
        disclosed_name: nameStr,
      };
    }
  }
  return null;
}

function extractReferencedBookingId(toolCalls: MonitoringToolCall[]): string | null {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (!MUTATION_OWNER_TOOLS.has(t.name)) continue;
    const r = t.result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.ok === true && typeof rec.booking_id === "string") return rec.booking_id;
  }
  return null;
}

export interface ThreadHijackWrongOwnerAlert {
  failure_class: "thread_hijack_wrong_owner";
  referenced_booking_id: string;
  booking_owner_phone: string | null;
  current_phone: string;
}

// Check B: direct DB-level ownership check. Reads the booking id straight off the tool RESULT
// object (never parsed from prose), then a single read-only select confirms whether the row it
// mutated actually belongs to the phone number that owns THIS conversation. See the file header
// for why this compares `customer_phone` rather than the design doc's assumed `contact_id`
// (that column does not exist on `bookings`; phone is the schema's real identity key).
export async function detectThreadHijackWrongOwner(
  supabase: SupabaseClient,
  toolCalls: MonitoringToolCall[],
  currentPhone: string | null | undefined,
): Promise<ThreadHijackWrongOwnerAlert | null> {
  if (!currentPhone) return null;
  const bookingId = extractReferencedBookingId(toolCalls);
  if (!bookingId) return null;
  const { data, error } = await supabase
    .from("bookings")
    .select("customer_phone")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) return null;
  const ownerPhone = (data as { customer_phone?: string | null }).customer_phone ?? null;
  if (ownerPhone && ownerPhone !== currentPhone) {
    return {
      failure_class: "thread_hijack_wrong_owner",
      referenced_booking_id: bookingId,
      booking_owner_phone: ownerPhone,
      current_phone: currentPhone,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage: fire-and-forget insert, never throws
// ---------------------------------------------------------------------------

export interface MonitoringAlertRow {
  failure_class: string;
  conversation_id: string | null;
  contact_phone: string | null;
  turn_id: string | null;
  details: Record<string, unknown>;
  detected_by?: string;
}

// Deliberately swallows every error. A monitoring-write failure must NEVER surface to, block, or
// delay the real customer-facing turn - the only acceptable side effect of a bug in this file is a
// missing alert row, never a broken reply.
export async function writeMonitoringAlert(supabase: SupabaseClient, row: MonitoringAlertRow): Promise<void> {
  try {
    await supabase.from("monitoring_alerts").insert({
      failure_class: row.failure_class,
      conversation_id: row.conversation_id,
      contact_phone: row.contact_phone,
      turn_id: row.turn_id,
      details: row.details,
      detected_by: row.detected_by ?? "in_turn",
    });
  } catch (_e) {
    // best-effort only, see header
  }
}
