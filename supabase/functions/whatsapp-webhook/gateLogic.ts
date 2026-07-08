// Pure decision logic for the three WhatsApp inbound-message gates (WHATSAPP_E2E_TEST_INFRA
// Item 2), extracted from index.ts's ACCESS-GATED AGENT INVOKE block so each gate's pass/fail
// behavior is unit-testable without a live Supabase instance. index.ts still performs every real
// DB round-trip (resolve_owner_calendar_by_code RPC, whatsapp_contacts/whatsapp_conversations
// lookups, get_user_status_type RPC, calendar_settings lookup); it only hands the already-fetched
// results in here for the decision itself. Behavior must stay byte-identical to the pre-extraction
// inline logic: this file changes WHERE the decision lives, not what it decides.

export type OwnerHistoryRow = { calendarId: string; ownerId: string };

export type ResolveSenderInput = {
  trackingCodeMatch: { ownerId: string; calendarId: string | null } | null;
  // This phone's non-deleted-calendar conversations, newest-first (empty if no contact/history row).
  historyRows: OwnerHistoryRow[];
  ownerTestPhoneMatch: { ownerId: string; defaultCalendarId: string | null } | null;
};

export type ResolveSenderResult = {
  ownerId: string | null;
  calendarId: string | null;
  matchedVia: 'tracking_code' | 'single_tenant_history' | 'owner_self_test' | 'none';
  // True whenever the phone's history spans 2+ distinct owners with no code to disambiguate.
  // R5 fix: owner-self-test is now NEVER allowed to resolve an owner when this is true (see
  // resolveSenderGate below), so `ambiguousMultiTenant: true` and a non-null `ownerId` can no
  // longer co-occur. The flag still surfaces independently so the caller can log
  // `whatsapp_ambiguous_tenant_inbound` regardless of the final matchedVia.
  ambiguousMultiTenant: boolean;
  distinctOwnerCount?: number;
};

// Single source of truth for "how many distinct owners does this phone's history touch", used
// both for the resolveSenderGate decision below and by index.ts's fetch-gating (whether the
// owner-test-phone DB lookup is worth doing). Kept as one exported function so the two call sites
// can never drift the way two independently-typed `new Set(...)` expressions could.
export function countDistinctHistoryOwners(historyRows: OwnerHistoryRow[]): number {
  return new Set(historyRows.map((r) => r.ownerId).filter(Boolean)).size;
}

export function resolveSenderGate(input: ResolveSenderInput): ResolveSenderResult {
  if (input.trackingCodeMatch?.ownerId) {
    return {
      ownerId: input.trackingCodeMatch.ownerId,
      calendarId: input.trackingCodeMatch.calendarId,
      matchedVia: 'tracking_code',
      ambiguousMultiTenant: false,
    };
  }

  const distinctOwnerCount = countDistinctHistoryOwners(input.historyRows);
  if (distinctOwnerCount === 1) {
    const top = input.historyRows[0];
    return { ownerId: top.ownerId, calendarId: top.calendarId, matchedVia: 'single_tenant_history', ambiguousMultiTenant: false };
  }
  const ambiguous = distinctOwnerCount > 1;

  // R5 fix (sev-1 cross-tenant hijack, WHATSAPP_E2E_TEST_INFRA / FULL_JOURNEY_AGENT_SIMULATION
  // R4 finding): this branch used to fire regardless of `ambiguous`, so a codeless follow-up whose
  // phone happens to ALSO be registered as a totally unrelated owner's `owner_test_phone` (that
  // column has no DB unique constraint) would silently attach to THAT owner's default calendar
  // mid-conversation with a DIFFERENT tenant, purely because the phone's history spans 2+ owners.
  // The surrounding index.ts comments already documented the INTENDED behavior ("resolveSenderGate
  // leaves ownerId/calendarId unset" when ambiguous), this gate just did not actually implement it.
  // Fix: never resolve via owner_test_phone when the history is genuinely ambiguous across owners;
  // fall through to the `none` result below instead, which index.ts's existing fail-closed
  // codeless-stranger path already handles by nudging the customer to (re)send their tracking code,
  // i.e. option (b) from the bug report (ask the customer to disambiguate) rather than (a) guessing
  // the most-recent thread, since a stale/wrong "most recent" owner is exactly the same class of
  // silent misroute this fix exists to remove. `ambiguousMultiTenant`/`distinctOwnerCount` are still
  // surfaced so the caller's `whatsapp_ambiguous_tenant_inbound` security-log event keeps firing.
  if (!ambiguous && input.ownerTestPhoneMatch?.ownerId) {
    return {
      ownerId: input.ownerTestPhoneMatch.ownerId,
      calendarId: input.ownerTestPhoneMatch.defaultCalendarId,
      matchedVia: 'owner_self_test',
      ambiguousMultiTenant: false,
    };
  }

  return {
    ownerId: null,
    calendarId: null,
    matchedVia: 'none',
    ambiguousMultiTenant: ambiguous,
    ...(ambiguous ? { distinctOwnerCount } : {}),
  };
}

export const ENTITLED_STATUSES = ['active_trial', 'paid_subscriber', 'canceled_but_active', 'missed_payment_grace'] as const;

export function checkEntitlementGate(status: string | null | undefined): boolean {
  return (ENTITLED_STATUSES as readonly string[]).includes(status ?? '');
}

// Only an explicit false blocks; missing/undefined/true never blocks (the decorative-toggle bug
// class this gate exists to prevent).
export function checkBotToggleGate(whatsappBotActive: boolean | null | undefined): boolean {
  return whatsappBotActive !== false;
}
