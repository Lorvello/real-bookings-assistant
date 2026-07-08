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
  // True whenever the phone's history spans 2+ distinct owners with no code to disambiguate,
  // regardless of whether owner-self-test still resolves an owner afterward: this mirrors the
  // original inline flow, where the ambiguity log fires independently of whatever resolves next.
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

  if (input.ownerTestPhoneMatch?.ownerId) {
    return {
      ownerId: input.ownerTestPhoneMatch.ownerId,
      calendarId: input.ownerTestPhoneMatch.defaultCalendarId,
      matchedVia: 'owner_self_test',
      ambiguousMultiTenant: ambiguous,
      ...(ambiguous ? { distinctOwnerCount } : {}),
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
