// DEV-ONLY no-auth harness for BATCH A error/skeleton states (Full Product QA loop).
// Renders the REAL error-branch / skeleton markup of the surfaces this batch touched so
// each graceful state can be eyeballed against the premium bar, without auth or a live DB:
//   1. Conversations fetch-error card (FQ-A-CONV)
//   2. Availability fetch-error card (FQ-A-STATES)
//   3. Analytics-tab error card, premium variant (FQ-A-STATES)
//   4. Pay & Book role-loading skeleton (FQ-A-AUTH)
// The payment named-toast (FQ-A-PAY-copy) + revert (FQ-A-PAY / N1) are proven by the
// existing payment-revert harness driving the REAL usePaymentSettings hook.
// Not part of the production build (preview/ is excluded from the app entry).
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import '@/i18n';
import { AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// 1. Conversations error card (copy + structure identical to Conversations.tsx hasFetchError branch).
function ConversationsError() {
  return (
    <div className="bg-background p-8">
      <Card role="alert">
        <CardHeader className="text-center py-12">
          <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
          </div>
          <CardTitle className="text-foreground">Couldn't load your conversations</CardTitle>
          <CardDescription className="text-muted-foreground mx-auto max-w-sm">
            Something went wrong while loading your WhatsApp data. Please try again.
          </CardDescription>
          <div className="mt-6">
            <Button variant="secondary" className="gap-2">Try again</Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

// 2. Availability error card (matches AvailabilityContent loadError branch).
function AvailabilityError() {
  return (
    <div className="bg-background p-8">
      <div className="surface-raised rounded-xl p-4">
        <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 py-16 text-center" role="alert">
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Couldn't load your availability</p>
          <p className="max-w-xs text-xs text-subtle-foreground">Something went wrong while loading your schedule. Please try again.</p>
          <Button variant="secondary" size="sm" className="mt-1 gap-1.5">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// 3. Analytics-tab error card (premium variant applied to BI/Performance/FutureInsights).
function AnalyticsError() {
  return (
    <div className="bg-background p-8">
      <div className="space-y-8" role="alert">
        <div className="surface-raised rounded-2xl border border-white/[0.08] p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-2xl flex items-center justify-center border border-destructive/20">
            <BarChart3 aria-hidden="true" className="h-8 w-8 text-destructive-foreground" />
          </div>
          <p className="text-foreground font-medium mb-1">Error loading business intelligence data</p>
          <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
        </div>
      </div>
    </div>
  );
}

// 4. Pay & Book role-loading skeleton (matches PaymentSettingsTab settingsLoading || roleLoading).
function PaymentSkeleton() {
  return (
    <div className="bg-background p-8">
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Loading payment settings</span>
        <div className="surface-raised rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="shimmer h-5 w-40 rounded bg-white/[0.06]" />
              <div className="shimmer h-4 w-64 rounded bg-white/[0.05]" />
            </div>
            <div className="shimmer h-6 w-11 rounded-full bg-white/[0.06]" />
          </div>
        </div>
        <div className="surface-raised rounded-xl p-6 space-y-3">
          <div className="shimmer h-4 w-28 rounded bg-white/[0.06]" />
          <div className="shimmer h-9 w-48 rounded-md bg-white/[0.05]" />
        </div>
        <div className="surface-raised rounded-xl p-6 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="shimmer h-4 w-44 rounded bg-white/[0.06]" />
                <div className="shimmer h-3 w-56 rounded bg-white/[0.04]" />
              </div>
              <div className="shimmer h-6 w-11 rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-10">
      <section><h2 className="mb-2 text-lg font-semibold">1. Conversations fetch-error (FQ-A-CONV)</h2><ConversationsError /></section>
      <section><h2 className="mb-2 text-lg font-semibold">2. Availability fetch-error (FQ-A-STATES)</h2><AvailabilityError /></section>
      <section><h2 className="mb-2 text-lg font-semibold">3. Analytics-tab error, premium (FQ-A-STATES)</h2><AnalyticsError /></section>
      <section><h2 className="mb-2 text-lg font-semibold">4. Pay &amp; Book role-loading skeleton (FQ-A-AUTH)</h2><PaymentSkeleton /></section>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
