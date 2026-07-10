// Lightweight customer-language detection for a DETERMINISTIC language directive.
// gpt-5-mini reliably WRITES in a NAMED language but won't reliably DECIDE on its own to
// translate the Dutch greeting to e.g. German/French on the first turn (it does so for
// English but not consistently for others). So we detect the language server-side from the
// inbound message (high-signal stopwords + diacritics) and pass the name into the prompt.
//
// R81 (language lock-in fix): the original detectCustomerLanguage() only ever answered "is THIS
// message confidently non-Dutch" (a signal word count) and returned a single `string | null`,
// where null meant BOTH "confidently Dutch" and "no signal at all / genuinely ambiguous" (e.g. a
// bare "ok"). index.ts persisted a detected non-Dutch language into `convContext.detected_language`
// forever (so a short, ambiguous LATER reply like "ja" still inherits the thread's language,
// intentional stickiness), but NEVER cleared it, because there was no way to tell "the customer
// just wrote a confidently-Dutch message" apart from "this message is ambiguous, keep inheriting".
// Root cause of the live R79/R80 bug: once any non-Dutch language was ever detected once on a
// long-lived shared thread, EVERY subsequent genuinely-Dutch message (which legitimately scores 0
// non-Dutch signal words) fell through to the stale stored language and stayed there for the rest
// of the conversation, and that stale value is injected into prompt.ts's <taal_klant> block as an
// authoritative "the customer writes in X" directive PLUS drives every deterministic en/nl
// guard/template in index.ts (`customerLanguage != null`), so the model (and every server-side
// template) kept answering in English even though the customer wrote only Dutch.
//
// Fix: split the signal into (nonDutch: confident non-Dutch language name, else null) and
// (confidentDutch: true only when Dutch itself scores >=2 signal words with a real margin over
// every other language, i.e. this specific message is NOT ambiguous, it is recognizably Dutch).
// A confidently-Dutch message now actively clears any stale stored language in index.ts; a truly
// ambiguous message (no language scores >=2, e.g. "ok"/"ja"/a bare number) still inherits the
// thread's prior language, unchanged stickiness behavior for that case.
export const LANG_WORDS: Record<string, string[]> = {
  en: ["the","you","i","to","a","for","would","like","can","could","please","want","book","appointment","hello","hi","hey","thanks","thank","my","name","is","at","on","afternoon","morning","evening","next","monday","tuesday","wednesday","thursday","friday","tomorrow","today","and","do","have","need","an","reschedule","cancel","change","move"],
  de: ["ich","möchte","gerne","einen","eine","am","um","bitte","termin","buchen","guten","tag","hallo","danke","mein","name","ist","nächsten","montag","dienstag","uhr","würde","hätte","für","und","der","die","das","nachmittag","morgen","heute","verschieben","absagen","können","kann","einen","gern"],
  fr: ["bonjour","je","voudrais","réserver","un","une","rendez","vous","lundi","mardi","après","midi","plaît","merci","mon","nom","est","pour","le","la","prochain","demain","aujourd","annuler","déplacer","heure","matin","soir","salut","aimerais"],
  es: ["hola","quiero","reservar","una","cita","lunes","martes","por","favor","gracias","mi","nombre","es","para","el","la","próximo","tarde","mañana","hoy","cancelar","cambiar","quisiera","necesito","puedo","buenas","cuanto","cuesta","corte","pelo","precio","abris","abren","abre","cuando","donde","hora","horas","gustaria","peluqueria","quisiera"],
  pt: ["olá","quero","reservar","um","agendamento","agendar","segunda","por","favor","obrigado","obrigada","meu","nome","para","próxima","tarde","amanhã","hoje","cancelar","remarcar","gostaria","queria","marcar","bom","dia","quanto","custa","corte","cabelo","preço","horas","quando","onde","você","sim","não","abrem","abre","fazer","cabeleireiro","marcação"],
  it: ["ciao","buongiorno","vorrei","prenotare","un","appuntamento","lunedì","martedì","per","favore","grazie","mio","nome","prossimo","pomeriggio","domani","oggi","annullare","spostare","posso","ora","salve","quanto","costa","taglio","capelli","quando","dove","aperto","orario","quanto","barbiere"],
  nl: ["ik","wil","wilt","graag","een","afspraak","maken","hoi","hallo","hey","bedankt","dank","mijn","naam","is","om","op","volgende","maandag","dinsdag","middag","ochtend","kan","kun","je","voor","en","morgen","vandaag","verzetten","annuleren","alsjeblieft","alstublieft"],
};
export const LANG_NL_NAME: Record<string, string> = { en: "het Engels", de: "het Duits", fr: "het Frans", es: "het Spaans", pt: "het Portugees", it: "het Italiaans" };

export interface LanguageSignal {
  // Confident NON-Dutch language name (Dutch-language name, e.g. "het Engels"), else null.
  nonDutch: string | null;
  // True only when THIS message is recognizably, unambiguously Dutch (not just "no non-Dutch
  // signal", a bare "ok" is NOT confidentDutch either -- it has zero signal, ambiguous).
  confidentDutch: boolean;
}

export function detectLanguageSignal(msg: string): LanguageSignal {
  const text = (msg || "").toLowerCase();
  // Strip diacritics for word matching so casual accent-less typing still scores ("ola"≈"olá",
  // "manana"≈"mañana", "preco"≈"preço"). The accent SIGNAL checks below still use the raw text.
  const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const tokens = new Set(strip(text).replace(/[^\p{L}]+/gu, " ").trim().split(/\s+/).filter(Boolean));
  if (tokens.size === 0) return { nonDutch: null, confidentDutch: false };
  const scores: Record<string, number> = {};
  for (const [lang, words] of Object.entries(LANG_WORDS)) {
    let s = 0;
    for (const w of words) if (tokens.has(strip(w))) s++;
    scores[lang] = s;
  }
  if (/[ß]/.test(text)) scores.de += 2;
  if (/[äöü]/.test(text)) scores.de += 1;
  if (/[ñ¿¡]/.test(text)) scores.es += 2;
  if (/[ãõ]/.test(text)) scores.pt += 2;
  if (/[çàèêœ]/.test(text)) scores.fr += 1;
  let best = "nl", bestScore = scores.nl ?? 0;
  for (const lang of Object.keys(LANG_WORDS)) {
    if ((scores[lang] ?? 0) > bestScore) { best = lang; bestScore = scores[lang]; }
  }
  // Confident NON-Dutch: need >=2 signal words and a strict margin over Dutch.
  if (best !== "nl" && bestScore >= 2 && (scores.nl ?? 0) < bestScore) {
    return { nonDutch: LANG_NL_NAME[best] ?? null, confidentDutch: false };
  }
  // Confident DUTCH: Dutch itself is the best-scoring language with a real signal (>=2 words) and
  // a real margin over every other language (not a near-tie, not zero signal at all).
  const nlScore = scores.nl ?? 0;
  const runnerUp = Math.max(0, ...Object.keys(LANG_WORDS).filter((l) => l !== "nl").map((l) => scores[l] ?? 0));
  const confidentDutch = nlScore >= 2 && nlScore > runnerUp;
  return { nonDutch: null, confidentDutch };
}

// Back-compat wrapper: previous call sites only ever needed the non-Dutch name.
export function detectCustomerLanguage(msg: string): string | null {
  return detectLanguageSignal(msg).nonDutch;
}
