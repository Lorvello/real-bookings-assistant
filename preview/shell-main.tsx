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
import { useIsMobile } from '@/hooks/use-mobile';
import Dashboard from '@/pages/Dashboard';
import { SettingsContext, type SettingsContextType } from '@/contexts/SettingsContext';
import { SettingsTabs } from '@/components/settings/SettingsLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

// A1a first-paint probe: records useIsMobile()'s value on the VERY FIRST render
// (in the render body, before any passive effect runs). That first value is what
// drives the desktop-shell flash: at a mobile width it MUST be true. Read it via
// window.__firstPaintMobile after mount. Dev-only.
(window as any).__firstPaintMobile = undefined;
function FirstPaintProbe() {
  const mobile = useIsMobile();
  if ((window as any).__firstPaintMobile === undefined) {
    (window as any).__firstPaintMobile = mobile;
  }
  return null;
}

// When this harness is driven at a DESKTOP width the real desktop sidebar mounts
// and CalendarSwitcherSection needs CalendarContext; supply it so desktop runs of
// the harness survive. (Since the A1a useIsMobile first-paint fix the sidebar no
// longer flashes in at mobile widths, but the mock stays for the desktop case.)
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
  selectAllCalendars: () => {},
  setViewingAllCalendars: () => {},
};

const mockAuthValue: any = {
  // Developer email → getEnvironmentConfig(email).allowMockData = true on a dev
  // host, so the BI/Performance/FutureInsights optimized-* hooks return their rich
  // getMock*Data() and every Pro tab renders fully populated (heaviest content =
  // strongest horizontal-overflow test for the A1b mobile sweep). The Overview tab
  // is still hook-bound, so its cache is seeded below.
  user: { id: 'u-owner', email: 'business01003@gmail.com' },
  session: { user: { id: 'u-owner', email: 'business01003@gmail.com' } },
  loading: false,
  isAuthenticated: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
};

const mockUserStatusValue: any = {
  userStatus: {
    userType: 'paid_subscriber',
    isExpired: false,
    isSetupIncomplete: false,
    needsUpgrade: false,
    statusMessage: 'Active',
  },
  // Paid tenant, every Pro tab unlocked so the real BI/Performance/FutureInsights
  // tab CONTENT mounts at mobile widths (the heaviest, widest content = best
  // horizontal-overflow probe for the A1b sweep).
  accessControl: {
    canCreateBookings: true,
    canAccessWhatsApp: true,
    canAccessBookingAssistant: true,
    canAccessAPI: true,
    canAccessFutureInsights: true,
    canAccessBusinessIntelligence: true,
    canAccessPerformance: true,
    canAccessCustomerSatisfaction: true,
    canAccessTeamMembers: true,
    canAccessTaxCompliance: true,
    maxCalendars: 3,
    maxBookingsPerMonth: null,
    maxTeamMembers: 5,
    maxWhatsAppContacts: 500,
  },
  isLoading: false,
  invalidateCache: async () => {},
};

// Seed the react-query cache so the Overview tab's hooks (useNextAppointment /
// usePopularService / useWeeklyInsights, keyed by the active calendar ids) resolve
// to deterministic data without Supabase (the populated owner). Mirrors
// dashboard-main.tsx's makeClient('populated').
function seedDashboardCache(qc: QueryClient) {
  const ids = ['cal-1'];
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
}

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

// ITEM A1c: ?surface=settings mounts the REAL SettingsTabs (AI Knowledge active by
// default) inside the real DashboardLayout against a mock SettingsContext, so the
// Settings tab strip + AI Knowledge form + floating SaveBar are exercised INSIDE the
// real mobile shell (the 64px fixed header + bounded scroll container) at 375/390/414.
// Mirrors SettingsLayout's inner markup (the `dark` wrapper + padding + page header +
// SettingsTabs) minus the live SettingsProvider. Services + Operations populated
// content keep their dedicated standalone harnesses (services.html / operations.html),
// which mount the same real components at full mobile width (the shell adds no
// horizontal constraint beyond full-width, proven by the A1b dashboard-in-shell run).
const mockProfile = {
  id: 'preview-user',
  full_name: 'Demo Owner',
  website: 'www.glowstudio.nl',
};
const mockBusiness = {
  business_name: 'Glow Studio',
  business_type: 'beauty_salon',
  business_description:
    'A calm boutique beauty studio in the heart of Amsterdam offering facials, lash and brow treatments by appointment.',
  business_email: 'hello@glowstudio.nl',
  business_phone: '+31 6 12345678',
  business_street: 'Prinsengracht',
  business_number: '42',
  business_postal: '1015 DV',
  business_city: 'Amsterdam',
  business_country: 'Netherlands',
  cancellation_policy:
    'Free cancellation up to 24h before your appointment. Later cancellations or no-shows are charged 50%. Rescheduling is free anytime.',
  payment_info: 'Pay in the studio by card or cash. A 20% deposit confirms appointments over €100.',
  preparation_info: '',
  parking_info: '',
  public_transport_info: '',
  accessibility_info: '',
  other_info: '',
};
const mockSettingsValue: SettingsContextType = {
  profileData: mockProfile,
  setProfileData: () => {},
  businessData: mockBusiness,
  setBusinessData: () => {},
  loading: false,
  isLoading: false,
  loadError: null,
  saveError: null,
  saveFields: async () => {
    await new Promise((r) => setTimeout(r, 700));
    return true;
  },
  refetch: async () => {},
};

function SettingsSurface() {
  // Mirror SettingsLayout's inner content (it wraps SettingsProvider, which we replace
  // with the mock context above so no live RLS fetch is needed).
  return (
    <SettingsContext.Provider value={mockSettingsValue}>
      <div className="dark min-h-full bg-background p-3 sm:p-4 md:p-8">
        <div className="w-full">
          <SimplePageHeader title="Settings" />
          <div className="mt-6 md:mt-8">
            <SettingsTabs />
          </div>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}

// ?surface=dashboard mounts the REAL Dashboard page (which carries its own
// DashboardLayout) inside the shell so the per-route A1b mobile sweep exercises the
// surface INSIDE the real shell at mobile widths. ?surface=settings mounts the real
// Settings surface (see above). Default (no/unknown param) keeps the A0/A1a
// TallContent scroll + first-paint probe so those regressions still run.
const surface = new URLSearchParams(window.location.search).get('surface') || 'probe';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, staleTime: Infinity, refetchOnMount: false },
  },
});
if (surface === 'dashboard') seedDashboardCache(queryClient);

function Harness() {
  return (
    <QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthContext.Provider value={mockAuthValue}>
        <UserStatusContext.Provider value={mockUserStatusValue}>
          <CalendarContext.Provider value={mockCalendarValue}>
            <FirstPaintProbe />
            <div className="dark">
              {surface === 'dashboard' ? (
                <Dashboard />
              ) : surface === 'settings' ? (
                <DashboardLayout>
                  <SettingsSurface />
                </DashboardLayout>
              ) : (
                <DashboardLayout>
                  <TallContent />
                </DashboardLayout>
              )}
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
