
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Find the main scroll container
    const mainScrollContainer = document.querySelector('main')?.parentElement;
    
    if (mainScrollContainer && mainScrollContainer.classList.contains('overflow-y-scroll')) {
      // Mobile: scroll the main container
      mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Desktop: scroll the window
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname]);
};
