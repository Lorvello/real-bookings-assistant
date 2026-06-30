// Deterministic unit tests for the AS-Z-guard refund backstop. The live agent runs on a temp-0.2 20B
// model that won't reliably produce a false refund promise on demand, so the REWRITE path is proven by
// exercising the logic directly (and the live testpad demonstrates a coaxed slip the guard catches).
// These tests also pin false-positive safety: a CORRECT "no refund" answer, a GRANTED refund
// affirmation, and an UNKNOWN/defer reply must NEVER be rewritten.
// Run: deno test refundGuard.test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import {
  AFFIRM_REFUND_RE,
  NEGATED_REFUND_RE,
  enforceRefundPolicy,
  looksLikeRefundPromise,
  noRefundReply,
} from "./refundGuard.ts";

const CANON = "Geen terugbetaling. Alle boekingen zijn definitief.";

// ── looksLikeRefundPromise: catches AFFIRMATIVE money-back promises ──────────
for (const promise of [
  "Ja hoor, je krijgt je geld terug bij annuleren.",
  "Je kunt tot 24 uur kosteloos annuleren, dus je krijgt je geld terug.",
  "Natuurlijk, het bedrag wordt terugbetaald.",
  "Je betaling wordt gerestitueerd na annulering.",
  "Geen probleem, we storten je geld terug.",
  "Yes, you'll get your money back.",
  "Sure, we will refund you in full.",
  "Of course, you get a full refund.",
  "We'll reimburse you after cancellation.",
  "Yes, that's refundable, money back guaranteed.",
]) {
  Deno.test(`promise caught: ${promise.slice(0, 40)}`, () => assert(looksLikeRefundPromise(promise)));
}

// ── looksLikeRefundPromise: must NOT flag a CORRECT no-refund answer ─────────
for (const ok of [
  "Nee, er is geen terugbetaling. Alle boekingen zijn definitief.",
  "Nee, je krijgt helaas geen geld terug bij annuleren.",
  "Sorry, een vooruitbetaling wordt niet terugbetaald.",
  "Volgens ons beleid is er geen terugbetaling mogelijk.",
  "No, there are no refunds, all bookings are final.",
  "Unfortunately bookings are non-refundable.",
  "No, we don't offer refunds.",
  "No, you won't get your money back, the booking is final.",
  // a clean no-refund + free-cancel addendum (the AS-3-Vr residual; accurate, NOT a promise)
  "Nee, er is geen terugbetaling. Je kunt wel tot 24 uur van tevoren kosteloos annuleren.",
]) {
  Deno.test(`safe (not flagged): ${ok.slice(0, 40)}`, () => assert(!looksLikeRefundPromise(ok)));
}

// ── looksLikeRefundPromise: an offer/question is not a done-promise ──────────
Deno.test("offer-question not flagged", () => {
  assert(!looksLikeRefundPromise("Wil je dat ik je afspraak annuleer?"));
});

// ── NEGATED_REFUND_RE pins the deny side ─────────────────────────────────────
Deno.test("negated regex hits the no-refund forms", () => {
  assert(NEGATED_REFUND_RE.test("geen terugbetaling"));
  assert(NEGATED_REFUND_RE.test("wordt niet terugbetaald"));
  assert(NEGATED_REFUND_RE.test("no refunds"));
  assert(NEGATED_REFUND_RE.test("non-refundable"));
  assert(NEGATED_REFUND_RE.test("all bookings are final"));
});
Deno.test("affirm regex hits the money-back forms", () => {
  assert(AFFIRM_REFUND_RE.test("terugbetaling"));
  assert(AFFIRM_REFUND_RE.test("je krijgt je geld terug"));
  assert(AFFIRM_REFUND_RE.test("full refund"));
  assert(AFFIRM_REFUND_RE.test("money back"));
});

// ── enforceRefundPolicy: disposition gating ─────────────────────────────────
const PROMISE = "Ja, je krijgt je geld terug.";
Deno.test("denied + promise => REWRITTEN to authoritative no-refund line (NL)", () => {
  const out = enforceRefundPolicy(PROMISE, "denied", CANON, null);
  assert(out !== PROMISE);
  assertStringIncludes(out.toLowerCase(), "nee");
  assertStringIncludes(out, CANON);
  // the rewrite itself must NOT re-trip the promise detector
  assert(!looksLikeRefundPromise(out));
});
Deno.test("denied + promise => English floor for non-Dutch customer", () => {
  const out = enforceRefundPolicy("Yes, you'll get your money back.", "denied", CANON, "het Engels");
  assertStringIncludes(out, "No");
  assertStringIncludes(out, CANON);
});
Deno.test("granted + affirmation => NO-OP (refund affirmation must stay)", () => {
  const granted = "Ja, je krijgt een volledige terugbetaling tot 72 uur van tevoren.";
  assertEquals(enforceRefundPolicy(granted, "granted", "Volledige terugbetaling tot 72 uur.", null), granted);
});
Deno.test("unknown + anything => NO-OP (defer/contact path stays)", () => {
  const defer = "Ik weet niet zeker of je geld terugkrijgt; neem daarvoor even rechtstreeks contact op.";
  assertEquals(enforceRefundPolicy(defer, "unknown", null, null), defer);
});
Deno.test("null disposition => NO-OP", () => {
  assertEquals(enforceRefundPolicy(PROMISE, null, CANON, null), PROMISE);
});
Deno.test("denied + CORRECT no-refund answer => NO-OP (not over-suppressed)", () => {
  const correct = "Nee, er is geen terugbetaling. Alle boekingen zijn definitief.";
  assertEquals(enforceRefundPolicy(correct, "denied", CANON, null), correct);
});

// ── noRefundReply: empty canonical falls back safely (never a promise) ───────
Deno.test("noRefundReply falls back safely with empty policy", () => {
  const nl = noRefundReply(null, null);
  assert(!looksLikeRefundPromise(nl));
  const en = noRefundReply("", "het Engels");
  assert(!looksLikeRefundPromise(en));
});

// ── END-TO-END WIRING: the exact index.ts chain (classify the owner policy -> guard the reply) ──
// This proves the guard is CODE-ENFORCED: given the owner's no-refund text, classifyRefundDisposition
// returns "denied", and a slipped model reply is REWRITTEN to the authoritative line. The live 20B did
// not slip across 26 adversarial trials (AS_Z_guard.md), so this deterministic test stands in for the
// "model slip" the guard exists to catch, demonstrating the rewrite the live wiring would perform.
import { classifyRefundDisposition } from "./refundClassifier.ts";

Deno.test("E2E wiring: owner no-refund text -> denied -> a slipped reply is rewritten", () => {
  const ownerPolicy = "Geen terugbetaling. Alle boekingen zijn definitief.";
  const disposition = classifyRefundDisposition(ownerPolicy);
  assertEquals(disposition, "denied");
  // the exact worst-case slip the AS-3-V1 verifier once caught from the live model
  const slip = "Je kunt tot 24 uur kosteloos annuleren, dus je krijgt je geld terug.";
  assert(looksLikeRefundPromise(slip));
  const guarded = enforceRefundPolicy(slip, disposition, ownerPolicy, null);
  assert(guarded !== slip);
  assertStringIncludes(guarded, ownerPolicy);
  assert(!looksLikeRefundPromise(guarded));
});
