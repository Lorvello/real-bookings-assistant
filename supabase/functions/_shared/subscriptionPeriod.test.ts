// Tests for getCurrentPeriodEndISO / resolvePeriodEndEpoch.
// Run: deno test supabase/functions/_shared/subscriptionPeriod.test.ts
import { assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { getCurrentPeriodEndISO, resolvePeriodEndEpoch } from "./subscriptionPeriod.ts";

const EPOCH = 1785280317; // 2026-07-28T23:11:57Z
const ISO = "2026-07-28T23:11:57.000Z";

Deno.test("old top-level shape (API < 2025-03-31) resolves", () => {
  const sub = { current_period_end: EPOCH, items: { data: [{}] } };
  assertEquals(getCurrentPeriodEndISO(sub), ISO);
});

Deno.test("new item-level shape (API >= 2025-03-31) resolves, the real failing case", () => {
  const sub = { current_period_end: undefined, items: { data: [{ current_period_end: EPOCH }] } };
  assertEquals(getCurrentPeriodEndISO(sub), ISO);
});

Deno.test("unresolvable shape returns null instead of throwing (was RangeError -> 500)", () => {
  const sub = { current_period_end: undefined, items: { data: [{}] } };
  assertEquals(getCurrentPeriodEndISO(sub), null);
});

Deno.test("null / empty subscription returns null", () => {
  assertEquals(getCurrentPeriodEndISO(null), null);
  assertEquals(getCurrentPeriodEndISO({}), null);
  assertEquals(getCurrentPeriodEndISO({ items: { data: [] } }), null);
});

Deno.test("multi-item subscription reports the latest period end", () => {
  const sub = { items: { data: [{ current_period_end: 100 }, { current_period_end: 999 }] } };
  assertEquals(resolvePeriodEndEpoch(sub), 999);
});

Deno.test("NaN / non-finite epoch is rejected (no Invalid Date)", () => {
  assertEquals(getCurrentPeriodEndISO({ current_period_end: NaN, items: { data: [{}] } }), null);
  assertEquals(getCurrentPeriodEndISO({ current_period_end: Infinity, items: { data: [{}] } }), null);
});
