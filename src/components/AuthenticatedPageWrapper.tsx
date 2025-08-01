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
        height: isMobile ? 'auto' : '125vh',
        minHeight: isMobile ? 'auto' : '125vh',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') && !isMobile ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: isMobile ? 'visible' : 'hidden'
      }}
    >
      {children}
    </div>
  );
}