// DEV-ONLY no-auth visual harness for the PUBLIC marketing "Who it's for /
// Built for every appointment business" section (Premium V2 loop, Blok C2).
// Mounts the REAL src/components/ui/testimonials-columns-1.tsx (no copy, no drift)
// over the EXACT homepage canvas color (BackgroundProvider variant="dark" =
// hsl(217,35%,12%)), which is what makes the formerly-black column strips
// (bg-background = #0B0D11) visibly clash. THE REALITY LESSON: prove the fix on
// the real section over the real canvas, not a mock. Not part of the production
// build (rollup input is index.html only); served by `vite` dev at
// /preview/whoisfor.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import Testimonials from '@/components/ui/testimonials-columns-1';

function Harness() {
  return (
    <div className="dark">
      {/* Exact homepage canvas (BackgroundProvider variant="dark") so any darker
          fill inside the section reads as a clashing black strip. */}
      <main
        style={{ backgroundColor: 'hsl(217, 35%, 12%)' }}
        className="min-h-screen text-foreground"
      >
        <Testimonials />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
