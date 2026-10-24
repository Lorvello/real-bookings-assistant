// Deterministic unit tests for the relative-date hint: R29's bare weekday pre-parse, plus R54's
// explicit day+month deterministic resolution (near or far, beyond the old 14-day table too).
// Pure extraction/formatting logic only, mirrors dateOfferGuard.test.ts's structure.
// Run: deno test relativeDateHint.test.ts
import { assertEquals, assertMatch } from "jsr:@std/assert@1.0.19";
import { extractRelativeDayHint, formatRelativeDateHint, extractCarriedForwardDayHint, formatCarriedForwardDayHint, hasDayMentionAnywhere, latestEndTodayMinutes, rescheduleFlowActiveWithNoDay, enforceRescheduleNoDayDisclosure } from "./relativeDateHint.ts";
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

// ---------------------------------------------------------------------------
// R127 (SILENT-DAY-DRIFT fix, live-reproduced R126): extractCarriedForwardDayHint tests.
const NOW_R127 = new Date("2026-07-12T12:00:00Z"); // Sunday, matches the fixture's real "today".

Deno.test("R127 exact repro shape: bare time-only reply with NO day carries forward the last established day (woensdag)", () => {
  const priorInboundTexts = [
    "Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00",
  ];
  const hint = extractCarriedForwardDayHint("Wat kost dat trouwens, en doe dan maar 10:00", priorInboundTexts, NOW_R127);
  assertEquals(hint?.iso, "2026-07-15"); // nearest upcoming Wednesday from Sunday 2026-07-12
});

Deno.test("R127: plain bare time-only reply (no mixed price question) also carries forward correctly", () => {
  const priorInboundTexts = [
    "Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00",
  ];
  const hint = extractCarriedForwardDayHint("Doe maar 10:00", priorInboundTexts, NOW_R127);
  assertEquals(hint?.iso, "2026-07-15");
});

Deno.test("R127: picks the MOST RECENT prior day mention, not an older stale one further back in history", () => {
  const priorInboundTexts = [
    "Ik wil graag Gelnagels boeken, ook Manicure, bij Bo, vrijdag om 14:00",
    "Laat maar, vergeet dit verzoek, ik wil niks boeken",
    "Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00",
  ];
  const hint = extractCarriedForwardDayHint("doe dan maar 10:00", priorInboundTexts, NOW_R127);
  assertEquals(hint?.iso, "2026-07-15"); // woensdag (most recent), NOT vrijdag (older, further back)
});

Deno.test("R127: current message naming its OWN day wins, carried-forward hint never consulted", () => {
  const priorInboundTexts = ["Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00"];
  const hint = extractCarriedForwardDayHint("doe maar vrijdag 10:00", priorInboundTexts, NOW_R127);
  assertEquals(hint, null);
});

Deno.test("R127: no bare clock time in current message -> null (nothing to carry a day forward for)", () => {
  const priorInboundTexts = ["Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00"];
  const hint = extractCarriedForwardDayHint("Wat kost dat eigenlijk?", priorInboundTexts, NOW_R127);
  assertEquals(hint, null);
});

Deno.test("R127: no prior day mention anywhere -> null (nothing to carry)", () => {
  const priorInboundTexts = ["Hallo, wat zijn jullie openingstijden?"];
  const hint = extractCarriedForwardDayHint("doe maar 10:00", priorInboundTexts, NOW_R127);
  assertEquals(hint, null);
});

Deno.test("R127: empty prior history -> null", () => {
  const hint = extractCarriedForwardDayHint("doe maar 10:00", [], NOW_R127);
  assertEquals(hint, null);
});

Deno.test("R127: formatCarriedForwardDayHint renders the real ISO/day and never claims the customer named it this turn", () => {
  const hint = extractCarriedForwardDayHint(
    "doe dan maar 10:00",
    ["Ik wil graag Knippen Dames boeken bij Sanne, woensdag om 10:00"],
    NOW_R127,
  );
  const text = formatCarriedForwardDayHint(hint);
  assertMatch(text, /2026-07-15/);
  assertMatch(text, /geen dag/);
});

Deno.test("R127: formatCarriedForwardDayHint(null) returns empty string", () => {
  assertEquals(formatCarriedForwardDayHint(null), "");
});

// R137 (live-reproduced R136, fixed this round): "over N dag(en)/week(en)" had zero deterministic
// coverage before this fix, so the model computed it freely and got it wrong, including a
// same-month case (see the goal-loop digest for the live "over twee weken" control-test result).
// Reference "now" here is the real live fixture instant this bug was found/fixed against: Sunday
// 2026-07-12.
const SUNDAY_R137 = new Date("2026-07-12T10:00:00Z");

Deno.test("R137: 'over drie weken' crossing a month boundary resolves to the mathematically correct date", () => {
  const h = extractRelativeDayHint("Op welke kalenderdatum valt over drie weken vanaf vandaag?", SUNDAY_R137);
  assertEquals(h?.iso, "2026-08-02");
});

Deno.test("R137: 'over twee weken' (no month boundary) resolves correctly", () => {
  const h = extractRelativeDayHint("Op welke kalenderdatum valt over twee weken vanaf vandaag?", SUNDAY_R137);
  assertEquals(h?.iso, "2026-07-26");
});

Deno.test("R137: 'over 21 dagen' (digit form) resolves identically to 'over drie weken'", () => {
  const h = extractRelativeDayHint("Wat is de datum over 21 dagen?", SUNDAY_R137);
  assertEquals(h?.iso, "2026-08-02");
});

Deno.test("R137: 'over 1 week' (singular unit) resolves correctly", () => {
  const h = extractRelativeDayHint("Kan het over 1 week?", SUNDAY_R137);
  assertEquals(h?.iso, "2026-07-19");
});

Deno.test("R137: year-boundary crossing ('over vier weken' from late December) rolls into the next year", () => {
  const lateDec = new Date("2026-12-10T10:00:00Z");
  const h = extractRelativeDayHint("Kan dat over vier weken?", lateDec);
  assertEquals(h?.iso, "2027-01-07");
});

Deno.test("R137: regression, bare weekday phrasing still resolves unaffected by the new relative-count block", () => {
  const h = extractRelativeDayHint("Kan het op vrijdag?", THURSDAY);
  assertEquals(h?.iso, "2026-07-10");
});

Deno.test("R137: regression, 'volgende week vrijdag' still skips to the following week unaffected", () => {
  const h = extractRelativeDayHint("Liever volgende week vrijdag.", THURSDAY);
  assertEquals(h?.iso, "2026-07-17");
});

Deno.test("R137: regression, 'vandaag' still resolves to today unaffected", () => {
  const h = extractRelativeDayHint("Kan het vandaag nog?", THURSDAY);
  assertEquals(h?.iso, "2026-07-09");
});

// =============================================================================================
// R140 (LAUNCH-RUN 2026-09 / R6-PRE). DE ENGELSE WEEKDAG EN DE NEDERLANDSE AFKORTING.
//
// GEMETEN OORZAAK, niet vermoed. Van de 30 suite-scenario's noemen er 14 hun dag UITSLUITEND als
// een Engelse weekdagnaam ("thursday 2pm", "wednesday", "friday", "tues 10", "sat 10") of als een
// Nederlandse afkorting ("do 2 uur", "di 10 uur", "wo 4 uur", "ma langskomen"). `NL_WEEKDAYS` kende
// alleen de zeven VOLUIT geschreven Nederlandse namen, dus `extractRelativeDayHint` gaf op al die
// zinnen `null`. Gevolg, gemeten op de gedeployde staging-functie: `hasDayMentionAnywhere` is dan
// false, `index.ts` zet `blockForNoDayNamed`, en `tools.ts` weigert ZOWEL `get_available_slots` als
// `book_appointment` met `vraag_dag`. De agent antwoordt daarop "Which day would you like?" op een
// bericht waarin de klant de dag AL noemde, en de boeking komt er nooit. Dit is de grootste enkele
// oorzaak achter de 30 gefaalde aanwezigheidspoorten van R5-A.
//
// DE VALKUIL, en waarom de afkortingen een eigen, strengere pas krijgen: "do", "ma", "zo", "wed",
// "sat" en "sun" zijn ook GEWONE woorden. De suite draagt de tegenvoorbeelden zelf:
//   S02 "hi what do u do and whats the price?"   <- twee keer het Engelse werkwoord
//   S08 "yeah fine. can we do 3 instead tho?"    <- werkwoord, met een getal erachter
//   S28 "whats the latest u can do me on friday" <- werkwoord EN een echte dag in dezelfde zin
// Een afkorting die vals matcht is erger dan geen match: hij injecteert een VERKEERDE datum in de
// prompt. Daarom: voluit geschreven namen (NL + EN) winnen altijd eerst; de afkortingen draaien
// alleen als daar niets uit kwam, en de dubbelzinnige vormen dragen een expliciete uitsluiting.
// =============================================================================================

// Referentiemoment: zondag 2026-09-06 12:00 Amsterdam (de dag van deze meting).
const ZONDAG_R140 = new Date("2026-09-06T10:00:00Z");

Deno.test("R140: Engelse weekdagnaam voluit ('thursday') resolves", () => {
  const h = extractRelativeDayHint("hi id like a haircut thursday 2pm, name is tom bakker", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-10");
});

Deno.test("R140: 'wednesday' resolves", () => {
  const h = extractRelativeDayHint("hi can i book a colour wednesday", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-09");
});

Deno.test("R140: 'friday' resolves, ook met het Engelse werkwoord 'do' in dezelfde zin", () => {
  const h = extractRelativeDayHint("whats the latest u can do me on friday", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-11");
});

Deno.test("R140: Engelse afkorting 'tues' resolves", () => {
  const h = extractRelativeDayHint("can u move my appt to tues 10?", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-08");
});

Deno.test("R140: Engelse afkorting 'sat' resolves", () => {
  const h = extractRelativeDayHint("can i just pay on the day? if not book me sat 10", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-12");
});

Deno.test("R140: Engelse daypart-suffix ('friday morning') resolves", () => {
  const h = extractRelativeDayHint("friday morning would be great", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-11");
});

Deno.test("R140: NL-afkorting 'do' met tijd resolves naar donderdag", () => {
  const h = extractRelativeDayHint("do 2 uur knippen kan dat? -Sanne", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-10");
});

Deno.test("R140: NL-afkorting 'di' resolves naar dinsdag", () => {
  const h = extractRelativeDayHint("di 10 uur knippen? karim", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-08");
});

Deno.test("R140: NL-afkorting 'wo' resolves naar woensdag", () => {
  const h = extractRelativeDayHint("kan ik ook nog ff een andere tijd, wo 4 uur?", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-09");
});

Deno.test("R140: NL-afkorting 'ma' zonder tijd resolves naar maandag", () => {
  const h = extractRelativeDayHint("kan ik ma langskomen voor knippen", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-07");
});

Deno.test("R140: 'do' vlak voor een lidwoord resolves ('do een balayage')", () => {
  const h = extractRelativeDayHint("hoi kan ik do een balayage boeken?", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-10");
});

Deno.test("R140: 'do half 5' resolves naar donderdag", () => {
  const h = extractRelativeDayHint("kan mn afspraak naar do half 5?", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-10");
});

Deno.test("R140: 'do open?' aan het begin resolves naar donderdag", () => {
  const h = extractRelativeDayHint("hoi! do open? en hoe laat dan", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-10");
});

// --- DE VALS-POSITIEVEN. Deze MOETEN null blijven. ---

Deno.test("R140 VALSE MATCH: 'what do u do' is het Engelse werkwoord, GEEN donderdag", () => {
  const h = extractRelativeDayHint("hi what do u do and whats the price? how long does it take", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'can we do 3 instead' is het werkwoord, GEEN donderdag", () => {
  const h = extractRelativeDayHint("yeah fine. can we do 3 instead tho?", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'zo snel mogelijk' is een bijwoord, GEEN zondag", () => {
  const h = extractRelativeDayHint("kan het zo snel mogelijk?", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'zo laat mogelijk' is een bijwoord, GEEN zondag", () => {
  const h = extractRelativeDayHint("ik wil zo laat mogelijk komen", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'ik sat' bestaat niet, maar 'I sat' wel: GEEN zaterdag", () => {
  const h = extractRelativeDayHint("i sat in the waiting room for ages", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'mn ma' is moeder, GEEN maandag", () => {
  const h = extractRelativeDayHint("ik kom samen met mn ma langs", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140 VALSE MATCH: 'wat kan je doen' bevat geen losse 'do'", () => {
  const h = extractRelativeDayHint("wat kan je doen aan mn haar", ZONDAG_R140);
  assertEquals(h, null);
});

Deno.test("R140: hasDayMentionAnywhere ziet nu de Engelse dag in het huidige bericht", () => {
  assertEquals(hasDayMentionAnywhere("hi can i book a haircut thursday 2pm?", [], ZONDAG_R140), true);
});

Deno.test("R140: hasDayMentionAnywhere blijft false op een bericht zonder dag", () => {
  assertEquals(hasDayMentionAnywhere("hi what do u do and whats the price?", [], ZONDAG_R140), false);
});

// R18: repair R06PRE's parked S13 qualifier gap. Keep the established arithmetic:
// next/volgende adds seven days to the nearest occurrence, including on Sundays.
Deno.test("R18: parked S13 'vrijdag 1 uur volgende week' preserves the week qualifier", () => {
  const h = extractRelativeDayHint("kan mn afspraak naar vrijdag 1 uur volgende week", ZONDAG_R140);
  assertEquals(h?.iso, "2026-09-18");
  assertEquals(h?.matchedPhrase, "vrijdag 1 uur volgende week");
});

for (const phrase of [
  "vrijdag om 13:00 volgende week",
  "vrijdag om half twee volgende week",
  "vrijdag om kwart over twee volgende week",
  "vrijdag middag volgende week",
  "vrijdagmiddag om 13.30 volgende week",
  "friday 1pm next week",
  "friday at 1 pm next week",
  "friday at 13:30 next week",
  "friday morning next week",
  "fri at 1pm next week",
  "vrijdag volgende week",
  "next week friday",
]) {
  Deno.test(`R18: local time/daypart qualifier '${phrase}'`, () => {
    assertEquals(extractRelativeDayHint(phrase, THURSDAY)?.iso, "2026-07-17");
  });
}

for (const phrase of [
  "vrijdag om 13:00, volgende week maandag om 10:00",
  "vrijdag 1 uur en volgende week maandag",
  "friday at 1pm or next week monday",
  "friday at 1pm. next week monday",
  "friday at 1pm\nnext week monday",
  "vrijdag 1 uur volgende week maandag",
  "friday at 1 next week tuesday",
  "friday at 1 next week on monday",
  "vrijdag 1 uur volgende week op maandag",
  "vrijdag volgende week maandag",
  "vrijdag 1 uur en ik bel je volgende week",
  "friday at 1pm I will call next week",
  "vrijdag om 25:00 volgende week",
  "vrijdag om 13:99 volgende week",
  "vrijdag 1 uur 2 uur volgende week",
  "vrijdag om half twee drie volgende week",
]) {
  Deno.test(`R18: no qualifier cross-association '${phrase}'`, () => {
    assertEquals(extractRelativeDayHint(phrase, THURSDAY)?.iso, "2026-07-10");
  });
}

Deno.test("R18: first qualified weekday keeps its own qualifier with a later alternative", () => {
  assertEquals(extractRelativeDayHint("friday at 1pm next week, or monday at 10", THURSDAY)?.iso, "2026-07-17");
});

Deno.test("R18: explicit date still wins over a time-gap weekday qualifier", () => {
  assertEquals(extractRelativeDayHint("vrijdag 24 juli om 13:00 volgende week", THURSDAY)?.iso, "2026-07-24");
});

Deno.test("R18: qualifier gap retains DST-safe date arithmetic at a month boundary", () => {
  assertEquals(extractRelativeDayHint("friday at 1pm next week", new Date("2026-10-29T23:30:00Z"))?.iso, "2026-11-06");
});

// R18 FIX1: qualifier ownership must apply R140's ambiguous-word exclusions.
for (const phrase of [
  "friday next week do you have space?",
  "vrijdag volgende week zo laat mogelijk",
  "friday at 1pm next week do you have space?",
  "vrijdag 1 uur volgende week zo laat mogelijk",
  "friday next week sat in the waiting room",
  "friday next week sun is shining",
]) {
  Deno.test(`R18 FIX1: ordinary word preserves qualifier '${phrase}'`, () => {
    assertEquals(extractRelativeDayHint(phrase, THURSDAY)?.iso, "2026-07-17");
  });
}
for (const phrase of [
  "vrijdag 1 uur volgende week do 2 uur",
  "vrijdag 1 uur volgende week zo 10 uur",
  "friday next week sat 10",
  "friday next week sun 10",
]) {
  Deno.test(`R18 FIX1: actual abbreviation retains qualifier ownership '${phrase}'`, () => {
    assertEquals(extractRelativeDayHint(phrase, THURSDAY)?.iso, "2026-07-10");
  });
}

// R84 (original11 S09, actual staging run 2026-09-08 22:01 Amsterdam): a weekday that is today,
// with a clock time that already passed today in every plausible reading, means next week.
const TUESDAY_2201 = new Date("2026-09-08T20:01:49Z"); // dinsdag 8 september, 22:01 Amsterdam
const TUESDAY_0800 = new Date("2026-09-08T06:00:00Z"); // dinsdag 8 september, 08:00 Amsterdam

Deno.test("R84 S09 exact: 'di 10 uur' on Tuesday 22:01 resolves to next Tuesday", () => {
  assertEquals(extractRelativeDayHint("di 10 uur knippen? karim", TUESDAY_2201)?.iso, "2026-09-15");
});

Deno.test("R84 'di 10 uur' on Tuesday 08:00 keeps today (10:00 still ahead)", () => {
  assertEquals(extractRelativeDayHint("di 10 uur knippen? karim", TUESDAY_0800)?.iso, "2026-09-08");
});

Deno.test("R84 full weekday name with a passed colon time rolls to next week", () => {
  assertEquals(extractRelativeDayHint("kan dinsdag om 10:30?", TUESDAY_2201)?.iso, "2026-09-15");
});

Deno.test("R84 an hour 1-6 reads as afternoon and keeps today while still ahead", () => {
  // 14:00 Amsterdam: '3 uur' may mean 15:00, which has not passed.
  assertEquals(extractRelativeDayHint("dinsdag 3 uur knippen", new Date("2026-09-08T12:00:00Z"))?.iso, "2026-09-08");
});

Deno.test("R84 explicit am time that passed rolls to next week", () => {
  // 10:00 Amsterdam, customer asks for 9am on 'tuesday'.
  assertEquals(extractRelativeDayHint("tuesday 9am haircut?", new Date("2026-09-08T08:00:00Z"))?.iso, "2026-09-15");
});

Deno.test("R84 explicit this-week qualifier and vandaag keep today", () => {
  assertEquals(extractRelativeDayHint("deze dinsdag 10 uur", TUESDAY_2201)?.iso, "2026-09-08");
  assertEquals(extractRelativeDayHint("vandaag 10 uur", TUESDAY_2201)?.iso, "2026-09-08");
});

Deno.test("R84 no clock time keeps today (unchanged behavior)", () => {
  assertEquals(extractRelativeDayHint("di knippen?", TUESDAY_2201)?.iso, "2026-09-08");
});

Deno.test("R84 other weekday and volgende are unchanged", () => {
  assertEquals(extractRelativeDayHint("di 10 uur knippen", new Date("2026-09-07T10:00:00Z"))?.iso, "2026-09-08");
  assertEquals(extractRelativeDayHint("volgende dinsdag 10 uur", TUESDAY_2201)?.iso, "2026-09-15");
});

Deno.test("R84 dates and durations are not read as clock times", () => {
  // '30 minuten' and '40 euro' are no clock times, so today stays today.
  assertEquals(extractRelativeDayHint("di, duurt 30 minuten en kost 40 euro?", TUESDAY_2201)?.iso, "2026-09-08");
});

// R84 review round (independent reviewer, 2026-10-23): inputs that must NOT roll to next week,
// plus the appointment-language reading (7-12 morning, 1-6 afternoon, "half een" = 12:30).
const tueAt = (hhmm: string) => new Date(`2026-09-08T${hhmm}:00+02:00`); // Tuesday, CEST
const TUE = "2026-09-08";
const NEXT_TUE = "2026-09-15";
for (
  const [label, msg, hhmm, want] of [
    ["'di 10 uur' at 14:00 means next week (10 uur is morning)", "di 10 uur knippen?", "14:00", NEXT_TUE],
    ["'dinsdag 6 uur' at 17:00 keeps today (18:00 ahead)", "dinsdag 6 uur?", "17:00", TUE],
    ["'half 11 dinsdag' at 12:00 means next week", "half 11 dinsdag kan dat?", "12:00", NEXT_TUE],
    ["'tuesday at 2:30' at 14:10 keeps today (14:30 ahead)", "tuesday at 2:30?", "14:10", TUE],
    ["'dinsdag om 10.30' at 22:15 means next week (10:30 is morning)", "kan dinsdag om 10.30?", "22:15", NEXT_TUE],
    ["'dinsdag half 1' at 09:00 keeps today (half een = 12:30)", "dinsdag half 1 knippen?", "09:00", TUE],
    ["'di half een' at 09:00 keeps today", "di half een?", "09:00", TUE],
    ["'deze week dinsdag 9 uur' keeps today", "deze week dinsdag 9 uur", "22:00", TUE],
    ["'dinsdag 9 uur deze week' keeps today", "dinsdag 9 uur deze week", "22:00", TUE],
    ["'deze di 10 uur' keeps today", "deze di 10 uur knippen", "22:01", TUE],
    ["'tuesday this week 9am' keeps today", "tuesday this week 9am?", "10:00", TUE],
    ["'today, tuesday at 1pm' keeps today", "can i come today, tuesday at 1pm?", "14:00", TUE],
    ["'tuesday tonight at 9' keeps today", "tuesday tonight at 9?", "14:00", TUE],
    ["duration 'duurt dat 1 uur' is not a time", "di knippen, duurt dat 1 uur?", "14:00", TUE],
    ["duration 'duurt toch 2 uur' is not a time", "dinsdag kleuren, dat duurt toch 2 uur?", "15:00", TUE],
    ["price '12.50' is not a time", "di knippen, kost dat 12.50?", "14:00", TUE],
    ["the time after the weekday wins ('tot 5 uur ... om 6 uur')", "ik werk tot 5 uur, kan dinsdag om 6 uur?", "17:30", TUE],
    ["explicit am that passed rolls ('tuesday at 9 am')", "tuesday at 9 am?", "10:00", NEXT_TUE],
    ["'10u30' is a clock time", "di 10u30 knippen?", "14:00", NEXT_TUE],
  ] as const
) {
  Deno.test(`R84 review: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}

Deno.test("R84 review: a dd.mm date is not a time ('dinsdag 15.09' on Tuesday 15 Sep 16:00)", () => {
  const tue15 = new Date("2026-09-15T16:00:00+02:00");
  assertEquals(extractRelativeDayHint("dinsdag 15.09 knippen?", tue15)?.iso, "2026-09-15");
  assertEquals(extractRelativeDayHint("di 15.09 nog plek?", tue15)?.iso, "2026-09-15");
});

// R84 review round 2 (independent reviewer, 2026-10-23). N1: an explicit evening or other daypart
// decides the reading; a spoken 7-9 can be evening, so the day only rolls once the evening has passed;
// N3: a lower bound is not the requested time; N5: a bare H.MM right after the weekday is a time.
for (
  const [label, msg, hhmm, want] of [
    ["N1 'dinsdagavond 8 uur' at 17:00 keeps today", "dinsdagavond 8 uur nog plek?", "17:00", TUE],
    ["N1 'dinsdag 's avonds om 8' at 17:00 keeps today", "dinsdag 's avonds om 8?", "17:00", TUE],
    ["N1 'om 8 uur 's avonds' at 17:00 keeps today", "kan dinsdag om 8 uur 's avonds?", "17:00", TUE],
    ["N1 'tuesday evening at 8' at 17:00 keeps today", "tuesday evening at 8?", "17:00", TUE],
    ["N1 'dinsdagavond half 8' at 17:00 keeps today", "dinsdagavond half 8?", "17:00", TUE],
    ["N1 an evening time that passed still rolls", "dinsdagavond 8 uur nog plek?", "20:30", NEXT_TUE],
    ["7-9 'dinsdag 7 uur' at 17:30 keeps today (19:00 ahead)", "dinsdag 7 uur nog plek?", "17:30", TUE],
    ["7-9 'di half 8' at 18:00 keeps today (19:30 ahead)", "di half 8 nog plek?", "18:00", TUE],
    ["7-9 'dinsdag om 8' at 21:00 rolls (20:00 passed too)", "kan dinsdag om 8?", "21:00", NEXT_TUE],
    ["7-9 written with minutes is the 24-hour clock ('8:30' at 12:00 rolls)", "kan dinsdag om 8:30?", "12:00", NEXT_TUE],
    ["morning daypart 'dinsdagochtend 8 uur' at 17:00 rolls", "dinsdagochtend 8 uur?", "17:00", NEXT_TUE],
    ["morning daypart ''s ochtends 6 uur' stays 06:00 and rolls at 09:00", "dinsdag 6 uur 's ochtends?", "09:00", NEXT_TUE],
    ["afternoon daypart 'dinsdagmiddag 3 uur' at 14:00 keeps today", "dinsdagmiddag 3 uur?", "14:00", TUE],
    ["afternoon daypart 'dinsdagmiddag 3 uur' at 16:00 rolls", "dinsdagmiddag 3 uur?", "16:00", NEXT_TUE],
    ["morning daypart ''s morgens' makes a spoken 9 the morning (rolls at 12:00)", "dinsdag om 9 's morgens?", "12:00", NEXT_TUE],
    ["without a daypart the same spoken 9 can still be 21:00 (keeps today at 12:00)", "dinsdag om 9?", "12:00", TUE],
    ["N3 'na 5 uur' at 17:30 keeps today", "kan ik dinsdag na 5 uur?", "17:30", TUE],
    ["N3 'after 5pm' at 17:30 keeps today", "tuesday after 5pm?", "17:30", TUE],
    ["N3 'ik werk tot 5 uur' at 17:30 keeps today", "ik werk tot 5 uur, kan dinsdag?", "17:30", TUE],
    ["N3 'vanaf 6 uur' at 18:30 keeps today", "dinsdag vanaf 6 uur?", "18:30", TUE],
    ["N3 an upper bound is a requested time ('voor 5 uur' at 17:30 rolls)", "dinsdag voor 5 uur?", "17:30", NEXT_TUE],
    ["N5 'di 10.30' at 22:01 rolls", "di 10.30", "22:01", NEXT_TUE],
    ["N5 'dinsdag 9.45, kan dat?' at 12:00 rolls", "dinsdag 9.45, kan dat?", "12:00", NEXT_TUE],
    ["N5 'di 10.30' at 08:00 keeps today", "di 10.30", "08:00", TUE],
    ["N5 a price after the weekday is not a time", "dinsdag 12.50 euro?", "14:00", TUE],
  ] as const
) {
  Deno.test(`R84 review 2: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}

// N2: an earlier message is resolved at the moment it was sent, never against the current clock.
Deno.test("R84 review 2 N2: 'dinsdag 10 uur' sent 09:00, 'doe maar 10:30' at 10:02 stays on today", () => {
  const hint = extractCarriedForwardDayHint("doe maar 10:30", ["dinsdag 10 uur knippen?"], tueAt("10:02"), [tueAt("09:00")]);
  assertEquals(hint?.iso, TUE);
});

Deno.test("R84 review 2 N2: 'di 2 uur' sent 13:30, 'ok 14:30 dan' at 14:01 stays on today", () => {
  assertEquals(extractCarriedForwardDayHint("ok 14:30 dan", ["di 2 uur?"], tueAt("14:01"), [tueAt("13:30")])?.iso, TUE);
});

Deno.test("R84 review 2 N2: without a send time the carried hint resolves against now (old behaviour)", () => {
  assertEquals(extractCarriedForwardDayHint("doe maar 10:30", ["dinsdag 10 uur knippen?"], tueAt("10:02"))?.iso, NEXT_TUE);
  // An unreadable or future send time is ignored the same way.
  assertEquals(
    extractCarriedForwardDayHint("doe maar 10:30", ["dinsdag 10 uur knippen?"], tueAt("10:02"), [new Date("x")])?.iso,
    NEXT_TUE,
  );
});

// R84 review round 3 (independent reviewer, 2026-10-24), the reviewer's own inputs. A daypart only
// counts for its own day or time; "voormiddag" is morning; a spoken 7-9 is evening only while the
// business is still open then (todayLatestEndMinutes); several times: the latest decides.
const CLOSES_17 = { todayLatestEndMinutes: 17 * 60 };
const CLOSES_21 = { todayLatestEndMinutes: 21 * 60 };
const CLOSES_22 = { todayLatestEndMinutes: 22 * 60 };
for (
  const [label, msg, hhmm, want, opts] of [
    ["K1 'dinsdagvoormiddag 10 uur' at 14:00 rolls (voormiddag is morning)", "dinsdagvoormiddag 10 uur?", "14:00", NEXT_TUE, undefined],
    ["K2 an evening word of another day does not make 10 uur evening", "dinsdag 10 uur, of anders woensdagavond", "14:00", NEXT_TUE, undefined],
    ["K3 'morgenavond' in the next sentence does not either", "di 10 uur? morgenavond kan ook", "14:00", NEXT_TUE, undefined],
    ["K4 bare '10.00' after the weekday is a time", "di 10.00 knippen?", "22:01", NEXT_TUE, undefined],
    ["K6 'kan het tot 5 uur?' is an upper bound and rolls at 17:30", "kan het dinsdag tot 5 uur?", "17:30", NEXT_TUE, undefined],
    ["K13 bare time after a comma", "di, 10.30 knippen?", "22:01", NEXT_TUE, undefined],
    ["K14 bare time after a qualifier", "aanstaande dinsdag 10.30?", "22:01", NEXT_TUE, undefined],
    ["K7 'di 9 uur' at 14:00 rolls when the business closes at 17:00", "di 9 uur knippen?", "14:00", NEXT_TUE, CLOSES_17],
    ["K7b the same message keeps today when it is open until 22:00", "di 9 uur knippen?", "14:00", TUE, CLOSES_22],
    ["K7d an appointment cannot start at closing time (open until 21:00, '9 uur' rolls)", "di 9 uur knippen?", "14:00", NEXT_TUE, CLOSES_21],
    ["K7c and keeps today when the hours are unknown", "di 9 uur knippen?", "14:00", TUE, undefined],
    ["K8 'dinsdag half 9' at 10:00 rolls when the business closes at 17:00", "dinsdag half 9?", "10:00", NEXT_TUE, CLOSES_17],
    ["K9 '8 uur 's ochtends' at 08:30 rolls", "dinsdag 8 uur 's ochtends?", "08:30", NEXT_TUE, undefined],
    ["K10 '8 in the morning' at 09:00 rolls", "tuesday 8 in the morning?", "09:00", NEXT_TUE, undefined],
    ["K11 'dinsdagochtend 9 uur' at 10:00 rolls", "dinsdagochtend 9 uur?", "10:00", NEXT_TUE, undefined],
    ["K12 'dinsdag 7 uur' at 21:00 rolls", "dinsdag 7 uur?", "21:00", NEXT_TUE, undefined],
    ["R1 'dinsdagmiddag 2 uur' at 13:00 keeps today", "dinsdagmiddag 2 uur?", "13:00", TUE, undefined],
    ["R2 ''s middags om 1' at 12:30 keeps today", "dinsdag 's middags om 1?", "12:30", TUE, undefined],
    ["R3 '12 uur 's middags' at 11:00 keeps today", "di 12 uur 's middags?", "11:00", TUE, undefined],
    ["R6 'di 8.30 's avonds' at 17:00 keeps today", "di 8.30 's avonds?", "17:00", TUE, undefined],
    ["R7 'na 7' at 18:00 keeps today", "kan ik dinsdag na 7?", "18:00", TUE, undefined],
    ["R8 'vanaf half 6' at 18:00 keeps today", "dinsdag vanaf half 6?", "18:00", TUE, undefined],
    ["R10 two options, the second still ahead, keeps today", "di 10 uur, kan ook 4 uur", "14:00", TUE, undefined],
    ["R11 'om 3 of 4 uur' at 15:30 keeps today", "dinsdag om 3 of 4 uur?", "15:30", TUE, undefined],
    ["R12 'tuesday at 7' at 17:00 keeps today while open until 21:00", "tuesday at 7?", "17:00", TUE, CLOSES_21],
    ["S09 exact still rolls with the real 09:00-17:00 hours", "di 10 uur knippen? karim", "22:01", NEXT_TUE, CLOSES_17],
  ] as const
) {
  Deno.test(`R84 review 3: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm), opts)?.iso, want);
  });
}

Deno.test("R84 review 3: '14.10' after a weekday stays a possible date (14 October), not a time", () => {
  // Deliberately not read: minutes 01-12 are also a month. A bare .00 or .13-.59 is read (K4, D1).
  assertEquals(extractRelativeDayHint("di 14.10 knippen?", tueAt("15:00"))?.iso, TUE);
});

Deno.test("R84 review 3 B: a stale day from two weeks ago resolves to the upcoming one, never a past date", () => {
  const hint = extractCarriedForwardDayHint(
    "is 10:30 nog vrij?",
    ["kan ik dinsdag knippen?"],
    new Date("2026-09-14T10:00:00+02:00"),
    [new Date("2026-09-01T10:00:00+02:00")],
  );
  assertEquals(hint?.iso, NEXT_TUE);
});

Deno.test("R84 review 3 B: yesterday's 'morgen' still means today", () => {
  const hint = extractCarriedForwardDayHint(
    "is 10:30 vrij?",
    ["kan ik morgen knippen?"],
    tueAt("09:00"),
    [new Date("2026-09-07T20:00:00+02:00")],
  );
  assertEquals(hint?.iso, TUE);
});

Deno.test("R84 review 3: latestEndTodayMinutes reads today's latest closing time", () => {
  const tue = tueAt("12:00");
  const iris = { Dinsdag: { open: true, start: "09:00", end: "17:00" } };
  const bram = { Dinsdag: { open: true, start: "10:00", end: "21:00" } };
  const closed = { Dinsdag: { open: false } };
  assertEquals(latestEndTodayMinutes(tue, [iris, bram]), 21 * 60);
  assertEquals(latestEndTodayMinutes(tue, [iris, closed]), 17 * 60);
  assertEquals(latestEndTodayMinutes(tue, [closed]), 0);
  assertEquals(latestEndTodayMinutes(tue, [null, undefined]), null);
  // An exact-date override wins: closed today, or other hours today.
  assertEquals(latestEndTodayMinutes(tue, [iris], { [TUE]: { isAvailable: false } }), 0);
  assertEquals(latestEndTodayMinutes(tue, [iris], { [TUE]: { isAvailable: true, start: "12:00", end: "20:00" } }), 20 * 60);
});

// R84 review round 4 (independent reviewer, 2026-10-24).
for (
  const [label, msg, hhmm, want] of [
    ["a dot inside a time does not end the clause ('9.30 of om 11 uur' at 10:00 keeps today)", "dinsdag om 9.30 of om 11 uur?", "10:00", TUE],
    ["the alternative bare dot time is read ('10.30 of 11.30' at 11:00 keeps today)", "dinsdag 10.30 of 11.30?", "11:00", TUE],
    ["a later time that is not an alternative does not count ('ik moet om 3 uur weer weg')", "dinsdag 10 uur, ik moet om 3 uur weer weg", "14:00", NEXT_TUE],
    ["'ben ik vrij tot 5 uur' is an upper bound and rolls at 17:30", "dinsdag ben ik vrij tot 5 uur", "17:30", NEXT_TUE],
    ["'ik ben bezig tot 5 uur' is still a lower bound", "dinsdag ben ik bezig tot 5 uur, daarna?", "17:30", TUE],
  ] as const
) {
  Deno.test(`R84 review 4: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}

// R84 review round 5 (independent reviewer, 2026-10-24).
for (
  const [label, msg, hhmm, want] of [
    ["an alternative named after the time ('4 uur kan ook') keeps today", "dinsdag 10 uur, 4 uur kan ook", "14:00", TUE],
    ["'liever 4 uur' keeps today", "dinsdag 10 uur, liever 4 uur", "14:00", TUE],
    ["'4pm works too' keeps today", "tuesday 10am, 4pm works too", "14:00", TUE],
    ["'10 uur / 4 uur' keeps today", "dinsdag 10 uur / 4 uur?", "14:00", TUE],
    ["'desnoods 4 uur' keeps today", "dinsdag 10 uur, desnoods 4 uur", "14:00", TUE],
    ["'ik ben ook om 3 uur weg' is a constraint and rolls", "dinsdag 10 uur, ik ben ook om 3 uur weg", "14:00", NEXT_TUE],
    ["'ben ik tot 5 uur aan het werk' is a lower bound (keeps today)", "dinsdag ben ik tot 5 uur aan het werk, kan het daarna?", "17:30", TUE],
    ["'ik zit tot 5 uur op mijn werk' is a lower bound (keeps today)", "ik zit tot 5 uur op mijn werk, kan dinsdag?", "17:30", TUE],
  ] as const
) {
  Deno.test(`R84 review 5: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}

// R84 review round 6 (independent reviewer, 2026-10-24).
for (
  const [label, msg, hhmm, want] of [
    ["a ruled-out time is no option ('om 4 uur kan ik niet' rolls)", "dinsdag 10 uur, om 4 uur kan ik niet", "14:00", NEXT_TUE],
    ["'anders moet het om 4 uur' offers 16:00 (keeps today)", "dinsdag om 10 uur, anders moet het om 4 uur", "14:00", TUE],
    ["'na mijn werk om 4 uur' offers 16:00 (keeps today)", "dinsdag 10 uur, of na mijn werk om 4 uur", "14:00", TUE],
    ["'om 3 uur moet ik werken' is a constraint (rolls)", "dinsdag 10 uur, om 3 uur moet ik werken", "14:00", NEXT_TUE],
    ["'vrij tot 5 uur, daarna moet ik werken' is an upper bound (rolls at 17:30)", "dinsdag ben ik vrij tot 5 uur, daarna moet ik werken", "17:30", NEXT_TUE],
  ] as const
) {
  Deno.test(`R84 review 6: ${label}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}

// R84 review round 7 (independent reviewer, 2026-10-24): each time is judged in its own part of the
// sentence, so a time ruled out before an alternative no longer hides it ("om 10 uur lukt me niet, kan het
// om 4 uur?"). Counterexample table in both directions, written before the change.
for (
  const [msg, hhmm, want] of [
    ["dinsdag om 10 uur lukt me niet, kan het om 4 uur?", "14:00", TUE],
    ["dinsdag om 4 uur lukt me niet, kan het om 10 uur?", "12:00", NEXT_TUE],
    ["dinsdag om 4 uur lukt me niet, kan het om 10 uur?", "08:00", TUE],
    ["tuesday 10am doesn't work, can we do 4pm?", "14:00", TUE],
    ["tuesday 4pm doesn't work, 10am?", "12:00", NEXT_TUE],
    ["dinsdag om 10 uur kan ik niet", "14:00", NEXT_TUE],
    ["dinsdag om 10 uur kan ik niet", "08:00", TUE],
    ["dinsdag ik kan niet om 10 uur, wel om 4 uur", "14:00", TUE],
    ["dinsdag kan ik niet om 4 uur, wel om 10 uur", "12:00", NEXT_TUE],
    ["tuesday can't do 4pm, 10am works", "12:00", NEXT_TUE],
    ["tuesday can't do 10am, 4pm?", "14:00", TUE],
    ["dinsdag om 10 uur gaat niet, om 4 uur wel", "14:00", TUE],
    ["dinsdag om 4 uur gaat niet, om 10 uur wel", "12:00", NEXT_TUE],
    ["dinsdag 10 uur niet, 4 uur wel", "14:00", TUE],
    ["dinsdag 4 uur niet, 10 uur wel", "12:00", NEXT_TUE],
    ["tuesday 4pm won't work, 10am?", "12:00", NEXT_TUE],
    ["dinsdag om 10 uur lukt me niet want dan moet ik werken, om 4 uur?", "14:00", TUE],
    ["dinsdag om 3 uur moet ik weg, kan het om 10 uur?", "12:00", NEXT_TUE],
    ["dinsdag om 3 uur moet ik weg, kan het om 10 uur?", "08:00", TUE],
    ["kan het niet om 4 uur dinsdag?", "14:00", TUE],
    ["dinsdag om 10 uur, of kan het niet om 4 uur?", "14:00", TUE],
    ["tuesday 10am doesn’t work, can we do 4pm?", "14:00", TUE],
    ["tuesday can’t do 4pm, 10am works", "12:00", NEXT_TUE],
    ["dinsdag om 10 uur lukt het me helaas niet, om 4 uur wel", "14:00", TUE],
    ["dinsdag liever niet om 4 uur, 10 uur?", "12:00", NEXT_TUE],
    ["dinsdag om 10 uur of om 4 uur", "14:00", TUE],
    ["dinsdag om 10 uur", "14:00", NEXT_TUE],
    ["tuesday 10am or i can't do 4pm", "12:00", NEXT_TUE],
    ["di 10 uur knippen? karim", "14:00", NEXT_TUE],
  ] as const
) {
  Deno.test(`R84 review 7: ${JSON.stringify(msg)} at ${hhmm}`, () => {
    assertEquals(extractRelativeDayHint(msg, tueAt(hhmm))?.iso, want);
  });
}
