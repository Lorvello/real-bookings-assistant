// Deterministic unit tests for the P0-1 slot-offer guard. The live agent runs on a temp-0.2
// 20B model that won't reliably hallucinate a phantom time on demand, so the guard's REBUILD
// path can only be proven by exercising the logic directly. These tests also pin the
// false-positive safety (opening-hours ranges, recall/info turns, customer-echoed times must
// NEVER be rewritten). Run: deno test slotOfferGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  buildDeterministicOffer,
  collectTurnSlots,
  enforceSlotOffer,
  extractOfferedClockTimes,
  noFreeSlotsReply,
  noQueryGroundedReply,
  stripHourRanges,
  type ToolCall,
} from "./slotOfferGuard.ts";

// get_available_slots tool result (object-array shape), the shape the live RPC returns.
const slots = (date: string, times: string[]): ToolCall => ({
  name: "get_available_slots",
  result: { date, available_slots: times.map((t) => ({ tijd: t, start: `${date}T${t}:00+02:00` })) },
});

// ── enforceSlotOffer: the guarantee ──────────────────────────────────────────

Deno.test("phantom offer is rebuilt from the real slots (NL)", () => {
  const out = enforceSlotOffer(
    "Schikt 11:00 of 14:00?", // both fabricated
    [slots("2026-06-29", ["09:00", "10:30"])],
    "maandag graag",
    null, // Dutch customer
  );
  assert(out.includes("09:00"), `expected real 09:00 in: ${out}`);
  assert(out.includes("10:30"), `expected real 10:30 in: ${out}`);
  assert(!out.includes("11:00"), `phantom 11:00 must be gone: ${out}`);
  assert(!out.includes("14:00"), `phantom 14:00 must be gone: ${out}`);
  assert(out.startsWith("Deze tijden zijn nog vrij"), `NL rebuild: ${out}`);
});

Deno.test("a fully real offer passes through untouched", () => {
  const reply = "Schikt 09:00 of 10:30?";
  const out = enforceSlotOffer(reply, [slots("2026-06-29", ["09:00", "10:30"])], "maandag", null);
  assertEquals(out, reply);
});

// R22 (task_745b7fa0): the result's `laatste_slot` (true last slot of the day, omitted from the
// 12-cap available_slots list on a full day) is REAL ground truth from the same RPC. A truthful
// "latest slot" answer citing it must never be rewritten as phantom.
Deno.test("laatste_slot time counts as real and is not rewritten", () => {
  const tc: ToolCall = {
    name: "get_available_slots",
    result: {
      date: "2026-07-03",
      available_slots: [{ tijd: "09:00", start: "2026-07-03T09:00:00+02:00" }],
      count: 15,
      laatste_slot: { tijd: "16:30", start: "2026-07-03T16:30:00+02:00" },
    },
  };
  const reply = "Het laatste slot dat voor sluitingstijd klaar is, is 16:30. Zal ik die boeken?";
  assertEquals(enforceSlotOffer(reply, [tc], "de laatste knipbeurt graag", null), reply);
  // and a genuinely phantom time is still rebuilt, with 16:30 in the allowlist/rebuild set
  const out = enforceSlotOffer("Schikt 13:00?", [tc], "de laatste knipbeurt graag", null);
  assert(!out.includes("13:00"), `phantom 13:00 must be gone: ${out}`);
  assert(out.includes("16:30"), `real laatste_slot 16:30 should appear in rebuild: ${out}`);
});

Deno.test("mixed offer (one real, one phantom) is rebuilt", () => {
  const out = enforceSlotOffer("09:00 of 13:00?", [slots("2026-06-29", ["09:00", "10:30"])], "maandag", null);
  assert(out.includes("09:00") && out.includes("10:30"), out);
  assert(!out.includes("13:00"), `phantom 13:00 must be gone: ${out}`);
});

Deno.test("no slots query this turn -> reply untouched (recall/info false-positive guard)", () => {
  const reply = "Je laatste afspraak was om 14:00 op dinsdag.";
  const out = enforceSlotOffer(reply, [{ name: "get_my_appointments", result: { ok: true } }], "wanneer was mijn afspraak?", null);
  assertEquals(out, reply);
});

Deno.test("queried a day with zero free slots but offered a time -> honest no-slots reply", () => {
  const out = enforceSlotOffer(
    "Schikt 09:00?",
    [{ name: "get_available_slots", result: { date: "2026-06-29", available_slots: [] } }],
    "maandag",
    null,
  );
  assertEquals(out, noFreeSlotsReply(false));
});

Deno.test("English customer -> English rebuild", () => {
  const out = enforceSlotOffer("Does 11:00 work?", [slots("2026-06-29", ["09:00", "10:30"])], "monday please", "het Engels");
  assert(out.startsWith("These times are still free"), out);
  assert(out.includes("09:00") && out.includes("10:30"), out);
  assert(!out.includes("11:00"), out);
});

Deno.test("customer-echoed time is excluded, so a real counter-offer passes through", () => {
  // Customer asked 08:00 (not free); agent says 08:00 unavailable but offers the real 09:00.
  const reply = "08:00 is helaas niet vrij, maar 09:00 kan wel.";
  const out = enforceSlotOffer(reply, [slots("2026-06-29", ["09:00"])], "kan ik om 08:00 maandag?", null);
  assertEquals(out, reply); // 08:00 excluded as echo; 09:00 is real -> no rewrite
});

Deno.test("hours-range reply with a slots query is NOT mistaken for an offer", () => {
  // Even if a query ran, a pure opening-hours sentence carries no discrete offer -> untouched.
  const reply = "We zijn maandag open van 09:00 tot 17:00.";
  const out = enforceSlotOffer(reply, [slots("2026-06-29", ["09:00", "10:30"])], "hoe laat open maandag?", null);
  assertEquals(out, reply);
});

Deno.test("multi-date rebuild labels each day with its real slots", () => {
  const out = enforceSlotOffer(
    "Schikt 20:00 of 21:00?", // phantom
    [slots("2026-06-29", ["09:00", "10:30"]), slots("2026-06-30", ["14:00"])],
    "deze week",
    null,
  );
  assert(out.includes("09:00") && out.includes("10:30") && out.includes("14:00"), out);
  assert(!out.includes("20:00") && !out.includes("21:00"), out);
});

// ── extractOfferedClockTimes: false-positive safety on ranges/echoes ──────────

Deno.test("opening-hours ranges are never extracted as offers", () => {
  assertEquals(extractOfferedClockTimes("Open van 09:00 tot 17:00.", ""), []);
  assertEquals(extractOfferedClockTimes("Open 09:00-17:00.", ""), []);
  assertEquals(extractOfferedClockTimes("Open 09:00–17:00.", ""), []); // en-dash
  assertEquals(extractOfferedClockTimes("tussen 9:00 en 12:00", ""), []);
});

Deno.test("a discrete offer list IS extracted, dot-format normalised", () => {
  assertEquals(extractOfferedClockTimes("09:00 of 10:30 of 14:00?", ""), ["09:00", "10:30", "14:00"]);
  assertEquals(extractOfferedClockTimes("schikt 9.30?", ""), ["09:30"]);
});

Deno.test("impossible clock values are rejected", () => {
  assertEquals(extractOfferedClockTimes("code 25:99 and 10:75", ""), []);
});

Deno.test("a time the customer named is excluded from the offered set", () => {
  assertEquals(extractOfferedClockTimes("10:00 is niet vrij", "kan ik om 10:00?"), []);
});

// ── stripHourRanges / collectTurnSlots: unit-level ───────────────────────────

Deno.test("stripHourRanges keeps a list but removes a range", () => {
  assert(!stripHourRanges("09:00-17:00").includes("09:00"));
  assert(stripHourRanges("09:00 of 10:30").includes("09:00"));
});

Deno.test("collectTurnSlots reads both result shapes + flags hadQuery", () => {
  const a = collectTurnSlots([slots("2026-06-29", ["09:00", "10:30"])]);
  assertEquals([...a.times].sort(), ["09:00", "10:30"]);
  assert(a.hadQuery);
  assertEquals(a.byDate.get("2026-06-29"), ["09:00", "10:30"]);

  // string-array shape (book/reschedule niet_beschikbaar)
  const b = collectTurnSlots([{ name: "book_appointment", result: { available_slots: ["11:00", "11:30"] } }]);
  assertEquals([...b.times].sort(), ["11:00", "11:30"]);
  assert(b.hadQuery);

  // no slots-bearing tool -> no ground truth
  const c = collectTurnSlots([{ name: "get_my_appointments", result: { ok: true } }]);
  assertEquals(c.hadQuery, false);
});

Deno.test("buildDeterministicOffer caps at 6 times and asks one question", () => {
  const out = buildDeterministicOffer(new Map(), ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"], false);
  assert(out.includes("09:00") && out.includes("11:30"), out);
  assert(!out.includes("12:00"), `should cap at 6: ${out}`);
  assertEquals((out.match(/\?/g) || []).length, 1);
});

// R37 (bug R36a, MILAN-SLOT-FABRICATION fix, final safety net text): pure text builder used by
// index.ts when the upstream slotOfferUnbacked nudge/retry cycle STILL has zero grounding tool
// call, so a fabricated offer is never allowed to ship even when the retry itself keeps skipping
// the required get_available_slots call (see index.ts's post-retry stillUnbacked check).
Deno.test("noQueryGroundedReply: NL asks for service+day, never invents a time", () => {
  const out = noQueryGroundedReply(false);
  assert(out.includes("dienst") && out.includes("dag"));
  assert(!/\b\d{1,2}[:.]\d{2}\b/.test(out), `must not contain a clock time: ${out}`);
});

Deno.test("noQueryGroundedReply: EN variant, never invents a time", () => {
  const out = noQueryGroundedReply(true);
  assert(out.includes("service") && out.includes("day"));
  assert(!/\b\d{1,2}[:.]\d{2}\b/.test(out), `must not contain a clock time: ${out}`);
});
