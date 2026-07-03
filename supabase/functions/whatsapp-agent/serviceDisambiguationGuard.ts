// R71 SERVICE-DISAMBIGUATION GUARD (the "never silently default a branch/service" guarantee,
// in CODE not prompt).
//
// R70-3 (sev-2): in a multi-calendar business with genuinely different services/prices/durations
// per branch, a customer who names NEITHER a specific service NOR a specific branch ("heb je
// morgen nog plek?", "ik wil een afspraak maken") was silently routed to one branch/service (the
// model's own guess) with ZERO disclosure anywhere in the conversation, including the booking
// confirmation. Prompt-only steering (multiple attempts, increasing salience) did not reliably
// close this against the live model (gpt-oss-20b is documented elsewhere in this codebase as
// looser on instruction-adherence than gpt-4.1-mini, see A1d), so this guard makes the guarantee
// a SERVER-SIDE gate, matching the existing pattern of confirmCancel/confirmBook/hardConfirm and
// resolveBookingCalendar's own "refuse to guess, ask" behaviour in tools.ts.
//
// WHAT THIS DOES: computes, once per turn (in index.ts, from the conversation's inbound history +
// the current message), whether the customer has EVER named a specific service (by name-substring
// match against the owner's own configured service names) OR a specific calendar/branch (by
// name-substring match against the owner's own configured calendar names) anywhere in this
// conversation. If NEITHER has ever been named, AND this is genuinely a multi-calendar business
// where more than one DISTINCT service name exists across the calendar set (so there is real
// ambiguity to resolve, not just multiple locations offering the exact same one service), the
// tool layer (tools.ts) refuses get_available_slots and the book_appointment PREVIEW step with a
// "kies_dienst" error, exactly like resolveBookingCalendar's existing needAsk path, so the model
// is forced to ask which service before it can silently proceed.
//
// FALSE-POSITIVE SAFETY (single-branch / single-service businesses must be unaffected):
// - Single-calendar tenants: this guard is never consulted (tools.ts only checks it when
//   ctx.calendars.length > 1, the same gate every other multi-calendar rule already uses).
// - Multi-calendar tenants where every calendar offers the SAME one service name (a genuine
//   "which of our stylists has room" case, not a service-ambiguity case): distinctServiceCount
//   <= 1, so the guard never fires; resolveBookingCalendar's existing "same service everywhere"
//   business-as-usual path (or its "ask who" tie-break) is unaffected.
// - Once the customer has named ANY matching service or calendar name at ANY point earlier in the
//   conversation (not just this turn), the guard is satisfied for the rest of the conversation
//   (matches how a real receptionist would remember what was already said); it only fires on a
//   customer who has genuinely never given either signal.

export interface DisambiguationInput {
  calendars: Array<{ name: string; services: Array<{ name: string }> }>;
  inboundTexts: string[]; // every inbound (customer) message in this conversation, oldest first
}

// Case-insensitive match, tolerant of the customer typing a service/branch name with different
// casing/punctuation, OR just its distinguishing word rather than the full configured name (a
// real customer types "bij Zuid" or "bij Anna", not the full "R71 Zuid" or "Anna's Kapsalon
// Centrum" a business owner configured). Matches when EITHER the full configured name appears in
// the customer's text, OR any individual word (3+ letters, generic filler words excluded) of the
// configured name appears as a whole word in the customer's text. Deliberately simple (no NLP/
// fuzzy match): a real name-mention is the ONLY signal this guard trusts, so a false negative
// (never firing when it should have) is far safer than a false positive here in the strict
// direction (a name/word accidentally matching unrelated text would only make the guard LESS
// strict, never book anything wrong). The word-level match closes the OTHER false-positive risk:
// a customer who DID name their branch/service, just not with its exact full configured string,
// must never be needlessly asked again (see the single-relevant-option false-positive check).
const GENERIC_NAME_WORDS = new Set(["de", "het", "een", "en", "van", "voor", "bij", "in", "op", "salon", "kapsalon", "praktijk", "studio"]);
function mentionsAny(haystacks: string[], needles: string[]): boolean {
  const names = needles.map((n) => n.trim().toLowerCase()).filter(Boolean);
  if (!names.length) return false;
  return haystacks.some((text) => {
    const lower = text.toLowerCase();
    for (const name of names) {
      if (name.length >= 2 && lower.includes(name)) return true;
      const words = name.split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w));
      for (const word of words) {
        if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)) return true;
      }
    }
    return false;
  });
}

// Returns true when the guard should BLOCK (i.e. neither a service nor a branch has ever been
// named by the customer, AND real service ambiguity exists across the calendar set).
export function shouldBlockForMissingServiceChoice(input: DisambiguationInput): boolean {
  const { calendars, inboundTexts } = input;
  if (calendars.length <= 1) return false; // single-calendar: never applicable
  const allServiceNames = calendars.flatMap((c) => c.services.map((s) => s.name));
  const distinctServiceNames = new Set(allServiceNames.map((n) => n.trim().toLowerCase()));
  if (distinctServiceNames.size <= 1) return false; // every branch offers the same one service: no ambiguity
  const calendarNames = calendars.map((c) => c.name);
  const namedService = mentionsAny(inboundTexts, allServiceNames);
  const namedBranch = mentionsAny(inboundTexts, calendarNames);
  return !namedService && !namedBranch;
}

export const KIES_DIENST_MESSAGE =
  "De klant noemde nog geen specifieke dienst en geen specifieke medewerker/locatie, en dit bedrijf biedt genuinely verschillende diensten per persoon/locatie aan (andere prijs/duur/dienst). Roep get_available_slots of book_appointment NIET aan; vraag EERST kort en menselijk welke dienst de klant wil (bijvoorbeeld \"Waarvoor wil je een afspraak maken?\", eventueel met 2-3 diensten als voorbeeld). Zodra de klant een dienst (of een persoon/locatie) noemt, mag je gewoon doorgaan.";
