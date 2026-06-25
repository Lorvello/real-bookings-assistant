
import React from 'react';
import { useLocation } from 'react-router-dom';
import { DeveloperDashboard } from '@/components/developer/DeveloperDashboard';

// The developer tools (account-status simulator + Stripe-mode toggle) belong to
// the LOGGED-IN app only. They are already gated to the single developer account
// (useDeveloperAccess), so no real user ever sees them. But the overlay is mounted
// globally in App.tsx (outside <Routes>), so without a route guard the floating
// "Dev" chip also bleeds onto the PUBLIC marketing pages (home, how-it-works, faq,
// pricing, etc.) during the developer's own logged-in session: clutter on surfaces
// where subscription/Stripe tooling has no meaning.
//
// Restrict it to the authenticated app routes. This is an ALLOWLIST, not a denylist
// of public routes, so a newly-added marketing page can never accidentally re-expose
// the dev chip; only routes that are genuinely part of the logged-in product opt in.
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/calendar',
  '/bookings',
  '/availability',
  '/conversations',
  '/whatsapp-booking-assistant',
  '/test-ai-agent',
  '/settings',
  '/success',
  '/team-invite',
  '/profile',
  '/admin',
  '/stripe',
];

export const DeveloperOverlay = () => {
  const { pathname } = useLocation();
  const onAppRoute = APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  // Public marketing + auth pages: never render the dev overlay here.
  if (!onAppRoute) return null;

  // DeveloperDashboard itself stays gated to the developer account; the route guard
  // above only narrows WHERE that already-gated tool may appear.
  return <DeveloperDashboard />;
};
