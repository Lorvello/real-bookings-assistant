// DEV-ONLY no-auth visual harness for the PUBLIC marketing Why-Us page
// (Premium V2 loop, Blok C9). Mounts the REAL src/pages/WhyUs.tsx (no copy
// change, text frozen per Mathieu: case studies + stats are real/proven) so the
// PREMIUM-VISUAL pass can be screenshotted + design-reviewed at phone + laptop
// widths. Wrapped in the real AuthProvider with no session = the logged-out
// public visitor state (user === null), and a MemoryRouter so the in-page
// Header's links resolve. Not part of the production build (rollup input is
// index.html only); served by `vite` dev at /preview/whyus.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import WhyUs from '@/pages/WhyUs';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

function Harness() {
  return (
    <MemoryRouter initialEntries={['/why-us']}>
      <AuthProvider>
        <div className="dark">
          <WhyUs />
          <Toaster />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
