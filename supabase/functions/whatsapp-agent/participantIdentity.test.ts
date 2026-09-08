import { assertEquals } from "jsr:@std/assert@1.0.19";
import { boundTakeoverMarker, explicitParticipantSwitch, takeoverPreemptCandidate, takeoverQuestion } from "./identityDisambiguationGuard.ts";
function context() {
  const p = { start_time: "2026-09-10T12:00:00Z", end_time: "2026-09-10T12:30:00Z", calendar_id: "cal", service_type_id: "cut", originator_name: "Daan Peters", customer_name: "Daan Peters", at: Date.now() };
  return { pending_booking: p, pending_book_takeover_verification: { ...p, proposed_name: "Sophie van Dijk" } };
}
Deno.test("R28 full names NL/EN are exact and one question", () => {
  for (const lang of [null, "English"]) {
    const q = takeoverQuestion(context(), lang)!;
    assertEquals(q.includes("Daan Peters") && q.includes("Sophie van Dijk"), true);
    assertEquals(q.match(/\?/g)?.length, 1);
  }
});
for (const field of ["start_time", "end_time", "calendar_id", "service_type_id", "originator_name"] as const) {
  Deno.test(`R28 marker from another ${field} cannot release or supply reply`, () => {
    const c = context(); c.pending_booking[field] += "-different";
    assertEquals(boundTakeoverMarker(c), null);
    assertEquals(takeoverQuestion(c, "English"), null);
    assertEquals(takeoverPreemptCandidate(c, "yes"), null);
  });
}
Deno.test("R28 expired preview or marker gives no preempt or server question", () => {
  for (const field of ["pending_booking", "pending_book_takeover_verification"] as const) {
    const c = context(); c[field].at -= 16 * 60_000;
    assertEquals(takeoverPreemptCandidate(c, "yes"), null);
    assertEquals(takeoverQuestion(c, "English"), null);
  }
});
Deno.test("R28 narrowly route participant switches, retain ordinary own-name and corrections", () => {
  assertEquals(explicitParticipantSwitch("make it Sophie van Dijk instead, not me"), "Sophie van Dijk");
  assertEquals(explicitParticipantSwitch("maak er Sophie van, niet voor mij"), "Sophie");
  assertEquals(explicitParticipantSwitch("voor Sophie, niet voor mij"), "Sophie");
  for (const m of ["my name is Sophie", "I am Sophie", "make it Sophie instead at 3pm", "voor Sophie vrijdag 14:00", "yes, book it for Sophie", "nee, gewoon voor Daan"]) assertEquals(explicitParticipantSwitch(m), null);
  assertEquals(takeoverPreemptCandidate(context(), "yes, book it for Sophie"), null);
  assertEquals(takeoverPreemptCandidate(context(), "yes"), "Sophie van Dijk");
  // R123: near names remain distinct, never treated as a spelling correction.
  const c = context(); c.pending_booking.originator_name = "Sofie";
  assertEquals(takeoverPreemptCandidate(c, "make it Sophie instead, not me"), "Sophie");
});

import { takeoverVerificationResolution } from "./identityDisambiguationGuard.ts";
Deno.test("FIX1 negative naming never grants takeover verification", () => {
  for (const msg of ["no, not for Sophie", "nee, niet voor Sophie", "yes, not Sophie", "ja, niet Sophie", "Sophie", "do not book for Sophie"]) {
    assertEquals(takeoverVerificationResolution("Daan Peters", "Sophie", msg), "unresolved");
  }
  for (const msg of ["no, not for Daan", "nee niet voor Daan"]) {
    assertEquals(takeoverVerificationResolution("Daan Peters", "Sophie", msg), "unresolved");
  }
  assertEquals(takeoverVerificationResolution("Daan Peters", "Sophie", "yes, book it for Sophie"), "confirmed_new");
  assertEquals(takeoverVerificationResolution("Daan Peters", "Sophie", "nee gewoon voor Daan"), "reverted_to_originator");
});
