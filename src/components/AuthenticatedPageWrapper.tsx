import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';

interface AuthenticatedPageWrapperProps {
  children: React.ReactNode;
}

export function AuthenticatedPageWrapper({ children }: AuthenticatedPageWrapperProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className="authenticated-page-scaler"
      style={{
        zoom: isMobile ? '1' : '0.8',
        width: '100%',
        // Mobile: a bounded dynamic-viewport height so the inner DashboardLayout
        // <main overflow-y-auto> can scroll. With the old height:auto the height
        // chain collapsed, main grew to full content height (never a scroll
        // container), and body{height:100vh;overflow:hidden} clipped the page
        // with NOTHING able to scroll, so the bottom of every logged-in screen
        // was unreachable on a phone. 100dvh (not 100vh) also excludes the mobile
        // browser chrome so the scroll area exactly fits the visible viewport.
        // Desktop branch unchanged (zoom 0.8 + 125vh fit hack).
        height: isMobile ? '100dvh' : '125vh',
        minHeight: isMobile ? '100dvh' : '125vh',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') && !isMobile ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
}