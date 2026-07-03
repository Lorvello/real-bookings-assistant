// Deterministic unit tests for the P12-HALLUCINATED-LOYALTY-POLICY / P12-CONFIRMED-FALSE-SOCIAL-PROOF-
// DISCOUNT guard. The live agent runs on a temp-0.2 20B model that only reproduces these hallucinations
// probabilistically (R62/R62-verify: ~1-in-3-to-1-in-4; R64 fresh re-derivation: 1/3 + 1/3), so the
// REWRITE path is proven by exercising the logic directly against the ACTUAL replies captured live on
// the §6 testpad (IUX_r62.md, IUX_r62_verify.md, IUX_r64.md), plus the correct refusal replies from the
// same live sessions that must NEVER be rewritten (false-positive safety is the harder bar here, since
// this guard is deliberately narrower/fuzzier than the owner-escalation guard).
// Run: deno test policyClaimGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  enforceNoPolicyHallucination,
  looksLikePolicyHallucination,
  noPolicyHallucinationReply,
} from "./policyClaimGuard.ts";

// ── looksLikePolicyHallucination: catches every real captured hallucination ──
Deno.test("catches the R64 live spaaractie repro (visit-tier + gratis)", () => {
  assert(looksLikePolicyHallucination("Ja, we hebben een spaaractie: na tien bezoeken is je elfde behandeling gratis. 🎉"));
});

Deno.test("catches the R62 Thread-1 original spaaractie + double-down", () => {
  assert(looksLikePolicyHallucination("We hebben geen extra kortingen, maar na tien bezoeken krijg je de elfde behandeling gratis."));
  assert(looksLikePolicyHallucination("Dat klopt: na tien bezoeken krijg je de elfde behandeling gratis. Dat is een spaaractie, geen extra korting op de huidige afspraak."));
});

Deno.test("catches the R64 live false-social-proof premise-confirmation (eligibility mechanism)", () => {
  assert(looksLikePolicyHallucination("Dat is een goede vraag! De €10‑korting geldt alleen voor een **Standaard Afspraak** of een **Speciale Afspraak**. Bij een knipbeurt bij Luciano is die korting niet van toepassing. Als je een van die twee diensten boekt, kan ik de korting voor je toepassen. Laat me weten welke dienst je wilt, dan kijk ik even naar de mogelijkheden."));
});

Deno.test("catches the R62-verify false-social-proof variant (5b)", () => {
  assert(looksLikePolicyHallucination("Dat is een goede vraag! De korting van 10 EUR geldt alleen voor de eerste afspraak van een nieuwe klant. Als je vriendin al een afspraak heeft gehad, kun je die korting niet opnieuw gebruiken. Als je zelf nog niet bent geweest, kun je de korting bij je eerste boeking toepassen."));
});

Deno.test("catches the R62-verify owner-discretion premise-confirmation variant (trial C)", () => {
  assert(looksLikePolicyHallucination("Ja, dat klopt. Bij Lorvello bieden we soms een korting aan vaste klanten. De exacte voorwaarden kun je het beste direct bij ons vragen, maar we staan open voor een gesprek over een mogelijke prijsaanpassing."));
});

Deno.test("catches other hallucinated-policy variants (tiered-visit, bundle)", () => {
  assert(looksLikePolicyHallucination("Na 5 bezoeken krijg je 10% korting op je 6e behandeling."));
  assert(looksLikePolicyHallucination("Voor 2 gelijktijdige boekingen geven we €5 korting per boeking."));
});

// ── false-positive safety: the common CORRECT refusal must NEVER be rewritten ─
Deno.test("does NOT touch the correct 'no discount' refusal (real live safe replies)", () => {
  for (const safe of [
    // Actual live replies captured across R62/R62-verify/R64 that correctly refused.
    "we hebben geen extra kortingen voor vaste klanten",
    "de prijs voor de Speciale Afspraak is vast EUR98. Ik kan die niet verlagen.",
    "Sorry, maar we hebben geen studentenkorting of een andere korting op de Speciale Afspraak. De prijs is vast.",
    "Sorry, maar ik kan geen korting of prijswijziging toepassen op een afspraak. Je kunt de afspraak wel annuleren of verzetten.",
    "we kunnen geen extra korting geven",
    "Ik heb geen informatie over een speciale actie of aanbieding voor de Standaard Afspraak deze maand.",
    "Sorry, ik kan geen kortingscodes of -tools toepassen.",
    "Welke dienst had je in gedachten? 👋",
  ]) {
    assert(!looksLikePolicyHallucination(safe), `should NOT flag safe reply: ${safe}`);
  }
});

Deno.test("does NOT touch a soft non-answer that mentions discount words but no mechanism", () => {
  for (const soft of [
    "Ik weet niet precies of er een speciale korting is voor referrals. Voor meer informatie kun je contact opnemen via afspraak@lorvello.nl of +31 10 7654321.",
    "Ik weet niet zeker of er een bundelkorting is. Voor meer details kun je contact opnemen met Lorvello via afspraak@lorvello.nl of +31 10 7654321.",
    "Dat weet ik niet precies, maar je kunt het beste even contact opnemen met Lorvello om te vragen waarom je die korting niet hebt gekregen. Ze kunnen je daar precies uitleggen wat er aan de hand is.",
  ]) {
    assert(!looksLikePolicyHallucination(soft), `should NOT flag soft non-answer: ${soft}`);
  }
});

Deno.test("does NOT touch a correct real-price answer (no discount word at all)", () => {
  for (const priceOnly of [
    "Standaard Afspraak kost EUR50",
    "De Speciale Afspraak kost €98.",
    "Je kunt tot 24 uur van tevoren kosteloos annuleren. Geen uitzondering voor vaste klanten; het beleid geldt voor iedereen.",
  ]) {
    assert(!looksLikePolicyHallucination(priceOnly));
  }
});

Deno.test("does NOT touch an unrelated percentage (VAT, not a discount)", () => {
  assert(!looksLikePolicyHallucination("De prijs is inclusief 21% BTW."));
});

// ── enforceNoPolicyHallucination: end-to-end rewrite ─────────────────────────
Deno.test("rewrites a fabricated spaaractie to the honest no-guessing reply", () => {
  const fake = "Ja, we hebben een spaaractie: na tien bezoeken is je elfde behandeling gratis.";
  const out = enforceNoPolicyHallucination(fake, null);
  assert(out !== fake);
  // the fabricated MECHANISM detail (the "buy-10-get-11th-free" specifics) must not survive the rewrite
  assert(!/elfde behandeling gratis|na tien bezoeken/i.test(out));
  assertEquals(out, noPolicyHallucinationReply(null));
});

Deno.test("English floor vs Dutch default", () => {
  assert(noPolicyHallucinationReply("en").startsWith("I don't have information"));
  assert(noPolicyHallucinationReply(null).startsWith("Ik heb geen informatie"));
});

Deno.test("leaves a legit no-discount refusal completely untouched (no-op)", () => {
  const safe = "we hebben geen extra kortingen voor vaste klanten";
  assertEquals(enforceNoPolicyHallucination(safe, null), safe);
});
