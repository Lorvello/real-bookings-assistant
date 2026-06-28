import React from 'react';
import { useIsMobile } from '../hooks/use-mobile';
import Footer from './Footer';

interface PublicPageWrapperProps {
  children: React.ReactNode;
  className?: string;
  showFooter?: boolean;
}

const PublicPageWrapper: React.FC<PublicPageWrapperProps> = ({ 
  children, 
  className = "",
  showFooter = true 
}) => {
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
      {/* `<main>` landmark for AT navigation (WCAG 2.1 AA / ARIA landmark guidance).
          Wraps each public page's primary content; the site `<footer>` (and the
          fixed, body-portaled `<header>`) stay outside the main region. */}
      <main>{children}</main>
      {showFooter && <Footer />}
    </div>
  );
};

export default PublicPageWrapper;