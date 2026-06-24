// DEV-ONLY no-auth visual harness for the first-run OnboardingWizard
// (launch-ready-loop §7; ITEM 2, tenant onboarding E2E). useOnboardingProgress
// derives steps from useProfile + useCalendarContext + Supabase fetches. useProfile
// hydrates synchronously from localStorage['userProfile'] when the cached userId
// matches the (mock) auth user and the version matches, and skips the network fetch;
// useOnboardingProgress short-circuits its service/availability/settings queries when
// calendars.length === 0. So we prime a PARTIAL profile (business info filled,
// nothing else) for the mock user below: the REAL wizard + REAL hook then render the
// genuine step-card states (step 1 completed with the emerald "Done" pill, steps 2-4
// incomplete with icon + CTA) at a realistic 1/4 = 25% mid-onboarding state, with NO
// network calls. `?state=fresh` clears the seed to show the 0/4 cold-start chrome.
// Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthContext } from '@/contexts/AuthContext';
import { UserStatusContext } from '@/contexts/UserStatusContext';
import { CalendarContext } from '@/contexts/CalendarContext';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

const MOCK_USER_ID = 'u-owner';

// Prime (or clear) the useProfile localStorage cache BEFORE the component mounts so
// the real hook hydrates from it without a Supabase round-trip. `?state=fresh` shows
// the 0/4 cold start; default shows a 1/4 mid-onboarding state with mixed card states.
const isFresh = new URLSearchParams(window.location.search).get('state') === 'fresh';
try {
  if (isFresh) {
    localStorage.removeItem('userProfile');
  } else {
    localStorage.setItem('userProfile', JSON.stringify({
      version: '2.0',
      userId: MOCK_USER_ID,
      timestamp: Date.now(),
      data: {
        id: MOCK_USER_ID,
        email: 'owner@glowstudio.example',
        full_name: 'Sofia Vermeer',
        business_name: 'Glow Studio',
        business_type: 'salon',
      },
    }));
  }
} catch (_) { /* storage blocked, falls back to 0/4 chrome */ }

const mockAuthValue: any = {
  user: { id: MOCK_USER_ID, email: 'owner@glowstudio.example' },
  session: { user: { id: MOCK_USER_ID } },
  loading: false, isAuthenticated: true,
  signIn: async () => {}, signOut: async () => {}, signUp: async () => {},
};

const mockUserStatusValue: any = {
  userStatus: { userType: 'setup_incomplete', isExpired: false, isSetupIncomplete: true, needsUpgrade: false, statusMessage: 'Setup incomplete' },
  accessControl: { canAccessWhatsApp: true },
  isLoading: false, invalidateCache: async () => {},
};

const calendarValue: any = {
  calendars: [], selectedCalendar: null, viewingAllCalendars: true,
  getActiveCalendarIds: () => [], loading: false,
  refreshCalendars: async () => {}, selectCalendar: () => {}, setViewingAllCalendars: () => {},
};

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <pre style={{ color: '#f88', background: '#1a1a1a', padding: 16, whiteSpace: 'pre-wrap', fontSize: 12 }}>{String(this.state.error.stack || this.state.error.message)}</pre>;
    }
    return this.props.children;
  }
}

function Harness() {
  const qc = React.useMemo(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnMount: false } } }), []);
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <AuthContext.Provider value={mockAuthValue}>
          <UserStatusContext.Provider value={mockUserStatusValue}>
            <CalendarContext.Provider value={calendarValue}>
              <QueryClientProvider client={qc}>
                <div className="dark main-scrollbar h-screen overflow-y-auto bg-background">
                  <div className="mx-auto max-w-3xl px-3 py-6 space-y-4 sm:space-y-6">
                    <SimplePageHeader title="Welcome to your Dashboard" />
                    <OnboardingWizard />
                  </div>
                </div>
                <Toaster />
              </QueryClientProvider>
            </CalendarContext.Provider>
          </UserStatusContext.Provider>
        </AuthContext.Provider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
