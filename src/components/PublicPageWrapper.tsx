import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';

interface PublicPageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const PublicPageWrapper: React.FC<PublicPageWrapperProps> = ({ children, className = "" }) => {
  const isMobile = useIsMobile();

  return (
    <div 
      className={`public-page-scaler ${className}`}
      style={{
        zoom: isMobile ? '1' : '0.8',
        width: '100%',
        height: 'fit-content',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') && !isMobile ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: isMobile ? 'visible' : 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default PublicPageWrapper;