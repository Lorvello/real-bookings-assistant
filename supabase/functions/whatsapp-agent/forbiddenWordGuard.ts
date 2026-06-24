// P2-tone "no fabricated availability word" guard (DoD #6, adversarial round 2 / R10).
//
// The prompt (prompt.ts line 298/299) FORBIDS telling a customer a day/time is "vol",
// "volgeboekt" or "druk" (or the cross-lingual equivalents): a CLOSED day is not "full", and
// "de agenda is vol" is the exact phrasing Mathieu bans. The model must instead say the day is
// not available and offer an alternative. A temp-0.2 20B model does not reliably hold this:
// adversarial round 2 found ~16% of closed-day turns said "voll" / "vol" / "fully booked",
// markedly worse under realistic multi-turn build-up (DE/NL build-up flows hit it 2/2). It is a
// tone slip with NO booking risk (the slot is server-guarded either way), but it is a hard
// doctrine violation AND factually wrong, so per the BA core-lesson the guarantee belongs in
// code, not trusted to the model.
//
// UNLIKE the 7-language relative-date / calendar-status PARSERS that the loop's DECISIONS
// rejected three times, this needs NO free-text or calendar-state parsing: it neutralizes a small
// CLOSED set of forbidden words to a language-appropriate "niet beschikbaar". The FP-surface is
// therefore just that word set, kept deliberately conservative (bare EN "full", FR "vol"=flight,
// and the ambiguous "druk"/"plein" are EXCLUDED). Applied only to model-prose replies; the
// server-templated confirmations/previews never contain these words.

export type LangKey = "nl" | "en" | "de" | "fr" | "es" | "pt" | "it";

// customerLanguage arrives as a Dutch language NAME ("het Duits") or null (Dutch / unsure),
// see index.ts LANG_NL_NAME / detectCustomerLanguage.
export function langKeyOf(customerLanguage: string | null): LangKey {
  if (!customerLanguage) return "nl";
  const s = customerLanguage.toLowerCase();
  if (s.includes("engels")) return "en";
  if (s.includes("duits")) return "de";
  if (s.includes("frans")) return "fr";
  if (s.includes("spaans")) return "es";
  if (s.includes("portugees")) return "pt";
  if (s.includes("italiaans")) return "it";
  return "nl";
}

const NEUTRAL: Record<LangKey, string> = {
  nl: "niet beschikbaar",
  en: "not available",
  de: "nicht verfügbar",
  fr: "pas disponible",
  es: "no disponible",
  pt: "não disponível",
  it: "non disponibile",
};

// Forbidden availability-words per language. Word-boundary anchored so longer legit words never
// match: NL "vol" never hits "volgende" / "volledig" / "volgens" (the g/l after "vol" breaks the
// trailing \b). Each language's pattern is applied ONLY when the reply is in that language (the
// model writes the whole reply in the customer's language), so a French "vol" (=flight) is never
// touched and replacements never mix languages. "druk" (NL, doctrine-forbidden but = "press" too)
// and bare EN "full" ("full name" / "full hour") are intentionally omitted: their FP-risk
// outweighs a rare slip with no booking consequence.
const FORBIDDEN: Record<LangKey, RegExp> = {
  nl: /\b(?:vol|volgeboekte?|volzet)\b/gi,
  en: /\b(?:fully[\s-]?booked|booked up)\b/gi,
  de: /\b(?:voll|ausgebuchte?[rnms]?|komplett belegt|belegt)\b/gi,
  fr: /\b(?:complet|complète|complets|complètes)\b/gi,
  es: /\b(?:completos?|completas?|llenos?|llenas?)\b/gi,
  pt: /\b(?:lotad[oa]s?|chei[oa]s?)\b/gi,
  it: /\b(?:al completo|pien[oae]|esaurit[oaie])\b/gi,
};

// Neutralize any forbidden availability-word in the reply to a language-appropriate
// "niet beschikbaar". Returns the input unchanged when nothing matched. Uses only String.replace
// (never .test()/.exec() on a /g regex, which is stateful, the footgun sanitizeReply.ts warns of).
export function neutralizeForbiddenAvailabilityWords(
  reply: string,
  customerLanguage: string | null,
): string {
  if (!reply) return reply;
  const lang = langKeyOf(customerLanguage);
  const out = reply.replace(FORBIDDEN[lang], NEUTRAL[lang]);
  if (out === reply) return reply;
  // Tidy whitespace artifacts the swap can create; punctuation/flow are preserved by replacing
  // the word in place ("die dag is helaas vol" -> "die dag is helaas niet beschikbaar").
  return out.replace(/\s{2,}/g, " ").trim();
}

// Detection-only helper (for the testpad / logging): true iff a forbidden word is present.
export function hasForbiddenAvailabilityWord(
  reply: string,
  customerLanguage: string | null,
): boolean {
  return neutralizeForbiddenAvailabilityWords(reply, customerLanguage) !== reply;
}
