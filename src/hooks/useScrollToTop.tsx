
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Don't scroll to top if coming from pricing link
    if (location.hash === '#pricing') {
      return;
    }

    // Target the main app scroll container
    const appScrollContainer = document.querySelector('[data-scroll-container]');
    if (appScrollContainer) {
      appScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);
};
