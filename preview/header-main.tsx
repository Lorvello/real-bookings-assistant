// DEV-ONLY no-auth visual harness for the PUBLIC marketing site Header
// (Premium V2 loop, Blok C1). Mounts the REAL src/components/Header.tsx (no copy
// duplication, no drift) so the premium pass can be screenshotted + design-reviewed
// at phone + laptop widths, AND the REAL mobile menu can be opened (THE REALITY
// LESSON: never accept a mocked drawer/menu). Wrapped in the real AuthProvider with
// no session, which is exactly the logged-out public-visitor state (user === null).
// A tall [data-scroll-container] mimics the marketing canvas so the fixed/floating
// header sits over real content and the hide-on-scroll hook has a target.
// Not part of the production build (rollup input is index.html only); served by
// `vite` dev at /preview/header.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '@/index.css';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';

function Harness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <div className="dark">
          <Header />
          {/* Marketing-canvas stand-in so the floating header has a real backdrop */}
          <main
            data-scroll-container
            className="h-screen overflow-y-auto bg-background text-foreground"
          >
            <section className="mx-auto max-w-7xl px-6 pt-40 pb-24">
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
                Header preview canvas
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-400">
                This page exists only to give the floating header a realistic dark
                backdrop. Open the mobile menu via the hamburger to render the real
                mobile navigation.
              </p>
              <div className="mt-16 grid gap-6 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/[0.06] bg-card p-8 text-slate-400"
                  >
                    Filler content block {i + 1}
                  </div>
                ))}
              </div>
              <div className="h-[120vh]" />
            </section>
          </main>
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
