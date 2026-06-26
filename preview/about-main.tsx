// DEV-ONLY no-auth visual harness for the PUBLIC marketing About /
// Meet-the-Founders page (Premium V2 loop, Blok C8). Mounts the REAL
// src/pages/About.tsx (no copy, no drift) so the fact-check rewrite + premium
// pass can be screenshotted + design-reviewed at phone + laptop widths.
// Wrapped in the real AuthProvider with no session = the logged-out public
// visitor state (user === null), and a MemoryRouter so the in-page Header's
// links resolve. Not part of the production build (rollup input is index.html
// only); served by `vite` dev at /preview/about.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import About from '@/pages/About';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

function Harness() {
  return (
    <MemoryRouter initialEntries={['/about']}>
      <AuthProvider>
        <div className="dark">
          <About />
          <Toaster />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
