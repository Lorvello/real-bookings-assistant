import { useState, useEffect } from 'react';

export const useScrollDirection = (threshold: number = 10) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const difference = Math.abs(scrollY - lastScrollY);
      
      // Only update if scroll difference exceeds threshold
      if (difference < threshold) {
        ticking = false;
        return;
      }

      if (scrollY > lastScrollY) {
        // Scrolling down
        setScrollDirection('down');
        setIsHeaderVisible(false);
      } else if (scrollY < lastScrollY) {
        // Scrolling up
        setScrollDirection('up');
        setIsHeaderVisible(true);
      }

      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    // Show header when at top of page
    const handleScrollTop = () => {
      if (window.scrollY === 0) {
        setIsHeaderVisible(true);
      }
    };

    window.addEventListener('scroll', onScroll);
    window.addEventListener('scroll', handleScrollTop);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', handleScrollTop);
    };
  }, [threshold]);

  return { scrollDirection, isHeaderVisible };
};