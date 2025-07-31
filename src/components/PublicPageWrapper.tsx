import React from 'react';

interface PublicPageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

const PublicPageWrapper: React.FC<PublicPageWrapperProps> = ({ children, className = "" }) => {
  return (
    <div 
      className={`public-page-scaler ${className}`}
      style={{
        zoom: '0.8',
        width: '100%',
        height: 'fit-content',
        // Firefox fallback
        transform: navigator.userAgent.includes('Firefox') ? 'scale(0.8)' : 'none',
        transformOrigin: 'top left',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default PublicPageWrapper;