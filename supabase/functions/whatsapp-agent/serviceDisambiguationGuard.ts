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

// R96 RESCHEDULE-VS-SECOND-SERVICE GUARD (RESCHEDULE-HIJACK, sev-2, PREEMPT, R95-1).
//
// R95-1 (live-reproduced, evidence/IUX_r95.md + IUX_r96.md): a customer who already has an
// upcoming booking, and then names a SECOND, genuinely DIFFERENT service in natural phrasing
// ("en nu ook nog de Speciale Afspraak graag" / "also book me the Special appointment"), could
// make the model call reschedule_appointment instead of book_appointment. reschedule_appointment
// silently keeps the EXISTING booking's own service_type_id (prompt.ts's own guidance literally
// tells the model "the service normally stays the same, don't ask again" for a reschedule) while
// only moving the TIME -- so the customer's actual request (a second distinct service) is never
// fulfilled, no row for it is ever created, and nothing discloses this. Root cause identified by
// R95-verify: prompt.ts's reschedule-trigger rule ("an existing booking + a new time is ALWAYS
// reschedule_appointment, NEVER book_appointment") has no carve-out for "the new time is for a
// DIFFERENT service than the existing booking's own service". Prompt-only instructions were not
// the fix this loop settled on for the sibling R70-3/R71/R72/R76 findings (the model's own
// tool-choice judgment on a high-stakes decision proved unreliable under natural phrasing
// variance), so this closes it the SAME way: a deterministic, server-side, code-level block.
//
// WHAT THIS DOES: computes, from the customer's inbound conversation history, which service
// NAMES (by exact configured name substring/word match, reusing the same `mentionsAny` matcher
// serviceDisambiguationGuard already trusts) the customer has mentioned, restricted to a SMALL
// recency window (the current turn's message plus a few immediately preceding turns) so an
// service named far earlier in a long, unrelated conversation does not spuriously re-trigger this
// guard on an unrelated later reschedule. If the MOST RECENTLY named service (in that recency
// window) is a real, distinct, configured service name that does NOT match the target booking's
// OWN current service name, AND the model's reschedule_appointment call did not itself supply a
// service_type_id (an intentional same-calendar service switch, which stays allowed, see below),
// the guard blocks and redirects to book_appointment's confirm_second_booking path -- mirroring
// how the existing book_appointment duplicate-guard (tools.ts ~1436) already phrases this exact
// disambiguation for its OWN entrypoint. reschedule_appointment gains the identical guarantee at
// ITS entrypoint, closing the specific gap R95-1 exploited.
//
// FALSE-POSITIVE SAFETY:
// - A genuine reschedule of the SAME service (the overwhelmingly common case: "kan het een uur
//   later?", no new service ever named) never blocks: `namedDistinctService` is null when no
//   service name other than the booking's own appears in the recency window.
// - A DELIBERATE same-calendar service switch via reschedule_appointment (prompt.ts's own
//   documented "ALLEEN bij meerdere agenda's ... wil de klant naar een ANDERE medewerker/locatie
//   verzetten" path, and the sibling single-calendar "wil de klant een ANDERE dienst i.p.v. alleen
//   een andere tijd" instruction, which tells the model to cancel+rebook) is NOT this guard's
//   concern: this guard only fires when the model calls reschedule_appointment WITHOUT an explicit
//   service_type_id AND the customer's own words point at a different service than the booking's
//   current one -- i.e. exactly the shape where the model is about to silently keep the OLD
//   service while the customer asked for a NEW one. If the model explicitly resolved and passed a
//   service_type_id (a conscious switch decision, already reviewed by the model), this guard does
//   not second-guess that call; only the "silently defaults to the old service" shape is blocked.
// - The recency window (default 4 messages, tunable) means a service mentioned many turns earlier
//   and since resolved/booked/abandoned cannot leak into blocking an unrelated later reschedule.

export interface RescheduleDistinctServiceInput {
  allServiceNames: string[]; // every distinct configured service name across the relevant calendar(s)
  currentServiceName: string | null; // the booking's OWN current service name (or null if unknown)
  recentInboundTexts: string[]; // the last few inbound (customer) messages, oldest first, THIS turn last
  modelSuppliedServiceId: boolean; // true if reschedule_appointment's call included service_type_id
}

// Word-level match restricted to a name's DISTINGUISHING words only (excludes any word the name
// shares with `excludeWords`, e.g. two services that both happen to contain the generic word
// "Afspraak"). Without this exclusion, `mentionsAny`'s generic word-splitting would treat a message
// naming ONLY the current service ("mijn Standaard Afspraak") as ALSO naming a distinct service
// ("Speciale Afspraak") purely because both names share the word "Afspraak", a real false-positive
// this guard's own test suite caught. Falls back to a full-name substring check first (the common,
// unambiguous case), then to word-level matching using ONLY the distinguishing words.
function mentionsDistinguishing(text: string, name: string, excludeWords: Set<string>): boolean {
  const lower = text.toLowerCase();
  const trimmedName = name.trim().toLowerCase();
  if (trimmedName.length >= 2 && lower.includes(trimmedName)) return true;
  const words = trimmedName
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w) && !excludeWords.has(w));
  if (words.length === 0) return false; // every word is shared/generic: no safe distinguishing word to match on
  return words.some((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower));
}

// Returns the distinct, different-from-current service name the customer named most recently in
// the recency window, or null if none (safe default: guard does not fire).
export function findDistinctServiceForReschedule(input: RescheduleDistinctServiceInput): string | null {
  const { allServiceNames, currentServiceName, recentInboundTexts, modelSuppliedServiceId } = input;
  if (modelSuppliedServiceId) return null; // an explicit, reviewed switch: not this guard's concern
  const current = currentServiceName ? normServiceName(currentServiceName) : null;
  const distinctNames = [...new Set(allServiceNames.map(normServiceName))].filter((n) => n !== current);
  if (distinctNames.length === 0) return null; // only one service exists (or matches current): nothing to confuse
  // Words the CURRENT service's own name contributes (e.g. "afspraak") must never, by themselves,
  // count as evidence of a DIFFERENT service being named; every distinct-name word check below
  // excludes them.
  const currentWords = new Set(current ? current.split(/\s+/).filter((w) => w.length >= 3) : []);
  // Scan the recency window NEWEST-FIRST so the customer's MOST RECENT naming wins if they
  // mentioned more than one distinct service across the window (their latest statement is the
  // one actually in play this turn).
  for (let i = recentInboundTexts.length - 1; i >= 0; i--) {
    const text = recentInboundTexts[i];
    for (const name of distinctNames) {
      if (mentionsDistinguishing(text, name, currentWords)) {
        // Return the ORIGINAL-cased configured name (not the normalized form) for use in the
        // customer-facing redirect message.
        const original = allServiceNames.find((n) => normServiceName(n) === name);
        return original ?? name;
      }
    }
    // Stop scanning further back once we hit a message that also mentions the CURRENT service by
    // name: that is the customer re-confirming/discussing the existing booking, not introducing a
    // new one, so an even-earlier distinct-service mention should not leak through past it.
    if (current && currentServiceName && mentionsAny([text], [currentServiceName])) break;
  }
  return null;
}

export const RESCHEDULE_DISTINCT_SERVICE_MESSAGE = (distinctService: string) =>
  `De klant noemde zojuist "${distinctService}", een ANDERE dienst dan de dienst van de bestaande afspraak. Roep reschedule_appointment NIET aan (dat zou stilzwijgend de dienst van de bestaande afspraak ongewijzigd laten en alleen de tijd verzetten, zonder de gevraagde "${distinctService}" ooit te boeken). Vraag kort: is dit een AANVULLENDE, tweede afspraak naast de bestaande (roep dan book_appointment aan met confirm_second_booking:true), of wil de klant de bestaande afspraak ECHT vervangen door "${distinctService}" (annuleer dan de oude en boek de nieuwe dienst opnieuw)? Verzin dit niet zelf; vraag het de klant.`;
