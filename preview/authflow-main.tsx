// DEV-ONLY no-auth visual harness for the auth-entry flow (ITEM 1: Signup +
// VerifyEmail). Mounts the real StreamlinedSignup card and the real
// EmailVerificationPending card inside the production AuthShell so the premium
// dark-theme look + smooth flow can be screenshotted at 390 + 1440 without the
// auth-gated app. Supabase calls only fire on user click (not on render), so no
// network is needed to verify the surface. Not part of the production build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthShell } from '@/components/auth/AuthShell';
import { StreamlinedSignup } from '@/components/registration/StreamlinedSignup';
import { EmailVerificationPending } from '@/components/auth/EmailVerificationPending';

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
  const which = new URLSearchParams(window.location.search).get('view') || 'signup';
  return (
    <ErrorBoundary>
      <MemoryRouter>
        <QueryClientProvider client={qc}>
          <AuthShell>
            {which === 'verify' ? (
              <EmailVerificationPending email="owner@glowstudio.example" onBackToLogin={() => {}} />
            ) : (
              <StreamlinedSignup />
            )}
          </AuthShell>
          <Toaster />
        </QueryClientProvider>
      </MemoryRouter>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
