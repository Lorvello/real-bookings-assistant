// DEV-ONLY no-auth visual harness for the GLOBAL APP SHELL (DashboardLayout),
// launch-ready-loop Premium-logged-in-app loop, ITEM A0 mobile scout.
//
// Why this exists: every other preview/*-main.tsx mounts the INNER surface in
// isolation and never renders DashboardLayout, so the prior loop verified
// surfaces clean on desktop while the REAL phone stayed "compleet gebukt" (the
// systemic bug lives in the shell the other harnesses skip). This mount wraps a
// tall, clearly-numbered content block in the REAL DashboardLayout against mocked
// Auth + UserStatus contexts (on mobile the sidebar is closed, so its child
// components do not mount, which keeps the mocking minimal). Drive it at
// 375/390/414 to see whether the bottom of the page is reachable (scrollable)
// and whether document.documentElement.scrollWidth === window.innerWidth.
// Not part of the production build (rollup input is index.html only).
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { CalendarContext } from '@/contexts/CalendarContext';
import { DashboardLayout } from '@/components/DashboardLayout';

// useIsMobile() returns false on first paint, so the shell briefly renders the
// desktop sidebar (CalendarSwitcherSection needs CalendarContext); supply it so
// the harness survives that first render even at a mobile width.
const calendars: any[] = [
  { id: 'cal-1', name: 'Glow Studio', slug: 'glow-studio', timezone: 'Europe/Amsterdam', is_active: true },
];
const mockCalendarValue: any = {
  calendars,
  selectedCalendar: calendars[0],
  viewingAllCalendars: true,
  getActiveCalendarIds: () => ['cal-1'],
  loading: false,
  refreshCalendars: async () => {},
  selectCalendar: () => {},
  setViewingAllCalendars: () => {},
};

const mockAuthValue: any = {
  user: { id: 'u-owner', email: 'owner@glowstudio.example' },
  session: { user: { id: 'u-owner' } },
  loading: false,
  isAuthenticated: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
};

const mockUserStatusValue: any = {
  userStatus: {
    userType: 'active_subscriber',
    isExpired: false,
    isSetupIncomplete: false,
    needsUpgrade: false,
    statusMessage: 'Active',
  },
  accessControl: {
    canCreateBookings: true,
    canAccessWhatsApp: true,
    canAccessBookingAssistant: true,
    maxCalendars: 3,
  },
  isLoading: false,
  invalidateCache: async () => {},
};

// A page taller than any phone viewport, so a broken scroll container makes the
// bottom rows physically unreachable. Row 30 + the bottom action bar are the
// "can the tenant reach the save button?" probe.
function TallContent() {
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">Shell scroll probe</h1>
      <p className="text-sm text-muted-foreground">
        If the app shell is healthy you can scroll all the way to row 30 and the
        action bar below it. If the height chain is broken the bottom rows are
        clipped and unreachable.
      </p>
      {Array.from({ length: 30 }, (_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.08] bg-surface-1 px-4 py-4 text-foreground"
        >
          Content row {i + 1} of 30
        </div>
      ))}
      <div
        id="probe-bottom-bar"
        className="rounded-lg border border-primary/40 bg-primary/15 px-4 py-5 text-center text-foreground font-semibold"
      >
        BOTTOM ACTION BAR (must be reachable)
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

function Harness() {
  return (
    <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthContext.Provider value={mockAuthValue}>
        <UserStatusContext.Provider value={mockUserStatusValue}>
          <CalendarContext.Provider value={mockCalendarValue}>
            <div className="dark">
              <DashboardLayout>
                <TallContent />
              </DashboardLayout>
            </div>
            <Toaster />
          </CalendarContext.Provider>
        </UserStatusContext.Provider>
      </AuthContext.Provider>
    </MemoryRouter>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
