// DEV-ONLY no-auth visual harness for the Dashboard surface (launch-ready-loop
// §7, Ronde 20 — Dashboard premium). The Overview tab is hook-bound
// (useNextAppointment / usePopularService / useWeeklyInsights + useCalendarContext
// + useMockDataControl→useAuth), so we mount the REAL DashboardTabs against mocked
// Auth / UserStatus / Calendar contexts + a SEEDED react-query cache (staleTime
// Infinity, refetchOnMount false → the hooks return our data, never Supabase).
// A non-developer email forces useMockData=false so we can show the genuine
// first-run (0-bookings) empty state, which is the launch reality Mathew calls
// "dun/leeg". Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { CalendarContext } from '@/contexts/CalendarContext';
import { DashboardTabs } from '@/components/DashboardTabs';
import { LockedTabPanel } from '@/components/dashboard-tabs/LockedTabPanel';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';
import { getPresetRange } from '@/utils/dateRangePresets';
import { TrendingUp } from 'lucide-react';

// Non-developer email → getEnvironmentConfig(email).allowMockData = false →
// useMockDataControl returns false → the Overview hooks honour our seeded cache.
const mockAuthValue: any = {
  user: { id: 'u-owner', email: 'owner@glowstudio.example' },
  session: { user: { id: 'u-owner' } },
  loading: false,
  isAuthenticated: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
};

const mockAccessControl = {
  canCreateBookings: true,
  canAccessWhatsApp: true,
  canAccessBookingAssistant: true,
  canAccessAPI: false,
  canAccessFutureInsights: false, // locked → LockedTabPanel
  canAccessBusinessIntelligence: false, // locked
  canAccessPerformance: false, // locked
  canAccessCustomerSatisfaction: false,
  canAccessTeamMembers: true,
  canAccessTaxCompliance: false,
  maxCalendars: 3,
  maxBookingsPerMonth: null,
  maxTeamMembers: 5,
  maxWhatsAppContacts: 500,
};

const mockUserStatusValue: any = {
  userStatus: {
    userType: 'active_subscriber',
    isExpired: false,
    isSetupIncomplete: false,
    needsUpgrade: false,
    statusMessage: 'Active',
  },
  accessControl: mockAccessControl,
  isLoading: false,
  invalidateCache: async () => {},
};

const calendars: any[] = [
  { id: 'cal-1', name: 'Glow Studio — Main', slug: 'glow-studio', timezone: 'Europe/Amsterdam', is_active: true },
];

function makeCalendarValue(ids: string[]): any {
  return {
    calendars,
    selectedCalendar: calendars[0],
    viewingAllCalendars: true,
    getActiveCalendarIds: () => ids,
    loading: false,
    refreshCalendars: async () => {},
    selectCalendar: () => {},
    setViewingAllCalendars: () => {},
  };
}

// Seed react-query so the Overview renders deterministically without Supabase.
function makeClient(mode: 'populated' | 'firstrun', ids: string[]) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false },
    },
  });
  if (mode === 'populated') {
    const next = new Date();
    next.setHours(next.getHours() + 2, 30, 0, 0);
    qc.setQueryData(['next-appointment', ids], {
      customer_name: 'Emma van der Berg',
      service_name: 'Knippen & Stylen',
      start_time: next.toISOString(),
      time_until: '2h 30m',
    });
    qc.setQueryData(['popular-service', ids], { service_name: 'Knippen & Stylen', booking_count: 28, percentage: 35 });
    qc.setQueryData(['weekly-insights', ids], { current_week: 28, previous_week: 22, growth_percentage: 27, trend: 'up' });
    qc.setQueryData(['calendar-count', mockAuthValue.user.id], 1);
    qc.setQueryData(['whatsapp-contacts-count', mockAuthValue.user.id, undefined], 320);
  } else {
    qc.setQueryData(['next-appointment', ids], null);
    qc.setQueryData(['popular-service', ids], null);
    qc.setQueryData(['weekly-insights', ids], null);
    qc.setQueryData(['calendar-count', mockAuthValue.user.id], 0);
    qc.setQueryData(['whatsapp-contacts-count', mockAuthValue.user.id, undefined], 0);
  }
  return qc;
}

const dateRange = getPresetRange('last30days');

function Surface({ mode }: { mode: 'populated' | 'firstrun' }) {
  const ids = mode === 'populated' ? ['cal-1'] : ['cal-empty'];
  const qc = React.useMemo(() => makeClient(mode, ids), [mode]);
  const calendarValue = React.useMemo(
    () => makeCalendarValue(mode === 'populated' ? ['cal-1'] : []),
    [mode],
  );
  return (
    <QueryClientProvider client={qc}>
      <CalendarContext.Provider value={calendarValue}>
        <div className="bg-background min-h-0 p-1 sm:p-1.5 md:p-8">
          <SimplePageHeader title="Dashboard" />
          <div className="mt-4">
            <DashboardTabs calendarIds={ids} dateRange={dateRange} />
          </div>
        </div>
      </CalendarContext.Provider>
    </QueryClientProvider>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mb-2 mt-10 max-w-6xl px-2 first:mt-0">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
        {children}
      </span>
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

function Harness() {
  return (
    <ErrorBoundary>
    <MemoryRouter>
      <AuthContext.Provider value={mockAuthValue}>
        <UserStatusContext.Provider value={mockUserStatusValue}>
          <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
            <div className="mx-auto max-w-6xl px-2 py-6">
              <SectionLabel>Populated — owner with bookings</SectionLabel>
              <Surface mode="populated" />

              <SectionLabel>First-run — onboarded, 0 bookings (the launch reality)</SectionLabel>
              <Surface mode="firstrun" />

              <SectionLabel>Locked Pro tab (trial owner) — in-tab upsell, not a screen-cover</SectionLabel>
              <div className="surface-raised rounded-xl p-0.5 md:p-6">
                <LockedTabPanel
                  feature="Business Intelligence"
                  description="Advanced business metrics, revenue analytics and service performance to grow your business."
                  bullets={['Revenue & service analytics', 'Top-performing services', 'Growth trends over time']}
                  icon={TrendingUp}
                  onUpgrade={() => alert('Upgrade (harness)')}
                />
              </div>
            </div>
          </div>
          <Toaster />
        </UserStatusContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
