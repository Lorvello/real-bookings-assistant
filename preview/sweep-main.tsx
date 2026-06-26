// DEV-ONLY no-auth visual harness for the Premium V2 Blok C10 ALL-PAGES SWEEP.
// Mounts the REAL public/content/auth pages (no copy, no drift) selected by a
// ?page= query param, inside the real AuthProvider (no session = logged-out
// public visitor), a MemoryRouter + <Routes> so useParams()/Link resolve, and a
// Toaster portal. Lets one harness file cover every page the dedicated C1-C9
// rounds did NOT build a harness for (homepage, how-it-works, terms, privacy,
// blog, blog-article, not-found, payment success/cancel, business-search,
// public-booking, login, forgot/reset password). Not part of the production
// build (rollup input is index.html only); served by `vite` dev at
// /preview/sweep.html?page=<name>.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@/index.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';

import Index from '@/pages/Index';
import SeeHowItWorks from '@/pages/SeeHowItWorks';
import TermsOfService from '@/pages/TermsOfService';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Blog from '@/pages/Blog';
import BlogArticle from '@/pages/BlogArticle';
import NotFound from '@/pages/NotFound';
import PaymentSuccess from '@/pages/PaymentSuccess';
import PaymentCancelled from '@/pages/PaymentCancelled';
import BusinessSearch from '@/pages/BusinessSearch';
import PublicBooking from '@/pages/PublicBooking';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// page key -> [Component, route path, initial entry (with any param)]
const PAGES: Record<string, [React.ComponentType, string, string]> = {
  index:     [Index,            '/',                '/'],
  how:       [SeeHowItWorks,    '/how-it-works',    '/how-it-works'],
  terms:     [TermsOfService,   '/terms-of-service','/terms-of-service'],
  privacy:   [PrivacyPolicy,    '/privacy-policy',  '/privacy-policy'],
  blog:      [Blog,             '/blog',            '/blog'],
  article:   [BlogArticle,      '/blog/:slug',      '/blog/salon-no-shows-revenue-loss'],
  notfound:  [NotFound,         '/nope',            '/nope'],
  paysuccess:[PaymentSuccess,   '/payment-success', '/payment-success'],
  paycancel: [PaymentCancelled, '/payment-cancelled','/payment-cancelled'],
  search:    [BusinessSearch,   '/business-search', '/business-search'],
  book:      [PublicBooking,    '/book/:slug',      '/book/personal-c5f6d8f5'],
  login:     [Login,            '/login',           '/login'],
  forgot:    [ForgotPassword,   '/forgot-password', '/forgot-password'],
  reset:     [ResetPassword,    '/reset-password',  '/reset-password'],
};

const params = new URLSearchParams(window.location.search);
const key = params.get('page') || 'index';
const entry = PAGES[key] || PAGES.index;
const [Page, routePath, initialEntry] = entry;

function Harness() {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <div className="dark">
          <Routes>
            <Route path={routePath} element={<Page />} />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </MemoryRouter>
  );
}

createRoot(document.getElementById('root')!).render(<Harness />);
