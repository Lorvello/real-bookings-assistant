// DEV-ONLY no-auth visual harness for the PUBLIC marketing Contact page
// (Premium V2 loop, Blok C6). Mounts the REAL src/pages/Contact.tsx (no copy,
// no drift) so the light-premium pass can be screenshotted + design-reviewed at
// phone + laptop widths, AND the REAL form (header, fields, meeting calendar)
// renders over the real public canvas. Wrapped in the real AuthProvider with no
// session = the logged-out public-visitor state (user === null), and a
// MemoryRouter so the in-page Header's links resolve. The page's on-mount
// supabase.rpc('get_booked_meeting_slots') runs with the anon key (returns []
// or errors silently); it does not block render. Toaster is mounted so any
// toast on submit has a portal target. Not part of the production build (rollup
// input is index.html only); served by `vite` dev at /preview/contact.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import Contact from '@/pages/Contact';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

function Harness() {
  return (
    <MemoryRouter initialEntries={['/contact']}>
      <AuthProvider>
        <div className="dark">
          <Contact />
          <Toaster />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
