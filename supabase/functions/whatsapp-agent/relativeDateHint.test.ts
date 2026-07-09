// Deterministic unit tests for the R29 relative-date hint (bare weekday pre-parse). Pure
// extraction/formatting logic only, mirrors dateOfferGuard.test.ts's structure.
// Run: deno test relativeDateHint.test.ts
import { assertEquals, assertMatch } from "jsr:@std/assert";
import { extractRelativeDayHint, formatRelativeDateHint } from "./relativeDateHint.ts";

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

Deno.test("explicit numeric date only (no bare weekday) -> null, this guard does not duplicate dateOfferGuard", () => {
  const h = extractRelativeDayHint("Kan ik 24 juli om 9 uur?", THURSDAY);
  assertEquals(h, null);
});

Deno.test("weekday name RIGHT NEXT TO an explicit date -> null (never overrules an explicit date, regression guard)", () => {
  const h = extractRelativeDayHint("Kan ik vrijdag 24 juli om 9 uur Gelnagels boeken bij Bo?", THURSDAY);
  assertEquals(h, null);
});

Deno.test("weekday name elsewhere in a message that ALSO contains an unrelated explicit date -> still null (defer entirely)", () => {
  const h = extractRelativeDayHint("Ik had het over 24 juli, maar kan het ook op vrijdag?", THURSDAY);
  assertEquals(h, null);
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
