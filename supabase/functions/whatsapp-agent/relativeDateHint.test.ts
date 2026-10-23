// Deterministic unit tests for the relative-date hint: R29's bare weekday pre-parse, plus R54's
// explicit day+month deterministic resolution (near or far, beyond the old 14-day table too).
// Pure extraction/formatting logic only, mirrors dateOfferGuard.test.ts's structure.
// Run: deno test relativeDateHint.test.ts
import { assertEquals, assertMatch } from "jsr:@std/assert@1.0.19";
import { extractRelativeDayHint, formatRelativeDateHint, extractCarriedForwardDayHint, formatCarriedForwardDayHint, hasDayMentionAnywhere, rescheduleFlowActiveWithNoDay, enforceRescheduleNoDayDisclosure } from "./relativeDateHint.ts";
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

Deno.test("R84 ambiguous 1-11 hour keeps today while the pm reading is still ahead", () => {
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
