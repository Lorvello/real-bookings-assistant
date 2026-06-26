// DEV-ONLY no-auth FUNCTIONAL harness for the PUBLIC marketing Pricing section
// (Premium V2 loop, Blok C3: "Pricing section, every button works"). Mounts the
// REAL src/components/Pricing.tsx (no copy, no drift) inside the real AuthProvider
// (no session = logged-out public visitor) + a MemoryRouter, so each plan CTA can
// be CLICKED and its real effect OBSERVED: Starter/Professional call
// navigate('/signup') (router location flips to /signup) and Enterprise opens the
// real EnterpriseContactForm dialog. THE REALITY LESSON: prove every button fires
// its real route/handler, not just that the onClick string exists. A fixed
// [data-current-path] readout mirrors the live router location so the headless
// ba-preview browser can assert the navigation. Not part of the production build
// (rollup input is index.html only); served by `vite` dev at /preview/pricing.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router-dom';
import '@/index.css';
import { Pricing } from '@/components/Pricing';
import { AuthProvider } from '@/contexts/AuthContext';

// Mirrors the live MemoryRouter location into a stable DOM hook so a click on a
// plan CTA can be verified by reading [data-current-path] (navigate('/signup')
// updates this even though Pricing stays mounted).
function PathReadout() {
  const location = useLocation();
  return (
    <div
      data-current-path={location.pathname}
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, padding: '4px 8px', fontSize: 12 }}
      className="bg-emerald-600 text-white"
    >
      path: {location.pathname}
    </div>
  );
}

function Harness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <div className="dark">
          <PathReadout />
          <main className="min-h-screen bg-background text-foreground">
            <Pricing />
          </main>
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
