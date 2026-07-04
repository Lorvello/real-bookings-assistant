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

Deno.test("noUngroundedClaimReply: NL with contact, NL without, EN with contact", () => {
  assertStringIncludes(noUngroundedClaimReply(null, "0101234567", "a@b.com"), "0101234567");
  assertStringIncludes(noUngroundedClaimReply(null, null, null), "rechtstreeks contact");
  assertStringIncludes(noUngroundedClaimReply("en", "0101234567", null), "0101234567");
});

// ---------------------------------------------------------------------------
// LIVE regression bank. Ground truth mirrors the real Lorvello Personal Calendar fixture used on
// the S6 testpad: Standaard Afspraak EUR50, payment_info states 20% deposit for new customers +
// iDEAL/on-site, refund_policy_text is NULL (disposition unknown), no discount/loyalty mechanism,
// no owner-escalation tool.
const GROUND_TRUTH = buildGroundingSummary({
  businessData: {
    business_name: "Lorvello",
    payment_info: "Betalen kan vooraf via iDEAL of contant bij de afspraak; voor nieuwe klanten geldt een aanbetaling van 20 procent.",
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
];

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
  name: "businessDataGuard: robust N=5 vote fails closed on GROQ_API_KEY missing",
  fn: async () => {
    const r = await classifyBusinessDataGroundingRobust("De Standaard Afspraak kost €50.", GROUND_TRUTH, undefined);
    assertEquals(r.isUngroundedClaim, true);
    assertEquals(r.votes.length, 5);
    assert(r.votes.every((v) => v === "error"));
  },
});
