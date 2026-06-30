// DEV-ONLY no-auth visual harness for the BookingDetailModal owner-actions surface
// (E-3, launch-ready-loop §7). Mounts the REAL BookingDetailModal with mock bookings
// so the new owner CANCEL + MARK-NO-SHOW actions + the destructive-cancel AlertDialog
// render without auth or Supabase. The mutation itself is proven server-side (Layer A
// via the real PostgREST RPC); here we only verify the surface renders + is operable.
// Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { BookingDetailModal } from '@/components/calendar/BookingDetailModal';

const iso = (hoursFromNow: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  return d.toISOString();
};

// Past confirmed booking: both actions available (no-show + cancel).
const pastConfirmed: any = {
  id: 'b-past', start_time: iso(-2), end_time: iso(-1), status: 'confirmed',
  customer_name: 'Emma van der Berg', customer_email: 'emma@example.com',
  customer_phone: '+31 6 18 84 22 19', service_name: 'Cut & Style',
  notes: 'Prefers a quiet corner.', total_price: 55,
  service_types: { name: 'Cut & Style', color: '#6366f1', duration: 60 },
};
// Future confirmed: only cancel (no-show hidden, mirrors server guard).
const futureConfirmed: any = {
  ...pastConfirmed, id: 'b-future', start_time: iso(48), end_time: iso(49),
  customer_name: 'Lars Janssen', customer_email: 'lars@example.com',
};
// Terminal (no-show): no actions at all.
const terminal: any = {
  ...pastConfirmed, id: 'b-terminal', status: 'no-show',
  customer_name: 'Noor Bakker', customer_email: 'noor@example.com',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-10 px-1 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">{children}</span>
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <pre style={{ color: '#f88', background: '#1a1a1a', padding: 16, whiteSpace: 'pre-wrap', fontSize: 12 }}>
          {String(this.state.error.stack || this.state.error.message)}
        </pre>
      );
    }
    return this.props.children;
  }
}

function ModalOpener({ label, booking }: { label: string; booking: any }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="mb-3">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{label}</Button>
      <BookingDetailModal open={open} onClose={() => setOpen(false)} booking={booking} onActed={() => {}} />
    </div>
  );
}

function Harness() {
  const qc = React.useMemo(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } }), []);
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
            <div className="mx-auto max-w-5xl px-3 py-6">
              <SectionLabel>Past confirmed: both owner actions (no-show + cancel)</SectionLabel>
              <ErrorBoundary><ModalOpener label="Open: past confirmed" booking={pastConfirmed} /></ErrorBoundary>

              <SectionLabel>Future confirmed: cancel only (no-show hidden)</SectionLabel>
              <ErrorBoundary><ModalOpener label="Open: future confirmed" booking={futureConfirmed} /></ErrorBoundary>

              <SectionLabel>Terminal (no-show): read-only, no actions</SectionLabel>
              <ErrorBoundary><ModalOpener label="Open: terminal no-show" booking={terminal} /></ErrorBoundary>
            </div>
          </div>
          <Toaster />
        </QueryClientProvider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
