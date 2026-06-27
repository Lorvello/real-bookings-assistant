// DEV-ONLY no-auth visual harness for the PUBLIC booking page
// (Launch-Ready Simulation loop, TRACK 0: Booking Success E2E). Mounts the REAL
// src/pages/PublicBooking.tsx (no copy, no drift) against the seeded Lorvello slug
// `personal-c5f6d8f5`, so the public booking + payment journey (the biggest no-harness
// blind spot, Appendix A) can be screenshotted + design-reviewed at phone + laptop
// widths in EN + NL. The component's on-mount anon reads (public_calendars,
// public_service_types, get_available_slots) run live with the publishable key
// (verified callable in TRACK 0 R1). i18n is initialized so publicBooking.* strings
// resolve; the language toggle is driven by the loop via i18n.changeLanguage. A
// MemoryRouter + Route gives useParams() the slug. Toaster is mounted for booking
// toasts. Not part of the production build (rollup input = index.html only); served
// by `vite` dev at /preview/public-booking.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@/i18n';
import '@/index.css';
import PublicBooking from '@/pages/PublicBooking';
import { Toaster } from '@/components/ui/toaster';

const SLUG = 'personal-c5f6d8f5';

function Harness() {
  return (
    <MemoryRouter initialEntries={[`/book/${SLUG}`]}>
      <div className="dark">
        <Routes>
          <Route path="/book/:slug" element={<PublicBooking />} />
        </Routes>
        <Toaster />
      </div>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
