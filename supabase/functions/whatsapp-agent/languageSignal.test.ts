import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectCustomerLanguage, detectLanguageSignal } from "./languageSignal.ts";

// R81: the live language-lock-in repro from R79/R80's shared test thread. Both are genuinely
// Dutch messages with zero English signal words; both must be recognized as confidently Dutch
// (not just "no non-Dutch signal") so a stale sticky non-Dutch language gets actively cleared.
Deno.test("R80 repro: Dutch opener with tracking-code prefix is confidently Dutch, not ambiguous", () => {
  const sig = detectLanguageSignal("Code: f744eddc Hoi, ik wil graag een afspraak maken bij Iris, dinsdagavond.");
  assertEquals(sig.nonDutch, null);
  assertEquals(sig.confidentDutch, true);
});

Deno.test("R79 repro: pure-Dutch cancel phrasing is confidently Dutch", () => {
  const sig = detectLanguageSignal("Ik wil mijn afspraak annuleren");
  assertEquals(sig.nonDutch, null);
  assertEquals(sig.confidentDutch, true);
});

Deno.test("a genuine English opener is detected as confident non-Dutch, not confidentDutch", () => {
  const sig = detectLanguageSignal("Hi, I would like to book an appointment for next Tuesday afternoon please");
  assertEquals(sig.nonDutch, "het Engels");
  assertEquals(sig.confidentDutch, false);
  assertEquals(detectCustomerLanguage("Hi, I would like to book an appointment for next Tuesday afternoon please"), "het Engels");
});

Deno.test("a bare ambiguous reply (no language signal at all) is neither confident Dutch nor non-Dutch", () => {
  for (const msg of ["ok", "ja", "12:00", "👍", ""]) {
    const sig = detectLanguageSignal(msg);
    assertEquals(sig.nonDutch, null, `nonDutch for "${msg}"`);
    assertEquals(sig.confidentDutch, false, `confidentDutch for "${msg}"`);
  }
});

Deno.test("German, French, Spanish, Portuguese, Italian openers all detect as confident non-Dutch", () => {
  assertEquals(detectCustomerLanguage("Guten Tag, ich möchte gerne einen Termin am Dienstag buchen"), "het Duits");
  assertEquals(detectCustomerLanguage("Bonjour, je voudrais réserver un rendez vous lundi après midi"), "het Frans");
  assertEquals(detectCustomerLanguage("Hola, quiero reservar una cita el lunes por la tarde, gracias"), "het Spaans");
  assertEquals(detectCustomerLanguage("Olá, quero agendar um horário para segunda de manhã, obrigado"), "het Portugees");
  assertEquals(detectCustomerLanguage("Ciao, vorrei prenotare un appuntamento lunedì pomeriggio, grazie"), "het Italiaans");
});

// The actual bug shape: index.ts must be able to tell "this turn is confidently Dutch" apart from
// "this turn is ambiguous" so it knows when to clear a stale stored `detected_language`. A single
// short Dutch word with real signal (>=2 NL words) still counts as confidently Dutch.
Deno.test("a short but real Dutch phrase (>=2 NL signal words) still counts as confidentDutch", () => {
  const sig = detectLanguageSignal("Ja graag, dank je");
  assertEquals(sig.confidentDutch, true);
  assertEquals(sig.nonDutch, null);
});
