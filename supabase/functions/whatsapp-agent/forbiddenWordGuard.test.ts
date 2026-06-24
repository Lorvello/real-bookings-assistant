// Deterministic unit tests for the P2-tone forbidden-availability-word guard (DoD #6 / R10).
// The live agent runs on a temp-0.2 20B model that won't reliably emit a forbidden word on demand
// (adversarial round 2 found it ~16% of the time), so the neutralizer is proven by exercising the
// logic directly against the exact slips observed in round 2, plus the false-positive safety
// (legit words that merely START with a forbidden one, and other-language text, must NEVER change).
// Run: deno test forbiddenWordGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  hasForbiddenAvailabilityWord,
  langKeyOf,
  neutralizeForbiddenAvailabilityWords as neut,
} from "./forbiddenWordGuard.ts";

// ── the guarantee: real round-2 slips get neutralized, per language ──────────────

Deno.test("NL 'vol' is neutralized (real round-2 slip)", () => {
  assertEquals(
    neut("Die dag is helaas vol. Wil je een andere dag?", null),
    "Die dag is helaas niet beschikbaar. Wil je een andere dag?",
  );
});

Deno.test("NL 'vol' mid-sentence with date (real round-2 slip)", () => {
  assertEquals(
    neut("Sorry, 29 juni is vol. Maar op dinsdag 30 juni hebben we 09:00 of 09:30. Welke past?", null),
    "Sorry, 29 juni is niet beschikbaar. Maar op dinsdag 30 juni hebben we 09:00 of 09:30. Welke past?",
  );
});

Deno.test("DE 'voll' is neutralized (real round-2 slip)", () => {
  assertEquals(
    neut("Der kommende Mittwoch ist leider voll. Wie wäre es mit Donnerstag?", "het Duits"),
    "Der kommende Mittwoch ist leider nicht verfügbar. Wie wäre es mit Donnerstag?",
  );
});

Deno.test("EN 'fully booked' is neutralized (real round-2 slip)", () => {
  assertEquals(
    neut("Monday 29 June is fully booked. Would you like Tuesday?", "het Engels"),
    "Monday 29 June is not available. Would you like Tuesday?",
  );
});

Deno.test("DE 'ausgebucht' inflected form is neutralized", () => {
  assertEquals(
    neut("Der Tag ist ausgebucht.", "het Duits"),
    "Der Tag ist nicht verfügbar.",
  );
});

Deno.test("NL 'volgeboekt' family is neutralized", () => {
  assertEquals(neut("Die dag is volgeboekt.", null), "Die dag is niet beschikbaar.");
  assertEquals(neut("Het is een volgeboekte dag.", null), "Het is een niet beschikbaar dag.");
});

Deno.test("EN 'booked up' is neutralized", () => {
  assertEquals(
    neut("Sorry, that day is booked up.", "het Engels"),
    "Sorry, that day is not available.",
  );
});

Deno.test("FR 'complet' is neutralized", () => {
  assertEquals(
    neut("Désolé, le lundi est complet.", "het Frans"),
    "Désolé, le lundi est pas disponible.",
  );
});

Deno.test("IT 'al completo' is neutralized", () => {
  assertEquals(
    neut("Spiacente, quel giorno è al completo.", "het Italiaans"),
    "Spiacente, quel giorno è non disponibile.",
  );
});

// ── false-positive safety: legit words must NEVER be touched ──────────────────────

Deno.test("NL 'volgende' / 'volledig' / 'volgens' are NOT touched (word-boundary)", () => {
  const s = "De volgende keer is de volledige agenda volgens mij open.";
  assertEquals(neut(s, null), s);
  assert(!hasForbiddenAvailabilityWord(s, null));
});

Deno.test("EN bare 'full' is intentionally NOT touched", () => {
  const s = "Please give me your full name for the booking.";
  assertEquals(neut(s, "het Engels"), s);
});

Deno.test("FR 'vol' (=flight) is NOT touched in a French reply", () => {
  const s = "Ce n'est pas un vol, c'est un rendez-vous.";
  assertEquals(neut(s, "het Frans"), s);
});

Deno.test("a clean reply with real times is left exactly as-is", () => {
  const s = "Schikt 09:00 of 10:30 op dinsdag 30 juni?";
  assertEquals(neut(s, null), s);
  assert(!hasForbiddenAvailabilityWord(s, null));
});

Deno.test("German 'voll' is NOT matched by the NL pattern (lang-gated)", () => {
  // If language were misdetected as Dutch, NL pattern would not catch German "voll" (it has the
  // double-l), so no half-broken cross-language replacement happens.
  const s = "Der Tag ist voll.";
  assertEquals(neut(s, null), s); // null -> nl pattern -> "voll" not matched by \bvol\b
});

// ── langKeyOf mapping ─────────────────────────────────────────────────────────────

Deno.test("langKeyOf maps the Dutch language names", () => {
  assertEquals(langKeyOf(null), "nl");
  assertEquals(langKeyOf("het Engels"), "en");
  assertEquals(langKeyOf("het Duits"), "de");
  assertEquals(langKeyOf("het Frans"), "fr");
  assertEquals(langKeyOf("het Spaans"), "es");
  assertEquals(langKeyOf("het Portugees"), "pt");
  assertEquals(langKeyOf("het Italiaans"), "it");
});

Deno.test("hasForbiddenAvailabilityWord detects without mutating", () => {
  assert(hasForbiddenAvailabilityWord("die dag is vol", null));
  assert(hasForbiddenAvailabilityWord("ist leider voll", "het Duits"));
  assert(!hasForbiddenAvailabilityWord("dinsdag 30 juni 09:00", null));
});

Deno.test("empty / whitespace input is safe", () => {
  assertEquals(neut("", null), "");
  assert(!hasForbiddenAvailabilityWord("", null));
});
