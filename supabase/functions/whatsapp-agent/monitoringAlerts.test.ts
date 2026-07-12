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
