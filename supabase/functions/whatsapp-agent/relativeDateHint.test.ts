// Deterministic unit tests for the relative-date hint: R29's bare weekday pre-parse, plus R54's
// explicit day+month deterministic resolution (near or far, beyond the old 14-day table too).
// Pure extraction/formatting logic only, mirrors dateOfferGuard.test.ts's structure.
// Run: deno test relativeDateHint.test.ts
import { assertEquals, assertMatch } from "jsr:@std/assert";
import { extractRelativeDayHint, formatRelativeDateHint, hasDayMentionAnywhere, rescheduleFlowActiveWithNoDay, enforceRescheduleNoDayDisclosure } from "./relativeDateHint.ts";
import { scopeToCurrentTopicWindow } from "./preFilterCalendars.ts";

const CALENDARS_TEST = [
  { id: "sanne", name: "Sanne" },
  { id: "milan", name: "Milan" },
  { id: "iris", name: "Iris" },
  { id: "bo", name: "Bo" },
];

// Minimal stand-in for identityDisambiguationGuard.ts's own RESCHEDULE_VERB_RE (avoids pulling in
// that whole module just for this regex in a pure-function unit test).
const RESCHEDULE_VERB_RE_TEST =
  /\b(verzet\w*|verplaats\w*|verschuif\w*|verschoven|reschedul\w*|\bmove\b|\bmoved\b|\bshift\w*)\b/i;

// Fixed reference instant: Thursday 2026-07-09, 10:00 UTC (matches this loop's live fixture
// "today" at the time of the R28/R29 reproduction).
const THURSDAY = new Date("2026-07-09T10:00:00Z");

Deno.test("vandaag resolves to today", () => {
  const h = extractRelativeDayHint("Kan het vandaag nog?", THURSDAY);
  assertEquals(h?.iso, "2026-07-09");
});

Deno.test("morgen resolves to tomorrow", () => {
  const h = extractRelativeDayHint("Kan het morgen?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("overmorgen resolves to the day after tomorrow", () => {
  const h = extractRelativeDayHint("Overmorgen zou fijn zijn.", THURSDAY);
  assertEquals(h?.iso, "2026-07-11");
});

Deno.test("bare weekday resolves to nearest upcoming occurrence", () => {
  const h = extractRelativeDayHint("Kan het op vrijdag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10"); // nearest Friday from Thursday 07-09
});

Deno.test("R28/R29 exact reproduction phrase: 'vrijdag diezelfde week' resolves correctly", () => {
  const h = extractRelativeDayHint(
    "Kan het misschien ook op vrijdag diezelfde week, iets vroeger op de dag, en anders is donderdag ook prima.",
    THURSDAY,
  );
  assertEquals(h?.iso, "2026-07-10");
  assertEquals(h?.matchedPhrase.includes("vrijdag"), true);
});

Deno.test("R28 exact rambling message: first weekday mention (vrijdag) wins over the later 'donderdag' fallback", () => {
  const h = extractRelativeDayHint(
    "Hoi! Sorry voor het lange bericht, mijn hond moest naar de dierenarts en het schoolreisje van mijn dochter " +
      "kwam er ook nog tussendoor, maar goed, ik wil hem verzetten naar vrijdag diezelfde week, iets vroeger op " +
      "de dag, en anders is donderdag ook prima.",
    THURSDAY,
  );
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("'deze vrijdag' behaves the same as a bare weekday", () => {
  const h = extractRelativeDayHint("Kan het deze vrijdag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("'volgende week vrijdag' skips to the following week", () => {
  const h = extractRelativeDayHint("Liever volgende week vrijdag.", THURSDAY);
  assertEquals(h?.iso, "2026-07-17");
});

Deno.test("'volgende vrijdag' skips to the following week", () => {
  const h = extractRelativeDayHint("Liever volgende vrijdag.", THURSDAY);
  assertEquals(h?.iso, "2026-07-17");
});

Deno.test("weekday earlier in the current week resolves to next week's occurrence", () => {
  // Thursday asking for "maandag" means the NEXT Monday (07-13), not a past Monday.
  const h = extractRelativeDayHint("Kan het op maandag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-13");
});

Deno.test("same weekday as today resolves to today (nearest occurrence includes today)", () => {
  const h = extractRelativeDayHint("Kan het donderdag, dus vandaag eigenlijk?", THURSDAY);
  assertEquals(h?.iso, "2026-07-09");
});

Deno.test("no relative-date phrase present -> null", () => {
  const h = extractRelativeDayHint("Wat kost een knipbeurt?", THURSDAY);
  assertEquals(h, null);
});

// ── R82: fused weekday+daypart compounds (FINDINGS LEDGER R80 exact repro) ──────────────────────

Deno.test("R80 exact repro: 'dinsdagavond' (fused, zero space) resolves to the real next Tuesday, not null", () => {
  const h = extractRelativeDayHint(
    "Code: f744eddc Hoi, ik wil graag een afspraak maken bij Iris, dinsdagavond.",
    THURSDAY,
  );
  assertEquals(h?.iso, "2026-07-14"); // nearest Tuesday from Thursday 07-09
  assertEquals(h?.matchedPhrase.includes("dinsdag"), true);
});

Deno.test("fused 'vrijdagmiddag' resolves the same as spaced 'vrijdag middag'", () => {
  const h = extractRelativeDayHint("Kan het vrijdagmiddag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("fused 'maandagochtend' resolves to the next Monday", () => {
  const h = extractRelativeDayHint("Liever maandagochtend.", THURSDAY);
  assertEquals(h?.iso, "2026-07-13");
});

Deno.test("fused 'zondagnacht' resolves to the next Sunday", () => {
  const h = extractRelativeDayHint("Zou zondagnacht nog kunnen?", THURSDAY);
  assertEquals(h?.iso, "2026-07-12");
});

Deno.test("fused weekday+daypart still honors 'volgende week' skip-to-next-week", () => {
  const h = extractRelativeDayHint("Liever volgende week dinsdagavond.", THURSDAY);
  assertEquals(h?.iso, "2026-07-21"); // next-week Tuesday, not this Tuesday 07-14
});

Deno.test("fused weekday+daypart still honors a trailing 'diezelfde week' qualifier", () => {
  const h = extractRelativeDayHint("Kan het misschien ook vrijdagmiddag diezelfde week?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("explicit numeric date within the 14-day window resolves deterministically (R54, no regression vs the old kalender-table path)", () => {
  const h = extractRelativeDayHint("Kan ik 24 juli om 9 uur?", THURSDAY);
  assertEquals(h?.iso, "2026-07-24");
});

Deno.test("weekday name RIGHT NEXT TO an explicit date resolves to the EXPLICIT date, not the weekday (never overrules an explicit date, regression guard)", () => {
  const h = extractRelativeDayHint("Kan ik vrijdag 24 juli om 9 uur Gelnagels boeken bij Bo?", THURSDAY);
  assertEquals(h?.iso, "2026-07-24");
  assertEquals(h?.matchedPhrase, "24 juli");
});

Deno.test("weekday name elsewhere in a message that ALSO contains an unrelated explicit date -> resolves to the explicit date (defer to it entirely, not the weekday)", () => {
  const h = extractRelativeDayHint("Ik had het over 24 juli, maar kan het ook op vrijdag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-24");
});

// ── R54: explicit day+month beyond the 14-day <kalender> table (FINDINGS LEDGER R53) ──────────

Deno.test("R53 exact repro: '6 augustus' (28 days out, beyond the 14-day table) resolves to the real future ISO date, not a hallucinated past one", () => {
  const h = extractRelativeDayHint("Kan ik donderdag 6 augustus een Manicure boeken bij Bo?", THURSDAY);
  assertEquals(h?.iso, "2026-08-06");
});

Deno.test("'6 aug' abbreviation resolves the same as '6 augustus'", () => {
  const h = extractRelativeDayHint("Kan ik 6 aug een Manicure boeken bij Bo?", THURSDAY);
  assertEquals(h?.iso, "2026-08-06");
});

Deno.test("explicit date WITH an explicit year is honored literally, not rolled", () => {
  const h = extractRelativeDayHint("Kan ik 6 augustus 2027 een Manicure boeken?", THURSDAY);
  assertEquals(h?.iso, "2027-08-06");
});

Deno.test("day+month already passed this year (no year stated) rolls to next year, never silently picks a past date", () => {
  // THURSDAY is 2026-07-09; "3 januari" with no year would be 2026-01-03 if taken literally,
  // which is already in the past. Must roll to 2027-01-03, not 2026-01-03.
  const h = extractRelativeDayHint("Kan ik 3 januari een Manicure boeken?", THURSDAY);
  assertEquals(h?.iso, "2027-01-03");
});

Deno.test("day+month still ahead this year (no year stated) stays in the current year", () => {
  const h = extractRelativeDayHint("Kan ik 25 december een Manicure boeken?", THURSDAY);
  assertEquals(h?.iso, "2026-12-25");
});

Deno.test("day+month equal to today (no year stated) resolves to today, not next year", () => {
  const h = extractRelativeDayHint("Kan ik 9 juli een Manicure boeken?", THURSDAY);
  assertEquals(h?.iso, "2026-07-09");
});

// ── formatRelativeDateHint ────────────────────────────────────────────────────

Deno.test("formatRelativeDateHint(null) renders nothing", () => {
  assertEquals(formatRelativeDateHint(null), "");
});

Deno.test("formatRelativeDateHint renders the resolved ISO + label + an anti-history-anchor instruction", () => {
  const h = extractRelativeDayHint("Kan het op vrijdag?", THURSDAY);
  const text = formatRelativeDateHint(h);
  assertMatch(text, /2026-07-10/);
  assertMatch(text, /eerder in dit gesprek/);
});

// ── R93: hasDayMentionAnywhere (SILENT-TODAY-DEFAULT fix) ───────────────────────────────────

Deno.test("R92 exact repro: no day named in current message or history -> false (no day mention anywhere)", () => {
  const found = hasDayMentionAnywhere(
    "Ik wil graag een afspraak bij Milan boeken, wanneer heb je tijd?",
    [],
    THURSDAY,
  );
  assertEquals(found, false);
});

Deno.test("no day named in current message, but an earlier inbound message named a weekday -> true", () => {
  const found = hasDayMentionAnywhere(
    "En hoe laat dan precies?",
    ["Ik wil graag een afspraak op vrijdag."],
    THURSDAY,
  );
  assertEquals(found, true);
});

Deno.test("current message itself names a day -> true even with no history", () => {
  const found = hasDayMentionAnywhere("Kan het morgen?", [], THURSDAY);
  assertEquals(found, true);
});

Deno.test("current message names a fused weekday+daypart (R82 regression guard) -> true", () => {
  const found = hasDayMentionAnywhere(
    "Code: f744eddc Hoi, ik wil graag een afspraak maken bij Iris, dinsdagavond.",
    [],
    THURSDAY,
  );
  assertEquals(found, true);
});

Deno.test("neither current message nor any prior inbound message names a day -> false", () => {
  const found = hasDayMentionAnywhere(
    "Wanneer heb je tijd?",
    ["Hoi, ik wil graag een afspraak maken.", "Wat kost een knipbeurt?"],
    THURSDAY,
  );
  assertEquals(found, false);
});

// R95 (RESCHEDULE-NO-DAY-STONEWALL fix) tests below: rescheduleFlowActiveWithNoDay's own
// narrower-than-whole-history scoping (the reschedule-specific twin of blockForNoDayNamed above),
// and enforceRescheduleNoDayDisclosure's reply-rewrite backstop.

Deno.test("R94 exact repro: reschedule verb this turn, no day anywhere in this reschedule attempt -> true", () => {
  const active = rescheduleFlowActiveWithNoDay(
    "Kan ik mijn afspraak verzetten naar een ander tijdstip?",
    ["Ik wil bij Iris (Weekend) Knippen + Stylen boeken op dinsdag 14 juli om 19:00"],
    THURSDAY,
    RESCHEDULE_VERB_RE_TEST,
  );
  assertEquals(active, true);
});

Deno.test("original booking's day in history does NOT satisfy the reschedule-day check (narrower scope than blockForNoDayNamed)", () => {
  // Same scenario as the R94 repro test above, phrased to make the point explicit: a day WAS
  // named in this conversation (when the appointment was booked), but that mention predates the
  // reschedule attempt entirely, so it must NOT count as "the customer named a new day".
  const active = rescheduleFlowActiveWithNoDay(
    "verzetten naar een ander tijdstip alsjeblieft",
    ["afspraak op dinsdag 14 juli om 19:00"],
    THURSDAY,
    RESCHEDULE_VERB_RE_TEST,
  );
  assertEquals(active, true);
});

Deno.test("bare follow-up naming only a new time, after an earlier reschedule-verb turn in this same attempt -> still true (no day given)", () => {
  const active = rescheduleFlowActiveWithNoDay(
    "Zet mijn afspraak alsjeblieft naar 20:00 uur",
    [
      "Ik wil bij Iris (Weekend) Knippen + Stylen boeken op dinsdag 14 juli om 19:00",
      "Kan ik mijn afspraak verzetten naar een ander tijdstip?",
    ],
    THURSDAY,
    RESCHEDULE_VERB_RE_TEST,
  );
  assertEquals(active, true);
});

Deno.test("reschedule with an explicit new day named this turn -> false (no block, zero regression)", () => {
  const active = rescheduleFlowActiveWithNoDay(
    "kan het naar dinsdag 21 juli 19:00?",
    ["Ik wil bij Iris (Weekend) Knippen + Stylen boeken op dinsdag 14 juli om 19:00"],
    THURSDAY,
    RESCHEDULE_VERB_RE_TEST,
  );
  assertEquals(active, false);
});

Deno.test("no reschedule intent at all (plain booking flow) -> false, never fires outside a reschedule attempt", () => {
  const active = rescheduleFlowActiveWithNoDay(
    "Wanneer heb je tijd?",
    ["Ik wil graag een afspraak bij Milan boeken"],
    THURSDAY,
    RESCHEDULE_VERB_RE_TEST,
  );
  assertEquals(active, false);
});

Deno.test("enforceRescheduleNoDayDisclosure rewrites the get_my_appointments-shaped stonewall to the day question", () => {
  const out = enforceRescheduleNoDayDisclosure(
    "Er staat een afspraak: Knippen + Stylen op dinsdag 14 juli 19:00 (op naam E2E Simulator).",
    true,
  );
  assertEquals(out, "Naar welke dag wil je de afspraak verzetten?");
});

Deno.test("enforceRescheduleNoDayDisclosure is a no-op when the flag is false", () => {
  const original = "Er staat een afspraak: Knippen + Stylen op dinsdag 14 juli 19:00 (op naam E2E Simulator).";
  const out = enforceRescheduleNoDayDisclosure(original, false);
  assertEquals(out, original);
});

Deno.test("enforceRescheduleNoDayDisclosure never clobbers a reply that already asks which day", () => {
  const original = "Naar welke dag zou je 'm willen verzetten?";
  const out = enforceRescheduleNoDayDisclosure(original, true);
  assertEquals(out, original);
});

Deno.test("enforceRescheduleNoDayDisclosure also rewrites a silent bare slot-offer (live-reproduced R95-verify shape, not just the status-readout template)", () => {
  const out = enforceRescheduleNoDayDisclosure("19:30 past?", true);
  assertEquals(out, "Naar welke dag wil je de afspraak verzetten?");
});

Deno.test("enforceRescheduleNoDayDisclosure defers to a sibling gate's own question (naam_verificatie_nodig) instead of overriding it", () => {
  const original = "De afspraak die ik vond staat op naam van Sanne. Klopt het dat dit haar afspraak is?";
  const out = enforceRescheduleNoDayDisclosure(original, true, [
    { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig" } },
  ]);
  assertEquals(out, original);
});

Deno.test("enforceRescheduleNoDayDisclosure never touches a reply for a turn that actually committed (ok:true)", () => {
  const original = "Gedaan, je staat nu op dinsdag 21 juli 19:00.";
  const out = enforceRescheduleNoDayDisclosure(original, true, [
    { name: "reschedule_appointment", result: { ok: true, booking_id: "abc" } },
  ]);
  assertEquals(out, original);
});

Deno.test("enforceRescheduleNoDayDisclosure STILL rewrites when reschedule_appointment itself returned vraag_dag (live-reproduced R95-verify: the model does not reliably relay that gate's own message either)", () => {
  const out = enforceRescheduleNoDayDisclosure(
    "Er staat een afspraak: Bruidskapsel op dinsdag 14 juli 18:00 (op naam E2E Simulator).",
    true,
    [{ name: "reschedule_appointment", result: { error: "vraag_dag", message: "vraag eerst welke dag" } }],
  );
  assertEquals(out, "Naar welke dag wil je de afspraak verzetten?");
});

// R98 (DAY/INTENT TOPIC-BLEED fix): composed tests proving the FULL fix (scopeToCurrentTopicWindow
// feeding hasDayMentionAnywhere / rescheduleFlowActiveWithNoDay), mirroring exactly the two live-
// confirmed R97 failures, plus the required non-regression checks (R93/R95/R97 must stay intact).
const NOW_R98 = new Date("2026-07-11T12:00:00Z");

Deno.test("R98: a fresh Bo booking with no day, after an Iris reschedule flow established a day, gets its OWN blockForNoDayNamed=true (booking-flavored, not silently satisfied by Iris's day)", () => {
  const priorInboundTexts = [
    "Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?",
    "Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?",
    "zondag 2 augustus graag",
  ];
  const currentText = "Ik wil graag een afspraak bij Bo boeken, wanneer heb je tijd?";
  const window = scopeToCurrentTopicWindow(currentText, priorInboundTexts, CALENDARS_TEST);
  const blockForNoDayNamed = !hasDayMentionAnywhere(currentText, window, NOW_R98);
  assertEquals(blockForNoDayNamed, true);
});

Deno.test("R98: the SAME fresh Bo booking never inherits reschedule flow-type (rescheduleFlowActiveWithNoDay is false, not true with the wrong 'verzetten' verb)", () => {
  const priorInboundTexts = [
    "Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?",
    "Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?",
    "zondag 2 augustus graag",
  ];
  const currentText = "Ik wil graag een afspraak bij Bo boeken, wanneer heb je tijd?";
  const window = scopeToCurrentTopicWindow(currentText, priorInboundTexts, CALENDARS_TEST);
  const rescheduleNoDayThisTurn = rescheduleFlowActiveWithNoDay(currentText, window, NOW_R98, RESCHEDULE_VERB_RE_TEST);
  assertEquals(rescheduleNoDayThisTurn, false);
});

Deno.test("R98 non-regression: a SAME-calendar Iris reschedule with no day still correctly asks the reschedule day-question (R95 case intact)", () => {
  const priorInboundTexts = [
    "Ik wil graag een afspraak bij Iris boeken, wanneer heb je tijd?",
    "vrijdag 10 juli graag",
  ];
  const currentText = "Kan mijn Knippen + Stylen afspraak alsjeblieft nog een keer verzet worden?";
  const window = scopeToCurrentTopicWindow(currentText, priorInboundTexts, CALENDARS_TEST);
  const rescheduleNoDayThisTurn = rescheduleFlowActiveWithNoDay(currentText, window, NOW_R98, RESCHEDULE_VERB_RE_TEST);
  assertEquals(rescheduleNoDayThisTurn, true);
});

Deno.test("R98 non-regression: a clean-history fresh booking (R93 shape, single calendar, no topic switch at all) still asks the day question", () => {
  const priorInboundTexts: string[] = [];
  const currentText = "Ik wil graag een afspraak bij Milan boeken, wanneer heb je tijd?";
  const window = scopeToCurrentTopicWindow(currentText, priorInboundTexts, CALENDARS_TEST);
  const blockForNoDayNamed = !hasDayMentionAnywhere(currentText, window, NOW_R98);
  assertEquals(blockForNoDayNamed, true);
});
