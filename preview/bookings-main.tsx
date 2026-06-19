// DEV-ONLY no-auth visual harness for the Bookings surface (launch-ready-loop
// §7, Ronde 22 — Bookings premium). The list children (BookingsFilters,
// BookingsList → VirtualizedBookingsList → BookingCard / BookingsEmptyState) are
// pure-props, so we mount them directly with mock data — no auth, no Supabase.
// Wrapped in MemoryRouter + QueryClientProvider + mock Auth/UserStatus contexts as
// a safety net for any nested hook (e.g. DateRangeFilter), with per-section
// ErrorBoundaries. Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { BookingsFilters } from '@/components/bookings/BookingsFilters';
import { BookingsList } from '@/components/bookings/BookingsList';

const iso = (hoursFromNow: number) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow, 0, 0, 0);
  return d.toISOString();
};

const bookings: any[] = [
  { id: 'b-1', start_time: iso(26), end_time: iso(27), status: 'confirmed', customer_name: 'Emma van der Berg', customer_email: 'emma@example.com', customer_phone: '+31 6 18 84 22 19', service_name: 'Cut & Style', notes: 'Prefers a quiet corner.', total_price: 55 },
  { id: 'b-2', start_time: iso(50), end_time: iso(51), status: 'pending', customer_name: 'Lars Janssen', customer_email: 'lars@example.com', customer_phone: '+31 6 24 55 90 03', service_name: 'Beard Trim', notes: null, total_price: 25 },
  { id: 'b-3', start_time: iso(-48), end_time: iso(-47), status: 'completed', customer_name: 'Sofia Martens', customer_email: 'sofia@example.com', customer_phone: null, service_name: 'Balayage', notes: null, total_price: 120 },
  { id: 'b-4', start_time: iso(-20), end_time: iso(-19), status: 'cancelled', customer_name: 'Daan de Vries', customer_email: 'daan@example.com', customer_phone: '+31 6 33 21 88 04', service_name: 'Manicure', notes: 'Cancelled, rebooked next week.', total_price: 35 },
  { id: 'b-5', start_time: iso(-2), end_time: iso(-1), status: 'no-show', customer_name: 'Noor Bakker', customer_email: 'noor@example.com', customer_phone: '+31 6 70 11 56 22', service_name: 'Color Refresh', notes: null, total_price: 80 },
];

const mockAuthValue: any = {
  user: { id: 'u-owner', email: 'owner@glowstudio.example' },
  session: { user: { id: 'u-owner' } },
  loading: false, isAuthenticated: true,
  signIn: async () => {}, signOut: async () => {}, signUp: async () => {},
};

const mockUserStatusValue: any = {
  userStatus: { userType: 'active_subscriber', isExpired: false, isSetupIncomplete: false, needsUpgrade: false, statusMessage: 'Active' },
  accessControl: { canAccessWhatsApp: true },
  isLoading: false, invalidateCache: async () => {},
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

function FiltersDemo() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateRange, setDateRange] = React.useState<any>({ type: 'all' });
  const [sortBy, setSortBy] = React.useState('newest');
  return (
    <BookingsFilters
      searchTerm={searchTerm} setSearchTerm={setSearchTerm}
      dateRange={dateRange} setDateRange={setDateRange}
      sortBy={sortBy} setSortBy={setSortBy}
    />
  );
}

function Harness() {
  const qc = React.useMemo(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } }), []);
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserStatusContext.Provider value={mockUserStatusValue}>
            <QueryClientProvider client={qc}>
              <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
                <div className="mx-auto max-w-5xl px-3 py-6">
                  <SectionLabel>Filters bar</SectionLabel>
                  <ErrorBoundary><FiltersDemo /></ErrorBoundary>

                  <SectionLabel>Populated list — all booking statuses</SectionLabel>
                  <ErrorBoundary>
                    <BookingsList bookings={bookings} loading={false} hasFilters={false} onBookingClick={() => {}} />
                  </ErrorBoundary>

                  <SectionLabel>Empty — calendar exists, no bookings yet</SectionLabel>
                  <ErrorBoundary>
                    <BookingsList bookings={[]} loading={false} hasFilters={false} onBookingClick={() => {}} />
                  </ErrorBoundary>

                  <SectionLabel>Empty — no results for the active filters</SectionLabel>
                  <ErrorBoundary>
                    <BookingsList bookings={[]} loading={false} hasFilters={true} onBookingClick={() => {}} />
                  </ErrorBoundary>
                </div>
              </div>
              <Toaster />
            </QueryClientProvider>
          </UserStatusContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
