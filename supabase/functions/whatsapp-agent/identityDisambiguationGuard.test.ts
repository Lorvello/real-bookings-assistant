// Deterministic unit tests for the R102 identity-disambiguation guard (generalizes R76's
// crossIdentityRisk from update_booking_name to resolveTarget/cancel/reschedule). Pins the exact
// R101 + verify-round repro shapes (Sanne/Tim, Anne/Anna) as regression tests.
// Run: deno test identityDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import {
  crossIdentityActionRisk,
  crossIdentityBookRisk,
  crossIdentityBookVerificationBypass,
  crossIdentityRenameRisk,
  enforceAppointmentNameDisclosure,
  enforceExistingAppointmentDisclosure,
  enforceVerificationGateDisclosure,
  extractStatedNameForBooking,
  hasMultipleDistinctNamesStated,
  identityVerificationResolved,
  isRealName,
  mentionsOwnAppointmentClaim,
  messageNamesPendingBookOwner,
  nameSuffix,
  previewTakeoverRisk,
  takeoverVerificationResolution,
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

// ── R120: crossIdentityBookRisk (book_appointment's OWN risk predicate, closes the live-
// reproduced 6/6 deterministic first-message false positive; see identityDisambiguationGuard.ts's
// own header comment for the full root-cause reasoning). ──────────────────────────────────────
Deno.test("crossIdentityBookRisk: brand-new phone, first-ever message, name self-supplied this turn -> NO risk (the exact deadlock repro shape)", () => {
  // knownSelfName null (nothing ever captured) AND no prior real booking on file at all: the
  // preview's name is definitionally the current speaker's own self-declared name.
  assertEquals(crossIdentityBookRisk("Chris", null, false), false);
});

Deno.test("crossIdentityBookRisk: a real prior booking exists on this phone -> RISK still fires even with null knownSelfName (genuine shared-phone protection preserved)", () => {
  assertEquals(crossIdentityBookRisk("Chris", null, true), true);
});

Deno.test("crossIdentityBookRisk: knownSelfName already a REAL established name that conflicts -> RISK fires regardless of prior-booking history (phone-handoff-mid-flow shape, R107's original concern)", () => {
  assertEquals(crossIdentityBookRisk("Chris", "Bob", false), true);
  assertEquals(crossIdentityBookRisk("Chris", "Bob", true), true);
});

Deno.test("crossIdentityBookRisk: preview name matches the speaker's own established name -> no risk regardless of prior-booking history", () => {
  assertEquals(crossIdentityBookRisk("Chris", "Chris", false), false);
  assertEquals(crossIdentityBookRisk("Chris", "Chris", true), false);
  assertEquals(crossIdentityBookRisk("chris", "CHRIS", true), false);
});

Deno.test("crossIdentityBookRisk: preview has no real name (placeholder) -> no risk", () => {
  assertEquals(crossIdentityBookRisk("Privé", null, true), false);
  assertEquals(crossIdentityBookRisk(null, null, true), false);
});

// ── R120: crossIdentityBookVerificationBypass ───────────────────────────────────────────────
Deno.test("crossIdentityBookVerificationBypass: true only when confirmBookVerification is exactly true", () => {
  assertEquals(crossIdentityBookVerificationBypass(true), true);
  assertEquals(crossIdentityBookVerificationBypass(false), false);
  assertEquals(crossIdentityBookVerificationBypass(undefined), false);
});

// ── R120: messageNamesPendingBookOwner (the marker-FREE catch-22 fix) ───────────────────────
Deno.test("messageNamesPendingBookOwner: message explicitly names the pending preview's own customer_name -> true", () => {
  assertEquals(messageNamesPendingBookOwner("Chris", "Ja, echt boeken voor Chris"), true);
  assertEquals(messageNamesPendingBookOwner("Chris", "Ja klopt, boek het echt voor Chris alsjeblieft"), true);
});

Deno.test("messageNamesPendingBookOwner: bare affirm with no name at all -> false (must not accidentally satisfy)", () => {
  assertEquals(messageNamesPendingBookOwner("Chris", "Ja"), false);
  assertEquals(messageNamesPendingBookOwner("Chris", "Klopt"), false);
});

Deno.test("messageNamesPendingBookOwner: near-identical name does not satisfy (Chris vs Christiaan/Christel)", () => {
  assertEquals(messageNamesPendingBookOwner("Chris", "Ja, voor Christiaan"), false);
  assertEquals(messageNamesPendingBookOwner("Christel", "Ja, voor Chris"), false);
});

Deno.test("messageNamesPendingBookOwner: no real pending name (placeholder) -> false", () => {
  assertEquals(messageNamesPendingBookOwner("Privé", "Ja, echt boeken"), false);
  assertEquals(messageNamesPendingBookOwner(null, "Ja, echt boeken"), false);
});

Deno.test("messageNamesPendingBookOwner: unrelated message content naming someone else entirely -> false", () => {
  assertEquals(messageNamesPendingBookOwner("Chris", "Nee, boek het voor Sanne"), false);
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

// ── R112 enforceVerificationGateDisclosure (closes R107-GATE-FIRST-TRIGGER-WRONG-TEXT) ─────────
function gateToolCall(customerReply: string, currentName = "Anna Fixture") {
  return [{
    name: "reschedule_appointment",
    result: { error: "naam_verificatie_nodig", current_name: currentName, customer_reply: customerReply, message: "internal instructions, never sent" },
  }];
}

Deno.test("enforceVerificationGateDisclosure: rewrites a non-sequitur reply to the customer_reply when the name is missing", () => {
  const nonSequitur = "Ik heb daar geen bevestigde informatie over, dus ik ga daar niet naar gokken. Voor een definitief antwoord kun je het beste rechtstreeks contact opnemen.";
  const result = enforceVerificationGateDisclosure(nonSequitur, gateToolCall("De afspraak die ik vond staat op naam van Anna Fixture. Klopt het dat dit echt de afspraak van Anna Fixture is die verzet moet worden?"));
  assertEquals(result.includes("Anna Fixture"), true);
  assertEquals(result.includes("geen bevestigde informatie"), false);
});

Deno.test("enforceVerificationGateDisclosure: no-op when the model's OWN reply already discloses the name correctly", () => {
  const good = "Ik zie een afspraak op naam van Anna Fixture (Standaard Afspraak, donderdag 20 augustus 12:00). Is dit echt de afspraak die je wilt verzetten?";
  assertEquals(enforceVerificationGateDisclosure(good, gateToolCall("some other customer_reply text")), good);
});

Deno.test("enforceVerificationGateDisclosure: no-op when no tool call this turn returned naam_verificatie_nodig", () => {
  const reply = "Schikt 10:00 of 14:30?";
  assertEquals(
    enforceVerificationGateDisclosure(reply, [{ name: "get_available_slots", result: { available_slots: [] } }]),
    reply,
  );
});

Deno.test("enforceVerificationGateDisclosure: no-op when replyText is empty (nothing to rewrite)", () => {
  assertEquals(enforceVerificationGateDisclosure("", gateToolCall("x")), "");
});

Deno.test("enforceVerificationGateDisclosure: no-op when current_name is not a real name (Privé/placeholder)", () => {
  const reply = "Sorry, kun je dat verduidelijken?";
  assertEquals(enforceVerificationGateDisclosure(reply, gateToolCall("x", "Privé")), reply);
});

Deno.test("enforceVerificationGateDisclosure: uses the MOST RECENT naam_verificatie_nodig result when several tool calls happened this turn", () => {
  const nonSequitur = "Neem rechtstreeks contact op.";
  const toolCalls = [
    { name: "get_my_appointments", result: { appointments: [] } },
    { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Oude Eigenaar", customer_reply: "De afspraak die ik vond staat op naam van Oude Eigenaar. Klopt het dat dit echt de afspraak van Oude Eigenaar is die verzet moet worden?" } },
  ];
  const result = enforceVerificationGateDisclosure(nonSequitur, toolCalls);
  assertEquals(result.includes("Oude Eigenaar"), true);
});

// ── R37 enforceExistingAppointmentDisclosure (bug R36b: hallucinated existing-booking date) ────
function existingApptToolCall(existingStartTime: string, customerReply: string, toolName = "book_appointment") {
  return [{
    name: toolName,
    result: {
      error: "bestaande_afspraak",
      existing_start_time: existingStartTime,
      customer_reply: customerReply,
      message: "internal instructions, never sent",
    },
  }];
}

Deno.test("enforceExistingAppointmentDisclosure: rewrites a reply citing the WRONG date to the real customer_reply", () => {
  // R36 live shape: real existing booking is 2026-07-12, but the model's reply named 2026-07-26
  // (the customer's own just-requested date) instead.
  const wrongDate = "Je hebt al een afspraak op zondag 26 juli 12:00 onder de naam E2E Simulator. Wil je die afspraak verzetten naar de nieuwe tijd, of wil je een tweede afspraak maken voor een andere persoon?";
  const result = enforceExistingAppointmentDisclosure(
    wrongDate,
    existingApptToolCall("2026-07-12T10:00:00+00:00", "Je hebt al een aankomende afspraak op zondag 12 juli 10:00 onder dit WhatsApp-nummer. Is dat dezelfde persoon als degene die je nu wilt boeken?"),
  );
  assertEquals(result.includes("12 juli"), true);
  assertEquals(result.includes("26 juli"), false);
});

Deno.test("enforceExistingAppointmentDisclosure: no-op when the model's OWN reply already cites the real date correctly", () => {
  const correct = "Je hebt al een afspraak op zondag 12 juli om 10:00 onder de naam E2E Simulator. Wil je die verzetten of gaat het om een andere persoon?";
  assertEquals(
    enforceExistingAppointmentDisclosure(correct, existingApptToolCall("2026-07-12T10:00:00+00:00", "some other customer_reply text")),
    correct,
  );
});

Deno.test("enforceExistingAppointmentDisclosure: EN month name also counts as a correct citation", () => {
  const correctEN = "You already have an appointment on 12 July at 10:00. Would you like to reschedule that one, or is this for someone else?";
  assertEquals(
    enforceExistingAppointmentDisclosure(correctEN, existingApptToolCall("2026-07-12T10:00:00+00:00", "fallback text")),
    correctEN,
  );
});

Deno.test("enforceExistingAppointmentDisclosure: no-op when no tool call this turn returned bestaande_afspraak", () => {
  const reply = "Schikt 10:00 of 14:30?";
  assertEquals(
    enforceExistingAppointmentDisclosure(reply, [{ name: "get_available_slots", result: { available_slots: [] } }]),
    reply,
  );
});

Deno.test("enforceExistingAppointmentDisclosure: no-op when replyText is empty (nothing to rewrite)", () => {
  assertEquals(enforceExistingAppointmentDisclosure("", existingApptToolCall("2026-07-12T10:00:00+00:00", "x")), "");
});

Deno.test("enforceExistingAppointmentDisclosure: forces customer_reply when the reply has no date at all", () => {
  const noDate = "Ik zie dat er al iets staat, wil je dat wijzigen?";
  const result = enforceExistingAppointmentDisclosure(noDate, existingApptToolCall("2026-07-12T10:00:00+00:00", "Je hebt al een aankomende afspraak op zondag 12 juli 10:00 onder dit WhatsApp-nummer."));
  assertEquals(result.includes("12 juli"), true);
});

Deno.test("enforceExistingAppointmentDisclosure: no authoritative customer_reply to fall back to -> leaves the model's own text", () => {
  const reply = "Je hebt al een afspraak, wil je die verzetten?";
  const toolCalls = [{ name: "book_appointment", result: { error: "bestaande_afspraak", existing_start_time: "2026-07-12T10:00:00+00:00" } }];
  assertEquals(enforceExistingAppointmentDisclosure(reply, toolCalls), reply);
});

Deno.test("enforceExistingAppointmentDisclosure: uses the MOST RECENT bestaande_afspraak result when several tool calls happened this turn", () => {
  const wrongDate = "Je hebt al een afspraak op 1 januari.";
  const toolCalls = [
    { name: "book_appointment", result: { error: "bestaande_afspraak", existing_start_time: "2026-08-01T09:00:00+00:00", customer_reply: "OLD, moet niet gebruikt worden (1 augustus)" } },
    { name: "book_appointment", result: { error: "bestaande_afspraak", existing_start_time: "2026-07-12T10:00:00+00:00", customer_reply: "Je hebt al een aankomende afspraak op zondag 12 juli 10:00 onder dit WhatsApp-nummer." } },
  ];
  const result = enforceExistingAppointmentDisclosure(wrongDate, toolCalls);
  assertEquals(result.includes("12 juli"), true);
  assertEquals(result.includes("1 augustus"), false);
});

// ── R123 previewTakeoverRisk: UNCONDITIONAL FAIL-CLOSED, no heuristic bypass of any kind ───────
// (R121 introduced the marker; R122 added a fail-closed default with a correction-marker +
// computed-similarity narrowing escape hatch; THIS ROUND removes that narrowing entirely after
// live-reproducing with DB proof on the S6 testpad, fresh fixtures 316000020001/316000020002,
// that R122's own escape hatch is itself exploitable: ordinary, genuinely-distinct short real
// names -- Erik/Derek, Anna/Hanna, Marco/Mario, Tom/Tim, Jack/Zack -- score above ANY similarity
// threshold that would also admit genuine typo-fixes, so a correction-marker word plus one of
// these pairs silently defeated R122's whole mechanism, committing a real booking under a
// stranger's name with zero verification. See identityDisambiguationGuard.ts's R123 header
// comment for the full reasoning on why this whole heuristic category -- shape, word list, or
// computed score -- is fundamentally unfixable and was removed rather than tuned again.)

Deno.test("previewTakeoverRisk: the exact Variation-E shape -> RISK (originator Anna, new candidate Bram)", () => {
  assertEquals(previewTakeoverRisk("Anna", "Bram", "Ja, echt boeken voor Bram"), true);
});

Deno.test("previewTakeoverRisk (R123): a genuine same-speaker typo correction now ALSO requires verification -- one extra confirm turn is the accepted, deliberate cost", () => {
  // Under R122 this used to auto-release (correction marker + high similarity). R123 removes
  // that narrowing unconditionally: even an honest "nee wacht, Ana niet Anna" now requires the
  // explicit takeoverVerificationResolution/identityVerificationResolved confirmation turn like
  // every other name-conflicting re-preview. This is EXPECTED and ACCEPTABLE friction, not a
  // regression (see the mandate: "this friction is EXPECTED and ACCEPTABLE").
  assertEquals(previewTakeoverRisk("Anna", "Ana", "Nee wacht, Ana niet Anna"), true);
});

Deno.test("previewTakeoverRisk (R123): negate-shaped message naming a dissimilar person -> RISK (R121-verify exploit #2, Nora->Otto)", () => {
  assertEquals(previewTakeoverRisk("Nora", "Otto", "Nee wacht, doe het voor Otto"), true);
});

Deno.test("previewTakeoverRisk (R123): imperative phrasing outside any affirm/negate shape -> RISK (R121-verify exploit #1)", () => {
  assertEquals(previewTakeoverRisk("Anna", "Bram", "Zet maar op Bram"), true);
  assertEquals(previewTakeoverRisk("Anna", "Bram", "Kan dit voor Bram?"), true);
  assertEquals(previewTakeoverRisk("Anna", "Bram", "Doe maar Bram"), true);
});

Deno.test("previewTakeoverRisk (R123): the R122-live-proven exploit pairs ALL now flag risk regardless of correction wording", () => {
  // Erik/Derek 0.6, Anna/Hanna 0.8, Marco/Mario 0.8, Tom/Tim 0.67, Jack/Zack 0.75 under R122's own
  // 0.5 threshold -- all scored "similar enough" to auto-release with a correction marker present,
  // and all were live-reproduced (this round: Erik->Derek, Anna->Hanna) as real committed
  // wrong-name bookings with zero verification. Every one must now flag risk, unconditionally.
  assertEquals(previewTakeoverRisk("Erik", "Derek", "nee wacht, ik bedoel Derek"), true);
  assertEquals(previewTakeoverRisk("Anna", "Hanna", "sorry, het is voor Hanna"), true);
  assertEquals(previewTakeoverRisk("Marco", "Mario", "nee toch niet, Mario"), true);
  assertEquals(previewTakeoverRisk("Tom", "Tim", "actually, it's Tim"), true);
  assertEquals(previewTakeoverRisk("Jack", "Zack", "sorry ik bedoel Zack"), true);
});

Deno.test("previewTakeoverRisk (R123): correction marker present but name is dissimilar -> RISK (unchanged, was already true under R122)", () => {
  assertEquals(previewTakeoverRisk("Anna", "Otto", "Nee wacht, toch maar Otto"), true);
});

Deno.test("previewTakeoverRisk (R123): full-name-vs-short-name pair (Christiaan/Chris) now ALSO requires verification", () => {
  assertEquals(previewTakeoverRisk("Christiaan", "Chris", "Nee sorry, gewoon Chris"), true);
});

Deno.test("previewTakeoverRisk: no originator_name on file yet (pre-fix in-flight preview) -> NO risk, conservative skip", () => {
  assertEquals(previewTakeoverRisk(null, "Bram", "Ja, echt boeken voor Bram"), false);
  assertEquals(previewTakeoverRisk(undefined, "Bram", "Ja, echt boeken voor Bram"), false);
});

Deno.test("previewTakeoverRisk: new candidate name agrees with the originator (case/diacritic variant) -> NO risk", () => {
  assertEquals(previewTakeoverRisk("Anna", "ANNA", "Ja, klopt, echt voor Anna"), false);
});

Deno.test("previewTakeoverRisk: new candidate has no real name (placeholder) -> NO risk", () => {
  assertEquals(previewTakeoverRisk("Anna", "Privé", "Ja, boek maar zonder naam"), false);
});

Deno.test("previewTakeoverRisk (R123): rawMessage content is never consulted -- identical name-pair risk regardless of wording", () => {
  // No message shape, word, or phrasing can ever change the verdict now: only the name-pair
  // comparison (nameMismatch against originator_name) drives the result.
  assertEquals(previewTakeoverRisk("Anna", "Ana", "voor Ana ipv Anna"), true);
  assertEquals(previewTakeoverRisk("Anna", "Ana", ""), true);
  assertEquals(previewTakeoverRisk("Anna", "Ana", null), true);
  assertEquals(previewTakeoverRisk("Anna", "Ana", undefined), true);
});

Deno.test("takeoverVerificationResolution: message names the PROPOSED new name -> confirmed_new", () => {
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "ja, echt voor Bram"), "confirmed_new");
});

Deno.test("takeoverVerificationResolution: message names the ORIGINATOR -> reverted_to_originator", () => {
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "nee, gewoon voor Anna"), "reverted_to_originator");
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "laat maar op Anna"), "reverted_to_originator");
});

Deno.test("takeoverVerificationResolution: bare affirm/negate with no name at all -> unresolved", () => {
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "ja"), "unresolved");
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "nee"), "unresolved");
});

Deno.test("takeoverVerificationResolution: BOTH names mentioned at once -> unresolved (never guess between two explicit signals)", () => {
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "niet Bram maar Anna"), "unresolved");
});

Deno.test("takeoverVerificationResolution: near-identical names never cross-match (Anne vs Anna, same strict matcher as the rest of this file)", () => {
  assertEquals(takeoverVerificationResolution("Anna", "Bram", "ja voor Anne"), "unresolved");
});
