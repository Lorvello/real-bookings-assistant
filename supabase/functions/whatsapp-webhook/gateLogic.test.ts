// Unit tests for the three WhatsApp inbound-message gates (WHATSAPP_E2E_TEST_INFRA Item 2).
// index.ts imports these exact functions (see gateLogic.ts header), so these tests exercise the
// real gate code, not a reimplementation of it. Run: deno test gateLogic.test.ts
import { assertEquals } from "jsr:@std/assert";
import {
  resolveSenderGate,
  checkEntitlementGate,
  checkBotToggleGate,
  countDistinctHistoryOwners,
  ENTITLED_STATUSES,
  type OwnerHistoryRow,
} from "./gateLogic.ts";

// ── countDistinctHistoryOwners (the single source of truth index.ts's fetch-gating shares with
// resolveSenderGate's own decision, closing the duplicated-Set-computation review finding) ───────

Deno.test("countDistinctHistoryOwners: 0 for empty history", () => {
  assertEquals(countDistinctHistoryOwners([]), 0);
});

Deno.test("countDistinctHistoryOwners: 1 for single-tenant history, regardless of row count", () => {
  assertEquals(
    countDistinctHistoryOwners([
      { ownerId: "owner-a", calendarId: "cal-1" },
      { ownerId: "owner-a", calendarId: "cal-2" },
    ]),
    1,
  );
});

Deno.test("countDistinctHistoryOwners: counts every distinct owner across multi-tenant history", () => {
  assertEquals(
    countDistinctHistoryOwners([
      { ownerId: "owner-a", calendarId: "cal-1" },
      { ownerId: "owner-b", calendarId: "cal-2" },
      { ownerId: "owner-a", calendarId: "cal-3" },
    ]),
    2,
  );
});

// ── Gate 1: resolveSenderGate (phone-to-owner resolution) ──────────────────────────────────────

Deno.test("tracking code match wins outright, even with conflicting history present", () => {
  const historyRows: OwnerHistoryRow[] = [{ ownerId: "owner-history", calendarId: "cal-history" }];
  const result = resolveSenderGate({
    trackingCodeMatch: { ownerId: "owner-code", calendarId: "cal-code" },
    historyRows,
    ownerTestPhoneMatch: { ownerId: "owner-test", defaultCalendarId: "cal-test" },
  });
  assertEquals(result, {
    ownerId: "owner-code",
    calendarId: "cal-code",
    matchedVia: "tracking_code",
    ambiguousMultiTenant: false,
  });
});

Deno.test("single-tenant history resolves to that owner via the most recent row", () => {
  const historyRows: OwnerHistoryRow[] = [
    { ownerId: "owner-a", calendarId: "cal-newest" },
    { ownerId: "owner-a", calendarId: "cal-older" },
  ];
  const result = resolveSenderGate({ trackingCodeMatch: null, historyRows, ownerTestPhoneMatch: null });
  assertEquals(result, {
    ownerId: "owner-a",
    calendarId: "cal-newest",
    matchedVia: "single_tenant_history",
    ambiguousMultiTenant: false,
  });
});

Deno.test("multi-tenant ambiguous history fails closed (no owner-test-phone match): matchedVia none, flagged ambiguous", () => {
  const historyRows: OwnerHistoryRow[] = [
    { ownerId: "owner-a", calendarId: "cal-a" },
    { ownerId: "owner-b", calendarId: "cal-b" },
  ];
  const result = resolveSenderGate({ trackingCodeMatch: null, historyRows, ownerTestPhoneMatch: null });
  assertEquals(result.ownerId, null);
  assertEquals(result.calendarId, null);
  assertEquals(result.matchedVia, "none");
  assertEquals(result.ambiguousMultiTenant, true);
  assertEquals(result.distinctOwnerCount, 2);
});

Deno.test("R5 sev-1 fix: multi-tenant ambiguous history NEVER resolves via owner-self-test, even when it matches (was: silently hijacked to the owner-test-phone owner's default calendar)", () => {
  const historyRows: OwnerHistoryRow[] = [
    { ownerId: "owner-a", calendarId: "cal-a" },
    { ownerId: "owner-b", calendarId: "cal-b" },
  ];
  const result = resolveSenderGate({
    trackingCodeMatch: null,
    historyRows,
    ownerTestPhoneMatch: { ownerId: "owner-self-test", defaultCalendarId: "cal-default" },
  });
  // Must fail closed (matches the no-owner-test-phone-match case above), NOT hijack to
  // "owner-self-test"/"cal-default": a phone whose history spans 2+ distinct owners is genuinely
  // ambiguous from the message alone, and owner_test_phone has no DB unique constraint, so any two
  // owners whose phones collide there could otherwise steal each other's in-progress conversation.
  assertEquals(result.ownerId, null);
  assertEquals(result.calendarId, null);
  assertEquals(result.matchedVia, "none");
  // The ambiguity signal still survives independently so the caller still logs
  // whatsapp_ambiguous_tenant_inbound.
  assertEquals(result.ambiguousMultiTenant, true);
  assertEquals(result.distinctOwnerCount, 2);
});

Deno.test("owner self-test resolves when there is no tracking code and no history at all", () => {
  const result = resolveSenderGate({
    trackingCodeMatch: null,
    historyRows: [],
    ownerTestPhoneMatch: { ownerId: "owner-self-test", defaultCalendarId: "cal-default" },
  });
  assertEquals(result, {
    ownerId: "owner-self-test",
    calendarId: "cal-default",
    matchedVia: "owner_self_test",
    ambiguousMultiTenant: false,
  });
});

Deno.test("codeless stranger: no code, no history, no owner-test-phone match, fails closed", () => {
  const result = resolveSenderGate({ trackingCodeMatch: null, historyRows: [], ownerTestPhoneMatch: null });
  assertEquals(result, {
    ownerId: null,
    calendarId: null,
    matchedVia: "none",
    ambiguousMultiTenant: false,
  });
});

Deno.test("codeless stranger: owner-test-phone matched but has no default calendar yet (defensive, still resolves owner)", () => {
  const result = resolveSenderGate({
    trackingCodeMatch: null,
    historyRows: [],
    ownerTestPhoneMatch: { ownerId: "owner-self-test", defaultCalendarId: null },
  });
  assertEquals(result.ownerId, "owner-self-test");
  assertEquals(result.calendarId, null);
  assertEquals(result.matchedVia, "owner_self_test");
});

// ── Gate 2: checkEntitlementGate (subscription/status gating) ──────────────────────────────────

Deno.test("entitlement PASS: every status in ENTITLED_STATUSES is allowed", () => {
  for (const status of ENTITLED_STATUSES) {
    assertEquals(checkEntitlementGate(status), true, `expected ${status} to be entitled`);
  }
});

Deno.test("entitlement FAIL: a lapsed/free/unknown status is blocked", () => {
  assertEquals(checkEntitlementGate("lapsed"), false);
  assertEquals(checkEntitlementGate("free"), false);
  assertEquals(checkEntitlementGate("expired_trial"), false);
});

Deno.test("entitlement FAIL: null/undefined status (RPC returned nothing) is blocked, never defaults open", () => {
  assertEquals(checkEntitlementGate(null), false);
  assertEquals(checkEntitlementGate(undefined), false);
});

// ── Gate 3: checkBotToggleGate (per-calendar WhatsApp bot on/off) ───────────────────────────────

Deno.test("bot-toggle FAIL: explicit false blocks forwarding", () => {
  assertEquals(checkBotToggleGate(false), false);
});

Deno.test("bot-toggle PASS: explicit true allows forwarding", () => {
  assertEquals(checkBotToggleGate(true), true);
});

Deno.test("bot-toggle PASS: missing/unset setting never blocks (decorative-toggle bug class this gate exists to prevent)", () => {
  assertEquals(checkBotToggleGate(null), true);
  assertEquals(checkBotToggleGate(undefined), true);
});
