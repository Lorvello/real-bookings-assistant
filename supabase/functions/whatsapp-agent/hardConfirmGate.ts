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
const CANCEL_VERB = "(?:annuleer(?: het)? maar|annuleren maar|cancel it|cancel that|cancel please)";
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
  new RegExp(`^(?:ja|yes|klopt|akkoord),? ${CANCEL_VERB}!?$`, "i"),
  new RegExp(`^${CONFIRM_WORD},? ${CONFIRM_WORD}!?$`, "i"),
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
