// Deterministic unit tests for the R18 date-offer guard. Pure extraction/formatting logic only
// (the RPC-verification/scan orchestration lives in index.ts, same split as slotOfferGuard.ts).
// Run: deno test dateOfferGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import { buildDeterministicDateAlternatives, dateLabelFromISO, extractOfferedDates, noNearbyOpenDateReply } from "./dateOfferGuard.ts";

// ── extractOfferedDates ──────────────────────────────────────────────────────

Deno.test("extracts a single 'day month' date, resolves nearest future year", () => {
  const out = extractOfferedDates("Bijvoorbeeld woensdag 22 juli of donderdag 23 juli?", "2026-07-19");
  assertEquals(out, ["2026-07-22", "2026-07-23"]);
});

Deno.test("R17 exact reproduction: 'woensdag 22 juli of donderdag 23 juli', excludes the declined date", () => {
  const out = extractOfferedDates(
    "Die dag is helaas niet beschikbaar. Kun je een andere dag kiezen? Bijvoorbeeld woensdag 22 juli of donderdag 23 juli?",
    "2026-07-19",
    "2026-07-21", // the declined date (21 juli) itself never appears in this reply, sanity check
  );
  assertEquals(out, ["2026-07-22", "2026-07-23"]);
});

Deno.test("excludes the declined date when the reply merely restates it", () => {
  const out = extractOfferedDates("21 juli is helaas niet beschikbaar, maar 23 juli wel.", "2026-07-19", "2026-07-21");
  assertEquals(out, ["2026-07-23"]);
});

Deno.test("month-then-day order also parsed", () => {
  const out = extractOfferedDates("juli 23 kan wel", "2026-07-19");
  assertEquals(out, ["2026-07-23"]);
});

Deno.test("rolls over to next year when the date already passed this year", () => {
  const out = extractOfferedDates("wat dacht je van 5 januari?", "2026-07-19");
  assertEquals(out, ["2027-01-05"]);
});

Deno.test("no date mentioned -> empty", () => {
  const out = extractOfferedDates("Welke dag komt jou uit?", "2026-07-19");
  assertEquals(out, []);
});

Deno.test("dedupes a date mentioned twice", () => {
  const out = extractOfferedDates("22 juli, dus 22 juli om 10:00?", "2026-07-19");
  assertEquals(out, ["2026-07-22"]);
});

// ── buildDeterministicDateAlternatives / noNearbyOpenDateReply ───────────────

Deno.test("builds a truthful NL alternative-day reply from real dates", () => {
  const out = buildDeterministicDateAlternatives(["2026-07-23", "2026-07-24"], false);
  const d1 = dateLabelFromISO("2026-07-23", false);
  const d2 = dateLabelFromISO("2026-07-24", false);
  assertEquals(out, `Die dag heeft geen vrije tijden. Deze dagen wel: ${d1} of ${d2}. Komt een van die dagen uit?`);
});

Deno.test("builds a truthful EN alternative-day reply, single date", () => {
  const out = buildDeterministicDateAlternatives(["2026-07-23"], true);
  const d1 = dateLabelFromISO("2026-07-23", true);
  assertEquals(out, `That day has no free times. This day does: ${d1}. Does one of those work?`);
});

Deno.test("no real open date found -> honest ask, no invented date", () => {
  const nl = noNearbyOpenDateReply(false);
  const en = noNearbyOpenDateReply(true);
  assertEquals(nl.includes("Welke andere dag"), true);
  assertEquals(en.includes("Which other day"), true);
});
