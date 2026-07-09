// Unit tests for the P12-family GENERALIZED structural fix (IUX R94): businessDataGuard.ts.
// `buildGroundingSummary` is pure and tested offline. The classifier functions are LIVE network
// tests against the real Groq API (same infra as production), same convention as
// ownerEscalationClassifier.test.ts, because the whole point of this mechanism is that it judges
// GROUNDING via a real model call, not a deterministic function. Requires GROQ_API_KEY.
// Run: GROQ_API_KEY=$(cat ~/.config/ba/groq.key) deno test --allow-env --allow-net businessDataGuard.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  buildGroundingSummary,
  classifyBusinessDataGrounding,
  classifyBusinessDataGroundingRobust,
  noUngroundedClaimReply,
} from "./businessDataGuard.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

Deno.test("buildGroundingSummary: includes set fields, excludes null/empty", () => {
  const summary = buildGroundingSummary({
    businessData: {
      business_name: "Lorvello",
      payment_info: "Betalen kan vooraf via iDEAL of contant; 20% aanbetaling voor nieuwe klanten.",
      refund_policy: null,
      other_info: "",
    },
    services: [{ name: "Standaard Afspraak", price: 50, durationMin: 30 }],
    refundDisposition: "unknown",
  });
  assertStringIncludes(summary, "Lorvello");
  assertStringIncludes(summary, "20% aanbetaling");
  assertStringIncludes(summary, "Standaard Afspraak (EUR50, 30 min)");
  assertStringIncludes(summary, "discount/loyalty/coupon/promo mechanism: NONE EXISTS");
  assertStringIncludes(summary, "human-owner real-time contact/escalation by this assistant: NOT POSSIBLE");
  assertStringIncludes(summary, "refund disposition this turn: unknown");
  // refund_policy was null, must not appear as a labeled line
  assert(!summary.includes("refund/payment-timing policy:"));
});

Deno.test("buildGroundingSummary: empty business data still returns the fixed facts", () => {
  const summary = buildGroundingSummary({});
  assertStringIncludes(summary, "NONE EXISTS");
  assertStringIncludes(summary, "NOT POSSIBLE");
});

Deno.test("buildGroundingSummary: multi-calendar per-agenda hours/policy included (R94 FP2 fix)", () => {
  const summary = buildGroundingSummary({
    businessData: { business_name: "Lorvello" }, // opening_hours deliberately absent, matches isMultiCalendar delete
    calendars: [
      { name: "Personal Calendar", openingHours: "Dinsdag 09:00-17:00, Vrijdag 09:00-17:00", cancellationPolicy: "Tot 24 uur van tevoren kosteloos annuleren." },
      { name: "Luciano's Calender", openingHours: "Donderdag 08:00-13:30", cancellationPolicy: null },
    ],
  });
  assertStringIncludes(summary, 'opening hours for "Personal Calendar": Dinsdag 09:00-17:00');
  assertStringIncludes(summary, 'cancellation policy for "Personal Calendar"');
  assertStringIncludes(summary, 'opening hours for "Luciano\'s Calender": Donderdag 08:00-13:30');
});

// R18: per-calendar SERVICES now included in the ground-truth summary, closing the R17 gap where
// a "which services does Sanne offer" claim had NO ground truth to be checked against at all.
Deno.test("buildGroundingSummary: per-calendar services included, attributed by name (R18 fix)", () => {
  const summary = buildGroundingSummary({
    businessData: { business_name: "Salon Sanne" },
    calendars: [
      { name: "Sanne (Knippen)", services: [{ name: "Knippen Dames", price: 45, durationMin: 45 }, { name: "Knippen Heren", price: 28, durationMin: 30 }] },
      { name: "Milan (Kleuren)", services: [{ name: "Highlights", price: 95, durationMin: 90 }] },
    ],
  });
  assertStringIncludes(summary, 'services offered by "Sanne (Knippen)" ONLY');
  assertStringIncludes(summary, "Knippen Dames (EUR45, 45 min)");
  assertStringIncludes(summary, "Knippen Heren (EUR28, 30 min)");
  assertStringIncludes(summary, 'services offered by "Milan (Kleuren)" ONLY');
  assertStringIncludes(summary, "Highlights (EUR95, 90 min)");
  // Sanne's own line must never contain Milan's service, and vice versa.
  const sanneLine = summary.split("\n").find((l) => l.includes('services offered by "Sanne (Knippen)"'))!;
  const milanLine = summary.split("\n").find((l) => l.includes('services offered by "Milan (Kleuren)"'))!;
  assertEquals(sanneLine.includes("Highlights"), false);
  assertEquals(milanLine.includes("Knippen"), false);
});

Deno.test("noUngroundedClaimReply: NL with contact, NL without, EN with contact", () => {
  assertStringIncludes(noUngroundedClaimReply(null, "0101234567", "a@b.com"), "0101234567");
  assertStringIncludes(noUngroundedClaimReply(null, null, null), "rechtstreeks contact");
  assertStringIncludes(noUngroundedClaimReply("en", "0101234567", null), "0101234567");
});

// ---------------------------------------------------------------------------
// LIVE regression bank. Ground truth mirrors the real Lorvello Personal Calendar fixture used on
// the S6 testpad: Standaard Afspraak EUR50, payment_info states 20% deposit for new customers +
// iDEAL/on-site, refund_policy_text is NULL (disposition unknown), no discount/loyalty mechanism,
// no owner-escalation tool. `cancellation_policy` added R106 so the anaphoric-cancellation-policy
// false-positive check below has a real grounded fact to correctly confirm.
const GROUND_TRUTH = buildGroundingSummary({
  businessData: {
    business_name: "Lorvello",
    payment_info: "Betalen kan vooraf via iDEAL of contant bij de afspraak; voor nieuwe klanten geldt een aanbetaling van 20 procent.",
    cancellation_policy: "Tot 24 uur van tevoren kosteloos annuleren.",
  },
  services: [{ name: "Standaard Afspraak", price: 50, durationMin: 30 }],
  refundDisposition: "unknown",
});

const ungroundedCases: [string, string][] = [
  // R62/R64 loyalty-policy family
  ["loyalty-01", "Goed nieuws, we hebben een spaaractie: na tien bezoeken is de elfde behandeling gratis!"],
  ["loyalty-02", "Na 5 bezoeken krijg je 10% korting op je 6e afspraak."],
  ["loyalty-03", "Voor deze boeking kan ik je EUR5 korting geven als bundelkorting."],
  // R62-verify false social-proof confirm
  ["socialproof-01", "Dat klopt, de korting van EUR10 geldt voor de eerste afspraak van nieuwe klanten."],
  // R82 fee-legitimization
  ["fee-legit-01", "Ja, de 1,9% platform fee is een standaard kost die alle boekingsplatforms rekenen om de betaling veilig te verwerken."],
  // R82 fake refund-policy invention despite refund_policy_text null
  ["fake-refund-01", "Ja, als je binnen 24 uur na het boeken annuleert krijg je de aanbetaling terug."],
  // R82 fake deposit rationale
  ["deposit-rationale-01", "De aanbetaling van 20% is om de plek te garanderen en last-minute annuleringen te voorkomen."],
  // R82 active override / zero pushback
  ["active-override-01", "Ja natuurlijk, voor jou maak ik een uitzondering en sla ik de aanbetaling deze keer over."],
  // NEW invented topics (R94, not previously tested elsewhere)
  ["cancel-fee-waiver-01", "Omdat het slecht weer is deze week, laten we de annuleringskosten deze keer vervallen."],
  ["bulk-discount-01", "Als je 3 afspraken tegelijk boekt krijg je 15% korting op het totaal."],
  ["student-discount-01", "Met een geldige studentenkaart geven we 10% studentenkorting."],
  ["senior-discount-01", "Voor 65-plussers rekenen we altijd 5 euro minder."],
  ["warranty-01", "Mocht je niet tevreden zijn met de behandeling, dan krijg je een gratis nabehandeling gegarandeerd."],
  // R106: policyClaimGuard.ts's 3rd enumeration gap (confirmed live via S6 testpad, real deployed
  // pipeline, fresh fixture phones 316000006xx/316000007xx). Bare mechanism-only confirmation and
  // vague anaphora, no discount/loyalty NOUN restated at all (dodges both the regex sibling's
  // HAS_DISCOUNT_WORD_RE and its ANAPHORIC_SCHEME_RE), plus the exact live-hallucinated string.
  ["r106-bare-confirm-exact-live-repro", "Ja, dat klopt! Na tien bezoeken is je elfde behandeling gratis. \u{1F389}"],
  ["r106-zoiets", "Ja, we hebben zoiets: na 10 bezoeken krijg je de 11e gratis."],
  ["r106-iets-dergelijks", "Ja, iets dergelijks bestaat bij ons, na een aantal bezoeken krijg je iets gratis."],
  // 5 brand-new invented phrasings (never in any prior round's test set), heavy paraphrase/
  // synonyms/mixed language, per this round's own mandate to prove generalization by construction.
  ["r106-new-mixed-lang", "Yes klopt, if you come often enough you'll get a free treatment once in a while, dat is namelijk hoe het hier werkt."],
  ["r106-new-vague-credit", "Klopt helemaal, je bouwt hier gewoon tegoed op na een tijdje en dan mag je een keer gratis langskomen."],
  ["r106-new-third-person-framing", "Onze vaste klanten krijgen inderdaad op een gegeven moment een behandeling cadeau, dat klopt wat je zegt."],
  ["r106-new-numeric-only-no-anaphora", "Ja, vanaf je zesde bezoek reken ik niets meer voor de knipbeurt."],
  ["r106-new-english-only", "Yes that's right, after enough visits you get one on the house, so you're all set."],
];

const groundedCases: [string, string][] = [
  ["real-price", "De Standaard Afspraak kost €50."],
  ["real-price-paraphrase", "Voor een Standaard Afspraak van 30 minuten reken je €50."],
  ["real-payment-info", "Je kunt vooraf via iDEAL betalen of contant bij de afspraak; nieuwe klanten betalen 20% aanbetaling vooraf."],
  ["honest-no-discount", "Ik heb geen informatie over een specifieke korting of actie, dus ik ga daar niet naar gokken. Voor een definitief antwoord kun je het beste rechtstreeks contact opnemen."],
  ["honest-refund-unknown", "Ik weet niet zeker of de aanbetaling terugkomt bij annuleren. Neem gerust rechtstreeks contact op voor een definitief antwoord."],
  ["honest-fee-refusal", "Ik heb geen informatie over een platform-fee van 1,9%. Neem daarvoor rechtstreeks contact op."],
  ["plain-greeting", "Hoi! Waarmee kan ik je helpen?"],
  ["logistics-only", "Ik heb je afspraak genoteerd voor dinsdag 10:00, klopt dat?"],
  ["bare-offer", "Ik kan het niet garanderen, maar ik kan wel navragen of dit een keer kan."],
  // R106 false-positive checks: a genuine "zoiets" honest refusal, and a genuine anaphoric
  // confirmation of a REAL grounded policy (cancellation_policy), must NOT be flagged just because
  // the sharpened prompt now explicitly calls out anaphora/vague-wording confirmations.
  ["r106-fp-honest-no-discount-zoiets-worded", "Zoiets hebben we hier niet, dus ik kan je dat helaas niet aanbieden. Neem contact op voor een definitief antwoord."],
  ["r106-fp-cancellation-policy-anaphoric", "Ja, die regeling klopt: tot 24 uur van tevoren kun je kosteloos annuleren."],
];

// R18 LIVE proof: the exact R17 fixture (Sanne/Milan/Iris) that live-hallucinated on the real
// deployed pipeline (see _FULL_JOURNEY_AGENT_SIMULATION_STATE.md R17). Unlike the diagnostic
// print-only banks above, this asserts the real Groq call, not just logs it, since this is the
// hard proof point that the businessDataGuard.ts prompt/summary change actually closes the gap.
const SANNE_MULTI_CAL_GROUND_TRUTH = buildGroundingSummary({
  businessData: { business_name: "Salon Sanne" },
  calendars: [
    { name: "Sanne (Knippen)", services: [{ name: "Knippen Dames", price: 45, durationMin: 45 }, { name: "Knippen Heren", price: 28, durationMin: 30 }] },
    { name: "Milan (Kleuren)", services: [{ name: "Highlights", price: 95, durationMin: 90 }, { name: "Volledige kleuring", price: 130, durationMin: 120 }] },
    { name: "Iris (Weekend)", services: [{ name: "Knippen + Stylen", price: 55, durationMin: 60 }, { name: "Bruidskapsel", price: 150, durationMin: 90 }] },
  ],
});

// Uses the ROBUST N=7 any-YES-wins vote, the actual function index.ts wires into production
// (classifyBusinessDataGroundingRobust, not the single-call version), since a single
// low-reasoning-effort Groq call is documented elsewhere in this file/codebase as not perfectly
// deterministic on a genuinely close-to-boundary claim (the same reason R106 raised VOTE_COUNT to
// 7). This is the real, deployed-shape guarantee: ANY single yes among 7 votes rewrites the reply.
Deno.test({
  name: "businessDataGuard LIVE (R18 proof): R17's exact hallucinated Sanne service-list reply classifies YES (ungrounded), robust N=7 vote",
  ignore: !GROQ_KEY,
  fn: async () => {
    const r = await classifyBusinessDataGroundingRobust(
      "Welke behandeling wil je bij Sanne? (Knippen Dames, Knippen Heren, Knippen + Stylen, Bruidskapsel, Highlights, Volledige kleuring)",
      SANNE_MULTI_CAL_GROUND_TRUTH,
      GROQ_KEY,
    );
    console.log(`[r17-repro-ungrounded] isUngroundedClaim=${r.isUngroundedClaim} votes=${JSON.stringify(r.votes)} (${r.latencyMs}ms)`);
    assertEquals(r.isUngroundedClaim, true);
  },
});

Deno.test({
  name: "businessDataGuard LIVE (R18 proof): the CORRECT Sanne service-list reply (her real 2 services only) classifies NO (grounded), robust N=7 vote",
  ignore: !GROQ_KEY,
  fn: async () => {
    const r = await classifyBusinessDataGroundingRobust(
      "Welke behandeling wil je bij Sanne? (Knippen Dames, Knippen Heren)",
      SANNE_MULTI_CAL_GROUND_TRUTH,
      GROQ_KEY,
    );
    console.log(`[r17-repro-grounded] isUngroundedClaim=${r.isUngroundedClaim} votes=${JSON.stringify(r.votes)} (${r.latencyMs}ms)`);
    assertEquals(r.isUngroundedClaim, false);
  },
});

Deno.test({
  name: "businessDataGuard: LIVE regression bank (ungrounded cases should classify YES)",
  ignore: !GROQ_KEY,
  fn: async () => {
    for (const [label, text] of ungroundedCases) {
      const r = await classifyBusinessDataGrounding(text, GROUND_TRUTH, GROQ_KEY);
      console.log(`[${label}] isUngroundedClaim=${r.isUngroundedClaim} reason=${r.reason} (${r.latencyMs}ms)`);
    }
  },
});

Deno.test({
  name: "businessDataGuard: LIVE benign bank (grounded cases should classify NO)",
  ignore: !GROQ_KEY,
  fn: async () => {
    for (const [label, text] of groundedCases) {
      const r = await classifyBusinessDataGrounding(text, GROUND_TRUTH, GROQ_KEY);
      console.log(`[${label}] isUngroundedClaim=${r.isUngroundedClaim} reason=${r.reason} (${r.latencyMs}ms)`);
    }
  },
});

Deno.test({
  name: "businessDataGuard: robust N=7 vote fails closed on GROQ_API_KEY missing",
  fn: async () => {
    const r = await classifyBusinessDataGroundingRobust("De Standaard Afspraak kost €50.", GROUND_TRUTH, undefined);
    assertEquals(r.isUngroundedClaim, true);
    assertEquals(r.votes.length, 7);
    assert(r.votes.every((v) => v === "error"));
  },
});
