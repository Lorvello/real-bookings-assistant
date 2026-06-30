// DEV-ONLY no-auth harness proving FQ-A-PAY: the REAL usePaymentSettings hook driving
// the REAL PaymentFlexibilitySection toggles, with the supabase upsert FORCED to fail at
// the network layer. Flipping "Force save failure" on and toggling a switch shows the
// optimistic paint REVERT to the true value + a destructive (announced) error toast,
// instead of the pre-fix stuck-wrong state. With the switch off, saves succeed and stick.
//
// We intercept window.fetch: PostgREST upsert (POST .../payment_settings) returns 403 when
// forcing failure; the initial GET (select) always returns the seeded "truth" row. This
// exercises the real hook end to end (real supabase-js client, real revert logic).
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import '@/i18n';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { Switch } from '@/components/ui/switch';
import { PaymentFlexibilitySection } from '@/components/settings/payments/PaymentFlexibilitySection';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const CAL = 'cal-revert-demo';

// Seeded server-confirmed "truth": secure payments ON, payment required ON.
const TRUTH = {
  id: 'ps-demo',
  calendar_id: CAL,
  secure_payments_enabled: true,
  payment_required_for_booking: true,
  payment_optional: false,
  enabled_payment_methods: ['ideal'],
  allowed_payment_timing: ['pay_now'],
  payout_option: 'standard',
  auto_cancel_unpaid_bookings: false,
  refund_policy_text: '',
  payment_deadline_hours: 24,
};

// Mutable server-state row so successful concurrent writes compose (mirrors real PostgREST
// returning the full updated row, not a static merge of one payload).
const SERVER_STATE: Record<string, unknown> = { ...TRUTH };

// Global flag the toggle UI flips; the fetch interceptor reads it.
(window as any).__FORCE_SAVE_FAIL__ = true;

const realFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  const method = (init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
  if (url.includes('/rest/v1/payment_settings')) {
    // Initial fetch (select) -> always return the truth row.
    if (method === 'GET') {
      return new Response(JSON.stringify({ ...SERVER_STATE }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    // Save (upsert = POST). Honor the force-fail flag.
    if ((window as any).__FORCE_SAVE_FAIL__) {
      return new Response(
        JSON.stringify({ code: '42501', message: 'permission denied for table payment_settings' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // Success: persist into the server-state row (so concurrent writes compose, like real
    // PostgREST which returns the full updated row) and echo it back.
    let body: any = {};
    try { body = init?.body ? JSON.parse(init.body as string) : {}; } catch { /* noop */ }
    Object.assign(SERVER_STATE, Array.isArray(body) ? body[0] : body);
    return new Response(JSON.stringify({ ...SERVER_STATE }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(input as any, init);
};

function Demo() {
  const [forceFail, setForceFail] = useState(true);
  useEffect(() => { (window as any).__FORCE_SAVE_FAIL__ = forceFail; }, [forceFail]);

  const s = usePaymentSettings(CAL);
  const paymentRequired = s.settings?.payment_required_for_booking ?? true;

  return (
    <div className="min-w-0 flex-1 space-y-6 pb-24">
      <div className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning/[0.08] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground" data-testid="truth-line">
            DB truth: secure_payments={String(s.settings?.secure_payments_enabled)} ·
            payment_required={String(s.settings?.payment_required_for_booking)} ·
            payment_optional={String(s.settings?.payment_optional)} ·
            timing={(s.settings?.allowed_payment_timing || []).join('+')}
          </p>
          <p className="text-xs text-muted-foreground">saving={String(s.saving)} (toggles disable while saving)</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          Force save failure
          <Switch checked={forceFail} onCheckedChange={setForceFail} aria-label="Force save failure" data-testid="force-fail" />
        </label>
      </div>

      <PaymentFlexibilitySection
        refundPolicy={s.settings?.refund_policy_text || ''}
        onRefundPolicyChange={() => {}}
        onSaveRefundPolicy={() => {}}
        onSelectRefundPreset={() => {}}
        savingRefundPolicy={s.saving}
        paymentRequired={paymentRequired}
        onToggleOptional={(optional) =>
          // Mirror PaymentSettingsTab.handleTogglePaymentOptional cascade so the master
          // switch (checked = !paymentRequired) reflects state. Both writes are optimistic
          // with central revert-on-failure, so a failed save rolls BOTH back.
          optional
            ? Promise.all([s.togglePaymentRequired(false), s.togglePaymentOptional(true)])
            : Promise.all([s.togglePaymentRequired(true), s.togglePaymentOptional(false)])
        }
        deadlineHours={String(s.settings?.payment_deadline_hours ?? 24)}
        onDeadlineChange={() => {}}
        onDeadlineBlur={() => {}}
        autoCancel={!!s.settings?.auto_cancel_unpaid_bookings}
        onToggleAutoCancel={() => {}}
        payOnSiteEnabled={s.settings?.allowed_payment_timing?.includes('pay_on_site') ?? false}
        onTogglePayOnSite={(enabled) => {
          const cur = s.settings?.allowed_payment_timing || ['pay_now'];
          const next = enabled ? [...cur.filter((x) => x !== 'pay_on_site'), 'pay_on_site'] : cur.filter((x) => x !== 'pay_on_site');
          s.updateAllowedPaymentTiming(next.length ? next : ['pay_now']);
        }}
        installmentsEnabled={false}
        onToggleInstallments={() => {}}
        canUseInstallments
        installmentConfigOpen={false}
        onToggleInstallmentConfig={() => {}}
        saving={s.saving}
        installmentSlot={null}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={150}>
        <div className="dark main-scrollbar h-screen overflow-y-auto bg-background p-3 md:p-8">
          <div className="mx-auto max-w-3xl">
            <SimplePageHeader title="FQ-A-PAY revert proof" />
            <div className="mt-6"><Demo /></div>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  </MemoryRouter>,
);
