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

// R120 (BOOK-COMMIT-FIRST-MESSAGE-FALSE-POSITIVE fix, live-reproduced 6/6 deterministic on the S6
// testpad, e.g. phone 31600001701/31600001702): book_appointment's commit gate (tools.ts) calls
// crossIdentityActionRisk the SAME way cancel/reschedule/rename do, comparing the PENDING
// PREVIEW's own customer_name against ctx.knownSelfName. That comparison is safe for cancel/
// reschedule/rename because their `targetCustomerName` always comes from a REAL, independent
// bookings-table row (resolveTarget()'s `b.customer_name`), i.e. a genuine fact about someone who
// might be a different real person than whoever is currently texting. book_appointment's own
// pending_booking.customer_name is structurally NOT that: on a brand-new customer's very first
// message, it is populated straight from THIS SAME conversation's own args.customer_name (see
// tools.ts's rawName/customerName derivation), i.e. it is simply what the CURRENT speaker just
// said about themselves. ctx.knownSelfName (index.ts's knownName) is null in that exact shape not
// because a genuine OTHER identity is on file, but because nothing has EVER been captured into
// convContext.booking_name yet (booking_name is only ever written by a SEPARATE update_lead tool
// call the model makes at its own discretion, which live testing shows it routinely skips when
// the name arrives bundled with the booking request itself, see evidence). nameMismatch's own
// documented behaviour (null self vs ANY real target name = mismatch) is exactly right for
// cancel/reschedule/rename's real-third-party-row case; for book_appointment it produces a
// deterministic false positive on the single most common first-contact phrasing ("Hoi, ik ben
// Chris, boek ... vrijdag 13:00"), forcing an unresolvable naam_verificatie_nodig loop (see
// crossIdentityBookVerificationBypass below for why it never actually resolves either).
//
// FIX: book_appointment gets its OWN risk predicate, requiring one more condition beyond
// nameMismatch before it fires: genuine PRIOR IDENTITY EVIDENCE must exist for this phone, either
// (a) a real booking already exists for this phone under this business (any calendar in the
// owner's allowlist, any status/time, even a past/cancelled booking is proof a DIFFERENT real
// person may have used this phone before), or (b) ctx.knownSelfName is itself a REAL, actually-
// established name (not null) that conflicts with the preview's name (the genuine "phone handed to
// someone else between preview and confirm" shape R107 was built for). When NEITHER holds:
// nobody has ever booked on this phone before AND nothing has ever been captured about who is
// texting, the preview's name cannot be anyone but the current speaker's own self-declared
// identity, so there is nothing to be in conflict WITH, and the guard must not fire. This never
// weakens the real R101/R107 protection: a genuine shared-phone case always has EITHER a real
// prior booking (satisfying condition a) OR an already-established knownSelfName from an earlier
// turn in the SAME conversation (satisfying condition b) by the time a second, conflicting name
// shows up; it is only the impossible-to-satisfy "null vs the name I just gave you, in the exact
// message that gave it" case that this additionally excludes.
export function crossIdentityBookRisk(
  targetCustomerName: string | null | undefined,
  knownSelfName: string | null | undefined,
  priorRealIdentityExists: boolean,
): boolean {
  if (!nameMismatch(targetCustomerName, knownSelfName)) return false;
  // A mismatch against a REAL, already-established knownSelfName is always a genuine risk,
  // independent of prior-booking history (the phone-handoff-mid-flow shape: the SAME conversation
  // already told us who is texting, via an earlier update_lead call or an earlier real booking on
  // file, and THIS preview's name now conflicts with that). nameMismatch only reaches this line
  // with a real target name, so isRealName(knownSelfName) alone decides whether the mismatch is
  // against a genuine established identity or against nothing (null) at all.
  if (isRealName(knownSelfName)) return true;
  // knownSelfName is null: the ONLY remaining question is whether a genuine OTHER identity could
  // exist on this phone at all. No prior real booking under this business, on any calendar, ever
  // -> the preview's name is definitionally the current speaker's own self-declared name, not a
  // third party; no risk. A prior real booking existing (even under the SAME name, even long
  // expired/cancelled) means a genuine identity is already on file for this phone that this
  // conversation simply has not re-confirmed yet this turn, so the mismatch stays live.
  return priorRealIdentityExists;
}

// R120 (continued): the customer's OWN current message explicitly names the SAME person the
// pending preview already has, the strongest, most specific evidence of genuine intent this
// codebase has (stronger than a bare "ja", which hardConfirmGate.ts's finite allow-list otherwise
// requires): reuses the exact containsWholeWord/firstNameToken matcher identityVerificationResolved
// already trusts for releasing a naam_verificatie_nodig marker. Exposed as its own named predicate
// so tools.ts's commit gate can accept EITHER ctx.hardConfirm's generic bare-affirm allow-list OR
// this narrower, equally-deterministic "explicitly named the target" signal, instead of requiring
// the customer to somehow satisfy a bare-affirm pattern AND restate a name in the same breath (a
// structural catch-22 live-reproduced on the S6 testpad: "Ja, echt boeken voor Chris" fails
// hardConfirm's finite allow-list on the extra content, but a bare "ja" alone can never satisfy
// identityVerificationResolved's name-match requirement, so NEITHER path alone can ever resolve a
// real verification question once one has fired). Deliberately requires the SAME clean-affirm
// signals (AFFIRM_RE/!NEGATE_RE/!ambiguousConfirm) the rest of this file's release logic already
// requires, via the caller passing ctx.confirmBookVerification (computed in index.ts exactly like
// confirmCancelVerification/confirmRescheduleVerification): this function only adds the "which
// hard-gate-shaped commit is this allowed to satisfy" wiring, it does not relax any existing
// affirm-cleanliness check.
export function crossIdentityBookVerificationBypass(confirmBookVerification: boolean | undefined): boolean {
  return confirmBookVerification === true;
}

// R120 (continued, closes the SECOND half of the catch-22): crossIdentityBookVerificationBypass
// only ever helps AFTER a naam_verificatie_nodig marker has already fired once. Live-reproduced on
// the S6 testpad, phone 31600001703: on the common, NEVER-at-risk path (crossIdentityBookRisk
// correctly returns false, no marker is ever written), a customer who bundles their own
// confirmation with their own name in one message ("Ja, echt boeken voor Chris") still fails
// ctx.hardConfirm's finite bare-affirm allow-list on the extra content, and falls through to a
// silent re-preview instead of committing (a bare "ja" on the VERY NEXT turn does correctly commit,
// so this is not a re-opened deadlock, just an avoidable extra round-trip on an already-
// unambiguous message). Same underlying insight as the verification-bypass above, generalized: a
// message that is a clean affirm (AFFIRM_RE/!NEGATE_RE/!ambiguousConfirm, the SAME cleanliness bar
// every commit-driving signal in this codebase already requires) AND explicitly names the SAME
// person the still-pending preview already has, is at least as strong evidence of genuine confirm
// intent as a bare "ja" on hardConfirmGate.ts's own allow-list; there is no real ambiguity left to
// protect against by making the customer say it twice. Reuses the exact containsWholeWord/
// firstNameToken matcher every other name-match check in this file already trusts. Deliberately
// narrow: only ever consulted by book_appointment's own commit gate, only ever compared against
// THIS SAME turn's own still-pending preview (never a marker, never a different booking), so it
// can never be satisfied by an unrelated message naming an unrelated person.
export function messageNamesPendingBookOwner(
  pendingCustomerName: string | null | undefined,
  rawMessage: string | undefined | null,
): boolean {
  if (!isRealName(pendingCustomerName)) return false;
  const token = firstNameToken(String(pendingCustomerName));
  if (!token || token.length < 2) return false;
  return containsWholeWord(String(rawMessage ?? ""), token);
}

// R122 (STRUCTURAL FAIL-CLOSED REDESIGN of R121's own isConfirmShapedMessage discriminator,
// live-reproduced with DB proof on the S6 testpad, fresh fixtures 31600001901/31600001902):
// R121's fix asked "is THIS message confirm-shaped" (isConfirmShapedMessage, an AFFIRM_RE-vs-
// NEGATE_RE token check) before ever consulting takeover risk, and skipped the whole
// verification path when it wasn't. Its own 2-lens verify round found this is trivially walkable
// two ways, BOTH live-reproduced to a real committed booking under a total stranger's name with
// ZERO verification marker ever created:
//   1. an IMPERATIVE phrasing outside the AFFIRM/NEGATE token lists at all ("Zet maar op Bram",
//      "Kan dit voor Bram?", "Doe maar Bram") -- isConfirmShapedMessage returns false (neither
//      regex matches), so previewTakeoverRisk short-circuited to false and the re-preview +
//      later bare "ja" committed silently under "Bram", a name with zero relation to the
//      original "Anna".
//   2. a NEGATE-shaped phrasing ("Nee wacht, doe het voor Otto") matches REPREVIEW_NEGATE_RE,
//      so isConfirmShapedMessage ALSO returns false here (by construction: NEGATE and AFFIRM are
//      mutually exclusive in that function) and was UNCONDITIONALLY TRUSTED as a same-speaker
//      typo-fix, with NO check that "Otto" resembles the original "Nora" at all -- the exact
//      opposite of a safety net, since a "Nee wacht"-shaped message is precisely the phrasing a
//      genuine typo-correction ALSO uses ("nee wacht, Ana niet Anna"), so this discriminator
//      could never tell the honest case from the theft.
//
// ROOT CAUSE: message CONTENT-SHAPE (does it look like an affirm or a negate) was being used as a
// proxy for "is this a genuine same-speaker correction," but shape says nothing about WHO is
// speaking or whether the new name is even related to the old one. A third real person can phrase
// a takeover as an imperative (sidestepping the shape check entirely) or as a negate (satisfying
// the WRONG half of the check, since negate was wrongly treated as auto-safe).
//
// FIX SHAPE (mandated structural rebuild, not a 3rd word/phrase list): flip the default from
// fail-OPEN (trust unless flagged negate-and-something) to FAIL-CLOSED (block unless PROVEN
// same-speaker). ANY re-preview message that proposes a name conflicting with originator_name is
// now takeover-risk BY DEFAULT, regardless of its shape (affirm/negate/imperative/anything else).
// The ONLY way to suppress the verification requirement is when BOTH hold:
//   (a) the message contains an explicit CORRECTION MARKER (nee/niet/wacht/typo/ik bedoel/
//       verkeerd -- a keyword list is fine here since it only gates a NARROWING condition, never
//       the sole safety mechanism); AND
//   (b) the new name is genuinely SIMILAR to originator_name via a REAL computed string-
//       similarity score (normalized Levenshtein edit distance, see nameSimilarity below), not
//       another hardcoded list of "acceptable" name pairs.
// A name sharing no meaningful similarity with the original (Nora -> Otto) can NEVER be treated
// as a same-speaker correction, no matter what marker words surround it -- closing exploit #2
// precisely. An imperative phrasing naming a DISSIMILAR person never had a correction marker to
// begin with, so it also always fails closed -- closing exploit #1. A genuine typo/nickname fix
// ("nee wacht, Ana niet Anna") has BOTH a correction marker AND high similarity, so it stays
// exactly as frictionless as before.
//
// Deliberately does NOT special-case imperative phrasings as a "third confirm shape": a stricter
// fail-closed design intentionally does not accept imperative phrasing ALONE (with no correction
// marker) as proof of same-speaker intent, even naming a similar/nickname variant of the
// original -- imperative wording ("zet maar op Ana") is exactly as available to a genuine second
// person taking over politely as to the original speaker correcting themselves, so it earns no
// special trust; only the explicit-correction-marker path (condition a) is ever allowed to narrow
// the fail-closed default, matching this file's existing standing rule (clarify over guess).
function normNameForSimilarity(n: string): string {
  return normName(n).replace(/[^\p{L}\p{N}]/gu, "");
}

// Iterative (non-recursive, O(len_a * len_b) time / O(min(len_a,len_b)) space) Levenshtein edit
// distance between two strings. Standard single-row DP; no external dependency, deterministic,
// fast enough for short name-length strings (this file's existing "deterministic guard over model
// judgment for identity-critical decisions" doctrine, see top-of-file comment).
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Ensure `a` is the shorter string, so the DP row is as small as possible.
  if (a.length > b.length) [a, b] = [b, a];
  let prevRow = new Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) prevRow[i] = i;
  for (let j = 1; j <= b.length; j++) {
    const currRow = new Array(a.length + 1);
    currRow[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[i] = Math.min(
        prevRow[i] + 1, // deletion
        currRow[i - 1] + 1, // insertion
        prevRow[i - 1] + cost, // substitution
      );
    }
    prevRow = currRow;
  }
  return prevRow[a.length];
}

// Normalized similarity score in [0, 1]: 1 = identical, 0 = completely dissimilar (edit distance
// >= the longer string's own length). Compares the first-name TOKEN of each (same "customer
// mentions someone by first name" convention every other matcher in this file already uses), on
// the SAME diacritic/case-insensitive normalized form containsWholeWord's callers already rely
// on. Empty-vs-empty is defined as maximally similar (1) so callers never divide by zero; either
// side actually being empty in practice is already excluded upstream by isRealName checks.
export function nameSimilarity(nameA: string, nameB: string): number {
  const a = normNameForSimilarity(firstNameToken(nameA));
  const b = normNameForSimilarity(firstNameToken(nameB));
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a, b);
  return 1 - dist / maxLen;
}

// The threshold above which two names are considered "genuinely similar" for same-speaker-
// correction purposes. Picked from the proven boundary corpus this round's own test suite pins:
//   - "Anna" -> "Ana"   : distance 1, len 4 -> similarity 0.75  (must PASS, genuine typo-fix)
//   - "Anne" -> "Anna"  : distance 1, len 4 -> similarity 0.75  (must PASS, R101's own near-
//                         identical-name pair; NOTE this predicate is only ever consulted for
//                         the SAME-speaker-correction narrowing condition, never for
//                         extractStatedNameForBooking's disambiguation matching, which must stay
//                         strict/non-fuzzy exactly as R101 requires -- these are different
//                         functions answering different questions, see each one's own header)
//   - "Nora" -> "Otto"  : distance 4, len 4 -> similarity 0.0   (must FAIL, R121's own live-
//                         reproduced theft)
//   - "Chris"-> "Christiaan": distance 5, len 10 -> similarity 0.50 (a plausible full-name-vs-
//                         short-name pair, sitting RIGHT AT the chosen threshold, kept passing
//                         via the ">=" comparison below).
// 0.5 is a deliberately generous-but-safe cutoff: it passes every genuine near-miss/typo/
// short-name pair in this round's proof corpus while still failing any name pair that shares no
// real structural resemblance (as Nora/Otto, sharing zero characters in the same position and
// only a coincidental single trailing vowel, demonstrates).
export const NAME_SIMILARITY_THRESHOLD = 0.5;

export function namesAreSimilar(nameA: string, nameB: string): boolean {
  return nameSimilarity(nameA, nameB) >= NAME_SIMILARITY_THRESHOLD;
}

// The keyword half of condition (a): does this message contain an explicit CORRECTION MARKER?
// This is intentionally a keyword list -- per the fix-shape mandate, a keyword list is fine here
// because it only ever NARROWS the fail-closed default (a message failing to match still fails
// closed, exactly as it should), it is never the sole safety mechanism (namesAreSimilar's real
// computed similarity score is the other, mandatory half). NL+EN coverage of the correction-
// signaling vocabulary this round's own reported exploits and prior rounds' evidence use.
const CORRECTION_MARKER_RE =
  /\b(nee|neen|no|niet|wacht|toch niet|verkeerd|fout|typo|ik bedoel(de)?|i mean|meant|correction|actually|sorry|ipv|in plaats van|instead of|liever)\b/i;

export function hasCorrectionMarker(rawMessage: string | undefined | null): boolean {
  const msg = String(rawMessage ?? "");
  if (!msg.trim()) return false;
  return CORRECTION_MARKER_RE.test(msg);
}

// R121 (PREVIEW-TAKEOVER-VIA-NAMECHANGED fix, live-reproduced with DB proof on the S6 testpad,
// fresh fixture 31600001806, "Variation-E"): a SECOND real person on a shared/fresh phone can
// silently steal an unconfirmed book_appointment preview from whoever actually started it, and
// the booking commits under the SECOND person's name with ZERO verification ever shown, to
// anyone. Precise mechanism (tools.ts's own nameChanged/namePreviewOnly + update_lead, see their
// header comments): Person A previews under "Anna" (never confirms). Person B, same phone,
// sends "Ja, echt boeken voor Bram" BEFORE Anna ever confirms; nameChanged correctly detects the
// name conflict and re-previews under "Bram" instead of committing (R25's own fix, unchanged,
// still exactly right for a genuine same-speaker correction) -- but this re-preview branch has
// NEVER called crossIdentityBookRisk (it structurally can't: crossIdentityBookRisk needs
// ctx.knownSelfName, which book_appointment's OWN commit gate already established as the correct
// reference point, see its own header). The model then also calls update_lead({first_name:
// "Bram"}) in that SAME turn (routine live behaviour whenever a name is bundled with other
// content), which writes convContext.booking_name = "Bram" for the FIRST time this
// conversation. On the VERY NEXT turn, index.ts computes knownName fresh from convContext BEFORE
// this turn's own tools run, so ctx.knownSelfName is now "Bram" -- matching the pending preview's
// OWN name (also "Bram", from the re-preview), so crossIdentityBookRisk("Bram", "Bram", ...)
// sees NO mismatch at all and a bare "ja" commits silently. The mismatch that mattered (Bram vs
// the ORIGINAL Anna) was never checked, because by the time any check ran, both sides of the
// comparison had already been overwritten to agree with each other.
//
// ROOT CAUSE: nameChanged/namePreviewOnly only ever compares the incoming name against the
// CURRENT (possibly already-hijacked) pendingBook.customer_name, which is simply "whatever this
// same re-preview mechanism last wrote," not an independent fact about who genuinely started this
// specific booking attempt. There was no signal at all for "who did this preview originally
// belong to," so a later re-preview + update_lead pair could rewrite BOTH sides of the identity
// comparison in the same turn, closing the gap crossIdentityBookRisk exists to open.
//
// FIX SHAPE: `pending_booking` gets its own `originator_name` field (tools.ts), stamped ONCE, only
// at a booking's TRUE first preview (never a namePreviewOnly re-preview), mirroring how other
// pending markers already store their own target/owner name independent of whatever the
// conversation's shared knownSelfName later becomes (pending_book_verification/
// pending_cancel_verification/pending_reschedule_verification all already do exactly this). This
// function is consulted at the RE-PREVIEW point itself (before nameChanged is allowed to silently
// swap the stored name), comparing the NEW candidate name against the ORIGINAL originator_name,
// never against the current (possibly already-hijacked) pendingBook.customer_name.
//
// THE SAME-SPEAKER-CORRECTION VS DIFFERENT-SPEAKER-TAKEOVER DISCRIMINATOR (R122 REDESIGN):
// R121's original approach asked "is THIS message CONFIRM-shaped" (isConfirmShapedMessage below,
// kept only for backward-compat/tests, no longer consulted here) and used message SHAPE
// (affirm-vs-negate) as a proxy for "is this a genuine same-speaker correction." R121's own
// 2-lens verify + this round's live reproduction proved that proxy fails open on BOTH an
// imperative phrasing (matches neither AFFIRM nor NEGATE, so the old check silently skipped
// entirely) and a negate-shaped phrasing (WRONGLY auto-trusted as "just a correction," with no
// check that the new name resembles the original at all). Message shape says nothing about WHO
// is speaking or whether the new name is even related to the old one -- this codebase's own
// established doctrine (top-of-file comment; the whole R101-R109/R120 arc) is that a hand-rolled
// wording heuristic's BELIEF about "who is speaking" is never a safe transaction boundary.
//
// FAIL-CLOSED REDESIGN: the default for ANY re-preview message naming a person conflicting with
// originator_name is now TAKEOVER RISK, full stop, independent of message shape (affirm, negate,
// imperative, or anything else). This is intentionally the OPPOSITE default of R121's own
// fail-open design. The ONLY way to suppress the verification requirement (treat a name change as
// a genuine same-speaker correction) is when BOTH of these hold:
//   (a) hasCorrectionMarker(rawMessage) -- the message contains an explicit correction signal
//       (nee/niet/wacht/typo/ik bedoel/verkeerd/...). A keyword list is acceptable here because
//       it only ever NARROWS the fail-closed default (missing the list still fails closed); and
//   (b) namesAreSimilar(newCandidateName, originatorName) -- a REAL computed string-similarity
//       score (normalized Levenshtein, see nameSimilarity above) shows the new name genuinely
//       resembles the original, not a hardcoded "acceptable pairs" list.
// A genuine same-speaker typo/correction ("nee wacht, Ana niet Anna") has BOTH a correction
// marker AND high similarity, so it stays exactly as frictionless as before. A takeover attempt
// naming a DISSIMILAR person (Nora -> Otto) fails condition (b) even when it happens to use
// correction-shaped wording ("Nee wacht, doe het voor Otto"), closing exploit #2 precisely. An
// imperative phrasing ("Zet maar op Bram") never had a correction marker to begin with, so it
// fails condition (a) regardless of similarity, closing exploit #1 precisely. Deliberately does
// NOT grant imperative phrasing alone (even naming a similar/nickname variant) a pass: wording
// alone never proves same-speaker intent as clearly as an explicit correction marker does, and
// this file's standing rule is clarify over guess -- only the marker+similarity combination is
// ever allowed to narrow the fail-closed default.
const REPREVIEW_AFFIRM_RE =
  /(?<![\p{L}\p{N}])(ja|jaha|jawel|jazeker|yes|yep|yup|yeah|sure|ok|oke|oké|okay|prima|graag|klopt|inderdaad|akkoord|echt|zeker weten|oui|si|sí|sì|sim|genau|klar)(?![\p{L}\p{N}])/iu;
const REPREVIEW_NEGATE_RE =
  /\b(nee|neen|no|niet|wacht|toch niet|verkeerd|fout|typo)\b/i;

// Kept for backward-compat / regression pinning only: no longer consulted by previewTakeoverRisk
// (see the R122 redesign comment above for why message-shape alone was proven unsafe as the sole
// discriminator). Still exported/tested as its own well-defined predicate ("does this message
// read as an affirm and not a negate"), just no longer wired into the takeover-risk decision.
export function isConfirmShapedMessage(rawMessage: string | undefined | null): boolean {
  const msg = String(rawMessage ?? "");
  if (!msg.trim()) return false;
  return REPREVIEW_AFFIRM_RE.test(msg) && !REPREVIEW_NEGATE_RE.test(msg);
}

// The core R122 predicate (redesign of R121's own previewTakeoverRisk) book_appointment's
// re-preview path consults. `originatorName` is pending_booking's own originator_name field (the
// name captured at this booking's TRUE first preview, never overwritten by a later re-preview);
// falls back to null for any in-flight pending_booking stored before originator_name existed at
// all, in which case this predicate is conservatively skipped by the caller (tools.ts), identical
// to today's behaviour for that narrow transitional window, never a new false-positive on old
// data. `newCandidateName` is the incoming args.customer_name this turn's nameChanged already
// detected as conflicting with the CURRENT (possibly already-hijacked) pendingBook.customer_name.
//
// FAIL-CLOSED: returns true (takeover risk, verification required) by default whenever the new
// name mismatches the originator. Returns false (frictionless, no verification) ONLY when the
// message both signals an explicit correction AND the new name is genuinely similar to the
// original -- see the header comment above for the full reasoning and exploit-closure mapping.
export function previewTakeoverRisk(
  originatorName: string | null | undefined,
  newCandidateName: string | null | undefined,
  rawMessage: string | undefined | null,
): boolean {
  if (!isRealName(originatorName)) return false; // no originator on file yet (pre-fix data): skip, unchanged behaviour
  if (!nameMismatch(newCandidateName, originatorName)) return false; // new name still agrees with the originator, not a takeover
  // FAIL-CLOSED default: a real name mismatch against the originator is takeover risk UNLESS
  // BOTH narrowing conditions hold (explicit correction marker AND genuine name similarity).
  const isGenuineSameSpeakerCorrection =
    hasCorrectionMarker(rawMessage) && namesAreSimilar(String(newCandidateName), String(originatorName));
  return !isGenuineSameSpeakerCorrection;
}

// R121 (continued): the dedicated release predicate for the takeover-verification marker
// previewTakeoverRisk's caller (tools.ts) writes. Deliberately its OWN function, not a reuse of
// identityVerificationResolved: that function answers "is this REALLY <target>'s appointment"
// (release = the reply names the SAME target the marker is protecting), which is backwards for
// this marker's actual question ("do you genuinely want this changed FROM <originator> TO
// <proposedName>"). A takeover verification is resolved one of two ways, both requiring the
// SAME clean-affirm cleanliness bar (AFFIRM_RE/!NEGATE_RE/!ambiguousConfirm) every release in this
// codebase already requires, applied by the caller before this function is even consulted:
//   1. the customer explicitly reaffirms the NEW name ("ja, echt voor Bram", "klopt, Bram") --
//      deliberate, repeated intent to change it, strong enough evidence to proceed with the change.
//   2. the customer instead names the ORIGINATOR ("nee, gewoon voor Anna", "laat maar op Anna") --
//      no takeover was actually intended, the original preview stands unchanged.
// A bare, context-free "ja"/"klopt" with neither name present resolves NEITHER way (matches this
// file's own R109 standing rule: a bare affirm with no new information can never release an
// identity-conflict marker); the caller keeps re-asking, exactly like every other gate here.
export function takeoverVerificationResolution(
  originatorName: string | null | undefined,
  proposedName: string | null | undefined,
  rawMessage: string | undefined | null,
): "confirmed_new" | "reverted_to_originator" | "unresolved" {
  const msg = String(rawMessage ?? "");
  const namesProposed = isRealName(proposedName) && (() => {
    const token = firstNameToken(String(proposedName));
    return !!token && token.length >= 2 && containsWholeWord(msg, token);
  })();
  const namesOriginator = isRealName(originatorName) && (() => {
    const token = firstNameToken(String(originatorName));
    return !!token && token.length >= 2 && containsWholeWord(msg, token);
  })();
  // Both mentioned (rare, e.g. "niet Bram maar Anna" said as a correction of the correction):
  // never guess between two explicit signals in the same message, stay unresolved and re-ask.
  if (namesProposed && namesOriginator) return "unresolved";
  if (namesProposed) return "confirmed_new";
  if (namesOriginator) return "reverted_to_originator";
  return "unresolved";
}

// R109 (MARKER-RELEASE-HAS-NO-SPEAKER-IDENTITY-CHECK fix, closes the gap R107's own verify round
// found in book_appointment and generalizes it to cancel/reschedule's pre-existing markers, which
// share the identical release-gate shape and were never adversarially tested for this specific
// weakness before): the pending_book_verification / pending_cancel_verification /
// pending_reschedule_verification markers in index.ts release PURELY on marker-freshness (15-min
// TTL) plus AFFIRM_RE/NEGATE_RE/ambiguousConfirm on the CURRENT message, with ZERO check on WHO is
// sending the affirming reply. Live-reproduced exploit: a cross-identity mismatch correctly blocks
// the FIRST bare "ja" (R107's fix working as intended), but a SECOND bare "ja" from the exact SAME
// wrong speaker (no new name, no new information at all) silently releases the marker and
// commits/executes under the stale wrong identity, on all three action types.
//
// FIX SHAPE: a marker's whole purpose is to answer ONE specific question: "is this REALLY
// <target customer_name>'s appointment?" (see the naam_verificatie_nodig `message` text in
// tools.ts, always phrased exactly this way). The only answer that genuinely RESOLVES that
// question, as opposed to merely repeating a generic affirm word, is one where the customer's OWN
// reply actually names the target person. This reuses the SAME strict, non-fuzzy whole-word name
// matcher (containsWholeWord/firstNameToken) already proven in extractStatedNameForBooking, so
// "Anne" can never satisfy "Anna"'s verification the same way it can never satisfy her
// disambiguation match. A bare "ja"/"klopt"/"yes", with no new information at all, can NEVER
// satisfy this, structurally, no matter how many times it's repeated: it is not an affirm-word
// enumeration problem (a 2nd/3rd regex-widening pass, explicitly rejected by this round's own
// scope), it is a presence-of-the-actual-name check.
//
// The SECOND way a marker may legitimately release: the conversation's OWN knownSelfName has
// genuinely come to match the target's name since the marker was set (the true owner of the
// booking steps in, this turn or a later one, and states their real name, which independently
// updates knownSelfName via the SAME booking_name-capture mechanism book_appointment/update_lead
// already use as the tenant-scoped identity source; see index.ts's scopedName/knownName). This is
// the "situation genuinely changed" half of the fix: once the CURRENT turn's own identity signal
// no longer conflicts with the target, crossIdentityActionRisk itself would no longer flag a FRESH
// call, so honoring a release here is consistent, not a special case.
//
// Neither path can ever be satisfied by silently repeating the same affirm word from the same
// unresolved identity: the customer must actually do one of the two things a real receptionist
// would require, namely say who the appointment is really for, or have the real owner confirm.
export function identityVerificationResolved(
  targetCustomerName: string | null | undefined,
  knownSelfNameAtRelease: string | null | undefined,
  rawMessage: string | undefined | null,
): boolean {
  // The mismatch that triggered the marker is no longer present at all: the current turn's own
  // identity signal now matches the target (the real owner has stepped in and been recognized).
  if (!nameMismatch(targetCustomerName, knownSelfNameAtRelease)) return true;
  // Otherwise, the ONLY way to resolve a STILL-mismatched identity is for this turn's own raw
  // message to explicitly name the target person by their real, distinct (first-token) name,
  // never a bare affirm word, never inferred, never fuzzy-matched.
  if (!isRealName(targetCustomerName)) return false;
  const token = firstNameToken(String(targetCustomerName));
  if (!token || token.length < 2) return false;
  return containsWholeWord(String(rawMessage ?? ""), token);
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

// R112 (GATE-FIRST-TRIGGER-WRONG-TEXT fix, closes R107-GATE-FIRST-TRIGGER-WRONG-TEXT): the
// deterministic disclosure backstop for the `naam_verificatie_nodig` cross-identity gate
// (crossIdentityActionRisk in tools.ts, fired from book_appointment/cancel_appointment/
// reschedule_appointment/update_booking_name). That gate ALWAYS correctly blocks the mutation
// server-side (the DB stays safe on every trigger, first or not) and hands the model a
// pre-composed `message` field naming the target `current_name` explicitly, exactly the same
// "message"-relay pattern get_my_appointments' own `message`/`guidance` fields use. Just like that
// sibling case (see enforceAppointmentNameDisclosure's own header), trusting the model to relay
// this message faithfully on every turn is NOT a safe guarantee: this codebase's own established
// lesson (OWNERESCALATION-VERBLIST-BRITTLE, get_my_appointments' own disclosure history) is that a
// 20B model at this scale intermittently drops or replaces a pre-composed safety message with its
// own improvised, sometimes non-sequitur prose (e.g. a generic "I don't have confirmed information
// about that, contact us directly" refusal lifted from an unrelated business-data-refusal
// register) instead of the intended disclosure-and-confirm question. The server-side block itself
// never weakens either way (this is a pure customer-facing TEXT guarantee); this function makes
// that text guarantee deterministic instead of trusting model fidelity.
//
// WHAT THIS DOES: given this turn's tool-call results, finds the MOST RECENT one whose result
// carries `error === "naam_verificatie_nodig"` (any of the 5 call sites in tools.ts: book/cancel
// x2/reschedule/rename all share this exact shape: `current_name` + a pre-composed `message`). If
// the model's drafted reply does not already mention that target name (the same
// containsWholeWord/firstNameToken whole-word matcher enforceAppointmentNameDisclosure trusts), the
// reply is rewritten to the tool's own `message` field, exactly as originally composed server-side
// (already phrased as the disclosure-and-confirm question, in Dutch; the tool always composes it in
// Dutch regardless of customer language today, matching this codebase's existing convention of
// leaving rare guard fallbacks Dutch-default, e.g. noFalseConfirmReply's EN floor is the sole
// exception because it is the single highest-traffic guard). No-op (return replyText unchanged)
// when no such tool result exists this turn, or when the reply already discloses the name
// correctly (a correct disclosure, however phrased, must never be second-guessed/altered).
export interface VerificationGateToolResult {
  name: string;
  result: unknown;
}
// The tool's own `message` field is INTERNAL guidance mixed with a customer-facing lead sentence
// (e.g. "De afspraak die ik vond staat op naam van X. Vraag de klant EXPLICIET te bevestigen dat
// ..."), never meant to be relayed verbatim (it would leak meta-instructions to the customer,
// worse than the bug this backstop fixes). `customer_reply` is a SEPARATE, purely customer-facing
// field tools.ts now sets alongside it on all 5 naam_verificatie_nodig call sites (book/cancel
// x2/reschedule/rename), the exact disclosure-and-confirm question with nothing else attached,
// mirroring how get_my_appointments' own `message` (relay-safe) is already kept separate from its
// `guidance` (instruction-only). This backstop uses ONLY `customer_reply`, never `message`.
export function enforceVerificationGateDisclosure(
  replyText: string,
  toolCalls: VerificationGateToolResult[],
): string {
  if (!replyText) return replyText;
  let gate: { current_name?: unknown; customer_reply?: unknown } | null = null;
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const r = toolCalls[i].result;
    if (r && typeof r === "object" && (r as Record<string, unknown>).error === "naam_verificatie_nodig") {
      gate = r as { current_name?: unknown; customer_reply?: unknown };
      break;
    }
  }
  if (!gate) return replyText;
  const targetName = gate.current_name;
  if (!isRealName(targetName)) return replyText; // nothing to disclose, conservative no-op
  const token = firstNameToken(String(targetName));
  if (token && token.length >= 2 && containsWholeWord(replyText, token)) return replyText; // already discloses it
  const customerReply = typeof gate.customer_reply === "string" ? gate.customer_reply.trim() : "";
  if (!customerReply) return replyText; // nothing authoritative to fall back to, leave the model's own text
  return customerReply;
}

// R118 (GAP 1, RESCHEDULE-SELF-CONFIRM-FRAGMENTATION-EXPLOIT fix): reschedule_appointment is
// deliberately a ONE-STEP tool (the new date/time IS the confirmation, see tools.ts's own doc
// comment on that case) so the HONEST single-message flow ("kun je mijn afspraak verzetten naar
// vrijdag 15:00") stays frictionless. But live-reproduced 3/3 on the S6 testpad (R117/R118): after
// cancel_appointment's own open-ended "annuleren of verzetten?" fork question, a BARE fragment
// with no verb/service/explicit-reschedule-intent of its own (e.g. just "voor vrijdag" or
// "maandag") gets silently read as accepting a reschedule and moves a REAL confirmed booking with
// zero confirmation for either branch.
//
// FIX SHAPE: a message carries its OWN explicit reschedule intent when it contains a reschedule
// verb (verzet/verzetten/verplaats/verschuif/reschedule/move, NL+EN) OR names a real configured
// service (a genuine "book this service at this new time" request is never ambiguous) OR is long
// enough / structured enough to plausibly be a full sentence rather than a bare day/time
// fragment. A message that names ONLY a day/time reference, with none of the above, is a "bare
// fragment": on its own it is a perfectly normal way to answer "which day suits you", but
// immediately after an unresolved cancel-or-reschedule fork question it is genuinely ambiguous
// (it could just as easily mean "yes, cancel it" or something unrelated). This function answers
// only the "does THIS message carry its own explicit intent" half; index.ts/tools.ts combine it
// with the fork-question-still-open signal (a fresh pending_cancel marker for the SAME booking).
const RESCHEDULE_VERB_RE =
  /\b(verzet\w*|verplaats\w*|verschuif\w*|verschoven|reschedul\w*|\bmove\b|\bmoved\b|\bshift\w*)\b/i;

export function hasExplicitRescheduleIntent(rawMessage: string | undefined | null, allServiceNames: string[]): boolean {
  const msg = String(rawMessage ?? "").trim();
  if (!msg) return false;
  if (RESCHEDULE_VERB_RE.test(msg)) return true;
  for (const name of allServiceNames) {
    const n = name.trim();
    if (n.length >= 2 && msg.toLowerCase().includes(n.toLowerCase())) return true;
  }
  // A genuinely long/structured message (multiple words beyond a bare day/time fragment) reads as
  // a real sentence, not a one/two-word fragment. Threshold picked from the proven exploit corpus
  // ("voor vrijdag" = 2 words, "maandag" = 1 word) plus the honest single-message flow ("kun je
  // mijn afspraak verzetten naar vrijdag 15:00" = 7 words, already caught by RESCHEDULE_VERB_RE
  // anyway, so this threshold is a pure safety net, never the primary discriminator).
  const wordCount = msg.split(/\s+/).filter(Boolean).length;
  return wordCount > 4;
}

// R118 (GAP 1 fix, continued): SAME "gate-first-trigger-wrong-text" pattern as
// enforceVerificationGateDisclosure above (R112), applied to reschedule_appointment's NEW
// verzet_bevestiging_nodig gate. The gate ALWAYS blocks the mutation server-side regardless of
// what the model says; this only guarantees the CUSTOMER-FACING TEXT on that turn is the intended
// confirmation question, deterministically, instead of trusting the model to relay it (which live
// testing across this codebase's sibling gates has repeatedly shown can drift into an unrelated
// reply). No-op unless a tool call this turn actually returned verzet_bevestiging_nodig.
export function enforceRescheduleAmbiguityDisclosure(
  replyText: string,
  toolCalls: VerificationGateToolResult[],
): string {
  if (!replyText) return replyText;
  let gate: { customer_reply?: unknown } | null = null;
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const r = toolCalls[i].result;
    if (r && typeof r === "object" && (r as Record<string, unknown>).error === "verzet_bevestiging_nodig") {
      gate = r as { customer_reply?: unknown };
      break;
    }
  }
  if (!gate) return replyText;
  const customerReply = typeof gate.customer_reply === "string" ? gate.customer_reply.trim() : "";
  if (!customerReply) return replyText; // nothing authoritative to fall back to, leave the model's own text
  // Conservative: only override when the model's own reply does not already end in a question
  // (a genuine confirming question, however phrased, is left alone; only a non-question drift is
  // replaced), mirroring this codebase's existing "?" heuristic for detecting an open question
  // (confirmationGuard.ts's FUTURE_OR_OFFER_RE / confirmStall both use the same signal).
  if (replyText.trim().endsWith("?")) return replyText;
  return customerReply;
}
