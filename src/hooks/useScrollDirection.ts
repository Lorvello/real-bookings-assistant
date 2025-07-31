import { useState, useEffect } from 'react';

export const useScrollDirection = (threshold: number = 10) => {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    const scrollContainer = document.querySelector('[data-scroll-container]');
    if (!scrollContainer) return;

    let lastScrollY = scrollContainer.scrollTop;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = scrollContainer.scrollTop;
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
      if (scrollContainer.scrollTop === 0) {
        setIsHeaderVisible(true);
      }
    };

    scrollContainer.addEventListener('scroll', onScroll);
    scrollContainer.addEventListener('scroll', handleScrollTop);

    return () => {
      scrollContainer.removeEventListener('scroll', onScroll);
      scrollContainer.removeEventListener('scroll', handleScrollTop);
    };
  }, [threshold]);

  return { scrollDirection, isHeaderVisible };
};