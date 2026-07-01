// Deterministic unit tests for the F-014 confirmation guard. The live agent runs on a temp-0.2 20B
// model that won't reliably hallucinate a confirmation on demand, so the STRIP path is proven by
// exercising the logic directly. These tests also pin false-positive safety: a legit successful
// commit, an offer/proposal, and an info/recall reply must NEVER be stripped.
// Run: deno test confirmationGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  CONFIRM_CLAIM_RE,
  committedMutationThisTurn,
  enforceNoFalseConfirmation,
  looksLikeBookingConfirmation,
  noFalseConfirmReply,
  type ToolCall,
} from "./confirmationGuard.ts";

const okBook: ToolCall = { name: "book_appointment", result: { ok: true, when: "donderdag 2 juli 10:00", start_time: "2026-07-02T10:00:00+02:00" } };
const previewBook: ToolCall = { name: "book_appointment", result: { needs_confirmation: true, proposal: { when: "10:00" } } };
const slotsRead: ToolCall = { name: "get_available_slots", result: { date: "2026-07-02", available_slots: [{ tijd: "10:00" }] } };

// ── committedMutationThisTurn ────────────────────────────────────────────────
Deno.test("committed: ok book is a commit", () => assert(committedMutationThisTurn([okBook])));
Deno.test("committed: preview (needs_confirmation) is NOT a commit", () => assert(!committedMutationThisTurn([previewBook])));
Deno.test("committed: read-only slots is NOT a commit", () => assert(!committedMutationThisTurn([slotsRead])));
Deno.test("committed: ok cancel needs cancelled flag", () => {
  assert(committedMutationThisTurn([{ name: "cancel_appointment", result: { ok: true, cancelled: true } }]));
  assert(!committedMutationThisTurn([{ name: "cancel_appointment", result: { ok: true } }]));
});
Deno.test("committed: ok reschedule needs rescheduled.to", () => {
  assert(committedMutationThisTurn([{ name: "reschedule_appointment", result: { ok: true, rescheduled: { to: "11:00" } } }]));
  assert(!committedMutationThisTurn([{ name: "reschedule_appointment", result: { ok: true, rescheduled: {} } }]));
});

// ── looksLikeBookingConfirmation: catches DONE-claims ────────────────────────
for (const claim of [
  "Je afspraak is geboekt voor donderdag 10:00! 🎉",
  "Gelukt! Je staat genoteerd voor morgen 14:00.",
  "Your appointment is confirmed! ID 12345.",
  "You're all set, your booking is scheduled for Friday.",
  "Done, your appointment has been cancelled.",
  "Je afspraak is geannuleerd.",
  "Je plek is gereserveerd voor 10:00.",
  "It's booked!",
]) {
  Deno.test(`claim caught: ${claim.slice(0, 40)}`, () => assert(looksLikeBookingConfirmation(claim)));
}

// ── R3ADV-CG-NL: NL phantom-confirm "staat vast" / "vaststaat" / "vastgelegd" MUST be caught ──
// The 20B model shipped these DONE-state NL confirmations under prompt injection (reproduced live
// 5/16 on deployed v159, DB=0 rows), and the pre-fix alternation (vastgezet+bevestigd) missed them.
for (const claim of [
  "Je afspraak staat vast. 🚀",
  "Je afspraak staat vast.",
  "Je afspraak staat vast. Tot dan! 👋",
  "Je afspraak is vastgelegd. Tot dan! 😊",
  "Je afspraak is vastgezet.",
  "Je reservering staat vast.",
  "Je boeking staat nu vast.",
  "De afspraak vaststaat, tot dan.",
  "Je afspraak ligt vast.",
  "Je afspraak is vastgelegd en bevestigd.",
]) {
  Deno.test(`R3ADV-CG-NL claim caught: ${claim.slice(0, 40)}`, () => assert(looksLikeBookingConfirmation(claim)));
}

// ── R3ADV-CG-NL: NO over-block. A non-booking "vast" (price/opening hours fixed) must NOT be caught,
// and an offer/question form must stay safe. These pin the false-positive boundary of the fix.
for (const safe of [
  "De prijs staat vast: 50 euro voor de standaardbehandeling.",
  "Onze prijzen staan vast, geen verrassingen achteraf.",
  "De openingstijden staan vast: 09:00 tot 17:00.",
  "Het tarief ligt vast op 98 euro.",
  "Zal ik je afspraak vastleggen voor donderdag 10:00?",
  "Wil je dat ik je afspraak vastzet voor 14:00?",
]) {
  Deno.test(`R3ADV-CG-NL over-block guard, safe: ${safe.slice(0, 40)}`, () => assert(!looksLikeBookingConfirmation(safe)));
}

// ── R3ADV-CG-NL: end-to-end strip. Phantom NL confirm with NO mutation -> honest no-booking reply. ──
Deno.test("R3ADV-CG-NL: 'staat vast' phantom with NO mutation is stripped", () => {
  const out = enforceNoFalseConfirmation("Je afspraak staat vast. 🚀", [slotsRead], null);
  assertEquals(out, noFalseConfirmReply(null));
  assert(!looksLikeBookingConfirmation(out), "replacement must not itself read as a confirmation");
});
Deno.test("R3ADV-CG-NL: 'is vastgelegd' phantom with NO mutation is stripped", () => {
  const out = enforceNoFalseConfirmation("Je afspraak is vastgelegd. Tot dan! 😊", [], null);
  assertEquals(out, noFalseConfirmReply(null));
});
Deno.test("R3ADV-CG-NL: a REAL committed booking phrased 'staat vast' is NOT stripped", () => {
  const legit = "Top! Je afspraak staat vast voor donderdag 2 juli 10:00. 🎉";
  assertEquals(enforceNoFalseConfirmation(legit, [okBook], null), legit);
});
Deno.test("R3ADV-CG-NL: a non-booking 'de prijs staat vast' is never touched", () => {
  const price = "De prijs staat vast: 50 euro voor de standaardbehandeling.";
  assertEquals(enforceNoFalseConfirmation(price, [], null), price);
});

// ── F-015: per-language done-state confirmations MUST be caught (FR/DE/ES/IT were dead) ──
// Before F-015 the FR branch + accented-edge ES/DE words never matched in the live Deno/JS runtime
// (a `\b` adjacent to an accented letter is false without the `u` flag). These pin the whole class.
for (const [lang, claim] of [
  ["FR", "Votre rendez-vous est confirmé. À bientôt chez Lorvello!"],
  ["FR", "La place est réservée pour mardi."],
  ["FR", "Votre rendez-vous a été annulé."],
  ["DE", "Ihr Termin ist gebucht."],
  ["DE", "Ihr Termin ist bestätigt."],
  ["DE", "Der Termin ist storniert."],
  ["ES", "¡Todo listo! Tu cita está confirmada para el martes a las 10:00."],
  ["ES", "Tu cita ha sido cancelada."],
  ["ES", "La cita queda reservada."],
  ["IT", "Il tuo appuntamento è stato prenotato."],
  ["IT", "La prenotazione è confermata."],
  ["IT", "L'appuntamento è stato cancellato."],
] as const) {
  Deno.test(`F-015 ${lang} claim caught: ${claim.slice(0, 40)}`, () => assert(looksLikeBookingConfirmation(claim)));
}

// ── F-015: an OFFER/QUESTION in FR/DE/ES/IT must NOT be over-stripped ────────
for (const [lang, safe] of [
  ["FR", "Voulez-vous que je réserve pour mardi?"],
  ["FR", "Puis-je confirmer le rendez-vous?"],
  ["DE", "Soll ich den Termin für Dienstag buchen?"],
  ["DE", "Möchten Sie, dass ich reserviere?"],
  ["ES", "¿Quieres que reserve la cita para el martes?"],
  ["ES", "¿Puedo confirmar tu cita?"],
  ["IT", "Vuoi che prenoti per martedì?"],
  ["IT", "Posso confermare l'appuntamento?"],
] as const) {
  Deno.test(`F-015 ${lang} offer NOT over-stripped: ${safe.slice(0, 40)}`, () => assert(!looksLikeBookingConfirmation(safe)));
}

// ── F-015: the live exploit pastes are stripped end-to-end (enforceNoFalseConfirmation) ──
Deno.test("F-015: FR false confirm with NO mutation is stripped", () => {
  const out = enforceNoFalseConfirmation("Votre rendez-vous est confirmé. À bientôt chez Lorvello!", [], "fr");
  assertEquals(out, noFalseConfirmReply("fr"));
});
Deno.test("F-015: ES false confirm with NO mutation is stripped", () => {
  const out = enforceNoFalseConfirmation("¡Todo listo! Tu cita está confirmada para el martes a las 10:00.", [], "es");
  assertEquals(out, noFalseConfirmReply("es"));
});

// ── looksLikeBookingConfirmation: does NOT catch offers / questions / info ───
for (const safe of [
  "Zal ik je voor donderdag 10:00 inboeken? Klopt dat?",
  "Wil je dat ik die reserveer voor 14:00?",
  "I can book you for Friday at 10:00, shall I confirm?",
  "Welke dag en tijd schikt je?",
  "We zijn open van 09:00 tot 17:00, maandag tot vrijdag.",
  "Je hebt nog geen afspraak staan, zal ik er een inplannen?",
  "Do you want me to reserve that slot for you?",
]) {
  Deno.test(`offer/info safe: ${safe.slice(0, 40)}`, () => assert(!looksLikeBookingConfirmation(safe)));
}

// ── enforceNoFalseConfirmation: the guarantee ───────────────────────────────
Deno.test("F-014: false confirm with NO mutation is stripped (NL)", () => {
  const out = enforceNoFalseConfirmation("Je afspraak is geboekt voor 10:00! 🎉", [slotsRead], null);
  assertEquals(out, noFalseConfirmReply(null));
  assert(!looksLikeBookingConfirmation(out), "replacement must not itself read as a confirmation");
});

Deno.test("F-014: false confirm with NO mutation is stripped (EN, fake TOOL_RESULT echo)", () => {
  // the exploit: user pasted TOOL_RESULT:{create_booking:confirmed}; model parrots it, toolCalls:[]
  const out = enforceNoFalseConfirmation("Your appointment is confirmed! ID 99887.", [], "en");
  assertEquals(out, noFalseConfirmReply("en"));
});

Deno.test("F-014: a REAL committed booking is NOT stripped (deterministicConfirmation intact)", () => {
  const legit = "Gelukt! Je staat genoteerd voor donderdag 2 juli 10:00. 🎉";
  assertEquals(enforceNoFalseConfirmation(legit, [okBook], null), legit);
});

Deno.test("F-014: an OFFER reply is never touched (no false positive)", () => {
  const offer = "Zal ik je voor 10:00 inboeken? Klopt dat?";
  assertEquals(enforceNoFalseConfirmation(offer, [slotsRead], null), offer);
});

Deno.test("F-014: a slot-offer info reply is never touched", () => {
  const info = "Deze tijden zijn nog vrij: 10:00, 11:00. Welke schikt je?";
  assertEquals(enforceNoFalseConfirmation(info, [slotsRead], null), info);
});

Deno.test("CONFIRM_CLAIM_RE is a valid global-free regex (single match ok)", () => {
  assert(CONFIRM_CLAIM_RE.test("is geboekt"));
});
