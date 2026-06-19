// DEV-ONLY no-auth visual harness for the first-run OnboardingWizard
// (launch-ready-loop §7, Ronde 23 — D5 premium first-run). useOnboardingProgress
// derives steps from useProfile (a non-react-query custom hook that fetches by
// user.id) + useCalendarContext + Supabase fetches, so without a real profile the
// step list is empty — this harness therefore verifies the wizard CHROME (the
// surface-raised container, brand glow, circular progress ring, header tokens) at
// the 0% fresh-start state; the per-step card token swaps are reviewed from code.
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

const mockAuthValue: any = {
  user: { id: 'u-owner', email: 'owner@glowstudio.example' },
  session: { user: { id: 'u-owner' } },
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
