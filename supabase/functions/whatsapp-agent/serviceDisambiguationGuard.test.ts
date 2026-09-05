// Deterministic unit tests for the R71 (R70-3 fix) + R72 (SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT
// fix) service-disambiguation guard. Pins the exact false-negative (must block) and false-positive
// (must NOT block) shapes proven live each round.
// Run: deno test serviceDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { shouldBlockForMissingServiceChoice, shouldBlockForAmbiguousBranch, findDistinctServiceForReschedule, shouldBlockReturningServiceDefault, shouldBlockForMultiServiceRequest, mentionsAnyServiceName, enforceReturningServiceDisclosure, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE, findServiceSwitchForPendingPreview, mentionsDistinguishing, type RecencyWindowMessage } from "./serviceDisambiguationGuard.ts";
import { scopeToCurrentTopicWindow, type PreFilterServiceInfo } from "./preFilterCalendars.ts";

// R98 helper: build an all-inbound recency window from plain strings (the common case for tests
// that only care about customer messages, matching the pre-R98 test convention).
function inbound(...texts: string[]): RecencyWindowMessage[] {
  return texts.map((content) => ({ direction: "inbound" as const, content }));
}

const THREE_BRANCH = [
  { name: "R71 Centrum", services: [{ name: "Knipbeurt Dames" }] },
  { name: "R71 Noord", services: [{ name: "Knipbeurt Dames" }] },
  { name: "R71 Zuid", services: [{ name: "Baard Trim" }] },
];

// ── must BLOCK: no service, no branch named anywhere ────────────────────────
Deno.test("blocks: bare availability question, first contact", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["heb je morgen nog plek?"] }),
    true,
  );
});

Deno.test("blocks: 'ik wil een afspraak maken' with no service/branch anywhere in history", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["hoi", "ik wil graag een afspraak maken"],
    }),
    true,
  );
});

Deno.test("blocks: English phrasing, no service/branch named", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["do you have any availability tomorrow?"] }),
    true,
  );
});

// ── must NOT block: a service or branch WAS named (this turn or earlier) ───
Deno.test("does not block: full service name mentioned in an earlier turn", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["ik wil graag een Baard Trim boeken", "wat kost dat", "heb je morgen nog plek?"],
    }),
    false,
  );
});

Deno.test("does not block: branch named by its distinguishing word only ('Zuid', not 'R71 Zuid')", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["heb je morgen nog plek bij Zuid?"] }),
    false,
  );
});

Deno.test("does not block: explicit branch + service named up front", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["ik wil een baard trim bij Zuid, wat kan er morgen?"],
    }),
    false,
  );
});

Deno.test("does not block: service named many turns earlier, well beyond a short window", () => {
  const longHistory = [
    "ik wil graag een Baard Trim boeken",
    "wat kost dat",
    "ok en hoe lang duurt het",
    "oke goed",
    "kan het ook op zaterdag",
    "en zondag",
    "hmm ok",
    "wat zijn de openingstijden",
    "oke",
    "en hebben jullie ook andere diensten",
    "aha ok",
    "heb je morgen nog plek?",
  ];
  assertEquals(shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: longHistory }), false);
});

// ── must NOT block: no real ambiguity exists (single-calendar / same-one-service) ──
Deno.test("does not block: single-calendar tenant (guard never applicable)", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: [{ name: "Solo Salon", services: [{ name: "Knipbeurt" }] }],
      inboundTexts: ["heb je morgen nog plek?"],
    }),
    false,
  );
});

Deno.test("does not block: multi-calendar but every branch offers the identical one service", () => {
  const sameServiceEverywhere = [
    { name: "Jan", services: [{ name: "Knipbeurt" }] },
    { name: "Tim", services: [{ name: "Knipbeurt" }] },
  ];
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: sameServiceEverywhere, inboundTexts: ["heb je morgen nog plek?"] }),
    false,
  );
});

Deno.test("does not block: no calendars (defensive empty-array shape)", () => {
  assertEquals(shouldBlockForMissingServiceChoice({ calendars: [], inboundTexts: ["heb je morgen nog plek?"] }), false);
});

// ── R72 shouldBlockForAmbiguousBranch: SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT fix ──────────

const R72_FIXTURE = [
  { name: "R72 Oost", services: [{ name: "Massage", price: 60, durationMin: 60 }] },
  { name: "R72 West", services: [{ name: "Massage", price: 40, durationMin: 45 }] },
  { name: "R72 Zuid", services: [{ name: "Manicure", price: 25, durationMin: 30 }] },
];

Deno.test("R72 blocks: service named, ambiguous across 2 differently-priced branches, no branch named", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil graag een massage boeken"] }),
    true,
  );
});

Deno.test("R72 blocks: bare service mention mid-conversation, no branch anywhere", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["hoi", "heb je nog plek voor een massage deze week?"],
    }),
    true,
  );
});

Deno.test("R72 does not block: branch named alongside the ambiguous service", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik wil een massage boeken bij West"],
    }),
    false,
  );
});

Deno.test("R72 does not block: branch named in an earlier turn, service named later", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik kom graag bij Oost langs", "kan ik een massage boeken?"],
    }),
    false,
  );
});

Deno.test("R72 does not block: named service exists at only ONE calendar (no branch ambiguity)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil een manicure boeken"] }),
    false,
  );
});

Deno.test("R72 does not block: multi-branch service with the IDENTICAL price+duration everywhere", () => {
  const sameServiceSamePrice = [
    { name: "Jan", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
    { name: "Tim", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
  ];
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: sameServiceSamePrice, inboundTexts: ["ik wil een knipbeurt boeken"] }),
    false,
  );
});

Deno.test("R72 does not block: no service named at all (that's shouldBlockForMissingServiceChoice's job)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["heb je morgen nog plek?"] }),
    false,
  );
});

Deno.test("R72 does not block: single-calendar tenant (guard never applicable)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: [{ name: "Solo Salon", services: [{ name: "Massage", price: 60, durationMin: 60 }] }],
      inboundTexts: ["ik wil een massage boeken"],
    }),
    false,
  );
});

Deno.test("R72 blocks: only price differs (same duration)", () => {
  const priceOnlyDiff = [
    { name: "A", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
    { name: "B", services: [{ name: "Knipbeurt", price: 45, durationMin: 30 }] },
  ];
  assertEquals(shouldBlockForAmbiguousBranch({ calendars: priceOnlyDiff, inboundTexts: ["ik wil een knipbeurt"] }), true);
});

Deno.test("R72 blocks: only duration differs (same price)", () => {
  const durationOnlyDiff = [
    { name: "A", services: [{ name: "Knipbeurt", price: 30, durationMin: 20 }] },
    { name: "B", services: [{ name: "Knipbeurt", price: 30, durationMin: 40 }] },
  ];
  assertEquals(shouldBlockForAmbiguousBranch({ calendars: durationOnlyDiff, inboundTexts: ["ik wil een knipbeurt"] }), true);
});

Deno.test("R72 does not block: two services named, ambiguous one absent from this business", () => {
  // Sanity: naming a service that does not exist at all should never crash or false-block.
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil een pedicure boeken"] }),
    false,
  );
});

Deno.test("R72 blocks: one of two named services is ambiguous, the other is not", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik wil een manicure of een massage boeken"],
    }),
    true,
  );
});

// ── R102 AMBIGUOUS-BRANCH-UNSCOPED-HISTORY fix ──────────────────────────────
// The bug lived in index.ts's ORCHESTRATION (the `inboundTexts` fed into
// shouldBlockForAmbiguousBranch was the raw, unscoped 40-row window), not inside the pure guard
// function itself, so these tests reproduce the exact composition index.ts now performs:
// scopeToCurrentTopicWindow() trims the historical portion, THEN the (possibly empty) scoped
// history + the current message is what shouldBlockForAmbiguousBranch actually sees. This mirrors
// R98's own established fix shape (day-detection) applied to this sibling check.
// Real production calendar names in this fixture family always carry a parenthetical suffix
// ("Bo (Nagels)", "Milan (Kleuren)", ...; see R79/R98's own fixtures + preFilterCalendars.ts's
// header), never a BARE 2-letter name. Matching that shape here avoids an unrelated, pre-existing,
// out-of-scope collision (mentionsAny's own plain-substring full-name check, with no word-boundary,
// matches a bare 2-letter name like "Bo" inside the common Dutch verb "boeken" -- a real but
// separate defect, not this round's target, and not reachable with real suffixed calendar names).
const R102_SCOPE_CALENDARS = [
  { id: "bo", name: "Bo (Nagels)" },
  { id: "sanne", name: "Sanne (Knippen)" },
  { id: "iris", name: "Iris (Weekend)" },
  { id: "milan", name: "Milan (Kleuren)" },
];
const R102_SCOPE_SERVICES = new Map<string, PreFilterServiceInfo[]>([
  ["bo", [{ name: "Knippen" }]],
  ["sanne", [{ name: "Knippen" }]],
  ["milan", [{ name: "Knippen" }]],
  ["iris", [{ name: "Bruidskapsel" }]],
]);
// DisambiguationInput shape: Knippen genuinely ambiguous (different price) across Bo/Sanne/Milan;
// Bruidskapsel exists only at Iris (no branch ambiguity for it).
const R102_FIXTURE = [
  { name: "Bo (Nagels)", services: [{ name: "Knippen", price: 25, durationMin: 30 }] },
  { name: "Sanne (Knippen)", services: [{ name: "Knippen", price: 30, durationMin: 30 }] },
  { name: "Iris (Weekend)", services: [{ name: "Bruidskapsel", price: 90, durationMin: 90 }] },
  { name: "Milan (Kleuren)", services: [{ name: "Knippen", price: 28, durationMin: 30 }] },
];

// Mirrors index.ts's own composition exactly (see the R102 comment above blockForAmbiguousBranch):
// scope the history-only portion (oldest-first) to the current topic, then re-append the current
// message, before calling the guard.
function shouldBlockAmbiguousBranchScoped(currentMessage: string, priorInboundTextsOldestFirst: string[]): boolean {
  const scopedHistory = scopeToCurrentTopicWindow(currentMessage, priorInboundTextsOldestFirst, R102_SCOPE_CALENDARS, R102_SCOPE_SERVICES);
  return shouldBlockForAmbiguousBranch({ calendars: R102_FIXTURE, inboundTexts: [...scopedHistory, currentMessage] });
}

Deno.test("R102 blocks: bare shared-service request after a genuine topic switch (all 4 calendar names appear somewhere earlier, but NOT for this fresh topic)", () => {
  const longUnscopedHistory = [
    "hoi",
    "ik wil graag een afspraak bij Sanne boeken voor Knippen",
    "wat kost dat",
    "kan het zaterdag",
    "ok bedankt",
    "Los van dat alles, ik wil ook nog een afspraak bij Milan boeken voor Highlights, wanneer heb je tijd?",
    "vrijdag graag",
    "10 uur is prima",
    "en ik had ook nog een vraag over mijn afspraak bij Iris voor Bruidskapsel",
    "kan die naar volgende week?",
    "ja dat is goed",
  ];
  assertEquals(
    shouldBlockAmbiguousBranchScoped("Ik wil graag Knippen boeken, zaterdag 15 augustus om 11:00.", longUnscopedHistory),
    true,
  );
});

Deno.test("R102 does not block: calendar named earlier in the SAME current topic (no topic switch since), still correctly resolved", () => {
  const sameTopicHistory = ["ik wil Knippen bij Bo boeken"];
  // Immediate next turn: bare day/time, no re-mention of Bo. currentMessage names no calendar/
  // service at all, so scopeToCurrentTopicWindow (per its own "no switch signal, keep full
  // window" rule) must NOT drop the "bij Bo" history, and the branch-already-named check must
  // still see it.
  assertEquals(shouldBlockAmbiguousBranchScoped("zaterdag 15 augustus om 11:00 graag", sameTopicHistory), false);
});

Deno.test("R102 regression pin: zero regression on the R101 single-candidate-suppress case (Iris + Bruidskapsel, single calendar, never ambiguous regardless of scoping)", () => {
  assertEquals(
    shouldBlockAmbiguousBranchScoped("Ik wil graag een nieuwe afspraak bij Iris boeken voor Bruidskapsel, zaterdag om 14:00.", []),
    false,
  );
});

// ── R96 RESCHEDULE-HIJACK guard (findDistinctServiceForReschedule) ──────────
// Pins R95-1's exact live-reproduced shape: a customer with an existing "Standaard Afspraak"
// booking names the DISTINCT "Speciale Afspraak" and gives a time, without the model itself
// resolving/passing a service_type_id.
const TWO_SERVICES = ["Speciale Afspraak", "Standaard Afspraak"];

Deno.test("R96 blocks: customer just named a distinct service, no model-supplied service_type_id", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound("En nu ook nog de Speciale Afspraak graag, wanneer kan dat deze week?"),
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R96 does not block: genuine same-service reschedule, no new service ever named", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound("kan het een uur later, om 10:00?"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 does not block: model explicitly supplied service_type_id (a reviewed switch)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound("en nu de Speciale Afspraak graag"),
      modelSuppliedServiceId: true,
    }),
    null,
  );
});

Deno.test("R96 does not block: only one service exists (nothing to confuse)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: ["Standaard Afspraak"],
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound("kan het een uur later"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 does not block: a distinct service was named MANY turns ago, current turn re-confirms existing service", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound(
        "ik had ooit gevraagd naar de Speciale Afspraak maar toen niet geboekt",
        "kan mijn Standaard Afspraak een uur later, om 10:00?",
      ),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 blocks: EN phrasing, distinct service named most recently", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: inbound("also book me the Speciale Afspraak, what times work?"),
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R96 does not block: no distinct service names configured (defensive empty case)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: [],
      currentServiceName: null,
      recentMessages: inbound("kan het een uur later"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

// ── R97 RESCHEDULE-HIJACK false-positive suite (multi-calendar cross-collision fix) ──────────
// Pins the exact live-reproduced Iris "Knippen + Stylen" false hijack (R94/R95/R96's own
// watch-item): a real, multi-calendar fixture where SEVERAL other calendars offer a service
// whose name shares the generic word "knippen" with the customer's own current service. Root
// cause was index.ts's upcomingBookingServiceName resolving to null for a multi-calendar tenant
// (scoped to only the entry calendar_id, not the whole allowlist resolveTarget() itself uses),
// which emptied `currentWords` and let a shared word falsely match. These tests pin the guard
// function's OWN correct behavior GIVEN a correctly-resolved currentServiceName (the index.ts fix
// makes sure it always gets one); the "null currentServiceName" cases below document the exact
// false-positive shape that null input reproduces, so this class of bug cannot silently regress.
const REAL_MULTI_CALENDAR_SERVICES = [
  "Knippen + Stylen", // Iris
  "Bruidskapsel", // Iris
  "Knippen", // Bo / Milan (bare, shared "knippen" word)
  "Gelnagels", // Bo
  "Manicure", // Bo
  "Highlights", // Milan
  "Volledige kleuring", // Milan
  "Knippen Dames", // Sanne
  "Knippen Heren", // Sanne
];

Deno.test("R97 does not block: Iris 'Knippen + Stylen' reschedule with explicit day+time, correct currentServiceName resolved (the exact live-reproduced Iris shape)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: REAL_MULTI_CALENDAR_SERVICES,
      currentServiceName: "Knippen + Stylen",
      recentMessages: inbound("Kan mijn Knippen + Stylen afspraak bij Iris verzet worden naar donderdag 16 juli 19:00?"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R97 does not block: same Iris booking, no day named yet (the R95 no-day reschedule case), still no false hijack", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: REAL_MULTI_CALENDAR_SERVICES,
      currentServiceName: "Knippen + Stylen",
      recentMessages: inbound("Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R97 regression pin: with currentServiceName WRONGLY null (the pre-fix index.ts bug), the SAME message falsely matches an unrelated other-calendar service via the shared 'knippen' word (Sanne's 'Knippen Dames' listed first here to mirror the live-reproduced shape; any of Bo/Milan's bare 'Knippen' or Sanne's 'Knippen Heren' collides identically, first-match-wins scan order is incidental, the point this pins is that null lets ANY of them falsely match at all)", () => {
  const namesWithKnippenDamesFirst = ["Knippen Dames", ...REAL_MULTI_CALENDAR_SERVICES];
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: namesWithKnippenDamesFirst,
      currentServiceName: null, // reproduces the pre-fix index.ts scoping bug
      recentMessages: inbound("Kan mijn Knippen + Stylen afspraak bij Iris verzet worden naar donderdag 16 juli 19:00?"),
      modelSuppliedServiceId: false,
    }),
    "Knippen Dames",
  );
});

Deno.test("R97 does not block: a GENUINE distinct-service swap on a different calendar still correctly triggers alongside the fix (Bruidskapsel named, Iris's own OTHER real service)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: REAL_MULTI_CALENDAR_SERVICES,
      currentServiceName: "Knippen + Stylen",
      recentMessages: inbound("Kan ik in plaats daarvan een Bruidskapsel afspraak, donderdag 16 juli 19:00?"),
      modelSuppliedServiceId: false,
    }),
    "Bruidskapsel",
  );
});

// ── R98 DIRECTION-CONFUSION regression suite (3rd bug in this function, R97-verify finding) ──
// Pins the exact bug: the early-break must ONLY fire on an INBOUND (customer) message mentioning
// the current service. An OUTBOUND (agent) message mentioning the current service must NEVER
// break the scan, even when it is the newest message in the window and even when it separates the
// customer's real distinct-service request from the rest of the window.

Deno.test("R98-1 blocks: agent's own confused reply mentions current service, must not break before reaching customer's real request (the exact R97-verify shape)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "Kan ik ook een Speciale Afspraak boeken, zelfde dag graag?" },
        { direction: "outbound", content: "Schikt 12:30 of 13:00?" },
        { direction: "inbound", content: "Oke doe dan 12:30" },
        { direction: "outbound", content: "Ik zie dat je al een Standaard Afspraak hebt op 12:00. Wil je die verzetten of een tweede afspraak maken?" },
        { direction: "inbound", content: "Ja klopt" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-2 blocks: agent mentions distinct service in its OWN reply BEFORE customer confirms (agent echo must still count as antecedent, per R96-SELFTEST GAP)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "wat kan er nog bij vandaag" },
        { direction: "outbound", content: "Wil je de Speciale Afspraak voor dezelfde persoon of iemand anders?" },
        { direction: "inbound", content: "zelfde persoon" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-3 blocks: multiple back-and-forth confusions, agent repeatedly mentions current service, customer's distinct request survives at the far end of the window", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "kan er ook nog een Speciale Afspraak bij?" },
        { direction: "outbound", content: "Je hebt al een Standaard Afspraak, bedoel je die verzetten?" },
        { direction: "inbound", content: "nee gewoon erbij" },
        { direction: "outbound", content: "oke, en je Standaard Afspraak blijft dan gewoon staan?" },
        { direction: "inbound", content: "ja" },
        { direction: "outbound", content: "voor je Standaard Afspraak, welke tijd wil je?" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-4 blocks: long conversation, many agent replies mentioning EITHER service, customer's real distinct request is the oldest message still in-window", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "ik wil ook een Speciale Afspraak" },
        { direction: "outbound", content: "voor de Speciale Afspraak, welke dag komt uit?" },
        { direction: "inbound", content: "deze week nog" },
        { direction: "outbound", content: "en klopt het dat je Standaard Afspraak blijft staan?" },
        { direction: "inbound", content: "ja" },
        { direction: "outbound", content: "top, dan kijk ik naar tijden voor je Standaard Afspraak" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-5 does not block: customer THEMSELVES re-confirms the current service most recently, no distinct service anywhere (genuine same-service reschedule, must still work)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "outbound", content: "Wil je je Standaard Afspraak verzetten naar een andere tijd?" },
        { direction: "inbound", content: "ja, mijn Standaard Afspraak graag een uur later" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R98-6 does not block: customer genuinely re-confirms current service AFTER an earlier, now-stale, distinct-service mention (customer's own re-confirmation is real evidence and must still gate)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "ik had ooit gevraagd naar de Speciale Afspraak maar toen niet geboekt" },
        { direction: "outbound", content: "geen probleem, waar kan ik je mee helpen?" },
        { direction: "inbound", content: "kan mijn Standaard Afspraak een uur later, om 10:00?" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R98-7 blocks: agent's confused reply is the ONLY message in the window besides the customer's request (2-message window, agent reply newest)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "en ook nog een Speciale Afspraak graag" },
        { direction: "outbound", content: "Ik zie een bestaande Standaard Afspraak, zal ik die verplaatsen?" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-8 blocks: agent's confused reply mentions current service AND asks about the distinct one in the SAME message (still must not count as customer re-confirmation)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "kan er een Speciale Afspraak bij, zelfde dag" },
        { direction: "outbound", content: "Je hebt al een Standaard Afspraak, wil je in plaats daarvan de Speciale Afspraak, of allebei?" },
        { direction: "inbound", content: "allebei graag" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-9 blocks: EN phrasing, agent's own confused reply in English mentions current service, must not break before customer's real request", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "can I also book the Speciale Afspraak, same day?" },
        { direction: "outbound", content: "I see you already have a Standaard Afspraak, do you want to move that instead?" },
        { direction: "inbound", content: "no just add it" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-10 does not block: agent's confused reply mentions current service, customer's OWN most recent message ALSO re-confirms current service (genuine dead-end, no distinct request survives)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "outbound", content: "Ik zie een bestaande Standaard Afspraak, zal ik die verplaatsen?" },
        { direction: "inbound", content: "ja graag, mijn Standaard Afspraak een uur later" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

// ── R111 RETURNING-SERVICE-DEFAULT-BLEED tests (closes R107-RETURNING-DEFAULT-BLEED) ──────────
const AFSPRAAK_SERVICES = ["Speciale Afspraak", "Standaard Afspraak"];

Deno.test("R111-1 blocks: returning customer, bare unspecified booking request, no service named", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil weer een afspraak maken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    true,
  );
});

Deno.test("R111-2 (regression pin, live-reproduced false negative) blocks: 'gewoon weer een afspraak zoals de vorige keer' must NOT be treated as naming 'Speciale Afspraak' via the shared generic word 'afspraak'", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "gewoon weer een afspraak zoals de vorige keer",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    true,
  );
  assertEquals(mentionsAnyServiceName("gewoon weer een afspraak zoals de vorige keer", AFSPRAAK_SERVICES), false);
});

Deno.test("R111-3 does not block: customer names the full returning service themselves", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil graag de Speciale Afspraak boeken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-4 does not block: customer names a DIFFERENT real service than their history", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil deze keer de Standaard Afspraak",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-5 does not block: customer names only the distinguishing word ('Speciale', not the full name)", () => {
  assertEquals(mentionsAnyServiceName("doe mij maar de Speciale", AFSPRAAK_SERVICES), true);
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "doe mij maar de Speciale",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-6 does not block: no booking history at all (fresh customer)", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: null,
      currentMessage: "ik wil een afspraak maken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-7 does not block: conversation already confirmed the returning-service assumption", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "kan het ook om 14:00?",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: true,
    }),
    false,
  );
});

Deno.test("R111-8 blocks: single-service catalog, bare request, still fires (returning-default is about DISCLOSURE, not just disambiguation)", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knipbeurt",
      currentMessage: "ik wil weer een afspraak maken",
      allServiceNames: ["Knipbeurt"],
      returningServiceConfirmed: false,
    }),
    true,
  );
});

Deno.test("R111-9 does not block: single-service catalog, customer's message contains the service's own (only) word", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knipbeurt",
      currentMessage: "ik wil een knipbeurt boeken",
      allServiceNames: ["Knipbeurt"],
      returningServiceConfirmed: false,
    }),
    false,
  );
});

// ── R113 enforceReturningServiceDisclosure (closes R111-verify's TOOL-CALL-GATE-ONLY gap) ──────
// Live-reproduced on the S6 testpad (fresh fixture phones, real future booking history, same
// tenant/service-catalog shape as R111's own fixture): "ik wil weer een afspraak inplannen" and
// "hoi, ik wil een afspraak" (both verbatim from prompt.ts's own trigger-phrase list) made the
// model compose a reply with ZERO tool calls, so tools.ts's "bevestig_terugkerende_dienst" refusal
// (and its message) never fired even though blockForReturningServiceDefaultEffective was true.

Deno.test("R113-1 rewrites: guard is effective this turn, model's reply names no service at all (live-reproduced 'get_my_appointments-style' non-sequitur shape)", () => {
  const out = enforceReturningServiceDisclosure(
    "Er staat een afspraak: Speciale Afspraak op zaterdag 1 augustus 11:00 (op naam Fixture Test).",
    true,
    "Speciale Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Speciale Afspraak"));
});

Deno.test("R113-2 rewrites: guard effective, model asks a generic 'which service' WITHOUT naming the last one (live-reproduced shape)", () => {
  const out = enforceReturningServiceDisclosure(
    "Hoi! Welkom bij Lorvello. Welke dienst wil je graag boeken?",
    true,
    "Speciale Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Speciale Afspraak"));
});

Deno.test("R113-3 no-op: guard not effective this turn (fresh customer / already confirmed / customer named a service)", () => {
  const reply = "Welke dienst wil je graag boeken?";
  assertEquals(enforceReturningServiceDisclosure(reply, false, "Speciale Afspraak", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-4 no-op: guard effective but lastService is null/empty (defensive, should never happen alongside effective=true)", () => {
  const reply = "Welke dienst wil je graag boeken?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, null, AFSPRAAK_SERVICES), reply);
  assertEquals(enforceReturningServiceDisclosure(reply, true, "", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-5 no-op: the model's OWN reply already discloses the last service by name (correct disclosure must never be second-guessed)", () => {
  const reply = "Ik ga uit van dezelfde dienst als de vorige keer, Speciale Afspraak, klopt dat?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, "Speciale Afspraak", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-6 no-op: replyText is empty (nothing to rewrite)", () => {
  assertEquals(enforceReturningServiceDisclosure("", true, "Speciale Afspraak", AFSPRAAK_SERVICES), "");
});

Deno.test("R113-7 rewrites: a tool-call-relayed refusal message the model paraphrased into a non-sequitur (defense in depth even when a tool DID fire but the model still dropped the disclosure)", () => {
  const out = enforceReturningServiceDisclosure(
    "Ik heb op dit moment geen bevestigde informatie daarover, neem contact op met de zaak.",
    true,
    "Standaard Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Standaard Afspraak"));
});

Deno.test("R113-8 no-op: single-service catalog, guard effective, reply already mentions the service's own (only) word", () => {
  const reply = "Ik boek de knipbeurt in, voor welke dag wil je?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, "Knipbeurt", ["Knipbeurt"]), reply);
});

// ── R140 (SERVICE-SWITCH-DEAD-END fix): findServiceSwitchForPendingPreview ─────────────────────
// Live-reproduced shape: a customer with an uncommitted SECOND pending_booking preview tries to
// switch that preview's own service to a different, real, configured one.

Deno.test("R140-1 finds the switch: 'wacht, ik wil toch de Standaard Afspraak voor die tweede afspraak van Jan'", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Wacht, ik wil toch de Standaard Afspraak voor die tweede afspraak van Jan",
  });
  assertEquals(out, "Standaard Afspraak");
});

Deno.test("R140-2 finds the switch: EN phrasing", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Standaard Afspraak",
    currentMessage: "Actually, change the second appointment to the Speciale Afspraak instead",
  });
  assertEquals(out, "Speciale Afspraak");
});

Deno.test("R140-3 no switch: customer only re-confirms the PENDING preview's own current service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ja, de Speciale Afspraak klopt, graag bevestigen",
  });
  assertEquals(out, null);
});

Deno.test("R140-4 no switch: message names neither service at all (bare confirm)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ja klopt",
  });
  assertEquals(out, null);
});

Deno.test("R140-5 no switch: only one service exists (nothing to switch to)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: ["Knipbeurt"],
    pendingServiceName: "Knipbeurt",
    currentMessage: "Ik wil toch iets anders",
  });
  assertEquals(out, null);
});

Deno.test("R140-6 still resolves with pendingServiceName null (defensive): message names exactly one configured service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: ["Standaard Afspraak"],
    pendingServiceName: null,
    currentMessage: "Ik wil de Standaard Afspraak",
  });
  assertEquals(out, "Standaard Afspraak");
});

Deno.test("R140-7 finds the switch by distinguishing word only, avoiding the shared 'Afspraak' word false-positive", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Standaard Afspraak",
    currentMessage: "verander de tweede afspraak naar Speciale alsjeblieft",
  });
  assertEquals(out, "Speciale Afspraak");
});

Deno.test("R140-8 no switch: message mentions the shared generic word 'afspraak' only, no distinguishing word for either service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "ik wil gewoon een afspraak veranderen",
  });
  assertEquals(out, null);
});

Deno.test("R140-9 no switch: empty allServiceNames (defensive)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: [],
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ik wil de Standaard Afspraak",
  });
  assertEquals(out, null);
});

// ── R118 STALE-SERVICE-DEFAULT-OVERRIDE tests (closes full-journey-simulation R23) ─────────────
// Live shape: turn 1 the customer explicitly names "Volledige kleuring bij Milan" (resolved), turn
// 2 (2 messages later in the transcript sense used here) asks about a slot WITHOUT repeating the
// service name, and the durable `returning_service_confirmed` marker write from turn 1 did not (or
// had not yet) persisted, so only `returningServiceConfirmed: false` reaches the guard this turn.
const KLEUR_SERVICES = ["Knippen Dames", "Knippen Heren", "Volledige kleuring", "Highlights"];

Deno.test("R118-1 does not block: explicit service named 2 messages ago in this same thread outranks older historical lastService, even when returningServiceConfirmed did not persist", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knippen Dames", // stale/older DB history, a DIFFERENT calendar's last booking
      currentMessage: "heb je woensdag 15 juli om 11:00 nog plek?",
      allServiceNames: KLEUR_SERVICES,
      returningServiceConfirmed: false, // marker write did not land in time (R23's exact shape)
      recentInboundTexts: [
        "heb je woensdag 15 juli om 11:00 nog plek?",
        "wat kost een Volledige kleuring bij Milan?",
      ],
    }),
    false,
  );
});

Deno.test("R118-2 still blocks: no recent explicit mention at all (genuinely stale/no history in the window), falls back to the historical-booking heuristic as intended", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knippen Dames",
      currentMessage: "heb je woensdag 15 juli om 11:00 nog plek?",
      allServiceNames: KLEUR_SERVICES,
      returningServiceConfirmed: false,
      recentInboundTexts: ["heb je woensdag 15 juli om 11:00 nog plek?", "hoi"],
    }),
    true,
  );
});

Deno.test("R118-3 still blocks: recentInboundTexts omitted entirely (backward-compatible, byte-identical to pre-fix behaviour)", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knippen Dames",
      currentMessage: "heb je woensdag 15 juli om 11:00 nog plek?",
      allServiceNames: KLEUR_SERVICES,
      returningServiceConfirmed: false,
    }),
    true,
  );
});

Deno.test("R118-4 does not block: already confirmed takes priority regardless of recentInboundTexts contents", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knippen Dames",
      currentMessage: "heb je woensdag 15 juli om 11:00 nog plek?",
      allServiceNames: KLEUR_SERVICES,
      returningServiceConfirmed: true,
      recentInboundTexts: ["iets willekeurigs zonder dienstnaam"],
    }),
    false,
  );
});

// ── R79 SHORT-NAME-NEVER-MATCHES fix: a genuinely short (2-letter) employee/branch name must be
// recognized when named on its own, not only via the exact full configured string ─────────────

const R79_FIXTURE = [
  { name: "Milan (Kleuren)", services: [{ name: "Knippen", price: 35, durationMin: 40 }] },
  { name: "Bo (Nagels)", services: [{ name: "Knippen", price: 38, durationMin: 50 }] },
];

Deno.test("R79 does not block: short 2-letter branch name ('Bo') named alone, no parentheses", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R79_FIXTURE,
      inboundTexts: ["ik wil graag een knippen boeken", "bij Bo graag, maandag om 10 uur"],
    }),
    false,
  );
});

Deno.test("R79 does not block: short 2-letter branch name ('Bo') named lowercase mid-sentence", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R79_FIXTURE,
      inboundTexts: ["kan ik een knippen boeken bij bo?"],
    }),
    false,
  );
});

Deno.test("R79 still blocks: neither branch named, service is genuinely ambiguous (regression guard)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R79_FIXTURE,
      inboundTexts: ["ik wil graag een knippen boeken"],
    }),
    true,
  );
});

Deno.test("R79 does not false-positive: a longer branch name ('Milan') still matches as before", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R79_FIXTURE,
      inboundTexts: ["ik wil graag een knippen boeken bij Milan"],
    }),
    false,
  );
});

Deno.test("R79 GENERIC_NAME_WORDS extension: a lone 'ik'/'je'/'we' in a message never falsely names a branch", () => {
  const genericWordFixture = [
    { name: "Ik (Studio)", services: [{ name: "Massage", price: 50, durationMin: 60 }] },
    { name: "We (Praktijk)", services: [{ name: "Massage", price: 70, durationMin: 90 }] },
  ];
  // Customer never names either branch; every message is full of the generic words "ik"/"je"/"we"
  // themselves, which must NOT be mistaken for a branch name mention.
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: genericWordFixture,
      inboundTexts: ["ik wil graag een massage boeken, wat kan je voor me doen"],
    }),
    true,
  );
});

// ── R88 (full-journey-simulation R87 finding B fix): mentionsDistinguishing's full-name substring
// check must respect excludeWords, exactly like its own word-level fallback already does. Live
// repro shape: previewing Iris's compound service "Knippen + Stylen" (excludeWords built from ITS
// own words, {"knippen","stylen"}) must never treat Bo's genuinely different, real service named
// just "Knippen" as a second, customer-named service purely because "knippen" is a literal substring
// of the just-previewed service's own name.

Deno.test("R88-1 no match: excluded name is a pure substring collision with the previewed service's own name ('Knippen' inside 'Knippen + Stylen')", () => {
  assertEquals(
    mentionsDistinguishing(
      "Ik wil Knippen + Stylen bij Iris boeken, zondag 26 juli om 15:00, naam R87HedgeC",
      "Knippen",
      new Set(["knippen", "stylen"]),
    ),
    false,
  );
});

Deno.test("R88-2 still matches: a genuinely distinct service actually named by the customer, unrelated to the excluded words", () => {
  assertEquals(
    mentionsDistinguishing(
      "Kan ik ook Gelnagels boeken bij Bo?",
      "Gelnagels",
      new Set(["knippen", "stylen"]),
    ),
    true,
  );
});

Deno.test("R88-3 still matches: a multi-word name only PARTLY overlapping excludeWords (not every word excluded) is unaffected", () => {
  assertEquals(
    mentionsDistinguishing(
      "en ook nog een Knippen Heren graag",
      "Knippen Heren",
      new Set(["knippen", "stylen"]), // "heren" is NOT excluded, so the name is not fully covered
    ),
    true,
  );
});

Deno.test("R88-4 findUnacknowledgedSecondService-shaped repro via findServiceSwitchForPendingPreview: previewed compound service's own word never resolves to an unrelated same-word service", () => {
  // Mirrors index.ts's findUnacknowledgedSecondService construction (excludeWords from the
  // previewed service's own words), reusing the sibling findServiceSwitchForPendingPreview entry
  // point since it shares the identical mentionsDistinguishing primitive and exclude-set shape.
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: ["Knippen + Stylen", "Knippen", "Volledige kleuring"],
    pendingServiceName: "Knippen + Stylen",
    currentMessage: "Ik wil Knippen + Stylen bij Iris boeken, zondag 26 juli om 15:00, naam R87HedgeC",
  });
  assertEquals(out, null);
});

// R125 (MULTI-SERVICE-IN-ONE-MESSAGE fix, closes R124's live-reproduced bug: "Ik wil graag
// Knippen Dames EN Knippen Heren boeken bij Sanne, woensdag om 10:00" fell through to
// businessDataGuard's generic no-info fallback instead of asking a clarifying question).
Deno.test("R125-1 blocks: two distinct services named in one message, same calendar (exact R124 repro)", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen Dames", "Knippen Heren", "Highlights"],
    currentMessage: "Ik wil graag Knippen Dames EN Knippen Heren boeken bij Sanne, woensdag om 10:00",
  });
  assertEquals(out, ["Knippen Dames", "Knippen Heren"]);
});

Deno.test("R125-2 blocks: comma-separated phrasing ('ook')", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen Dames", "Knippen Heren"],
    currentMessage: "Knippen Dames boeken bij Sanne, ook Knippen Heren graag, woensdag 10:00",
  });
  assertEquals(out, ["Knippen Dames", "Knippen Heren"]);
});

Deno.test("R125-3 blocks: two services across different calendars (original R19/R20 cross-calendar shape)", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen Dames", "Highlights"],
    currentMessage: "Knippen Dames bij Sanne EN Highlights bij Milan graag",
  });
  assertEquals(out, ["Knippen Dames", "Highlights"]);
});

Deno.test("R125-4 does not block: single-service booking request (control, must stay unaffected)", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen Dames", "Knippen Heren"],
    currentMessage: "Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00",
  });
  assertEquals(out, null);
});

Deno.test("R125-5 does not block: same service configured on 2+ calendars, mentioned once (not a compound request)", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen", "Knippen"],
    currentMessage: "Ik wil Knippen boeken, woensdag 10:00",
  });
  assertEquals(out, null);
});

Deno.test("R125-6 does not block: no configured service named at all", () => {
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames: ["Knippen Dames", "Knippen Heren"],
    currentMessage: "heb je morgen nog plek?",
  });
  assertEquals(out, null);
});

Deno.test("R125-7 does not block: bare short service name ('Knippen') is a substring of the matched longer name ('Knippen Dames'), must not double-count", () => {
  // Live-caught this round: the real fixture also configures a bare 'Knippen' service on OTHER
  // calendars (Bo/Milan). A message naming only 'Knippen Dames' textually contains 'knippen',
  // which would otherwise falsely also match the bare 'Knippen' service, reporting 2 services
  // from a genuinely single-service message and getting the customer stuck in a repeated
  // clarifying-question loop (observed live before this fix).
  const allServiceNames = ["Gelnagels", "Knippen", "Manicure", "Bruidskapsel", "Knippen + Stylen", "Highlights", "Volledige kleuring", "Knippen Dames", "Knippen Heren"];
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames,
    currentMessage: "Vergeet de vorige boeking maar, ik wil gewoon alleen Knippen Dames boeken bij Sanne, donderdag om 11:00",
  });
  assertEquals(out, null);
});

Deno.test("R125-8 still blocks: genuine two-service message survives the substring-subsumption filter (regression guard for R125-7's fix)", () => {
  const allServiceNames = ["Gelnagels", "Knippen", "Manicure", "Bruidskapsel", "Knippen + Stylen", "Highlights", "Volledige kleuring", "Knippen Dames", "Knippen Heren"];
  const out = shouldBlockForMultiServiceRequest({
    allServiceNames,
    currentMessage: "Ik wil graag Knippen Dames EN Knippen Heren boeken bij Sanne, woensdag om 10:00",
  });
  assertEquals(out, ["Knippen Dames", "Knippen Heren"]);
});
