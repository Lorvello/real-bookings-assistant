// Deterministic unit tests for the R45 (TRACK G5) <kalenders> pre-filter matcher. Pure
// token-based matching logic only, mirrors relativeDateHint.test.ts's structure. No network,
// no live model calls.
// Run: deno test --allow-env preFilterCalendars.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { resolveCandidateCalendarIds, lastMentionedCalendar, scopeToCurrentTopicWindow, enforceNoRedundantLocationAsk } from "./preFilterCalendars.ts";

const CALENDARS = [
  { id: "sanne", name: "Sanne" },
  { id: "milan", name: "Milan" },
  { id: "iris", name: "Iris" },
  { id: "bo", name: "Bo" },
];

const SERVICES = new Map([
  ["sanne", [{ name: "Knippen Dames" }]],
  ["milan", [{ name: "Highlights" }, { name: "Kleuren" }]],
  ["iris", [{ name: "Knippen + Stylen" }]],
  ["bo", [{ name: "Gelnagels" }]],
]);

Deno.test("G4 regression: 'ik wil een afspraak boeken' must fail OPEN to all calendars, not spuriously narrow to Bo", () => {
  const r = resolveCandidateCalendarIds("Hoi, ik wil graag een afspraak boeken.", CALENDARS, SERVICES);
  assertEquals(r.matched, false);
  assertEquals(r.candidateIds.size, 4);
  assertEquals([...r.candidateIds].sort(), ["bo", "iris", "milan", "sanne"]);
});

Deno.test("single calendar-name match (whole word) narrows to that one calendar", () => {
  const r = resolveCandidateCalendarIds("Kan ik iets boeken bij Bo?", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds], ["bo"]);
});

Deno.test("single service-name match narrows to the owning calendar", () => {
  const r = resolveCandidateCalendarIds("Ik wil graag Gelnagels boeken.", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds], ["bo"]);
});

Deno.test("shared/ambiguous match across 2 calendars keeps BOTH as candidates (F1 shape)", () => {
  // Craft a message that names both Milan's and Bo's services in one turn (multi_service_confused
  // shape); both must survive, neither narrowed away.
  const r = resolveCandidateCalendarIds("Ik wil Highlights en ook Gelnagels boeken.", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds].sort(), ["bo", "milan"]);
});

Deno.test("zero match on a bare vague_intent message fails OPEN to all ids", () => {
  const r = resolveCandidateCalendarIds("Ik wil graag een afspraak maken.", CALENDARS, SERVICES);
  assertEquals(r.matched, false);
  assertEquals(r.candidateIds.size, 4);
});

Deno.test("F3 shape: a service belonging to a NON-entry sibling calendar still surfaces that sibling", () => {
  // Entry calendar is irrelevant to this pure matcher (index.ts always includes it in `calendars`);
  // here we just prove naming a sibling's service alone matches the sibling, not the whole set.
  const r = resolveCandidateCalendarIds("Kan ik Knippen + Stylen boeken?", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds], ["iris"]);
});

Deno.test("service-name substring match still requires the message to contain the (near-)full service name", () => {
  // Design's v1 approach for SERVICE names (unaffected by the G4 calendar-name fix, per G4's own
  // scoping): the message must contain the service name itself, not the other way around. A bare
  // "Knippen" alone does not spell out either full service name, so this fails open (no false
  // narrowing to just one of the two calendars that happen to share the "Knippen" stem).
  const r = resolveCandidateCalendarIds("Ik wil graag Knippen.", CALENDARS, SERVICES);
  assertEquals(r.matched, false);
  assertEquals(r.candidateIds.size, 4);
});

Deno.test("naming the full service verbatim still matches its owning calendar (Sanne)", () => {
  const r = resolveCandidateCalendarIds("Ik wil graag Knippen Dames boeken.", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds], ["sanne"]);
});

Deno.test("punctuation around a name does not block or leak a match", () => {
  const r = resolveCandidateCalendarIds("Bo, kun je Gelnagels doen morgen?!", CALENDARS, SERVICES);
  assertEquals(r.matched, true);
  assertEquals([...r.candidateIds], ["bo"]);
});

Deno.test("empty message text fails OPEN to all ids (no tokens to match)", () => {
  const r = resolveCandidateCalendarIds("", CALENDARS, SERVICES);
  assertEquals(r.matched, false);
  assertEquals(r.candidateIds.size, 4);
});

Deno.test("a longer common word merely CONTAINING a short name as substring never matches (word-boundary proof)", () => {
  // "milaan" (Milan the city, NL spelling) should not match calendar "Milan" via naive substring
  // logic; token-based matching requires the exact token "milan", so this must fail open.
  const r = resolveCandidateCalendarIds("Ik kom net terug van een tripje naar Milaan.", CALENDARS, SERVICES);
  assertEquals(r.matched, false);
  assertEquals(r.candidateIds.size, 4);
});

// R98 (DAY/INTENT TOPIC-BLEED fix) tests below.

Deno.test("lastMentionedCalendar: no calendar named returns null", () => {
  assertEquals(lastMentionedCalendar("Wanneer heb je tijd?", CALENDARS), null);
});

Deno.test("lastMentionedCalendar: single named calendar returned", () => {
  assertEquals(lastMentionedCalendar("Ik wil graag een afspraak bij Bo boeken, wanneer heb je tijd?", CALENDARS), "bo");
});

Deno.test("lastMentionedCalendar: two calendars named, the LAST one (by token position) wins", () => {
  // Live R97 shape: the customer excludes the old calendar first, then names the real target.
  assertEquals(
    lastMentionedCalendar("Los van de Iris-afspraak: ik wil ook graag een nieuwe afspraak bij Bo boeken, wanneer heb je tijd?", CALENDARS),
    "bo",
  );
});

Deno.test("lastMentionedCalendar: 'Milaan' (city, NL spelling) never false-matches calendar Milan", () => {
  assertEquals(lastMentionedCalendar("Ik kom net terug van Milaan.", CALENDARS), null);
});

Deno.test("scopeToCurrentTopicWindow: single-calendar tenant always returns the window unchanged", () => {
  const single = [{ id: "only", name: "Only" }];
  const prior = ["bericht 1", "bericht 2"];
  assertEquals(scopeToCurrentTopicWindow("nieuw bericht", prior, single), prior);
});

Deno.test("scopeToCurrentTopicWindow: current message names no calendar, keeps full window (plain continuation)", () => {
  const prior = ["Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?", "zondag 2 augustus graag"];
  assertEquals(scopeToCurrentTopicWindow("Kan het naar 19:00?", prior, CALENDARS), prior);
});

Deno.test("scopeToCurrentTopicWindow: same calendar named again is a continuation, keeps full window", () => {
  const prior = ["Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?", "zondag 2 augustus graag"];
  assertEquals(scopeToCurrentTopicWindow("Kan het bij Iris ook om 19:00?", prior, CALENDARS), prior);
});

Deno.test("scopeToCurrentTopicWindow: genuine topic switch to a different calendar returns an EMPTY window", () => {
  // Live R97 case 1 shape: a reschedule flow was active on Iris, day "zondag 2 augustus" was
  // named there, then a fresh unrelated Bo booking request arrives with no day named. The old
  // Iris day/verb history must not bleed into this Bo turn.
  const prior = [
    "Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?",
    "Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?",
    "zondag 2 augustus graag",
  ];
  const window = scopeToCurrentTopicWindow("Ik wil graag een afspraak bij Bo boeken, wanneer heb je tijd?", prior, CALENDARS);
  assertEquals(window, []);
});

Deno.test("scopeToCurrentTopicWindow: topic switch detected even when the OLD calendar is also named (live R97 case 2 shape)", () => {
  const prior = [
    "Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?",
    "zondag 2 augustus graag",
  ];
  // Names BOTH Iris (to exclude it) and Bo (the real ask); lastMentionedCalendar's "last wins"
  // rule must resolve this to Bo, so the switch is still detected and the window still empties.
  const window = scopeToCurrentTopicWindow(
    "Los van de Iris-afspraak: ik wil ook graag een nieuwe afspraak bij Bo boeken, wanneer heb je tijd?",
    prior,
    CALENDARS,
  );
  assertEquals(window, []);
});

Deno.test("scopeToCurrentTopicWindow: topic carried by SERVICE NAME alone (no calendar name repeated) is still recognized, real live-reproduced R98 gap", () => {
  // This is the EXACT shape that first slipped through calendar-name-only matching: the whole
  // reschedule flow is carried by the service name "Knippen + Stylen" (owned by Iris), the
  // calendar's own name "Iris" is never repeated after the very first turn. Without
  // servicesByCalendar awareness, lastMentionedCalendar sees no calendar name at all in these
  // prior messages and the topic switch to Bo goes UNDETECTED, live-reproduced this round (the
  // fresh Bo request wrongly got "Op zondag 2 augustus heb ik geen vrije tijden meer", inheriting
  // Iris's own reschedule-target day).
  const prior = [
    "Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden naar donderdag 30 juli 18:00?",
    "Zondag 2 augustus is goed, 18:00 graag",
    "12:00 is prima",
  ];
  const current = "Los van die Iris-afspraak, ik wil ook nog een keer een afspraak bij Bo boeken, wanneer heb je tijd?";
  const withoutServices = scopeToCurrentTopicWindow(current, prior, CALENDARS, undefined);
  // Documents the gap this test itself closes: with NO service map, the middle 2 messages carry
  // no calendar-name signal at all, so no switch is detected purely from calendar names here
  // (current still names both Iris and Bo, "last wins" -> Bo; prior messages name neither
  // explicitly by calendar name, so recentCal stays null and the window is returned unchanged).
  assertEquals(withoutServices, prior);
  const withServices = scopeToCurrentTopicWindow(current, prior, CALENDARS, SERVICES);
  assertEquals(withServices, []);
});

Deno.test("scopeToCurrentTopicWindow: a DUPLICATE of the current message as the newest prior entry never masks a real topic switch (live-verify-reproduced gap)", () => {
  // The real webhook path (process_whatsapp_message) inserts THIS turn's own inbound row into
  // whatsapp_messages BEFORE invoking the agent, so priorInboundTexts's newest entry is often
  // already a duplicate of the current message (see index.ts's own established
  // "newestIsCurrentInbound" dedup, same shape). Live-reproduced this round: without skipping
  // that duplicate, the "most recently named calendar" search matched the duplicate against
  // itself and never detected the switch, letting the exact R97 bug straight back through.
  const current = "Los van die Iris afspraak, ik wil ook nog een keer een afspraak bij Bo boeken, wanneer heb je tijd?";
  const prior = [
    "Zondag 2 augustus is goed, 18:00 graag",
    "Ik wil mijn Iris afspraak (Knippen + Stylen) verzetten naar woensdag 5 augustus om 17:00.",
    current, // the duplicate: textually identical to the current message
  ];
  const window = scopeToCurrentTopicWindow(current, prior, CALENDARS, SERVICES);
  assertEquals(window, []);
});

// R98 (live-verify fix): real production calendar names carry a descriptive parenthetical suffix
// ("Bo (Nagels)", "Milan (Kleuren)", "Iris (Weekend)", "Sanne (Knippen)"), live-confirmed this
// round. A customer only ever says the primary name ("bij Bo boeken"), never the full suffixed
// string, so lastMentionedCalendar/scopeToCurrentTopicWindow must strip the suffix before
// matching or every calendar-name match silently fails and no switch is ever detected.
const CALENDARS_WITH_SUFFIX = [
  { id: "sanne", name: "Sanne (Knippen)" },
  { id: "bo", name: "Bo (Nagels)" },
  { id: "iris", name: "Iris (Weekend)" },
  { id: "milan", name: "Milan (Kleuren)" },
];

Deno.test("lastMentionedCalendar: matches the PRIMARY name even when the calendar's stored name has a parenthetical suffix", () => {
  assertEquals(lastMentionedCalendar("bij Bo een afspraak maken", CALENDARS_WITH_SUFFIX), "bo");
  assertEquals(lastMentionedCalendar("bij Milan boeken", CALENDARS_WITH_SUFFIX), "milan");
});

Deno.test("scopeToCurrentTopicWindow: genuine topic switch still detected with real suffixed calendar names (live-verify-reproduced gap)", () => {
  const prior = [
    "Ik wil graag een afspraak bij Milan boeken op donderdag 6 augustus, wat zijn de tijden?",
  ];
  const current = "Los van de Milan-afspraak, wil ik ook nog een keer bij Bo een afspraak maken, wanneer heb je tijd?";
  const window = scopeToCurrentTopicWindow(current, prior, CALENDARS_WITH_SUFFIX);
  assertEquals(window, []);
});

// R101 (SINGLE-CANDIDATE-DISAMBIGUATION-ASK fix, live-reproduced R96/R100): resolveCandidateCalendarIds
// narrows to exactly one calendar (e.g. Iris for Bruidskapsel, a service that exists on only one
// calendar), but the model asks a "which location" question anyway. enforceNoRedundantLocationAsk is
// the reply-rewrite backstop that discards that question in exactly this situation.

Deno.test("enforceNoRedundantLocationAsk: no-op when there is no single candidate (null)", () => {
  const reply = "Bij welke locatie wil je het Bruidskapsel plannen? (Sanne, Bo, Iris, Milan)";
  assertEquals(enforceNoRedundantLocationAsk(reply, null), reply);
});

Deno.test("enforceNoRedundantLocationAsk: no-op when the reply does not ask a location question", () => {
  const reply = "Iris kan je op donderdag 30 juli om 17:00 helpen met het Bruidskapsel. Zal ik dat inplannen?";
  assertEquals(enforceNoRedundantLocationAsk(reply, "Iris"), reply);
});

Deno.test("enforceNoRedundantLocationAsk: rewrites a 'bij welke locatie' question when a single candidate is active", () => {
  const reply = "Bij welke locatie wil je het Bruidskapsel plannen? (Sanne (Knippen), Bo (Nagels), Iris (Weekend), Milan (Kleuren))";
  const out = enforceNoRedundantLocationAsk(reply, "Iris");
  assertEquals(out, "Dat kan bij Iris, dus die keuze staat al vast. Een moment, ik ga verder met je afspraak.");
});

Deno.test("enforceNoRedundantLocationAsk: rewrites a 'bij wie wil je' phrasing too", () => {
  const reply = "Bij wie wil je de afspraak maken voor Knippen?";
  const out = enforceNoRedundantLocationAsk(reply, "Bo");
  assertEquals(out, "Dat kan bij Bo, dus die keuze staat al vast. Een moment, ik ga verder met je afspraak.");
});

Deno.test("enforceNoRedundantLocationAsk: rewrites the English 'which location' phrasing too", () => {
  const reply = "Which location would you like to book the Wedding Hairstyle at?";
  const out = enforceNoRedundantLocationAsk(reply, "Iris");
  assertEquals(out, "Dat kan bij Iris, dus die keuze staat al vast. Een moment, ik ga verder met je afspraak.");
});

// Genuinely-shared-service consistency check (multi-candidate case): resolveCandidateCalendarIds
// itself must still return ALL matching calendars (never narrow to one) for a service like Knippen
// that really is offered by multiple calendars, so index.ts never even computes a
// singleCandidateCalendarName for this case and enforceNoRedundantLocationAsk is never invoked with a
// non-null name; the disambiguation question must still fire correctly (zero regression).

Deno.test("resolveCandidateCalendarIds: a genuinely shared service (Knippen) still narrows to ALL offering calendars, not one", () => {
  const sharedCalendars = [
    { id: "sanne", name: "Sanne (Knippen)" },
    { id: "bo", name: "Bo (Nagels)" },
    { id: "milan", name: "Milan (Kleuren)" },
  ];
  const sharedServices = new Map([
    ["sanne", [{ name: "Knippen Dames" }]],
    ["bo", [{ name: "Knippen" }]],
    ["milan", [{ name: "Knippen" }]],
  ]);
  const r = resolveCandidateCalendarIds("Ik wil graag Knippen boeken, donderdag om 14:00.", sharedCalendars, sharedServices);
  assertEquals(r.matched, true);
  assertEquals(r.candidateIds.size > 1, true);
});
