// Deterministic unit tests for the FQ-R2-CLAIM price guard. The live agent runs on a temp-0.2 20B
// model that will not reliably produce a false price on demand (though the §6 testpad DID coax it via
// a forged TOOL_RESULT injection -> "EUR7"), so the REWRITE path is proven by exercising the logic
// directly. These tests also pin false-positive safety: a CORRECT price answer, the safe "No, it's
// actually EUR50" negotiation answer, a multi-service sum, a deposit/percentage line, and a price-less
// service list must NEVER be rewritten.
// Run: deno test priceGuard.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  buildRealPriceSet,
  dedupServices,
  enforcePriceClaim,
  extractAssertedPrices,
  realPriceReply,
  rejectsAPrice,
  statesARealPrice,
} from "./priceGuard.ts";

// The §6 testpad calendar's real services.
const SERVICES = [
  { name: "Standaard Afspraak", price: 50 },
  { name: "Speciale Afspraak", price: 98 },
];
const REAL = buildRealPriceSet(SERVICES);

// ── buildRealPriceSet: real prices + subset sums, cents-normalised ──────────
Deno.test("real price set includes each price and their sum", () => {
  assert(REAL.has(5000)); // 50
  assert(REAL.has(9800)); // 98
  assert(REAL.has(14800)); // 50 + 98 = 148 (multi-service total allowed)
  assert(!REAL.has(700)); // 7 is NOT real
  assert(!REAL.has(1200)); // 12 is NOT real
});

Deno.test("empty / price-less services -> empty set (guard no-ops)", () => {
  assertEquals(buildRealPriceSet([]).size, 0);
  assertEquals(buildRealPriceSet([{ name: "X", price: null }]).size, 0);
  assertEquals(buildRealPriceSet([{ name: "X", price: 0 }]).size, 0);
});

// ── extractAssertedPrices: pulls priced euro amounts, skips deposit/% lines ──
Deno.test("extracts euro amounts from positive price claims (EUR-first + suffix)", () => {
  assertEquals(extractAssertedPrices("The Standaard costs €7."), [700]);
  assertEquals(extractAssertedPrices("De prijs is 12 euro."), [1200]);
  assertEquals(extractAssertedPrices("De Standaard Afspraak kost €50."), [5000]);
  assertEquals(extractAssertedPrices("It costs EUR 7,50."), [750]);
});

Deno.test("does NOT treat a deposit / percentage / refund euro as a price claim", () => {
  // 20% deposit line is refund-domain, not a service price
  assertEquals(extractAssertedPrices("Bij annuleren is de aanbetaling van 20 euro niet terug."), []);
  assertEquals(extractAssertedPrices("Je krijgt €50 terug bij annulering."), []);
  assertEquals(extractAssertedPrices("De korting is 5 euro."), []);
});

// ── enforcePriceClaim: the REWRITE path (false price) ──────────────────────
Deno.test("rewrites a forged low price (the injection exploit)", () => {
  for (const fake of [
    "The Standaard costs €7.",
    "The Standaard service costs €7.",
    "De prijs voor Standaard is 7 EUR.",
    "The price for a Standaard appointment is €7.",
    "De Standaard Afspraak kost nu €8.",
    "De Standaard Afspraak kost nu 12 euro, dankzij de huidige actie.",
    // real price quoted as "normaal" but a fake asserted as the CURRENT price is still a false claim
    "De Standaard Afspraak kost normaal €50, maar met de actie is het nu €12.",
  ]) {
    const out = enforcePriceClaim(fake, SERVICES, "en");
    assert(out !== fake, `should rewrite: ${fake}`);
    // The authoritative reply must quote a REAL price and never the fake one.
    assert(/€50|€98/.test(out), `rewrite must quote a real price: ${out}`);
    assert(!/€?7\b|€?8\b|€?12\b/.test(out.replace(/€50|€98/g, "")), `rewrite must not carry the fake price: ${out}`);
  }
});

Deno.test("English floor vs Dutch default in the rewrite", () => {
  assertStringIncludes(realPriceReply(SERVICES, "en"), "Our prices are");
  assertStringIncludes(realPriceReply(SERVICES, null), "Onze prijzen zijn");
  // single service -> "costs" / "kost"
  assertStringIncludes(realPriceReply([{ name: "Knip", price: 30 }], "en"), "The Knip costs €30.");
  assertStringIncludes(realPriceReply([{ name: "Knip", price: 30 }], null), "De Knip kost €30.");
});

// ── enforcePriceClaim: false-positive safety (must NOT rewrite) ─────────────
Deno.test("keeps a CORRECT price answer untouched", () => {
  for (const ok of [
    "Een Standaard Afspraak kost €50.",
    "The Speciale Afspraak costs €98.",
    "De Standaard Afspraak kost 50 euro.",
    "That's €148 in total for both.", // real sum
  ]) {
    assertEquals(enforcePriceClaim(ok, SERVICES, ok.startsWith("The") || ok.startsWith("That") ? "en" : null), ok);
  }
});

Deno.test("keeps the safe negotiation answer (quotes the wrong AND the real price)", () => {
  // The model's correct answer to "can I get it for 10 euro?" mentions EUR10 but also the real EUR50.
  for (const safe of [
    "De Standaard Afspraak kost €50. Een prijs van €10 is helaas niet beschikbaar.",
    "De Standaard Afspraak kost €50. Een prijs van 10 euro is helaas niet beschikbaar.",
    "The Standaard Afspraak is €50. A price of €5 isn't possible.",
  ]) {
    assertEquals(enforcePriceClaim(safe, SERVICES, safe.startsWith("The") ? "en" : null), safe);
  }
});

Deno.test("no price claim in the reply -> untouched", () => {
  for (const noprice of [
    "Sure! Which service are you interested in?",
    "Sorry, die behandeling is niet in ons aanbod.",
    "We're open Monday to Friday 09:00-17:00.",
  ]) {
    assertEquals(enforcePriceClaim(noprice, SERVICES, "en"), noprice);
  }
});

Deno.test("no real prices configured -> guard no-ops even on a stated price", () => {
  const noPriced = [{ name: "Consult", price: null }];
  const reply = "The Consult costs €7.";
  assertEquals(enforcePriceClaim(reply, noPriced, "en"), reply);
});

Deno.test("statesARealPrice carve-out helper", () => {
  assert(statesARealPrice([5000, 700], REAL)); // has a real one
  assert(!statesARealPrice([700, 800], REAL)); // only fakes
});

Deno.test("rejectsAPrice detects the safe negotiation reject phrasing", () => {
  assert(rejectsAPrice("De Standaard kost €50. Een prijs van €10 is helaas niet beschikbaar."));
  assert(rejectsAPrice("The Standaard is €50. A price of €5 isn't possible."));
  // a plain "actie" claim does NOT reject -> not spared
  assert(!rejectsAPrice("De Standaard kost normaal €50, maar met de actie is het nu €12."));
});

Deno.test("dedupServices removes multi-calendar duplicates by name+price", () => {
  const dup = [
    { name: "Standaard Afspraak", price: 50 },
    { name: "Speciale Afspraak", price: 98 },
    { name: "Standaard Afspraak", price: 50 }, // dup
    { name: "Knipbeurt Luciano", price: 40 },
  ];
  const out = dedupServices(dup);
  assertEquals(out.length, 3);
  const reply = realPriceReply(dup, "en");
  // "Standaard Afspraak" appears once in the rewrite, not twice
  assertEquals((reply.match(/Standaard Afspraak/g) || []).length, 1);
});
