// DEV-ONLY no-auth FUNCTIONAL harness for the PUBLIC Header "Pricing" nav button
// (Premium V2 loop, Blok C4: smooth-scroll-to-pricing that works from ANY route).
// Mounts the REAL src/components/Header.tsx (no copy, no drift) over a faithful
// stand-in of App.tsx's layout: a single [data-scroll-container] (the app's real
// scroll parent) wrapping a mini <Routes>. Route '/' renders tall filler + the
// real <div id="pricing"> target at the bottom (exactly like Index.tsx); route
// '/faq' is a no-#pricing stub so the CROSS-ROUTE case can be driven (click
// Pricing while on /faq -> must navigate to / AND land on the pricing section).
// THE REALITY LESSON: prove the button reaches the real #pricing element from
// both home and a foreign route, not just that the source says behavior:'smooth'.
// A fixed [data-current-path] readout mirrors the live router location. Not part
// of the production build; served by `vite` dev at /preview/header-pricing.html.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '@/index.css';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';

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

function HomeStub() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 pt-40 pb-24">
        <h1 className="text-4xl font-bold">Home top</h1>
        {/* Tall filler so #pricing is far below the fold and a scroll is required.
            Inline style: preview/ is NOT in tailwind.config content globs, so
            arbitrary h-[..vh] classes used only here would not be generated. */}
        <div style={{ height: '260vh' }} />
      </section>
      {/* The REAL target id used by Header's handlePricingClick + Index.tsx */}
      <div id="pricing">
        <section className="mx-auto max-w-7xl px-6 py-24">
          <h2 className="text-3xl font-bold">Pricing section target</h2>
          <div style={{ height: '80vh' }} />
        </section>
      </div>
    </>
  );
}

function FaqStub() {
  return (
    <section className="mx-auto max-w-7xl px-6 pt-40 pb-24">
      <h1 className="text-4xl font-bold">FAQ route (no #pricing here)</h1>
      <div style={{ height: '120vh' }} />
    </section>
  );
}

function Harness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <div className="dark">
          <PathReadout />
          <Header />
          {/* Mirror App.tsx: the single app-level scroll container wraps Routes */}
          <main
            data-scroll-container
            className="h-screen overflow-y-auto bg-background text-foreground"
          >
            <Routes>
              <Route path="/" element={<HomeStub />} />
              <Route path="/faq" element={<FaqStub />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
