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
  // price/durationMin are optional (R72 addition): the sibling `shouldBlockForMissingServiceChoice`
  // check never reads them, only `shouldBlockForAmbiguousBranch` (R72) does, so every existing call
  // site/test that only passes `{ name }` keeps compiling and behaving byte-identically.
  calendars: Array<{ name: string; services: Array<{ name: string; price?: number | null; durationMin?: number | null }> }>;
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

// R72 SAME-SERVICE-MULTI-BRANCH extension (SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT, sev-2).
//
// R71's guard above only covers "customer named NEITHER a service NOR a branch". A sibling,
// OLDER, prompt-only rule (prompt.ts's <kalenders> block, "same service, multiple branches, ask
// which branch") was supposed to cover the case where the customer DOES name a real service that
// happens to exist at 2+ calendars under the same name but with a genuinely different price and/or
// duration (e.g. "Massage" at EUR60/60min at one branch vs EUR40/45min at another). Confirmed
// FLAKY (R71-verify: 0/6 one batch, 2/3 another; this round's own independent reproduction: 20/20
// silently defaulted to one branch with zero disclosure, real different price/duration, same
// defect SHAPE as R70-3). Rather than a further prompt-only patch attempt on a rule already proven
// unreliable this round, this extends the SAME deterministic, server-side guard mechanism.
//
// WHAT THIS DOES: a service the customer named (by name-substring match, reusing `mentionsAny`)
// that resolves to 2+ DISTINCT calendars whose price and/or duration for that service name
// genuinely differ, with no specific branch/calendar named yet, blocks exactly like the sibling
// condition (same "kies_dienst" tool error, forcing a clarifying "which location" question).
//
// FALSE-POSITIVE SAFETY (mirrors the sibling condition's own safety design):
// - A service offered at only ONE calendar, or at multiple calendars with the IDENTICAL
//   price+duration everywhere it is offered, never blocks (no real ambiguity to resolve, so a
//   same-priced multi-branch service proceeds without a needless interruption).
//   IMPORTANT: this is evaluated PER NAMED SERVICE, not globally. A business can have one service
//   that is genuinely ambiguous (different price/branch) alongside another that is not; only a
//   customer who named the AMBIGUOUS one is blocked.
// - Once the customer has named a specific branch/calendar (by name, the same `mentionsAny`
//   matcher the sibling condition uses) anywhere in the conversation, this never blocks: the
//   ambiguity is already resolved.
// - Never fires for the neither-named case (that is the sibling `shouldBlockForMissingServiceChoice`
//   condition's own job, kept separate and unmodified) or for a single-calendar tenant.
function normServiceName(n: string): string {
  return n.trim().toLowerCase();
}

// True when the SAME service name appears at 2+ calendars with a genuinely different price
// and/or duration (the actual customer-facing consequence a silent default would hide).
function serviceIsAmbiguousAcrossBranches(calendars: DisambiguationInput["calendars"], serviceName: string): boolean {
  const target = normServiceName(serviceName);
  const matches = calendars.flatMap((c) =>
    c.services.filter((s) => normServiceName(s.name) === target).map((s) => ({ price: s.price ?? null, durationMin: s.durationMin ?? null }))
  );
  if (matches.length <= 1) return false; // only offered at one calendar: no branch ambiguity
  const first = matches[0];
  return matches.some((m) => m.price !== first.price || m.durationMin !== first.durationMin);
}

// Returns true when the guard should BLOCK for the "service named, but ambiguous across 2+
// differently-priced/duration calendars, no branch specified" condition.
export function shouldBlockForAmbiguousBranch(input: DisambiguationInput): boolean {
  const { calendars, inboundTexts } = input;
  if (calendars.length <= 1) return false; // single-calendar: never applicable
  const calendarNames = calendars.map((c) => c.name);
  if (mentionsAny(inboundTexts, calendarNames)) return false; // branch already named: resolved
  const allServiceNames = calendars.flatMap((c) => c.services.map((s) => s.name));
  const distinctServiceNames = [...new Set(allServiceNames.map(normServiceName))];
  // Which distinct service names did the customer actually mention? Check each individually
  // (not the whole list at once) so we know WHICH service is in play, not merely THAT one is.
  const namedServices = distinctServiceNames.filter((name) => mentionsAny(inboundTexts, [name]));
  if (namedServices.length === 0) return false; // no service named: the sibling condition's job, not this one
  // Block if ANY service the customer named is itself ambiguous across differently-priced/duration
  // branches. (A customer who names two services, one ambiguous and one not, should still be asked.)
  return namedServices.some((name) => serviceIsAmbiguousAcrossBranches(calendars, name));
}

export const KIES_DIENST_MESSAGE =
  "De klant noemde nog geen specifieke dienst en geen specifieke medewerker/locatie, en dit bedrijf biedt genuinely verschillende diensten per persoon/locatie aan (andere prijs/duur/dienst). Roep get_available_slots of book_appointment NIET aan; vraag EERST kort en menselijk welke dienst de klant wil (bijvoorbeeld \"Waarvoor wil je een afspraak maken?\", eventueel met 2-3 diensten als voorbeeld). Zodra de klant een dienst (of een persoon/locatie) noemt, mag je gewoon doorgaan.";

export const KIES_LOCATIE_MESSAGE =
  "De klant noemde een dienst die bij meerdere medewerkers/locaties wordt aangeboden met een ECHT andere prijs en/of duur, maar noemde nog geen specifieke medewerker/locatie. Roep get_available_slots of book_appointment NIET aan; vraag EERST kort en menselijk bij wie of waar de klant de afspraak wil (bijvoorbeeld \"bij wie/waar wil je de afspraak?\"), en noem de opties als personen/plekken in natuurlijke taal (nooit \"agenda's\" of technische namen). Zodra de klant een persoon/locatie noemt, mag je gewoon doorgaan.";
