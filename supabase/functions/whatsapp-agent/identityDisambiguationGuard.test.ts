// Deterministic unit tests for the R102 identity-disambiguation guard (generalizes R76's
// crossIdentityRisk from update_booking_name to resolveTarget/cancel/reschedule). Pins the exact
// R101 + verify-round repro shapes (Sanne/Tim, Anne/Anna) as regression tests.
// Run: deno test identityDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import {
  crossIdentityActionRisk,
  crossIdentityRenameRisk,
  enforceAppointmentNameDisclosure,
  extractStatedNameForBooking,
  isRealName,
  nameSuffix,
  type NamedCandidate,
} from "./identityDisambiguationGuard.ts";

// ── isRealName ───────────────────────────────────────────────────────────────
Deno.test("isRealName: real name true, placeholder/empty false", () => {
  assertEquals(isRealName("Sanne"), true);
  assertEquals(isRealName(""), false);
  assertEquals(isRealName("Privé"), false);
  assertEquals(isRealName("Prive"), false);
  assertEquals(isRealName(null), false);
  assertEquals(isRealName(undefined), false);
});

// ── extractStatedNameForBooking: the STRICT (non-fuzzy) matcher ─────────────
const SANNE_TIM: NamedCandidate[] = [
  { id: "b-sanne", customerName: "Sanne" },
  { id: "b-tim", customerName: "Tim" },
];
const ANNE_ANNA: NamedCandidate[] = [
  { id: "b-anne", customerName: "Anne" },
  { id: "b-anna", customerName: "Anna" },
];

Deno.test("extractStatedNameForBooking: explicit third-party name resolves uniquely (verify-finding-1 shape)", () => {
  assertEquals(extractStatedNameForBooking(SANNE_TIM, "Kun je Anna's afspraak annuleren?"), null); // Anna not a candidate here
  assertEquals(extractStatedNameForBooking(SANNE_TIM, "Kun je Sanne's afspraak annuleren?"), "b-sanne");
  assertEquals(extractStatedNameForBooking(SANNE_TIM, "cancel Tim's appointment please"), "b-tim");
});

Deno.test("extractStatedNameForBooking: near-identical names never cross-match (finding-2/R101 core guarantee)", () => {
  // A message naming "Anne" must NEVER resolve to Anna's booking, and vice versa.
  assertEquals(extractStatedNameForBooking(ANNE_ANNA, "cancel Anne's appointment"), "b-anne");
  assertEquals(extractStatedNameForBooking(ANNE_ANNA, "cancel Anna's appointment"), "b-anna");
  assertEquals(extractStatedNameForBooking(ANNE_ANNA, "annuleer de afspraak van Anne"), "b-anne");
  assertEquals(extractStatedNameForBooking(ANNE_ANNA, "annuleer de afspraak van Anna"), "b-anna");
});

Deno.test("extractStatedNameForBooking: no name mentioned -> null (must fall through to disambiguation)", () => {
  assertEquals(extractStatedNameForBooking(SANNE_TIM, "Kun je mijn afspraak annuleren?"), null);
  assertEquals(extractStatedNameForBooking(SANNE_TIM, "Hey, wanneer is mijn afspraak ook alweer?"), null);
});

Deno.test("extractStatedNameForBooking: BOTH distinct names mentioned -> ambiguous, null (never guess)", () => {
  assertEquals(
    extractStatedNameForBooking(SANNE_TIM, "is dit de afspraak van Sanne of van Tim?"),
    null,
  );
});

Deno.test("extractStatedNameForBooking: whole-word only, no substring false-positive", () => {
  // "Annelies" contains "Anne" as a SUBSTRING but must not match as a whole word.
  const withAnnelies: NamedCandidate[] = [{ id: "b-anne", customerName: "Anne" }];
  assertEquals(extractStatedNameForBooking(withAnnelies, "boek voor Annelies"), null);
});

Deno.test("extractStatedNameForBooking: case/diacritic tolerant, still exact per-name", () => {
  const withAccent: NamedCandidate[] = [{ id: "b1", customerName: "René" }];
  assertEquals(extractStatedNameForBooking(withAccent, "de afspraak van RENE"), "b1");
  assertEquals(extractStatedNameForBooking(withAccent, "de afspraak van rené"), "b1");
});

Deno.test("extractStatedNameForBooking: ignores placeholder-named candidates", () => {
  const withPrivate: NamedCandidate[] = [
    { id: "b1", customerName: "Privé" },
    { id: "b2", customerName: "Sanne" },
  ];
  assertEquals(extractStatedNameForBooking(withPrivate, "annuleer de afspraak van Sanne"), "b2");
});

Deno.test("extractStatedNameForBooking: multi-part name matches on first token", () => {
  const multiPart: NamedCandidate[] = [{ id: "b1", customerName: "Anna de Vries" }];
  assertEquals(extractStatedNameForBooking(multiPart, "cancel Anna's booking"), "b1");
});

// ── nameSuffix ────────────────────────────────────────────────────────────────
Deno.test("nameSuffix: real name renders, placeholder/empty renders nothing", () => {
  assertEquals(nameSuffix("Sanne"), " (op naam Sanne)");
  assertEquals(nameSuffix("Privé"), "");
  assertEquals(nameSuffix(null), "");
  assertEquals(nameSuffix(undefined), "");
});

// ── crossIdentityActionRisk: the WIDER cancel/reschedule gate (NOT gated on candidate count,
// because R101-2's silent reschedule + R101-1's misattribution both reproduced on exactly ONE
// booking on the phone) ───────────────────────────────────────────────────────
Deno.test("crossIdentityActionRisk: single booking, target differs from unnamed speaker -> RISK (R101-1/2 exact single-booking shape)", () => {
  assertEquals(crossIdentityActionRisk(1, "Sanne", null), true);
  assertEquals(crossIdentityActionRisk(1, "Sanne", "Tim"), true);
});

Deno.test("crossIdentityActionRisk: 2+ bookings, target differs from unnamed speaker -> RISK (R101-3 shape)", () => {
  assertEquals(crossIdentityActionRisk(2, "Sanne", null), true);
});

Deno.test("crossIdentityActionRisk: 2+ bookings, target differs from a DIFFERENT named speaker -> RISK", () => {
  // Tim has stated his own name; the target booking is Sanne's -> still a risk.
  assertEquals(crossIdentityActionRisk(2, "Sanne", "Tim"), true);
  // Anne acting on a booking that's actually Anna's -> risk (near-identical names, finding 2).
  assertEquals(crossIdentityActionRisk(2, "Anna", "Anne"), true);
});

Deno.test("crossIdentityActionRisk: target IS the speaker's own name -> no risk (self-action stays smooth, common case)", () => {
  assertEquals(crossIdentityActionRisk(1, "Sanne", "Sanne"), false);
  assertEquals(crossIdentityActionRisk(1, "sanne", "SANNE"), false); // case-insensitive same-person
  assertEquals(crossIdentityActionRisk(2, "Sanne", "Sanne"), false);
});

Deno.test("crossIdentityActionRisk: target has no real name (placeholder) -> no risk (nothing to disclose)", () => {
  assertEquals(crossIdentityActionRisk(1, "Privé", "Tim"), false);
  assertEquals(crossIdentityActionRisk(1, null, "Tim"), false);
  assertEquals(crossIdentityActionRisk(2, "Privé", "Tim"), false);
});

// ── crossIdentityRenameRisk: update_booking_name's ORIGINAL, UNCHANGED R76 gate (DOES require
// totalCandidates >= 2, kept exactly as shipped; this module only offers it for parity/reuse,
// update_booking_name's own inline code is untouched by this round) ─────────
Deno.test("crossIdentityRenameRisk: single booking -> never a risk (rename stays frictionless for the common typo-fix case)", () => {
  assertEquals(crossIdentityRenameRisk(1, "Sanne", null), false);
  assertEquals(crossIdentityRenameRisk(1, "Sanne", "Tim"), false);
});

Deno.test("crossIdentityRenameRisk: 2+ bookings, name mismatch -> RISK (matches update_booking_name's own R76 behaviour)", () => {
  assertEquals(crossIdentityRenameRisk(2, "Sanne", null), true);
  assertEquals(crossIdentityRenameRisk(2, "Sanne", "Tim"), true);
  assertEquals(crossIdentityRenameRisk(2, "Sanne", "Sanne"), false);
});

// ── enforceAppointmentNameDisclosure: deterministic backstop for get_my_appointments ─────────
Deno.test("enforceAppointmentNameDisclosure: rewrites a bare 'je afspraak' when a real name is undisclosed (R101-1 exact single-booking shape)", () => {
  const out = enforceAppointmentNameDisclosure(
    "Je afspraak is donderdag 9 juli om 10:00.",
    [{ service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: "Sanne" }],
    null,
  );
  assertEquals(out.includes("Sanne"), true);
  assertEquals(/\bje afspraak\b/i.test(out), false);
});

Deno.test("enforceAppointmentNameDisclosure: no-op when the name is already correctly disclosed", () => {
  const reply = "Ik zie een afspraak van Sanne op donderdag 9 juli 10:00.";
  const out = enforceAppointmentNameDisclosure(
    reply,
    [{ service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: "Sanne" }],
    null,
  );
  assertEquals(out, reply);
});

Deno.test("enforceAppointmentNameDisclosure: no-op when no appointment carries a real name (common case, byte-identical)", () => {
  const reply = "Je afspraak is donderdag 9 juli om 10:00.";
  const out = enforceAppointmentNameDisclosure(
    reply,
    [{ service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: null }],
    null,
  );
  assertEquals(out, reply);
});

Deno.test("enforceAppointmentNameDisclosure: no-op when the reply text does not use a bare 'je afspraak' phrase", () => {
  const reply = "Ik kon geen afspraken vinden voor je.";
  const out = enforceAppointmentNameDisclosure(
    reply,
    [{ service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: "Sanne" }],
    null,
  );
  assertEquals(out, reply);
});

Deno.test("enforceAppointmentNameDisclosure: near-identical name (Anna vs Annabel/Anne) still gets disclosed, not silently treated as matching", () => {
  const out = enforceAppointmentNameDisclosure(
    "Je afspraak is donderdag 9 juli om 10:00.",
    [{ service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: "Anna" }],
    null,
  );
  assertEquals(out.includes("Anna"), true);
});

Deno.test("enforceAppointmentNameDisclosure: multiple appointments, mixed names, rewritten with both disclosed", () => {
  const out = enforceAppointmentNameDisclosure(
    "Je hebt twee afspraken staan.",
    [
      { service: "Standaard Afspraak", when: "donderdag 9 juli 10:00", customer_name: "Kees" },
      { service: "Speciale Afspraak", when: "woensdag 8 juli 12:00", customer_name: "Marieke" },
    ],
    null,
  );
  assertEquals(out.includes("Kees"), true);
  assertEquals(out.includes("Marieke"), true);
});

Deno.test("enforceAppointmentNameDisclosure: English reply rewritten in English", () => {
  const out = enforceAppointmentNameDisclosure(
    "Your appointment is Thursday July 9 at 10:00.",
    [{ service: "Standard Appointment", when: "Thursday 9 July 10:00", customer_name: "Sanne" }],
    "het Engels",
  );
  assertEquals(out.includes("Sanne"), true);
  assertEquals(/your appointment\b/i.test(out.replace(/under the name/i, "")), false);
});
