import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';

interface PublicPageWrapperProps {
  children: React.ReactNode;
  className?: string;
  disableZoom?: boolean;
}

const PublicPageWrapper: React.FC<PublicPageWrapperProps> = ({ children, className = "", disableZoom = false }) => {
  const isMobile = useIsMobile();

  return (
    <div 
      className={`public-page-scaler ${className}`}
      style={{
        zoom: disableZoom || isMobile ? '1' : '0.8',
        width: '100%',
        height: 'fit-content',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') && !disableZoom && !isMobile ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: isMobile ? 'visible' : 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default PublicPageWrapper;