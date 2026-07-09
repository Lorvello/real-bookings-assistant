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

// R98 STRUCTURAL FIX (3rd distinct bug in this exact function across R95/R96/R97-verify; see
// header comment above the R96 section for the full history). R97-verify found: the early-break
// condition treated ANY message mentioning the current service as "the customer re-confirming",
// including the AGENT'S OWN confused outbound replies (e.g. "Ik zie dat je al een Standaard
// Afspraak hebt... wil je die verzetten?"), which broke the scan before it reached the customer's
// real, earlier, distinct-service request. Point-patching just that one `if` was rejected in favor
// of a CONTRACT change: the function no longer accepts a flat, direction-erased `string[]` under a
// misleading name. It now takes `recentMessages: RecencyWindowMessage[]`, each row tagged with its
// real `direction`, so ANY future "did the CUSTOMER say X" logic added to this function is
// structurally forced to filter by direction rather than being able to silently reintroduce a
// direction-blind read (the exact mistake this bug was). The two existing uses of the window are
// kept deliberately asymmetric, per the audit above:
// - the FORWARD "was a distinct service raised at all" scan stays direction-agnostic on purpose
//   (an agent's own echo of the distinct service name during a disambiguation exchange is valid
//   antecedent evidence the customer is still discussing it -- this is R96's own
//   R96-SELFTEST GAP fix and must not regress);
// - the "stop scanning, customer is re-confirming the CURRENT service" break is now filtered to
//   `direction === "inbound"` ONLY, by the data shape itself, not by an ad hoc condition that can
//   be lost again in a future edit.
export type RecencyWindowDirection = "inbound" | "outbound";
export interface RecencyWindowMessage {
  direction: RecencyWindowDirection;
  content: string;
}

export interface RescheduleDistinctServiceInput {
  allServiceNames: string[]; // every distinct configured service name across the relevant calendar(s)
  currentServiceName: string | null; // the booking's OWN current service name (or null if unknown)
  recentMessages: RecencyWindowMessage[]; // last few messages BOTH directions, oldest first, THIS turn last
  modelSuppliedServiceId: boolean; // true if reschedule_appointment's call included service_type_id
}

// Word-level match restricted to a name's DISTINGUISHING words only (excludes any word the name
// shares with `excludeWords`, e.g. two services that both happen to contain the generic word
// "Afspraak"). Without this exclusion, `mentionsAny`'s generic word-splitting would treat a message
// naming ONLY the current service ("mijn Standaard Afspraak") as ALSO naming a distinct service
// ("Speciale Afspraak") purely because both names share the word "Afspraak", a real false-positive
// this guard's own test suite caught. Falls back to a full-name substring check first (the common,
// unambiguous case), then to word-level matching using ONLY the distinguishing words.
export function mentionsDistinguishing(text: string, name: string, excludeWords: Set<string>): boolean {
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
  const { allServiceNames, currentServiceName, recentMessages, modelSuppliedServiceId } = input;
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
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    // FORWARD scan (was a distinct service raised at all): stays direction-agnostic BY DESIGN.
    // An agent's own echo of the distinct service's name during a disambiguation exchange (R96's
    // R96-SELFTEST GAP fix) is valid antecedent evidence the customer is still discussing that
    // service, so both inbound and outbound rows are checked here, unchanged from before.
    for (const name of distinctNames) {
      if (mentionsDistinguishing(msg.content, name, currentWords)) {
        // Return the ORIGINAL-cased configured name (not the normalized form) for use in the
        // customer-facing redirect message.
        const original = allServiceNames.find((n) => normServiceName(n) === name);
        return original ?? name;
      }
    }
    // R98 STRUCTURAL FIX (3rd bug in this function across R95/R96/R97-verify): stop scanning
    // further back once we hit an INBOUND (customer) message that also mentions the CURRENT
    // service by name -- that is the CUSTOMER re-confirming/discussing the existing booking, not
    // introducing a new one, so an even-earlier distinct-service mention should not leak through
    // past it. An OUTBOUND (agent) message mentioning the current service (e.g. the agent's own
    // confused "Ik zie dat je al een Standaard Afspraak hebt... wil je die verzetten?") is NOT
    // customer intent and must NEVER break the scan; the `direction === "inbound"` guard makes
    // this structurally enforced by the data shape, not by a condition that can be silently lost
    // in a future edit the way the pre-R98 code was.
    if (msg.direction === "inbound" && current && currentServiceName && mentionsAny([msg.content], [currentServiceName])) break;
  }
  return null;
}

export const RESCHEDULE_DISTINCT_SERVICE_MESSAGE = (distinctService: string) =>
  `De klant noemde zojuist "${distinctService}", een ANDERE dienst dan de dienst van de bestaande afspraak. Roep reschedule_appointment NIET aan (dat zou stilzwijgend de dienst van de bestaande afspraak ongewijzigd laten en alleen de tijd verzetten, zonder de gevraagde "${distinctService}" ooit te boeken). Vraag kort: is dit een AANVULLENDE, tweede afspraak naast de bestaande (roep dan book_appointment aan met confirm_second_booking:true), of wil de klant de bestaande afspraak ECHT vervangen door "${distinctService}" (annuleer dan de oude en boek de nieuwe dienst opnieuw)? Verzin dit niet zelf; vraag het de klant.`;

// R140 PENDING-SECOND-BOOKING SERVICE-SWITCH GUARD (closes the SERVICE-SWITCH-DEAD-END, sev-3,
// filed by R129's own adversarial verify).
//
// ROOT CAUSE (live-reproduced, S6 testpad, fresh fixture phone, real deployed whatsapp-agent):
// with a first booking (A) already confirmed, and a second, genuinely distinct booking (B)
// already mid-flow as an uncommitted pending_booking preview (the R75/confirm_second_booking
// path), a customer who then tries to switch B's OWN service to a different one ("wacht, ik wil
// toch de Speciale Afspraak voor de tweede afspraak") got stuck in a conversational dead-end: the
// model re-calls book_appointment with the new service but WITHOUT confirm_second_booking:true
// (it is not, in its own mind, starting a brand-new THIRD booking, it is correcting the
// already-agreed second one). This re-triggers the R75 "bestaande_afspraak" duplicate guard
// against booking A, a guard whose own question ("is this a reschedule of the existing booking,
// or a genuine second one?") was ALREADY answered the moment pending_booking B was created. The
// model, unable to resolve the resulting repeated disambiguation, degrades into
// cancel_appointment/update_booking_name flailing and finally a generic "contact us directly"
// reply, never reaching book_appointment's own "vorige_boeking_nog_open" service-switch logic at
// all. FAILS SAFE throughout (booking A's own row is never touched by this guard's own mechanism,
// and B's stuck preview never writes a wrong-duration/duplicate row), but it is a genuine,
// reproducible dead-end.
//
// FIX SHAPE (two parts, both additive, no existing guard weakened):
// 1. hasEstablishedSecondBookingPreview (tools.ts) lets the R75 duplicate-guard recognize "this
//    fresh pending_booking already IS the reviewed, established second booking" (its
//    originator_name is a real name, genuinely distinct from the existing real booking's own
//    customer_name, exactly the fact confirm_second_booking/abandon_previous_preview already
//    proved true when B was first created) and skip re-asking its own already-answered question,
//    falling through instead to the existing service/time preview logic below it.
// 2. This function, findServiceSwitchForPendingPreview, mirrors findDistinctServiceForReschedule
//    (same mentionsDistinguishing matcher, same "a real, distinct, configured service name was
//    just named" signal) but answers the SIBLING question for a still-uncommitted PREVIEW rather
//    than a committed booking: does the CUSTOMER'S CURRENT message name a real configured service
//    different from pending_booking B's own currently-stored service? If so, tools.ts's
//    "vorige_boeking_nog_open" guard treats this exactly like an explicit abandon-and-replace
//    (clearing the stale preview and re-previewing under the NEW service), without requiring the
//    model to discover/set abandon_previous_preview itself (proven unreliable for the sibling
//    "drop it" case by R96; the same unreliability applies here to a "switch it" statement).
//
// FALSE-POSITIVE SAFETY:
// - Only ever consulted by tools.ts when a fresh pending_booking already exists for a DIFFERENT
//   service_type_id than the one this turn's book_appointment call resolved to (the exact same
//   precondition the sibling "vorige_boeking_nog_open" guard itself already requires). Never
//   fires outside that narrow, already-safety-checked shape.
// - A message that only re-confirms the PENDING preview's OWN current service name (no distinct
//   service named) returns null: a plain "ja, die klopt" never falsely triggers a switch.
// - Reuses the exact same distinguishing-word matcher as the reschedule-hijack guard, so a shared
//   generic word across two service names ("Standaard Afspraak" / "Speciale Afspraak" both
//   containing "Afspraak") can never, by itself, count as naming a distinct service.
export function findServiceSwitchForPendingPreview(input: {
  allServiceNames: string[]; // every distinct configured service name across the relevant calendar(s)
  pendingServiceName: string | null; // pending_booking B's OWN currently-stored service name
  currentMessage: string; // this turn's raw customer message
}): string | null {
  const { allServiceNames, pendingServiceName, currentMessage } = input;
  const pending = pendingServiceName ? normServiceName(pendingServiceName) : null;
  const distinctNames = [...new Set(allServiceNames.map(normServiceName))].filter((n) => n !== pending);
  if (distinctNames.length === 0) return null; // only one service exists (or matches pending): nothing to switch to
  const pendingWords = new Set(pending ? pending.split(/\s+/).filter((w) => w.length >= 3) : []);
  for (const name of distinctNames) {
    if (mentionsDistinguishing(currentMessage, name, pendingWords)) {
      const original = allServiceNames.find((n) => normServiceName(n) === name);
      return original ?? name;
    }
  }
  return null;
}

// R111 RETURNING-SERVICE-DEFAULT-BLEED GUARD (the "never silently assume the returning customer's
// last service/date" guarantee, in CODE not prompt; closes R107-RETURNING-DEFAULT-BLEED).
//
// ROOT CAUSE (live-reproduced on a fresh single-calendar fixture, phone-scoped history, S6
// testpad): when a phone number has ANY booking history at all (any status, most-recent by
// start_time; see index.ts's `lastService` derivation), a bare unspecified booking request ("ik
// wil weer een afspraak maken", "gewoon weer een afspraak zoals de vorige keer") made the model
// silently treat the LAST-BOOKED service as already-settled and jump straight to
// get_available_slots / book_appointment for date/time, with ZERO disclosure of the assumed
// service, and sometimes with an equally silent assumed date ("morgen"). prompt.ts's own
// `<context>` line ("verifieer of ze weer hetzelfde willen voordat je boekt") was too weak: it
// asks the model to "verify" but never says WHEN (before any tool call) or HOW (an explicit,
// named, confirmable question), and prompt-only steering has repeatedly proven unreliable against
// this model at this scale elsewhere in this codebase (OWNERESCALATION-VERBLIST-BRITTLE,
// AFFIRM-CONFIRM, R70-3/R71/R72's own service-disambiguation history). This guard makes the
// disclosure a SERVER-SIDE gate, the same architecture as `shouldBlockForMissingServiceChoice`
// above: refuse the slot-lookup/booking tool and force the model to ask, rather than trusting it
// to remember to ask on its own.
//
// WHAT THIS DOES: computes, once per turn (in index.ts), whether (a) this phone has a known
// `lastService` (a real returning-customer signal), (b) the customer has NOT, in their CURRENT
// message, named any real configured service themselves (a customer who names a service, even a
// DIFFERENT one, has resolved the ambiguity themselves and needs no disclosure question), and (c)
// the conversation has not already confirmed/resolved the returning-service assumption (tracked
// via a `returning_service_confirmed` conversation-context marker, set once the customer answers
// the disclosure question either way, mirroring the pending_*_verification marker convention used
// throughout this codebase). If all three hold, the tool layer refuses get_available_slots and the
// book_appointment PREVIEW step with a "bevestig_terugkerende_dienst" error, forcing the model to
// ask the disclosure-and-confirm question ("Ik ga uit van dezelfde dienst als de vorige keer,
// <service>, klopt dat?") before any slot-availability lookup or date assumption can occur.
//
// FALSE-POSITIVE SAFETY:
// - No booking history at all (fresh customer): lastService is null, this guard never fires
//   (byte-identical to today's behaviour for the common non-returning case).
// - The customer names ANY real configured service in their current message (the returning one, a
//   different one, or simply states what they want): resolved by construction, never blocks.
// - Once `returning_service_confirmed` is set for this conversation (the customer answered the
//   disclosure question, confirming OR correcting it), this never blocks again for the rest of the
//   conversation, so the guard fires AT MOST once per conversation, matching a real receptionist
//   who only asks once.
export interface ReturningServiceDefaultInput {
  lastService: string | null | undefined;
  currentMessage: string;
  allServiceNames: string[]; // every real configured service name for this calendar/customer
  returningServiceConfirmed: boolean; // conversation-context marker: already asked+answered
  // R118 (STALE-SERVICE-DEFAULT-OVERRIDE fix, closes the R23 full-journey-simulation finding):
  // recent same-thread CUSTOMER messages (most-recent-first is fine, order does not matter, just
  // needs to include the last few turns), checked in ADDITION to `currentMessage`. Optional and
  // additive: omitting it (as every pre-existing R111 test does) reproduces the exact prior
  // behaviour byte-for-byte. See the block below for why this exists.
  recentInboundTexts?: string[];
}

// CODE-REVIEW FIX (found during this guard's own live testing, S6 testpad): the generic
// `mentionsAny` matcher (used by the sibling multi-calendar guards above) word-splits a configured
// name and treats ANY individual word (3+ letters, only a small business-generic exclude list
// applied) as a valid standalone match. Real service catalogs routinely share a generic noun across
// EVERY service name ("Standaard Afspraak" / "Speciale Afspraak" both contain "Afspraak"; "Knipbeurt
// Dames" / "Knipbeurt Heren" both contain "Knipbeurt"), and `mentionsAny`'s own exclude list (`de`,
// `salon`, `kapsalon`, ...) has no way to know which words are catalog-specific vs shared, since it
// only ever sees ONE needle at a time. Live-reproduced: "gewoon weer een afspraak zoals de vorige
// keer" (a BARE request naming no service at all) matched "Speciale Afspraak" purely via the shared
// word "afspraak", silently resolving this guard's own ambiguity check on the very message it exists
// to catch, the SAME failure shape R107-RETURNING-DEFAULT-BLEED itself describes. This guard needs a
// STRICTER bar than the sibling multi-calendar guards (which only ever fail LESS strict on a false
// negative, safe per their own design note above): a word shared across 2+ of THIS calendar's own
// configured service names is excluded from the word-level match entirely (only the FULL configured
// name, or one of its DISTINGUISHING words, counts), mirroring `mentionsDistinguishing`'s own
// same-shared-word exclusion used by the reschedule-hijack guard below.
function distinguishingWordsFor(name: string, allNames: string[]): Set<string> {
  const norm = (n: string) => n.trim().toLowerCase();
  const wordsOf = (n: string) => norm(n).split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_NAME_WORDS.has(w));
  const ownWords = new Set(wordsOf(name));
  const sharedWithOthers = new Set<string>();
  for (const other of allNames) {
    if (norm(other) === norm(name)) continue;
    for (const w of wordsOf(other)) {
      if (ownWords.has(w)) sharedWithOthers.add(w);
    }
  }
  return new Set([...ownWords].filter((w) => !sharedWithOthers.has(w)));
}

function mentionsServiceNameStrict(text: string, allServiceNames: string[]): boolean {
  const lower = text.toLowerCase();
  for (const name of allServiceNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    // Full configured name, exact substring: always a valid, unambiguous match.
    if (trimmed.length >= 2 && lower.includes(trimmed.toLowerCase())) return true;
    // A DISTINGUISHING word only (one this service's name does NOT share with any OTHER configured
    // service name in the same set): a word shared across every service ("afspraak", "knipbeurt")
    // never counts on its own.
    for (const word of distinguishingWordsFor(trimmed, allServiceNames)) {
      if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)) return true;
    }
  }
  return false;
}

export function shouldBlockReturningServiceDefault(input: ReturningServiceDefaultInput): boolean {
  const { lastService, currentMessage, allServiceNames, returningServiceConfirmed, recentInboundTexts } = input;
  if (!lastService || !lastService.trim()) return false; // no history: not a returning customer
  if (returningServiceConfirmed) return false; // already asked+answered this conversation
  // A customer who names ANY real configured service themselves (including the returning one)
  // has resolved the ambiguity; nothing to silently assume.
  if (mentionsServiceNameStrict(currentMessage, allServiceNames)) return false;
  // R118 (STALE-SERVICE-DEFAULT-OVERRIDE fix): ROOT CAUSE, live-reproduced (full-journey
  // simulation R23, multi-calendar entry-code thread, Milan/"Volledige kleuring"). Before this
  // fix, ONLY the single literal current message was checked above; the durable
  // `returning_service_confirmed` context marker (set the turn the customer first names a
  // service, see index.ts) is what was relied on to keep the guard from re-firing on a later
  // turn that does not repeat the service name. That marker write is a separate, later DB
  // round-trip in the SAME turn that named the service, and is not guaranteed to have landed (or
  // to have survived an unrelated concurrent context write) by the time the NEXT turn's read
  // happens. Net effect: an explicit, same-thread service statement from just 1-2 turns earlier
  // could be silently outranked by OLDER `bookings` history the instant the marker write did not
  // (or had not yet) persist, exactly R23's reproduction. This check makes the guard itself
  // self-contained instead of solely trusting that side-effect write: it also inspects a small,
  // BOUNDED window of the most recent customer messages (deliberately NOT the full conversation
  // history, unlike the sibling R71 "has a service ever been named" guards, since THIS guard's
  // guarantee is specifically about a RECENT explicit statement outranking OLDER historical-
  // booking data, not "ever mentioned"). A genuinely stale mention from many turns ago must not
  // silently resolve a brand-new bare ask; the caller (index.ts) is responsible for keeping this
  // window small (a handful of the most recent inbound turns).
  if (recentInboundTexts && recentInboundTexts.some((t) => mentionsServiceNameStrict(t, allServiceNames))) {
    return false;
  }
  return true;
}

// Exposed standalone so index.ts can persist `returning_service_confirmed` on ANY turn where the
// customer names a real configured service, independent of whether this particular turn's own
// blockForReturningServiceDefault decision fired (e.g. the customer names the service on the SAME
// turn as their very first bare request, before the guard would even have blocked yet). Reuses the
// exact same STRICT matcher `shouldBlockReturningServiceDefault` trusts, so "resolved" means the
// identical thing in both places.
export function mentionsAnyServiceName(currentMessage: string, allServiceNames: string[]): boolean {
  return mentionsServiceNameStrict(currentMessage, allServiceNames);
}

export const BEVESTIG_TERUGKERENDE_DIENST_MESSAGE = (lastService: string) =>
  `Dit is een terugkerende klant met een eerdere dienst "${lastService}", maar de klant noemde in dit gesprek zelf nog GEEN dienst. Roep get_available_slots of book_appointment NIET aan. Vraag EERST, als je ENIGE eerstvolgende bericht, expliciet of controleerbaar of je van dezelfde dienst mag uitgaan (bijvoorbeeld: "Ik ga uit van dezelfde dienst als de vorige keer, ${lastService}, klopt dat?"). Vraag in DIE beurt NOG NIET naar dag/tijd en neem ook geen dag (zoals "vandaag" of "morgen") stilzwijgend aan; dat komt pas nadat de klant de dienst heeft bevestigd of gecorrigeerd. Zodra de klant bevestigt of een (andere) dienst noemt, mag je gewoon doorgaan.`;

// R113 (RETURNING-SERVICE-TOOL-CALL-GATE-ONLY fix, closes the gap R111's own verify round found).
//
// ROOT CAUSE: `shouldBlockReturningServiceDefault` above is a TOOL-CALL gate: tools.ts only ever
// returns the "bevestig_terugkerende_dienst" refusal (and its message) when the model actually
// attempts get_available_slots or the book_appointment PREVIEW step and gets refused. Live-
// reproduced (S6 testpad, fresh fixture phones with real future booking history, same tenant/
// service-catalog shape as R111's own fixture): a bare returning-customer request phrased as
// "ik wil weer een afspraak inplannen" or "hoi, ik wil een afspraak" (both drawn verbatim from
// prompt.ts's own example trigger-phrase list) routinely makes the model compose a reply with
// ZERO tool calls at all -- e.g. it answers as if the customer asked to SEE their existing
// appointment ("Er staat een afspraak: Speciale Afspraak op ..., op naam ...") or asks a generic
// "Welke dienst wil je graag boeken?" without ever surfacing the assumed last-service by name --
// so the gated tool call this guard's disclosure depends on never happens, and the customer never
// sees any disclosure of the returning-service assumption at all. `blockForReturningServiceDefault`
// itself computes correctly in every one of these cases (confirmed live: the
// `pending_returning_service_confirm` marker is set server-side on exactly these turns), so the
// gap is purely "the disclosure TEXT depends on a tool call that may never come", the identical
// defect shape `enforceAppointmentNameDisclosure` and `enforceVerificationGateDisclosure` already
// each closed once for their own sibling gates.
//
// FIX SHAPE (same deterministic-backstop pattern, no new mechanism invented): run AFTER the
// model's reply is drafted, independent of which (if any) tool calls happened this turn. Given
// this turn's OWN effective block decision (computed once in index.ts, the same boolean tools.ts
// itself gates get_available_slots/book_appointment on) and the last-booked service name, if the
// guard's condition holds this turn AND the drafted reply does not already disclose that service
// name (the same whole-word-or-full-name strict matcher `shouldBlockReturningServiceDefault`
// itself trusts, via `mentionsServiceNameStrict`/`mentionsAnyServiceName`), the reply is rewritten
// to the canonical disclosure-and-confirm question, byte-identical in wording to
// `BEVESTIG_TERUGKERENDE_DIENST_MESSAGE`'s own customer-facing sentence (kept as its own constant
// below rather than reusing that message verbatim, since the tool-call message mixes an
// internal instruction with the customer-facing question -- exactly the same reason
// enforceVerificationGateDisclosure needed its own separate `customer_reply` field instead of
// reusing a tool's internal `message`).
//
// FALSE-POSITIVE SAFETY:
// - No-op when `blockForReturningServiceDefaultEffective` is false this turn (fresh customer, no
//   history, already confirmed this conversation, or the customer's OWN message already names a
//   service): byte-identical behaviour to today for every one of those cases.
// - No-op when the reply ALREADY discloses the last service by name (a correct disclosure,
//   however phrased -- via a tool-call refusal message relayed faithfully, or the model's own
//   correct prose -- must never be second-guessed/altered), using the exact same strict matcher
//   the gate itself uses so "disclosed" means the identical thing in both places.
// - Runs in the SAME prose-reply branch as the sibling backstops (index.ts, after
//   enforceVerificationGateDisclosure), so a turn that already got a deterministic override from
//   an earlier backstop for an unrelated guarantee is not fought over; this only checks the FINAL
//   drafted text for this ONE guarantee, same as every sibling backstop already does independently.
//
// APPOINTMENT-STATUS-READOUT EXCLUSION (found during this backstop's OWN live testing, S6
// testpad): one of the two live-reproduced failures ("ik wil weer een afspraak inplannen") made
// the model misread the request as "show me my existing appointment" and reply with the exact
// `get_my_appointments`-shaped template ("Er staat een afspraak: <service> op <when> (op naam
// <name>)."). That reply DOES contain the last service's name, so a naive "does the reply mention
// the service anywhere" check would wrongly treat it as disclosed -- but naming the service as
// part of describing the EXISTING booking is not the same guarantee as disclosing-and-confirming
// the ASSUMPTION behind a NEW booking request; the customer's actual ask (book again) was never
// engaged with at all. `looksLikeAppointmentStatusReadout` recognizes this exact canonical
// template shape (mirrors identityDisambiguationGuard.ts's own `enforceAppointmentNameDisclosure`
// output strings byte-for-byte, the only two shapes get_my_appointments' deterministic path ever
// produces) and, when matched, the service-name check is skipped entirely so this backstop still
// rewrites to the real disclosure-and-confirm question, closing this exact reproduced shape too.
function looksLikeAppointmentStatusReadout(replyText: string): boolean {
  return /^(er staat een afspraak|er staan meerdere afspraken|there is an appointment|there are multiple appointments)\s*:/i.test(replyText.trim());
}

export const BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE = (lastService: string) =>
  `Ik ga uit van dezelfde dienst als de vorige keer, ${lastService}, klopt dat?`;

export function enforceReturningServiceDisclosure(
  replyText: string,
  blockForReturningServiceDefaultEffective: boolean,
  lastService: string | null | undefined,
  allServiceNames: string[],
): string {
  if (!replyText) return replyText;
  if (!blockForReturningServiceDefaultEffective) return replyText;
  if (!lastService || !lastService.trim()) return replyText;
  // A pure existing-appointment status readout never counts as disclosing the NEW booking's
  // assumption, regardless of whether it happens to name the service (see the exclusion note
  // above): skip straight to the rewrite without consulting the name-match check below.
  if (looksLikeAppointmentStatusReadout(replyText)) return BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE(lastService);
  // Already disclosed: the reply names a real configured service somewhere (the strict matcher
  // used by the gate itself), so trust it rather than second-guess correct model output.
  if (mentionsServiceNameStrict(replyText, allServiceNames)) return replyText;
  return BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE(lastService);
}
