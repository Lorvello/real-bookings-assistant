import React from 'react';

interface AuthenticatedPageWrapperProps {
  children: React.ReactNode;
}

export function AuthenticatedPageWrapper({ children }: AuthenticatedPageWrapperProps) {
  return (
    <div 
      className="authenticated-page-scaler"
      style={{
        zoom: '0.8',
        width: '100%',
        height: '100vh',
        minHeight: '100vh',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
}