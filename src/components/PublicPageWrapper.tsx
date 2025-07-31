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
        transform: 'scale(0.8)',
        transformOrigin: 'top left',
        width: '125%',
        minHeight: '125vh',
        height: 'auto'
      }}
    >
      {children}
    </div>
  );
};

export default PublicPageWrapper;