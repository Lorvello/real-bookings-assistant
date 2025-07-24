import { useEffect } from 'react';

/**
 * SecurityHeaders component that sets security-related meta tags and headers
 * Provides protection against XSS, clickjacking, and other security threats
 */
export const SecurityHeaders = () => {
  useEffect(() => {
    // Create meta tags for security headers
    const securityMetas = [
      {
        httpEquiv: 'Content-Security-Policy',
        content: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.supabase.com wss://*.supabase.co; frame-ancestors 'none';"
      },
      {
        httpEquiv: 'X-Frame-Options',
        content: 'DENY'
      },
      {
        httpEquiv: 'X-Content-Type-Options',
        content: 'nosniff'
      },
      {
        httpEquiv: 'Referrer-Policy',
        content: 'strict-origin-when-cross-origin'
      },
      {
        httpEquiv: 'Permissions-Policy',
        content: 'geolocation=(), microphone=(), camera=()'
      }
    ];

    // Add security meta tags to document head
    securityMetas.forEach(meta => {
      const existingMeta = document.querySelector(`meta[http-equiv="${meta.httpEquiv}"]`);
      if (existingMeta) {
        existingMeta.setAttribute('content', meta.content);
      } else {
        const metaElement = document.createElement('meta');
        metaElement.setAttribute('http-equiv', meta.httpEquiv);
        metaElement.setAttribute('content', meta.content);
        document.head.appendChild(metaElement);
      }
    });

    // Cleanup function to remove added meta tags
    return () => {
      securityMetas.forEach(meta => {
        const metaElement = document.querySelector(`meta[http-equiv="${meta.httpEquiv}"]`);
        if (metaElement) {
          document.head.removeChild(metaElement);
        }
      });
    };
  }, []);

  return null;
};