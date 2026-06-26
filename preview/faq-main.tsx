// DEV-ONLY no-auth visual harness for the PUBLIC marketing FAQ page
// (Premium V2 loop, Blok C7). Mounts the REAL src/pages/FAQ.tsx (no copy,
// no drift) so the fact-check rewrite can be screenshotted + design-reviewed at
// phone + laptop widths, in BOTH collapsed and expanded-accordion states.
// Wrapped in the real AuthProvider with no session = the logged-out public
// visitor state, and a MemoryRouter so the in-page Header's links resolve.
// Not part of the production build (rollup input is index.html only);
// served by `vite` dev at /preview/faq.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import FAQ from '@/pages/FAQ';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

function Harness() {
  return (
    <MemoryRouter initialEntries={['/faq']}>
      <AuthProvider>
        <div className="dark">
          <FAQ />
          <Toaster />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
