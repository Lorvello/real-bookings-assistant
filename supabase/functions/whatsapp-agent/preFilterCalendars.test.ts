// Deterministic unit tests for the R45 (TRACK G5) <kalenders> pre-filter matcher. Pure
// token-based matching logic only, mirrors relativeDateHint.test.ts's structure. No network,
// no live model calls.
// Run: deno test --allow-env preFilterCalendars.test.ts
import { assertEquals } from "jsr:@std/assert";
import { resolveCandidateCalendarIds } from "./preFilterCalendars.ts";

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
