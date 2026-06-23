// Unit tests for the outbound-hygiene helpers. Run: deno test sanitizeReply.test.ts
// ITEM 4 focus: countCustomerQuestions (one-question-per-turn regression signal).
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { countCustomerQuestions, sanitizeReply, stripInternalDirectives } from "./sanitizeReply.ts";

Deno.test("countCustomerQuestions: empty/no-question replies = 0", () => {
  assertEquals(countCustomerQuestions(""), 0);
  assertEquals(countCustomerQuestions("Gedaan, je staat genoteerd voor maandag 22 juni 14:00."), 0);
  assertEquals(countCustomerQuestions("Geen probleem! Ik regel het."), 0);
});

Deno.test("countCustomerQuestions: a single question = 1 (the good case)", () => {
  assertEquals(countCustomerQuestions("Waarmee kan ik je helpen?"), 1);
  assertEquals(countCustomerQuestions("Welke dag wil je om 14:00 langskomen?"), 1);
  // A binary slot offer is ONE question and must NOT trip the guardrail (ITEM 5 friendly).
  assertEquals(countCustomerQuestions("Schikt 10:00 of 14:00 je beter?"), 1);
  // Repeated "?" collapses to one question.
  assertEquals(countCustomerQuestions("Echt waar??"), 1);
});

Deno.test("countCustomerQuestions: two or more stacked questions = 2+ (the slip we flag)", () => {
  assertEquals(countCustomerQuestions("Welke dienst wil je? En wanneer?"), 2);
  assertEquals(
    countCustomerQuestions("Welke dienst wil je? Op welke dag? En hoe laat?"),
    3,
  );
});

Deno.test("countCustomerQuestions: a payment URL query string never counts as a question", () => {
  assertEquals(
    countCustomerQuestions("Je plek is gereserveerd, betaal hier: https://pay.example.com/c?session=abc&x=1"),
    0,
  );
  // URL + one real question = 1, not 2.
  assertEquals(
    countCustomerQuestions("Betaal hier https://pay.example.com/c?s=1 om je plek vast te zetten. Lukt dat?"),
    1,
  );
});

// Guard the existing directive-strip behaviour so ITEM 4 changes do not regress R3.
Deno.test("stripInternalDirectives: a leaked self-directive sentence is dropped", () => {
  const { clean, stripped } = stripInternalDirectives(
    "Je kunt niet meer annuleren. Verwijs naar het annuleringsbeleid.",
  );
  assertEquals(clean.includes("annuleringsbeleid"), false);
  assertEquals(stripped.length >= 1, true);
});

Deno.test("sanitizeReply: clean customer text passes through unchanged (minus dashes)", () => {
  assertEquals(sanitizeReply("Gedaan! Tot maandag."), "Gedaan! Tot maandag.");
});
