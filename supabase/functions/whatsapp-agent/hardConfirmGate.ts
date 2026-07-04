// R32 (2nd AFFIRM-CONFIRM taste-fork): a deterministic, language-independent, purely structural
// final-confirmation gate. Mathew's decision (verbatim intent): "zero errors allowed, keep going
// until it is genuinely perfect." After 9 recurrences of the confirmation-ambiguity bug class
// (R22-R31, each closed one NEW phrasing the existing regex-enumeration layers did not yet cover),
// this module replaces "enumerate every way a message can be UNCLEAR" with "check whether the
// message is a member of a small, finite, human-auditable list of ways to be CLEAR." A brand-new
// phrasing invented by a future customer is, by construction, not a member of a finite list, so it
// cannot match this gate, so it cannot drive a commit through it, regardless of what new wording it
// invents. This is intentionally NOT a regex "does this roughly mean yes" classifier: every accepted
// string is either an EXACT match (2b) or matches one of a tiny, explicitly-enumerated set of fixed
// skeletons with only a trivial closed suffix/prefix alternation (2c), never a free-form wildcard.
//
// This is an ADDITIVE third layer (see index.ts/tools.ts), required in AND alongside the existing
// ambiguousConfirm regex layer and the model's own only_confirming_previous attestation, not a
// replacement for either. See evidence/IUX_r32.md section 2 for the full layering reasoning.
//
// Pure, dependency-free, unit-testable in isolation (no Supabase/LLM imports), by design: a gate
// this safety-critical must be testable exhaustively without any live infrastructure.

/** Strip a fixed, explicit set of leading/trailing punctuation, quotes and whitespace (never
 * touches INTERNAL punctuation: "ja, tot dan" keeps its internal comma; that phrase is matched
 * as a whole string by HARD_CONFIRM_PATTERNS below, not by deleting the comma here). Also strips
 * a small, explicit set of trailing "decoration" emoji so "Ja! 🎉" / "Klopt 👍" still exact-match,
 * without doing any general-purpose emoji stripping (which could silently swallow real content). */
// Built as a pre-escaped, properly ordered regex CHARACTER-CLASS body (the `]`/`[`/`^`/`-` special
// characters inside a class must be escaped or carefully positioned, unlike in plain regex text).
// The hyphen is placed LAST in the class so it is never mis-parsed as a range operator. Backtick
// and single/double quotes need no escaping inside a class.
const EDGE_CHAR_CLASS = ".,!?:;\"'`~()\\[\\]{}*_‘’“”…\\-";
// A curated set of common trailing "decoration" emoji/pictographs seen in casual confirms. Not
// exhaustive by design (this is a strip-list, not a classifier); anything outside this set is left
// in place, which only ever makes a match FAIL SAFE (falls through to "not hard-confirmed"), never
// falsely succeed.
const TRAILING_DECOR_RE =
  /[\u{1F44D}\u{1F44C}\u{1F642}\u{1F600}-\u{1F64F}\u{2764}\u{FE0F}\u{2705}\u{1F389}\u{1F60A}\u{1F44B}\s]+$/gu;
const EDGE_TRIM_RE = new RegExp(`^[${EDGE_CHAR_CLASS}\\s]+|[${EDGE_CHAR_CLASS}\\s]+$`, "gu");

function stripEdges(s: string): string {
  let out = s;
  // Strip trailing decoration emoji/whitespace runs first (may be interleaved with punctuation,
  // e.g. "Klopt! 👍😊"); loop until stable, bounded iterations so this can never hang.
  for (let i = 0; i < 5; i++) {
    const before = out;
    out = out.replace(TRAILING_DECOR_RE, "");
    out = out.replace(EDGE_TRIM_RE, "");
    if (out === before) break;
  }
  return out;
}

// Invisible formatting characters (zero-width space/joiner/non-joiner, BOM, and the bidi
// direction-control marks) carry no visible content but are not whitespace either, so a message
// like "ja" + a trailing invisible mark (WhatsApp/mobile-keyboard autocorrect can insert these)
// would otherwise fail to exact-match. Stripped GLOBALLY (not just at the edges): they are true
// zero-width formatting noise with no semantic content of their own, unlike punctuation/emoji,
// so removing them anywhere in the string can never delete meaningful customer content. This can
// only ever make a genuine clean confirm match MORE reliably; it cannot manufacture a match for a
// message that carries real extra content, since the visible characters are untouched.
const INVISIBLE_RE = /[​‌‍‎‏﻿⁠-⁤]/g;

/** Bounded, fully deterministic normalization: NFC-normalize, strip invisible/bidi-control
 * formatting marks, lowercase (locale-safe), strip edge punctuation/emoji/whitespace (never
 * internal VISIBLE content), collapse internal whitespace runs to a single space. No stemming,
 * no fuzzy matching, no synonym expansion: every step here is mechanically reversible/auditable
 * by reading this function alone. */
export function normalizeForHardConfirm(raw: unknown): string {
  const s = typeof raw === "string" ? raw : "";
  const nfc = s.normalize("NFC").trim();
  const noInvisible = nfc.replace(INVISIBLE_RE, "");
  const lower = noInvisible.toLocaleLowerCase();
  const stripped = stripEdges(lower);
  return stripped.replace(/\s+/g, " ").trim();
}

// 2b. Exact bare-token allow-list. Every entry here, once normalized, must mean "yes, exactly
// that" with NO possible other reading. Sourced from: the existing AFFIRM_RE keyword set in
// index.ts (proven-safe token list, reused rather than re-invented), restricted to tokens that are
// unambiguously a bare confirmation on their own ("prima"/"graag"/"doe maar" are kept since they
// are unambiguous standalone confirms in the existing corpus; every AFFIRM_RE token reads as a
// clean standalone confirm, so none needed dropping). Plus a handful of standalone English/NL
// confirmation words not in AFFIRM_RE but common in casual chat ("confirm", "confirmed",
// "correct", "that's correct", "that's right").
export const HARD_CONFIRM_EXACT: ReadonlySet<string> = new Set([
  // NL
  "ja", "jaa", "jaaa", "jaaaa", "jazeker", "jawel", "jaha", "klopt", "klopt.", "akkoord", "oke",
  "oké", "okay", "ok", "prima", "graag", "doe maar", "inderdaad", "correct", "top", "helemaal goed",
  "helemaal juist", "dat klopt", "dat is correct", "is goed",
  // EN
  "yes", "yep", "yup", "yeah", "yea", "sure", "correct", "confirm", "confirmed", "that's correct",
  "that is correct", "that's right", "that is right", "sounds good", "perfect", "great", "good",
  "alright", "all good", "looks good", "looks right",
  // FR / ES / PT / DE / IT (same tokens AFFIRM_RE already trusts as unambiguous standalone confirms)
  "oui", "ouais", "volontiers", "si", "sí", "claro", "vale", "perfecto", "sì", "certo", "esatto",
  "perfetto", "sim", "perfeito", "parfait", "genau", "gerne", "bitte", "klar", "passt",
]);

export const HARD_REJECT_EXACT: ReadonlySet<string> = new Set([
  // NL
  "nee", "neen", "niet", "stop", "annuleer", "annuleren", "annuleer maar", "annuleer het maar",
  "verwijder", "verwijder maar", "liever niet", "toch niet", "afzeggen",
  // EN
  "no", "nope", "nah", "cancel", "don't", "dont", "do not", "stop it",
]);

// 2c. Curated, finite "confirm-word plus trivial suffix/prefix" patterns. Each is a FIXED skeleton
// (never `.*`); the only variability allowed is a tiny, explicitly-enumerated alternation for the
// pleasantry itself. Anchored at both ends (^...$) against the fully normalized string, so nothing
// beyond what is spelled out here can ever match. Kept deliberately small: every entry was chosen
// because it is a genuinely common, load-bearing pleasantry shape (validated against the R22-R31
// genuine-confirm corpus plus this round's own UX-smoothness sample, section 6b below), not because
// "it might help." When in doubt, an entry was left out (falls back to the existing layers, safe).
const PLEASANTRY = "(?:tot dan|dank je(?:wel)?|dankjewel|bedankt|dank u(?: wel)?|thanks?|thank you|please)";
// R32 live-testpad finding (section 6b): a bare affirm word followed ONLY by the SAME cancel verb
// already named in the preview being confirmed ("Ja, annuleer maar" / "Yes, cancel it") is a
// genuinely common, unambiguous CANCEL-confirm shape, distinct from a bare "annuleer maar" alone
// (which sits in HARD_REJECT_EXACT for the DECLINE-an-offer/proposal reading). Restricted to a
// fixed, tiny alternation of the cancel verb itself, never a free-form action word, so it stays a
// closed skeleton like every other entry in this list.
// R78 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE, filed by R74-verify): the ORIGINAL CANCEL_VERB skeleton
// only covered "annuleer maar"/"annuleren maar", missing the equally common "annuleer DIE maar"
// (an explicit object pronoun referring back to the previewed booking), a plain "annuleer het"
// without the trailing "maar", and "cancel it please" (verb-object-please word order, as opposed to
// the pre-existing "please cancel it"/"cancel please"). Live-reproduced 7/7 on the S6 testpad
// (evidence/IUX_r78.md section 3): "Ja, annuleer die maar" / "Ja hoor, annuleer maar" / "Zeker,
// annuleer het" / "Yeah cancel it please" all returned "none" and stalled identically to the pre-R74
// booking-confirm gap. Extended with the SAME closed-alternation discipline as every other entry:
// `(?: (?:die|dat|hem))?` is a tiny, fixed, optional pronoun slot (never a wildcard), inserted only
// where "annuleer" is immediately followed by an optional pronoun before the closing "maar"/bare
// form; "cancel it please"/"cancel that please" are two more fixed, explicit alternation members.
const CANCEL_VERB =
  "(?:annuleer(?: (?:die|dat|hem))?(?: het)? maar|annuleer(?: het| die| dat| hem)|annuleren maar|cancel it|cancel that|cancel please|please cancel it|please cancel that|cancel it please|cancel that please)";
// R32-verify finding V4 (evidence/IUX_r32.md): a "double affirm-word" message, i.e. two DIFFERENT
// standalone confirm words back to back ("Ja klopt", "Ja ok", "Ja prima", "Yes correct"), is a very
// common, completely natural way to confirm in both Dutch and English, but previously matched neither
// HARD_CONFIRM_EXACT (not a single token) nor any HARD_CONFIRM_PATTERNS skeleton (those only covered
// "confirm-word + pleasantry", never "confirm-word + confirm-word"). CONFIRM_WORD is a DELIBERATE
// SUBSET of HARD_CONFIRM_EXACT (not the full set), restricted to the words that actually co-occur in
// the reported gap plus the two natural EN doubles from the same finding, to avoid combinatorially
// expanding the accepted surface with lower-confidence word pairs. Anchored ^...$ like every other
// entry here, so a message with real content beyond the two words ("ja klopt, maar toch niet") fails
// the anchor and correctly falls through to "none" (safe fallback to the existing layers), never a
// false match; see hardConfirmGate.test.ts for the adversarial regression test proving this.
const CONFIRM_WORD = "(?:ja|jaa|klopt|ok|oke|oké|okay|prima|akkoord|correct|yes|yep|sure)";
// R74 (CONFIRM-TURN-CONTEXT-LOSS): a bare affirm word ("ja"/"yes") FOLLOWED BY a "that's
// correct"-family clause is a genuinely common, unambiguous confirm shape distinct from either
// CONFIRM_WORD-alone (a single bare token) or the existing "confirm-word + pleasantry" skeletons
// (those never covered "affirm-word + a full correctness clause"). Live-reproduced this round:
// "Yes that's correct, thanks" classified "none" and stalled the confirm turn (evidence/IUX_r74.md
// section 4, trial 2). CORRECTNESS_CLAUSE is a small, closed, hand-picked alternation of the
// natural NL/EN ways to say "that is correct", never a free-form wildcard; PREFIX_AFFIRM is
// restricted to the same closed bare-word set already trusted standalone elsewhere in this file.
// Anchored ^...$ like every other entry, so any extra content beyond this fixed skeleton (a
// correction, hedge, question, etc.) still falls through to "none", proven by the adversarial
// tests in hardConfirmGate.test.ts section 9.
const PREFIX_AFFIRM = "(?:ja|jaa|yes|yeah|yep|klopt|ok|oke|oké|okay)";
// R78 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE fix): widened to include "zeker" ("Zeker, annuleer het"
// live-reproduced, evidence/IUX_r78.md trial 7), a genuinely common standalone-confirm affirm word.
// Kept as a SEPARATE constant from PREFIX_AFFIRM (not merged into it) since this round's live
// evidence only covers "zeker"/"sure" in the cancel-confirm shape, following this file's own
// discipline of only widening a set as far as live/static evidence actually supports.
// R81 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE, closing gap 1): bare "ok"/"oke"/"okay" was missing here
// even though all three spellings are already trusted standalone elsewhere in this same file
// (HARD_CONFIRM_EXACT, PREFIX_AFFIRM, CONFIRM_WORD, and even inside CANCEL_INTERJECTION as an
// interjection slot, just never as the LEAD affirm word for a cancel). Live-reproduced gap
// (evidence/IUX_r81.md section 3): "Ok, cancel that" / "Oke, cancel it" / "Okay, cancel it" all
// stalled. Added for consistency with the rest of the file's spelling set, same closed alternation.
const CANCEL_PREFIX_AFFIRM = "(?:ja|jaa|yes|yeah|yep|klopt|akkoord|zeker|sure|ok|oke|oké|okay)";
// A tiny, closed, optional interjection slot ("Ja hoor", "Yeah okay") that can sit between the
// affirm word and the cancel verb in genuinely common casual Dutch/English. Fixed alternation only,
// never a wildcard; live-reproduced gap: "Ja hoor, annuleer maar" (evidence/IUX_r78.md trial 2).
const CANCEL_INTERJECTION = "(?:hoor|oke|ok)?";
// R81 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE, closing gap 2): added the bare "klopt helemaal" member
// (no leading "dat"). It previously only existed as its OWN separate standalone
// `^klopt helemaal!?$` pattern entry below, never as a member of this shared alternation, so it
// could not chain with CANCEL_VERB. Live-reproduced gap: "Klopt helemaal, annuleer maar" /
// "Klopt helemaal, annuleer het" (evidence/IUX_r81.md section 3). Purely additive: every existing
// use of CORRECTNESS_CLAUSE (the R74 booking chain, the bare-clause-alone booking pattern, the R78
// cancel chain) only gains one more accepted member, never loses one.
const CORRECTNESS_CLAUSE =
  "(?:dat klopt|dat is correct|dat is juist|is correct|that'?s correct|that'?s right|that is correct|that is right|that works|klinkt goed|sounds good|dat klopt helemaal|dat is helemaal correct|helemaal correct|klopt helemaal|klinkt perfect)";
export const HARD_CONFIRM_PATTERNS: readonly RegExp[] = [
  new RegExp(`^ja,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^klopt,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^klopt helemaal!?$`, "i"),
  new RegExp(`^prima,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^akkoord,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^perfect,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^top,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^yes,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^yes please!?$`, "i"),
  new RegExp(`^yes please,? thanks?!?$`, "i"),
  new RegExp(`^yep,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^sure,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^that'?s correct,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^sounds good,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^correct,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^${PLEASANTRY},? ja!?$`, "i"),
  // R78 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE fix): the original cancel-confirm entry restricted its
  // prefix to a hardcoded 4-word alternation and its verb to the pre-widening CANCEL_VERB. Now uses
  // the shared CANCEL_PREFIX_AFFIRM set (adds "zeker"/"sure"), an optional closed interjection slot
  // (CANCEL_INTERJECTION, adds "hoor"/"oke"/"ok" between the affirm word and the verb), and the
  // widened CANCEL_VERB (adds the "die/dat/hem" pronoun slot + bare "annuleer het"/"cancel that"
  // forms), mirroring R74's own affirm+clause skeleton shape. Live-reproduced gap phrasings this
  // closes: "Ja, annuleer die maar", "Ja hoor, annuleer maar", "Zeker, annuleer het", "Yeah cancel it
  // please", "yes please cancel that".
  new RegExp(`^${CANCEL_PREFIX_AFFIRM},? ?${CANCEL_INTERJECTION},? ${CANCEL_VERB}!?$`, "i"),
  // R78: an affirm word FOLLOWED BY a correctness-clause (or a bare second confirm word, e.g. the
  // standalone "klopt" in "Ja, klopt, annuleer die maar") FOLLOWED BY the cancel verb. Both
  // "Ja, dat klopt, annuleer maar" and "Ja, klopt, annuleer die maar" live-reproduced, evidence/
  // IUX_r78.md trials 4 and 6. Reuses the SAME closed CORRECTNESS_CLAUSE, CONFIRM_WORD and
  // CANCEL_VERB alternations already defined above, just chained; still a single fixed skeleton,
  // no wildcard, anchored ^...$.
  new RegExp(`^${PREFIX_AFFIRM},? (?:${CORRECTNESS_CLAUSE}|${CONFIRM_WORD}),? ${CANCEL_VERB}!?$`, "i"),
  // R81 (CANCEL-CONFIRM-PATTERNLIST-BRITTLE, closing gap 2): a bare correctness-clause with NO
  // leading affirm word, chained directly into the cancel verb ("Klopt helemaal, annuleer maar"),
  // live-reproduced (evidence/IUX_r81.md section 3): the chained pattern above always required
  // PREFIX_AFFIRM before the clause/word, and no bare-clause-alone cancel entry existed anywhere
  // in this list, unlike the booking side which already has one (see the bare CORRECTNESS_CLAUSE
  // entry near the end of this list). Direct mirror of that existing booking-side entry, reusing
  // the same closed CORRECTNESS_CLAUSE and CANCEL_VERB alternations, no new wildcard, anchored
  // ^...$ like every other entry. A bare cancel verb with NO correctness clause at all (e.g. a
  // standalone "annuleer maar") still cannot match this pattern, so it correctly stays on the
  // existing HARD_REJECT_EXACT path, proven by an adversarial boundary test.
  new RegExp(`^${CORRECTNESS_CLAUSE},? ${CANCEL_VERB}!?$`, "i"),
  new RegExp(`^${CONFIRM_WORD},? ${CONFIRM_WORD}!?$`, "i"),
  new RegExp(`^${PREFIX_AFFIRM},? ${CORRECTNESS_CLAUSE}(?:,? ${PLEASANTRY})?!?$`, "i"),
  new RegExp(`^${CORRECTNESS_CLAUSE}(?:,? ${PLEASANTRY})?!?$`, "i"),
];

export const HARD_REJECT_PATTERNS: readonly RegExp[] = [
  new RegExp(`^nee,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^no,? ${PLEASANTRY}!?$`, "i"),
  new RegExp(`^nee,? laat maar!?$`, "i"),
  new RegExp(`^no,? never ?mind!?$`, "i"),
];

export type HardConfirmVerdict = "confirm" | "reject" | "none";

/** The gate. Returns "confirm" only when the normalized message is EXACTLY a member of
 * HARD_CONFIRM_EXACT or matches one whole-string HARD_CONFIRM_PATTERNS entry; "reject" mirrors
 * for the reject lists; otherwise "none" (the safe default: falls through to the existing
 * ambiguousConfirm plus model-attestation layers, which may re-ask). The reject check runs first,
 * but the sets/patterns are disjoint by construction (verified in tests), so order is irrelevant. */
export function classifyHardConfirm(raw: unknown): HardConfirmVerdict {
  const norm = normalizeForHardConfirm(raw);
  if (norm === "") return "none";
  if (HARD_REJECT_EXACT.has(norm) || HARD_REJECT_PATTERNS.some((re) => re.test(norm))) return "reject";
  if (HARD_CONFIRM_EXACT.has(norm) || HARD_CONFIRM_PATTERNS.some((re) => re.test(norm))) return "confirm";
  return "none";
}
