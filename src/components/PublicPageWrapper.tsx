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
        height: 'fit-content',
        maxWidth: '125%',
        overflowX: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

export default PublicPageWrapper;