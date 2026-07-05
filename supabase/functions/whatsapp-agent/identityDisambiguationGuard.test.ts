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
  hasMultipleDistinctNamesStated,
  identityVerificationResolved,
  isRealName,
  mentionsOwnAppointmentClaim,
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

// ── hasMultipleDistinctNamesStated: the R103 GAP 2 stale-marker-invalidation signal ──────────
const DENNIS_ELLEN: NamedCandidate[] = [
  { id: "b-dennis", customerName: "Dennis" },
  { id: "b-ellen", customerName: "Ellen" },
];

Deno.test("hasMultipleDistinctNamesStated: rapid name-correction naming BOTH people -> true (R103 live-repro shape)", () => {
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "nee wacht, niet Dennis, ik bedoelde Ellen's afspraak"), true);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "ja graag ellen dennis"), true);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "is het Dennis of Ellen?"), true);
});

Deno.test("hasMultipleDistinctNamesStated: only ONE candidate name mentioned -> false (common single-name case)", () => {
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "Ellen"), false);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "cancel Dennis's appointment"), false);
});

Deno.test("hasMultipleDistinctNamesStated: no candidate name mentioned -> false (bare 'ja'/'welke afspraak')", () => {
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "Ja"), false);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "Welke afspraak bedoel je?"), false);
});

Deno.test("hasMultipleDistinctNamesStated: 2 candidates sharing the SAME real name -> false (not genuinely 2 distinct people)", () => {
  const twoAnnas: NamedCandidate[] = [
    { id: "b1", customerName: "Anna" },
    { id: "b2", customerName: "Anna" },
  ];
  assertEquals(hasMultipleDistinctNamesStated(twoAnnas, "annuleer de afspraak van Anna"), false);
});

Deno.test("hasMultipleDistinctNamesStated: near-identical names (Anne/Anna) both mentioned -> true, never silently collapsed", () => {
  assertEquals(hasMultipleDistinctNamesStated(ANNE_ANNA, "is dit die van Anne of van Anna?"), true);
});

Deno.test("hasMultipleDistinctNamesStated: empty/whitespace message -> false", () => {
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, ""), false);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, "   "), false);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, null), false);
  assertEquals(hasMultipleDistinctNamesStated(DENNIS_ELLEN, undefined), false);
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

// ── R107: crossIdentityActionRisk applied to book_appointment's own commit shape ─────────────
// (book_appointment has no candidate LIST the way cancel/reschedule's resolveTarget does; a
// pending_booking is a single stored preview, so totalCandidates is always passed undefined,
// matching tools.ts's own call site. These pin the exact book-commit repro shapes.)
Deno.test("crossIdentityActionRisk: book_appointment shape, pending preview name differs from unnamed speaker -> RISK (R107 exact exploit shape)", () => {
  assertEquals(crossIdentityActionRisk(undefined, "Alice", null), true);
});

Deno.test("crossIdentityActionRisk: book_appointment shape, pending preview name differs from a DIFFERENT named speaker -> RISK", () => {
  assertEquals(crossIdentityActionRisk(undefined, "Alice", "Bob"), true);
});

Deno.test("crossIdentityActionRisk: book_appointment shape, pending preview name MATCHES the speaker -> no risk (genuine same-person confirm stays smooth)", () => {
  assertEquals(crossIdentityActionRisk(undefined, "Alice", "Alice"), false);
  assertEquals(crossIdentityActionRisk(undefined, "alice", "ALICE"), false);
});

Deno.test("crossIdentityActionRisk: book_appointment shape, pending preview has no real name -> no risk (common placeholder case)", () => {
  assertEquals(crossIdentityActionRisk(undefined, "Privé", "Bob"), false);
  assertEquals(crossIdentityActionRisk(undefined, null, "Bob"), false);
});

// ── R107: BARE_MY_APPOINTMENT_RE / mentionsOwnAppointmentClaim widened coverage ──────────────
// (DISCLOSURE-BACKSTOP-COVERAGE-GAP fix: the original regex required the literal word
// "afspraak(en)"/"appointment(s)"; these pin the natural phrasings that bypassed it before.)
Deno.test("mentionsOwnAppointmentClaim: original literal-word shape still caught (no regression)", () => {
  assertEquals(mentionsOwnAppointmentClaim("Je afspraak is donderdag 9 juli om 10:00."), true);
  assertEquals(mentionsOwnAppointmentClaim("Your appointment is Thursday at 10."), true);
  assertEquals(mentionsOwnAppointmentClaim("Je hebt twee afspraken staan."), true);
});

Deno.test("mentionsOwnAppointmentClaim: bare possessive phrasings WITHOUT the literal word now caught (the diagnosed bypass)", () => {
  assertEquals(mentionsOwnAppointmentClaim("Je staat op maandag 10:00 ingepland."), true);
  assertEquals(mentionsOwnAppointmentClaim("Je bent ingepland op donderdag 14:00."), true);
  assertEquals(mentionsOwnAppointmentClaim("Jouw moment is vrijdag 14:00."), true);
  assertEquals(mentionsOwnAppointmentClaim("You're booked in for Monday at 10."), true);
  assertEquals(mentionsOwnAppointmentClaim("Your slot is scheduled for Monday."), true);
});

Deno.test("mentionsOwnAppointmentClaim: unrelated reply text -> false (no over-firing)", () => {
  assertEquals(mentionsOwnAppointmentClaim("Ik kon geen afspraken vinden voor je."), false);
  assertEquals(mentionsOwnAppointmentClaim("Welkom bij ons bedrijf!"), false);
  assertEquals(mentionsOwnAppointmentClaim(""), false);
});

Deno.test("enforceAppointmentNameDisclosure: bare possessive phrasing WITHOUT the literal word still gets rewritten (bypass shape closed)", () => {
  const out = enforceAppointmentNameDisclosure(
    "Je staat op maandag 10:00 ingepland.",
    [{ service: "Testafspraak", when: "maandag 6 juli 10:00", customer_name: "Alice" }],
    null,
  );
  assertEquals(out.includes("Alice"), true);
});

// ── identityVerificationResolved (R109 MARKER-RELEASE-HAS-NO-SPEAKER-IDENTITY-CHECK fix) ────────
Deno.test("identityVerificationResolved: a bare repeated affirm with zero new info NEVER resolves a still-mismatched marker (the exact live exploit shape)", () => {
  // "Klaas Bakker"'s preview, speaker still known as "Piet", speaker just repeats "ja".
  assertEquals(identityVerificationResolved("Klaas Bakker", "Piet", "ja"), false);
  assertEquals(identityVerificationResolved("Klaas Bakker", "Piet", "Ja, klopt"), false);
  assertEquals(identityVerificationResolved("Emma Jansen", "Bram", "ja graag"), false);
});

Deno.test("identityVerificationResolved: the customer explicitly naming the target person BY NAME resolves it", () => {
  assertEquals(identityVerificationResolved("Klaas Bakker", "Piet", "Ja, dat klopt, het is voor Klaas"), true);
  assertEquals(identityVerificationResolved("Emma Jansen", "Bram", "Ja, Emma's afspraak inderdaad"), true);
});

Deno.test("identityVerificationResolved: near-identical name does NOT satisfy the check (Anne must never resolve Anna's verification)", () => {
  assertEquals(identityVerificationResolved("Anna", "Piet", "Ja, dat klopt, voor Anne"), false);
});

Deno.test("identityVerificationResolved: knownSelfName now genuinely matching the target resolves it (the real owner stepped in)", () => {
  // The mismatch that triggered the marker no longer exists at release time: knownSelfName caught
  // up to the target's real name (e.g. the true owner is now the one recognized as speaking).
  assertEquals(identityVerificationResolved("Klaas Bakker", "Klaas Bakker", "ja"), true);
});

Deno.test("identityVerificationResolved: no real target name on the marker -> nothing to verify, resolves trivially", () => {
  assertEquals(identityVerificationResolved(null, "Piet", "ja"), true);
  assertEquals(identityVerificationResolved("Privé", "Piet", "ja"), true);
});

Deno.test("identityVerificationResolved: unrelated message content does not accidentally satisfy it", () => {
  assertEquals(identityVerificationResolved("Klaas Bakker", "Piet", "Ok doe donderdag maar"), false);
});
