// R102 IDENTITY DISAMBIGUATION GUARD (generalizes update_booking_name's R76
// CROSS-IDENTITY-RENAME guard to cancel_appointment + reschedule_appointment, and to
// resolveTarget() itself).
//
// ROOT CAUSE (R101 + its verify round, evidence/IUX_r101.md + IUX_r101_verify.md): phone number
// is the SOLE identity key end-to-end (no attendee-name field anywhere in the schema).
// resolveTarget()/get_my_appointments scope only by phone+calendar, NEVER by attendee name, and
// the conversational surface (previews, disambiguation prompts, confirmations) never disclosed
// whose name a candidate booking was under. On a phone shared by multiple real people (family,
// small office), this let a second, unnamed (or differently-named) person on the same phone:
//   1. be shown a DIFFERENT person's real booking as if it were their own (R101-1),
//   2. silently RESCHEDULE that other person's real booking (R101-2),
//   3. CANCEL that other person's real booking via a service+time-only disambiguation prompt
//      that never named who it belonged to (R101-3, the worst finding),
//   4. have their OWN explicitly-stated third-party name ("cancel Anna's appointment") silently
//      DROPPED from the confirmation and final reply (verify-round finding 1),
//   5. have NEAR-IDENTICAL names ("Anne" vs "Anna") collide with zero name-distinction in the
//      disambiguation prompt, letting one cancel the other's real booking (verify-round finding 2).
//
// FIX SHAPE (mirrors the ALREADY-PROVEN R76 rename guard, not a new invented mechanism):
// - `extractStatedNameForBooking`: a small, STRICT (non-fuzzy) name matcher. Given the candidate
//   bookings' own `customer_name` values and the customer's raw current message, finds whether the
//   customer named ONE of those specific people BY NAME in their own message (substring/word-level
//   match against each candidate's real, distinct first name). Deliberately conservative: "Anne"
//   must NEVER match "Anna" (near-identical names must still fall through to disambiguation, never
//   silently auto-pick); this only matches an EXACT (case/diacritic-insensitive) whole-word
//   occurrence of a candidate's actual stored name (or its first token) in the message, never a
//   fuzzy/edit-distance match. If more than one distinct candidate name is mentioned, or none is,
//   this returns null (ambiguous / no signal) rather than guessing.
// - `nameSuffix`: a small renderer so a disambiguation list ALWAYS includes each candidate's own
//   customer_name (not just service+time), so a customer choosing between two options can see
//   whose booking each one is, closing R101-3/finding-2's silent-collision gap even before any
//   verification gate below engages.
// - `crossIdentityActionRisk`: the SAME two-condition test as R76's crossIdentityRisk
//   (>=2 total candidates under the phone AND the target booking's own customer_name is a real,
//   distinct name that differs from the name the CURRENT speaker has stated about themselves this
//   turn/conversation), generalized so cancel_appointment/reschedule_appointment can reuse it via
//   their own `pending_*_verification` markers (index.ts computes the confirm signal exactly like
//   ctx.confirmRenameVerification, same AFFIRM_RE/NEGATE_RE/ambiguousConfirm/15-minute-freshness
//   pattern; tools.ts stores/consumes the marker, mirroring update_booking_name's own code exactly).
//
// This is deterministic, code-level, NOT a prompt instruction: prompt-only steering has repeatedly
// proven unreliable against this model at this scale (OWNERESCALATION-VERBLIST-BRITTLE,
// AFFIRM-CONFIRM's 9 recurrences, R75/R76's own rename-hijack history). A small model's inference
// about "who is this booking for" or "does the customer want this specific booking touched" is not
// a safe transaction boundary; only a raw-message, code-level check is.

export interface NamedCandidate {
  id: string;
  customerName?: string | null;
}

// Same bar as tools.ts's various isRealName() helpers (kept independent/duplicated on purpose,
// matching every other guard module's independence, no cross-file coupling).
export function isRealName(n: unknown): boolean {
  const t = String(n ?? "").trim().toLowerCase();
  return t !== "" && t !== "privé" && t !== "prive";
}

// Normalize for STRICT comparison: trim, lowercase, strip diacritics (cafe/Anna stays Anna),
// collapse internal whitespace. Deliberately does NOT do any fuzzy/edit-distance matching; that is
// the exact thing that would make "Anne" match "Anna" and reopen finding 5.
function normName(n: string): string {
  return n
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .trim().toLowerCase().replace(/\s+/g, " ");
}

// The first "real" name token of a stored customer_name ("Anna emoji de Vries" -> "anna"; "Anna"
// -> "anna"). Bookings store the customer's FULL typed name verbatim (tools.ts book_appointment
// customer_name field comment: "LETTERLIJK overnemen"), but a customer referring to someone by
// name in conversation almost always uses just the first name ("cancel Anna's appointment", never
// the full multi-part name), so matching is done against the leading token.
function firstNameToken(customerName: string): string {
  const norm = normName(customerName);
  const firstWord = norm.split(" ").find((w) => /\p{L}/u.test(w));
  return firstWord ?? norm;
}

// Whole-word, case/diacritic-insensitive search for `needle` inside `haystack`. Whole-word only
// (not a bare substring) so "Anna" never matches inside an unrelated longer word, and so "Anne"
// (4 letters) can never accidentally satisfy as a substring of a longer name. Uses a Unicode-aware
// word boundary (no letter immediately before/after the match).
function containsWholeWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const normHaystack = normName(haystack);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(normHaystack);
}

// STRICT name-match: does the customer's raw message explicitly name ONE of the candidate
// bookings' own customer_name (by its first-name token)? Returns the SINGLE matching candidate's
// id, or null when zero or MORE THAN ONE distinct candidate name is mentioned (never guesses
// between two real, distinct name-mentions; that is a genuine ambiguity, not a resolvable hint).
// Near-identical names ("Anne" vs "Anna") are two DIFFERENT normalized strings and two different
// whole-word matches, so a message naming "Anne" will not satisfy "Anna"'s pattern or vice versa;
// this is the exact guarantee finding 5 needs: near-identical names must still require
// disambiguation, never silently collide.
export function extractStatedNameForBooking(
  candidates: NamedCandidate[],
  rawMessage: string | undefined | null,
): string | null {
  const msg = String(rawMessage ?? "");
  if (!msg.trim()) return null;
  const matchedIds = new Set<string>();
  const seenNames = new Set<string>(); // dedupe: 2 candidates sharing the SAME real name count once
  for (const c of candidates) {
    if (!isRealName(c.customerName)) continue;
    const name = String(c.customerName).trim();
    const token = firstNameToken(name);
    if (!token || token.length < 2) continue; // guard against a junk 1-letter token
    const normKey = normName(name);
    if (containsWholeWord(msg, token)) {
      matchedIds.add(c.id);
      seenNames.add(normKey);
    }
  }
  // Only a signal when exactly ONE candidate matched, OR multiple candidates matched but they all
  // share the exact same real name (e.g. two bookings both under "Anna": matching either is fine,
  // pick the first since resolveTarget's own hint-narrowing already prefers the strongest hint).
  if (matchedIds.size === 0) return null;
  if (seenNames.size > 1) return null; // 2+ DISTINCT names mentioned, genuinely ambiguous, don't guess
  return [...matchedIds][0];
}

// R103 (GAP 2, STALE-VERIFICATION-MARKER-ON-RAPID-NAME-CORRECTION fix): the SAME 2+-distinct-name
// detection extractStatedNameForBooking already performs internally (then discards, returning null
// for both the "0 names" and "2+ names" cases), exposed as its own named signal. Live-reproduced
// (R103): when a customer corrects themselves mid-flow ("nee wacht, niet Dennis, ik bedoelde
// Ellen's afspraak" / "ja graag ellen dennis"), this is true, and MUST invalidate any
// pending_cancel_verification/pending_reschedule_verification marker left over from a PRIOR turn
// (which still points at whichever candidate the FIRST message named, e.g. Dennis) rather than
// letting that stale marker's identity silently carry forward into this turn's re-disambiguation.
// Deliberately independent of extractStatedNameForBooking's own return value: a caller cannot
// distinguish "0 names" from "2+ names" from a bare null, but the two cases need OPPOSITE
// marker-handling (0 names: the stale marker may still be exactly what's being answered, keep it;
// 2+ names: the marker is now stale, drop it and re-disambiguate fresh from this message).
export function hasMultipleDistinctNamesStated(
  candidates: NamedCandidate[],
  rawMessage: string | undefined | null,
): boolean {
  const msg = String(rawMessage ?? "");
  if (!msg.trim()) return false;
  const seenNames = new Set<string>();
  for (const c of candidates) {
    if (!isRealName(c.customerName)) continue;
    const name = String(c.customerName).trim();
    const token = firstNameToken(name);
    if (!token || token.length < 2) continue;
    if (containsWholeWord(msg, token)) {
      seenNames.add(normName(name));
    }
  }
  return seenNames.size > 1;
}

// Disambiguation-list rendering: ALWAYS includes each candidate's own name when it is a real,
// distinct name, so "who is whose" is disclosed before any pick is made (closes R101-3/finding-2's
// silent-collision gap independent of whether the cross-identity verification gate below also
// fires). A candidate with no real name (placeholder "Prive"/empty) is rendered without a name
// suffix, matching the existing behaviour for the common (non-shared-phone) single-attendee case.
export function nameSuffix(customerName?: string | null): string {
  return isRealName(customerName) ? ` (op naam ${String(customerName).trim()})` : "";
}

// The core cross-identity name-mismatch test: is the resolved target booking's own customer_name
// a REAL, distinct name that differs from the name the CURRENT speaker has stated about
// themselves (knownSelfName: the tenant-scoped "booking_name" this conversation has on file, i.e.
// the same signal book_appointment already uses as the default booking name, see index.ts
// scopedName/knownName)? When the speaker has stated NO name of their own yet, this is null and
// the check fires on any real name mismatch too (a second, unnamed person is exactly
// R101-1/R101-2/R101-3's trigger shape: "the account's own next appointment" auto-pick with zero
// name check, reproduced live on a SINGLE booking, not just 2+; R101-2's silent reschedule
// happened with exactly ONE booking on the phone). Same-person spelling/case variants of what the
// speaker already told us about themselves are NOT a risk (R76's own carve-out, same-name
// compare, never fuzzy).
function nameMismatch(
  targetCustomerName: string | null | undefined,
  knownSelfName: string | null | undefined,
): boolean {
  if (!isRealName(targetCustomerName)) return false;
  const targetNorm = normName(String(targetCustomerName));
  const selfNorm = isRealName(knownSelfName) ? normName(String(knownSelfName)) : null;
  if (selfNorm !== null && selfNorm === targetNorm) return false;
  return true;
}

// update_booking_name's ORIGINAL R76 gate, UNCHANGED: additionally requires totalCandidates >= 2
// (a rename is corrective/low-frequency and R76 was deliberately scoped to the genuine
// multi-booking shared-phone shape only, to keep the common single-booking self-rename/typo-fix
// case completely frictionless). Kept as its own export so update_booking_name's exact, already-
// shipped, already-proven behaviour is never altered by this round's generalization.
export function crossIdentityRenameRisk(
  totalCandidates: number | undefined,
  targetCustomerName: string | null | undefined,
  knownSelfName: string | null | undefined,
): boolean {
  if ((totalCandidates ?? 0) < 2) return false;
  return nameMismatch(targetCustomerName, knownSelfName);
}

// R102: the WIDER gate for cancel_appointment/reschedule_appointment. Unlike rename,
// R101-2 (silent reschedule) and the reproducible "shown someone else's only booking as your own"
// shape (R101-1) both fired with EXACTLY ONE booking on the phone, so cancel/reschedule cannot
// safely require totalCandidates >= 2: a destructive action on the account's ONLY booking, by
// someone whose stated identity does not match that booking's name, is exactly the risk. This is
// pure name-mismatch, independent of candidate count. totalCandidates is accepted for parity with
// crossIdentityRenameRisk's signature and potential future tuning, but not currently gated on.
export function crossIdentityActionRisk(
  totalCandidates: number | undefined,
  targetCustomerName: string | null | undefined,
  knownSelfName: string | null | undefined,
): boolean {
  void totalCandidates;
  return nameMismatch(targetCustomerName, knownSelfName);
}

// R102 DETERMINISTIC DISCLOSURE BACKSTOP for get_my_appointments (mirrors this codebase's own
// established pattern, e.g. refundGuard.ts/priceGuard.ts: a hard correctness guarantee belongs in
// CODE, not in trusting the model to follow a prompt instruction). Live-tested this round: even
// with a pre-composed 'message' field AND an explicit 'guidance' instruction in the tool result,
// gpt-oss-20b repeatedly still said "je afspraak"/"your appointment" for a SINGLE booking whose
// name differs from the current speaker (R101-1's exact single-booking shape), while it DID
// relay correctly for a 2+-item list. Rather than trust prompt-following, this runs AFTER the
// model drafts its reply (mirrors the other prose-guard call sites in index.ts): given the RAW
// get_my_appointments result (appointments carrying an optional customer_name) and the drafted
// reply, if any appointment has a real, distinct name AND the reply's prose contains a bare
// "je/jouw afspraak" (or "your appointment") phrase WITHOUT that name anywhere in the reply, the
// reply is rewritten to the deterministic, name-disclosing sentence built straight from the real
// data. No-op when every appointment's name is already present in the reply (a correct disclosure
// must never be second-guessed/altered) or when no appointment carries a real name at all (the
// common non-shared-phone case, byte-identical behaviour).
export interface AppointmentForDisclosure {
  service?: string | null;
  when: string;
  customer_name?: string | null;
}
// R107 (DISCLOSURE-BACKSTOP-COVERAGE-GAP fix): the ORIGINAL regex only matched a bare "je/jouw
// ... afspra(a)k(en)" or "your ... appointment(s)" phrase, i.e. it REQUIRED the literal word
// "afspraak(en)"/"appointment(s)" to appear. Live-diagnosed gap: gpt-oss-20b routinely answers a
// get_my_appointments question WITHOUT ever using that word at all, e.g. "je staat op maandag
// 10:00 ingepland", "je bent ingepland op donderdag", "jouw moment is vrijdag 14:00", "you're
// booked in for Monday at 10". Every one of these is the EXACT same undisclosed-possessive shape
// the backstop exists to catch (a "je/jouw"/"your" claim of ownership over a booking that may not
// be the current speaker's own), just phrased without the trigger word, so they silently bypassed
// the whole mechanism. Widened to a SECOND alternative: any "je/jouw"/"your"/"you're" possessive
// reference followed (within a short window, allowing a day/time/prepositional phrase in between)
// by a scheduling verb/participle (staat/bent/zit + ingepland/gepland/ingeboekt, "moment is", or EN
// "booked (in)"/"scheduled"), independent of whether "afspraak"/"appointment" ever appears. Kept as
// an OR alongside the original literal-word pattern (byte-identical behaviour preserved for every
// case the original already caught); this only ADDS coverage, never narrows it.
const BARE_MY_APPOINTMENT_RE =
  /\b(je|jouw)\b[^.!?]{0,15}\bafspra(a?k|ken)\b|\byour\b[^.!?]{0,15}\bappointments?\b|\b(je|jouw)\b[^.!?]{0,10}\b(staat|bent|zit)\b[^.!?]{0,30}\b(ingepland|gepland|ingeboekt)\b|\bjouw\b[^.!?]{0,10}\bmoment\b[^.!?]{0,10}\bis\b|\b(you'?re|your)\b[^.!?]{0,20}\b(booked( in)?|scheduled)\b/i;
// R107 (NO-FRESH-TOOL-CALL coverage gap): exposes the exact same "does this reply claim a bare
// possessive booking" test the rewrite path below already gates on, as its OWN named predicate, so
// a caller (index.ts) can decide whether to run a FALLBACK DB re-check when get_my_appointments was
// NOT called this turn at all (the model answered a follow-up purely from its own prior-turn
// context memory, e.g. "en hoe laat ook alweer?" after an earlier get_my_appointments turn). Without
// this, the whole disclosure mechanism (model-prompted AND deterministic) is structurally never
// invoked on such a turn, since enforceAppointmentNameDisclosure only ever runs against THIS turn's
// fresh tool result. Deliberately the SAME regex, not a new one: the risk shape (a bare "je/jouw
// afspraak"-style ownership claim) is identical whether or not a tool ran this turn.
export function mentionsOwnAppointmentClaim(replyText: string): boolean {
  return !!replyText && BARE_MY_APPOINTMENT_RE.test(replyText);
}
export function enforceAppointmentNameDisclosure(
  replyText: string,
  appointments: AppointmentForDisclosure[] | undefined,
  language: string | null | undefined,
): string {
  if (!replyText || !appointments || appointments.length === 0) return replyText;
  const named = appointments.filter((a) => isRealName(a.customer_name));
  if (named.length === 0) return replyText; // nothing to disclose, common case, untouched
  // Already disclosed correctly: every named appointment's name appears somewhere in the reply.
  const allNamesPresent = named.every((a) => containsWholeWord(replyText, firstNameToken(String(a.customer_name))));
  if (allNamesPresent) return replyText;
  // Only rewrite when the reply actually uses a possessive "your appointment(s)" phrasing without
  // the name; a reply that already reads oddly/differently is left alone (conservative, no-op bias).
  if (!BARE_MY_APPOINTMENT_RE.test(replyText)) return replyText;
  const isEN = typeof language === "string" && /english/i.test(language);
  const lines = appointments.map((a) => {
    const svc = a.service ?? (isEN ? "appointment" : "afspraak");
    const nm = isRealName(a.customer_name) ? (isEN ? ` (under the name ${a.customer_name})` : ` (op naam ${a.customer_name})`) : "";
    return isEN ? `${svc} on ${a.when}${nm}` : `${svc} op ${a.when}${nm}`;
  });
  if (appointments.length === 1) {
    return isEN ? `There is an appointment: ${lines[0]}.` : `Er staat een afspraak: ${lines[0]}.`;
  }
  return isEN ? `There are multiple appointments: ${lines.join("; ")}.` : `Er staan meerdere afspraken: ${lines.join("; ")}.`;
}
