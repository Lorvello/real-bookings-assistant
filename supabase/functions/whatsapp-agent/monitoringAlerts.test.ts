// Deterministic unit tests for the monitoring/alerts detection mechanism (Item 3, see
// launch-ready-loop/MONITORING_ALERTS_DESIGN.md). Mechanism-level proof (Path B, per the design's
// section 5): fabricated turnCtx objects, no real agent turn, no live DB write beyond the isolated
// ownership-check test below (which uses a stubbed Supabase client, not the real project).
// Run: deno test monitoringAlerts.test.ts
import { assertEquals } from "jsr:@std/assert";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import {
  detectDateMismatch,
  detectThreadHijackNameMismatch,
  detectThreadHijackReadOnlyDisclosure,
  detectThreadHijackWrongOwner,
  extractDateFromReplyText,
} from "./monitoringAlerts.ts";

const NOW = new Date("2026-07-15T10:00:00Z"); // Wednesday

// --- Class 1: date mismatch -------------------------------------------------

Deno.test("date mismatch: reply names a different date than the committed booking", () => {
  const alert = detectDateMismatch({
    toolCalls: [
      { name: "book_appointment", result: { ok: true, booking_id: "b1", start_time: "2026-07-15T09:00:00Z" } },
    ],
    finalReplyText: "Top, je afspraak staat gepland op 18 juli om 11:00.",
    relativeDateHintISO: "2026-07-15",
    matchedPhrase: "vandaag",
    now: NOW,
  });
  assertEquals(alert?.failure_class, "date_mismatch");
  assertEquals(alert?.committed_iso, "2026-07-15");
  assertEquals(alert?.reply_iso, "2026-07-18");
  assertEquals(alert?.booking_id, "b1");
});

Deno.test("date mismatch: no alert when reply date matches the committed date", () => {
  const alert = detectDateMismatch({
    toolCalls: [
      { name: "book_appointment", result: { ok: true, booking_id: "b1", start_time: "2026-07-15T09:00:00Z" } },
    ],
    finalReplyText: "Top, je afspraak staat gepland op 15 juli om 11:00.",
    relativeDateHintISO: "2026-07-15",
    matchedPhrase: "vandaag",
    now: NOW,
  });
  assertEquals(alert, null);
});

Deno.test("date mismatch: no alert when nothing was actually booked this turn", () => {
  const alert = detectDateMismatch({
    toolCalls: [{ name: "get_available_slots", result: { slots: [] } }],
    finalReplyText: "We hebben nog plek op 18 juli.",
    relativeDateHintISO: null,
    matchedPhrase: null,
    now: NOW,
  });
  assertEquals(alert, null);
});

Deno.test("date mismatch: no alert when the reply names no date at all", () => {
  const alert = detectDateMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { ok: true, booking_id: "b2", rescheduled: { to_start_time: "2026-07-20T09:00:00Z" } } },
    ],
    finalReplyText: "Dat kost 45 euro.",
    relativeDateHintISO: null,
    matchedPhrase: null,
    now: NOW,
  });
  assertEquals(alert, null);
});

Deno.test("extractDateFromReplyText: vandaag/morgen/weekday/explicit all resolve", () => {
  assertEquals(extractDateFromReplyText("kan vandaag nog", NOW), "2026-07-15");
  assertEquals(extractDateFromReplyText("dan morgen om 10:00", NOW), "2026-07-16");
  assertEquals(extractDateFromReplyText("geen datum genoemd", NOW), null);
  assertEquals(extractDateFromReplyText("op 3 augustus is er plek", NOW), "2026-08-03");
});

// R9 GAP 1 FIX: enWhen (index.ts ~line 145) renders every English confirmation as
// "<Weekday> <day> <Month> <HH:MM>" (en-GB toLocaleDateString weekday:long/day:numeric/month:long,
// no comma, then 24h time) - e.g. deterministicConfirmation's "Done! You're booked for Tuesday 21
// July 14:00. 🎉". extractDateFromReplyText must resolve that exact shape.
Deno.test("extractDateFromReplyText: English explicit date (enWhen's exact rendered shape) resolves", () => {
  assertEquals(extractDateFromReplyText("Done! You're booked for Tuesday 21 July 14:00. 🎉", NOW), "2026-07-21");
  assertEquals(extractDateFromReplyText("We can do today at 10:00", NOW), "2026-07-15");
  assertEquals(extractDateFromReplyText("How about tomorrow at 10:00", NOW), "2026-07-16");
  assertEquals(extractDateFromReplyText("no date mentioned here", NOW), null);
});

// R9 GAP 1 FIX, combined with class-1 detection: an English customer (customerLanguage != null
// upstream) whose committed booking and reply text disagree must now be caught, matching the
// existing Dutch true-positive test above.
Deno.test("date mismatch: fires for an English reply naming a different date than the committed booking", () => {
  const alert = detectDateMismatch({
    toolCalls: [
      { name: "book_appointment", result: { ok: true, booking_id: "b3", start_time: "2026-07-15T09:00:00Z" } },
    ],
    finalReplyText: "Done! You're booked for Tuesday 21 July 14:00. 🎉",
    relativeDateHintISO: "2026-07-15",
    matchedPhrase: "today",
    now: NOW,
  });
  assertEquals(alert?.failure_class, "date_mismatch");
  assertEquals(alert?.committed_iso, "2026-07-15");
  assertEquals(alert?.reply_iso, "2026-07-21");
  assertEquals(alert?.booking_id, "b3");
});

Deno.test("date mismatch: no alert for an English reply whose date matches the committed booking", () => {
  const alert = detectDateMismatch({
    toolCalls: [
      { name: "book_appointment", result: { ok: true, booking_id: "b3", start_time: "2026-07-21T13:00:00Z" } },
    ],
    finalReplyText: "Done! You're booked for Tuesday 21 July 15:00. 🎉",
    relativeDateHintISO: null,
    matchedPhrase: null,
    now: NOW,
  });
  assertEquals(alert, null);
});

// --- Class 2: wrong-thread hijack -------------------------------------------

Deno.test("thread hijack name mismatch: fires when the gate's current_name differs from the known identity", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Anna" } },
    ],
    knownSelfName: "Anne",
  });
  assertEquals(alert?.failure_class, "thread_hijack_name_mismatch");
  assertEquals(alert?.stated_name, "Anne");
  assertEquals(alert?.actual_name, "Anna");
});

Deno.test("thread hijack name mismatch: no alert when names match", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Anna" } },
    ],
    knownSelfName: "Anna",
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack name mismatch: no alert when no identity is established yet", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Anna" } },
    ],
    knownSelfName: null,
  });
  assertEquals(alert, null);
});

// R7 remediation: gate fires (the R130 fix working correctly) AND the final reply properly asks
// the customer to confirm identity, real shape from R7's false-positive rows (00a2d239.../
// e2457656...): "Klopt het dat dit echt de afspraak van R112ProofX is die verzet moet worden? Typ
// ter bevestiging de naam terug...". Must now correctly return null.
Deno.test("thread hijack name mismatch: no alert when the gate fires and the reply properly asks for confirmation", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "R112ProofX" } },
    ],
    knownSelfName: "Someone Else",
    finalReplyText:
      'Klopt het dat dit echt de afspraak van R112ProofX is die verzet moet worden? Typ ter bevestiging de naam terug, bijv. "Ja, R112ProofX".',
  });
  assertEquals(alert, null);
});

// Live-replay finding during this fix's own Item 7 re-verification: the model's own paraphrase of
// the gate's disclosure-and-confirm question, real reply text captured live against the deployed
// fixture ("Wil je die echt annuleren? Typ de naam terug, bijv. \"Ja, R112ProofX\"."). The first,
// narrower regex version of this fix missed this exact shape (produced one extra false-positive
// row during re-verification, since cleaned up). Must return null.
Deno.test("thread hijack name mismatch: no alert on a paraphrased confirmation question (live-replay finding)", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "cancel_appointment", result: { error: "naam_verificatie_nodig", current_name: "R112ProofX" } },
    ],
    knownSelfName: "Someone Else",
    finalReplyText: 'Wil je die echt annuleren? Typ de naam terug, bijv. "Ja, R112ProofX".',
  });
  assertEquals(alert, null);
});

// Original R130 true-positive shape (Item 6/R6 proof): gate fires but the reply does NOT ask for
// confirmation - proceeds/discloses silently instead. Must still correctly fire.
Deno.test("thread hijack name mismatch: still fires when the gate fires and the reply does not ask for confirmation", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Fatima" } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Je afspraak is verzet naar vrijdag 14:00.",
  });
  assertEquals(alert?.failure_class, "thread_hijack_name_mismatch");
  assertEquals(alert?.stated_name, "Peter");
  assertEquals(alert?.actual_name, "Fatima");
});

// Actual hijack-completed shape: gate fires but a mutation tool still reports ok:true later in the
// same turn despite the unresolved mismatch. Must fire regardless of reply phrasing.
Deno.test("thread hijack name mismatch: fires when a mutation succeeds later in the turn despite the gate", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Fatima" } },
      { name: "reschedule_appointment", result: { ok: true, booking_id: "abc123" } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Klopt het dat dit echt de afspraak van Fatima is die verzet moet worden?",
  });
  assertEquals(alert?.failure_class, "thread_hijack_name_mismatch");
});

// R9 GAP 2 FIX: naam_verificatie_nodig fires for an English customer, the model paraphrases the
// gate's disclosure-and-confirm question into English (no locked English template exists to
// duplicate verbatim - checked tools.ts/identityDisambiguationGuard.ts during this fix). Must
// correctly return null (gate working as designed), matching the Dutch equivalent test above -
// without the fix, CONFIRMATION_KEYWORDS_RE_EN did not exist and this reintroduced R7's bug.
Deno.test("thread hijack name mismatch: no alert on an English confirmation-request paraphrase (gap 2 fix)", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "R112ProofX" } },
    ],
    knownSelfName: "Someone Else",
    finalReplyText:
      'Is this really the appointment for R112ProofX that should be rescheduled? Please confirm by typing the name back, e.g. "Yes, R112ProofX".',
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack name mismatch: English reply that does NOT ask for confirmation still fires (gap 2, true-positive shape)", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Fatima" } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Your appointment has been moved to Friday 14:00.",
  });
  assertEquals(alert?.failure_class, "thread_hijack_name_mismatch");
  assertEquals(alert?.stated_name, "Peter");
  assertEquals(alert?.actual_name, "Fatima");
});

// --- Class 2, Check A, R11 gap B fix: tightened EN keyword set -------------------------------
// R9's CONFIRMATION_KEYWORDS_RE_EN included generic conversational fragments ("should i", "is
// this", "does this") that could match an unrelated trailing question the model stacks onto a
// reply (index.ts's own ITEM 4 comment documents this model's real tendency to bundle 2+
// questions). Genuine confirmation phrasing must still suppress; a stacked unrelated question
// using one of the removed generic fragments must no longer false-suppress a real hijack.

Deno.test("thread hijack name mismatch: still no alert on a genuine tightened English confirmation phrase (gap B, true-negative preserved)", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "R112ProofX" } },
    ],
    knownSelfName: "Someone Else",
    finalReplyText:
      'Is this correct, that this is really the appointment for R112ProofX? Please type the name back to confirm, e.g. "Yes, R112ProofX".',
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack name mismatch: fires despite a stacked unrelated generic question that the OLD English keyword set would have false-suppressed (gap B fix)", () => {
  const alert = detectThreadHijackNameMismatch({
    toolCalls: [
      { name: "reschedule_appointment", result: { error: "naam_verificatie_nodig", current_name: "Fatima" } },
    ],
    knownSelfName: "Peter",
    // No genuine confirmation-question phrasing at all - the agent silently proceeded and merely
    // stacked an unrelated generic question. Under the OLD regex ("is this"/"does this"/"should i")
    // this would have matched and wrongly suppressed a real hijack alert.
    finalReplyText: "Your appointment has been moved to Friday 14:00. Is this a good time for you? Should I also block Tuesday?",
  });
  assertEquals(alert?.failure_class, "thread_hijack_name_mismatch");
  assertEquals(alert?.stated_name, "Peter");
  assertEquals(alert?.actual_name, "Fatima");
});

// --- Class 2, Check C: read-only tool result disclosure (R9 gap 3 fix) -----

Deno.test("thread hijack read-only disclosure: fires when get_my_appointments discloses a name differing from the known identity", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Fatima" }] } },
    ],
    knownSelfName: "Peter",
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
  assertEquals(alert?.known_self_name, "Peter");
  assertEquals(alert?.disclosed_name, "Fatima");
});

Deno.test("thread hijack read-only disclosure: no alert when the disclosed name matches the known identity", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Peter" }] } },
    ],
    knownSelfName: "Peter",
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack read-only disclosure: no alert when no self identity is established yet (normal first-turn shape)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Fatima" }] } },
    ],
    knownSelfName: null,
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack read-only disclosure: no alert when get_my_appointments carries no customer_name (single-attendee, no cross-identity signal)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed" }] } },
    ],
    knownSelfName: "Peter",
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack read-only disclosure: no alert on other read-only tools (e.g. get_available_slots)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_available_slots", result: { slots: ["2026-07-21T13:00:00Z"] } },
    ],
    knownSelfName: "Peter",
  });
  assertEquals(alert, null);
});

// --- Class 2, Check C, R11 gap A fix: benign GEDEELD NUMMER disclosure vs actual hijack ---------
// tools.ts's own "GEDEELD NUMMER" rule (referenced 15+ times) makes a mismatched customer_name a
// NORMAL, everyday, correct disclosure - the agent is supposed to say "de afspraak van [naam]".
// Check C must suppress that case and only fire when the reply fails to attribute the name.

Deno.test("thread hijack read-only disclosure: no alert when the reply correctly attributes the disclosed name (gap A, benign GEDEELD NUMMER shape)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "R112ProofX" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText:
      "Onder dit nummer staat ook de afspraak van R112ProofX (Knippen, vrijdag 14:00). Wil je die inzien of gaat het om jouw eigen afspraak?",
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack read-only disclosure: still fires when the reply presents the disclosed booking as the customer's own (gap A, actual hijack shape)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Fatima" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Jouw afspraak staat gepland voor vrijdag 14:00, tot dan!",
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
  assertEquals(alert?.known_self_name, "Peter");
  assertEquals(alert?.disclosed_name, "Fatima");
});

Deno.test("thread hijack read-only disclosure: still fires when no reply text is available at all (matches Check A's own established convention)", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Fatima" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText: undefined,
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
});

// --- Class 2, Check C, R13 fix: replyProperlyAttributesDisclosedName word-boundary matching -----
// R13 found the previous raw `.includes()` substring check was unanchored in both directions - see
// _BA_MONITORING_ALERTS_STATE.md R13 finding. These three tests cover: (a) the false-negative shape
// (short disclosed name "An" accidentally substring-matching inside an unrelated word, silently
// swallowing a genuine hijack), (b) the false-positive shape (multi-part stored name "Anna de
// Vries" shortened to just "Anna" in a correctly-attributed reply, wrongly reopening R11's bug),
// (c) the original R11/R12 exact full-name match still passing (regression guard).

Deno.test("thread hijack read-only disclosure: R13 fix - short name 'An' does NOT falsely match inside an unrelated word, genuine hijack still fires", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "maandag 14:00", status: "confirmed", customer_name: "An" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Jouw afspraak staat gepland voor maandag 14:00, tot dan!",
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
  assertEquals(alert?.disclosed_name, "An");
});

Deno.test("thread hijack read-only disclosure: R13 fix - multi-part name 'Anna de Vries' correctly matches via the 'Anna' token, benign disclosure suppressed", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Anna de Vries" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText: "Onder dit nummer staat ook de afspraak van Anna (Knippen, vrijdag 14:00). Wil je die inzien of gaat het om jouw eigen afspraak?",
  });
  assertEquals(alert, null);
});

Deno.test("thread hijack read-only disclosure: R13 fix - exact full-name match (R11/R12 shape) still passes as benign", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "R112ProofX" }] } },
    ],
    knownSelfName: "Peter",
    finalReplyText:
      "Onder dit nummer staat ook de afspraak van R112ProofX (Knippen, vrijdag 14:00). Wil je die inzien of gaat het om jouw eigen afspraak?",
  });
  assertEquals(alert, null);
});

// --- Class 2, Check C, R15 fix: attribution-marker proximity, "Wil"/"wil" name/word collision -----
// R15 found R14's word-boundary match still has a real collision: a short Dutch first name can
// itself be an ordinary Dutch word. "Wil" is a real first name AND the modal verb "wil" ("wants").
// A genuinely unattributed hijack reply like "Wil je deze bevestigen?" has zero real attribution,
// yet the word "wil" appears as a standalone word - the old check would wrongly call that "properly
// attributed". These two tests cover both directions: the verb-collision hijack must still fire, and
// a genuine "Wil"-the-name disclosure, properly attributed via "van", must still be suppressed.

Deno.test("thread hijack read-only disclosure: R15 fix - 'Wil' the name colliding with 'wil' the modal verb, unattributed hijack still fires", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Wil" }] } },
    ],
    knownSelfName: "Peter",
    // Ordinary sentence, zero name-attribution - "wil" here is only the modal verb, not a reference
    // to the disclosed name "Wil". Old word-boundary-only check would have wrongly suppressed this.
    finalReplyText: "Wil je deze bevestigen?",
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
  assertEquals(alert?.disclosed_name, "Wil");
});

Deno.test("thread hijack read-only disclosure: R15 fix - 'Wil' the actual disclosed name, properly attributed via 'van', correctly suppressed", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Wil" }] } },
    ],
    knownSelfName: "Peter",
    // Real GEDEELD NUMMER disclosure shape, name preceded by "van" - genuine attribution.
    finalReplyText: "Onder dit nummer staat ook de afspraak van Wil (Knippen, vrijdag 14:00). Wil je die inzien of gaat het om jouw eigen afspraak?",
  });
  assertEquals(alert, null);
});

// --- Class 2, Check C, R17 fix: zero-slack immediate-adjacency attribution match -----------------
// R17 found R16's 3-token lookback let ANY marker occurrence within 3 tokens before the name count
// as attribution, without checking it actually governs the name. Real shape: "Zal ik dit voor je
// bevestigen, Sophie?" is a plain generic customer-service sentence, zero real attribution, but
// "voor" sits at distance 3 from "Sophie" and wrongly suppressed a genuine hijack. These two tests
// cover both directions: the filler-word false-positive must now correctly fire, and a genuine
// immediate-adjacency attribution ("voor Sophie" with no filler between marker and name) must
// still correctly suppress.

Deno.test("thread hijack read-only disclosure: R17 fix - marker separated from the name by filler words no longer counts as attribution, hijack fires", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Sophie" }] } },
    ],
    knownSelfName: "Peter",
    // "voor" is 3 tokens back from "Sophie" ("voor je bevestigen, Sophie") - a generic sentence,
    // not real attribution. R16's lookback wrongly suppressed this; R17 must fire.
    finalReplyText: "Zal ik dit voor je bevestigen, Sophie?",
  });
  assertEquals(alert?.failure_class, "thread_hijack_readonly_disclosure");
  assertEquals(alert?.disclosed_name, "Sophie");
});

Deno.test("thread hijack read-only disclosure: R17 fix - marker immediately adjacent to the name (zero slack) still correctly suppresses", () => {
  const alert = detectThreadHijackReadOnlyDisclosure({
    toolCalls: [
      { name: "get_my_appointments", result: { appointments: [{ service: "Knippen", when: "vrijdag 14:00", status: "confirmed", customer_name: "Sophie" }] } },
    ],
    knownSelfName: "Peter",
    // "voor Sophie" - marker directly precedes the name, genuine attribution, no filler between.
    finalReplyText: "Deze afspraak is voor Sophie, klopt dat?",
  });
  assertEquals(alert, null);
});

// Stubbed Supabase client, no live project touched. Mirrors the design's Path B "hand-constructed
// synthetic inputs" discipline for Check B.
function stubSupabase(row: { customer_phone: string | null } | null): SupabaseClient {
  return {
    from(_table: string) {
      return {
        select(_cols: string) {
          return {
            eq(_col: string, _val: unknown) {
              return {
                maybeSingle() {
                  return Promise.resolve({ data: row, error: null });
                },
              };
            },
          };
        },
        insert(_row: Record<string, unknown>) {
          return Promise.resolve({ error: null });
        },
      };
    },
  } as unknown as SupabaseClient;
}

Deno.test("thread hijack wrong owner: fires when the referenced booking belongs to a different phone", async () => {
  const supabase = stubSupabase({ customer_phone: "31600000001" });
  const alert = await detectThreadHijackWrongOwner(
    supabase,
    [{ name: "cancel_appointment", result: { ok: true, booking_id: "b9" } }],
    "31600000002",
  );
  assertEquals(alert?.failure_class, "thread_hijack_wrong_owner");
  assertEquals(alert?.referenced_booking_id, "b9");
  assertEquals(alert?.booking_owner_phone, "31600000001");
  assertEquals(alert?.current_phone, "31600000002");
});

Deno.test("thread hijack wrong owner: no alert when the phone matches", async () => {
  const supabase = stubSupabase({ customer_phone: "31600000002" });
  const alert = await detectThreadHijackWrongOwner(
    supabase,
    [{ name: "cancel_appointment", result: { ok: true, booking_id: "b9" } }],
    "31600000002",
  );
  assertEquals(alert, null);
});

Deno.test("thread hijack wrong owner: no alert when no mutation committed this turn", async () => {
  const supabase = stubSupabase({ customer_phone: "31600000001" });
  const alert = await detectThreadHijackWrongOwner(
    supabase,
    [{ name: "get_my_appointments", result: { appointments: [] } }],
    "31600000002",
  );
  assertEquals(alert, null);
});
