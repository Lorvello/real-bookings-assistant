// Deterministic outbound-text hygiene for every WhatsApp agent reply.
// Two concerns, applied ONCE at the single outbound choke point (index.ts), so the
// guarantee covers the WhatsApp send, the persisted transcript AND the testpad response
// identically and never depends on the model obeying a prompt rule:
//   1. stripInternalDirectives: block/strip internal meta-text that must never reach a
//      customer (self-directives, internal context tags, tool/field names, error labels).
//      The 20B/temp-0.2 model sometimes echoes a tool-result directive verbatim (observed:
//      "...verwijs naar het annuleringsbeleid." leaked into a cancel reply). This is the
//      "garantie in code" defense-in-depth: prompt-side we keep customer-text and directives
//      in separate tool-result fields (tools.ts message vs guidance); here we guarantee it.
//   2. sanitizeReply: em-dash hygiene (the "written by an AI" tell Mathew never wants).
// Built from char codes so the source itself stays dash-free: U+2014 em, U+2013 en,
// U+2015 bar, U+2012 figure, U+2212 minus.
const DASHES = String.fromCharCode(0x2014, 0x2013, 0x2015, 0x2012, 0x2212);

// --- 1. Internal-directive guardrail -------------------------------------------------

// Internal context tags that wrap the system prompt's sections; never customer-facing.
const INTERNAL_TAGS =
  /<\/?(role|context|critical|tools|welcome|language|dates|payment|services|service_selection|booking_flow|cancel_reschedule|business_data|business_info_honesty|identity_scope|name_policy|availability_wording|taal_klant|taal_check|kalender|kalenders|dont)>/gi;

// Tool names, parameter/field names and internal error labels: snake_case identifiers that
// only exist inside the agent; if one of these surfaces in a reply it is a leak.
const INTERNAL_TOKENS =
  /\b(get_business_data|get_available_slots|get_my_appointments|book_appointment|cancel_appointment|reschedule_appointment|update_lead|service_type_id|calendar_index|match_start_time|match_time|needs_confirmation|pending_cancel|pending_booking|confirmed\s*:\s*true|annuleren_niet_toegestaan|te_laat_annuleren|te_laat_verzetten|geen_boeking|meerdere_afspraken|naam_ontbreekt|niet_beschikbaar|dag_vol|slot_taken|bestaande_afspraak|payment_setup_failed|ontbrekende_gegevens|ontbrekende_tijd|ongeldige_tijd|datum_verleden|datum_te_ver|in_verleden|bad_date|bad_time|een_per_keer|te_vroeg|kies_medewerker)\b/gi;

// System-channel markers used in internal nudges ("[systeem] ...").
const SYSTEM_MARKER = /\[(systeem|system)\]/gi;

// Self-directive sentence patterns: imperatives addressed to the MODEL, or 3rd-person talk
// ABOUT "de klant". A genuine reply addresses the customer in 2nd person ("je"/"u") and
// never instructs itself, so a sentence matching any of these is a leaked directive and the
// whole sentence is dropped. Kept high-precision (mechanism, not invented stats): each verb
// here is one that appears in tools.ts/prompt.ts directive strings, not in customer copy.
const DIRECTIVE_SENTENCE: RegExp[] = [
  /\bverwijs\s+(de\s+klant\s+|je\s+|hem\s+|haar\s+)?naar\b/i, // "verwijs (de klant) naar ..."
  /\bverwijs\s+naar\s+(het|de)\b/i, // "verwijs naar het annuleringsbeleid" (the observed leak)
  /\bverzin\s+(geen|nooit|niets)\b/i, // "verzin geen contactgegevens", "verzin nooit een id"
  /\bzeg\s+(dit|dat)\s+vriendelijk\b/i, // "Zeg dit vriendelijk en ..."
  /\bzeg\s+nooit\b/i, // "Zeg NOOIT 'neem contact op via WhatsApp'"
  /\blees\s+.{0,40}?\bterug\b/i, // "Lees dienst + tijd terug ..."
  /\bbeschrijf\s+.{0,40}?\bnooit\b/i, // "Beschrijf een boeking nooit ..."
  /\broep\s+\w+\s+(opnieuw\s+)?aan\b/i, // "roep cancel_appointment (opnieuw) aan"
  /\bpas\s+na\s+(de\s+)?bevestiging\b/i, // "Pas NA de bevestiging van de klant ..."
  /\bniet\s+geannuleerd\b/i, // "NIET geannuleerd. ..."
  /\bvraag\s+(de\s+klant|welke\s+de\s+klant|of\s+er\s+nog)\b/i, // "Vraag welke de klant bedoelt"
  /\bde\s+klant\s+(bedoelt|wil|of\b|naar\b|om\b)\b/i, // 3rd-person about the customer
];

// Split into sentence-ish segments on terminal punctuation/newlines, KEEPING the delimiter
// so a surviving sentence reads naturally after re-joining.
function splitSentences(text: string): string[] {
  return text.match(/[^.!?\n]+[.!?]*\n?|\n/g) ?? [text];
}

export function stripInternalDirectives(text: string): { clean: string; stripped: string[] } {
  if (!text) return { clean: text, stripped: [] };
  const stripped: string[] = [];

  // a) Drop whole sentences that are self-directives.
  const kept = splitSentences(text).filter((seg) => {
    const isDirective = DIRECTIVE_SENTENCE.some((re) => re.test(seg));
    if (isDirective) stripped.push(seg.trim());
    return !isDirective;
  });
  let t = kept.join("");

  // b) Strip inline internal tokens/tags that should never survive in ANY context. Detect via
  // a before/after compare rather than .test(): the constants carry the /g flag and .test() on
  // a global regex is stateful (advances lastIndex), which is a footgun. .replace() is not.
  const before1 = t; t = t.replace(INTERNAL_TAGS, " "); if (t !== before1) stripped.push("<internal-tag>");
  const before2 = t; t = t.replace(INTERNAL_TOKENS, " "); if (t !== before2) stripped.push("<internal-token>");
  t = t.replace(SYSTEM_MARKER, " ");

  // c) Tidy whitespace/punctuation artifacts a strip can create.
  t = t
    .replace(/\s+([.,!?;:])/g, "$1") // " ." -> "."
    .replace(/([.,;:])\1+/g, "$1") // ".." -> "."
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s.,;:]+/, "")
    .trim();

  return { clean: t, stripped };
}

// --- 1b. One-question-per-turn detector (defense-in-depth regression signal) ---------

// Count the customer-facing questions in a reply. The persona-probe found the 20B/temp-0.2
// model bundling service + day/time + staff into ONE message (two or more questions at once),
// which a prompt rule alone does not reliably prevent on a small model. The prompt
// (<role> + <booking_flow>) does the behavioural work; this is its "garantie in code" companion,
// but a deliberately NON-destructive one: asking two things is a tone slip, not a wrong-DB-state,
// so the reply is never auto-rewritten (that would risk mangling a legit binary offer like
// "om 10:00 of 14:00?", which is ONE question). Instead the choke point (index.ts) flags a 2+
// result so the slip is visible in the edge logs and assertable on the testpad (ITEM 4 / ITEM 7).
// Method: ignore URLs (a payment link's query string contains "?"), then count runs of "?" so
// "echt??" counts once and "10:00 of 14:00?" counts once, while "welke dienst? en wanneer?"
// counts twice.
export function countCustomerQuestions(text: string): number {
  if (!text) return 0;
  const noUrls = text.replace(/https?:\/\/\S+/gi, " ");
  const runs = noUrls.match(/\?+/g);
  return runs ? runs.length : 0;
}

// --- 2. Em-dash hygiene + public entry point ----------------------------------------

export function sanitizeReply(text: string): string {
  if (!text) return text;

  // 1. Guardrail: remove any leaked internal directive/tag/token before anything else.
  const { clean, stripped } = stripInternalDirectives(text);
  if (stripped.length > 0) {
    console.warn("sanitizeReply: stripped internal directive leak:", JSON.stringify(stripped));
  }
  let t = clean;

  // 2. Em-dashes (and their en/figure/bar/minus cousins) read as "written by an AI", which
  //    Mathew wants to NEVER appear. Numeric ranges keep a plain hyphen; everywhere else a
  //    spaced/tight dash becomes a comma so the sentence still reads naturally.
  t = t.replace(new RegExp(`(\\d)\\s*[${DASHES}]\\s*(\\d)`, "g"), "$1-$2");
  t = t.replace(new RegExp(`\\s*[${DASHES}]\\s*`, "g"), ", ");
  // 3. Tidy artifacts a substitution can create.
  t = t
    .replace(/\s+,/g, ",") // " ," -> ","
    .replace(/,\s*,/g, ", ") // double comma -> single
    .replace(/^[\s,]+/, "") // leading comma/space from a line-initial dash
    .replace(/\s{2,}/g, " "); // collapse double spaces
  return t.trim();
}
