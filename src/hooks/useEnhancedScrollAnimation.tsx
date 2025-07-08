import { useEffect, useRef, useState, useCallback } from 'react';

export type AnimationType = 'default' | 'stagger' | 'rotate';

interface UseEnhancedScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  animationType?: AnimationType;
  delay?: number;
  once?: boolean;
}

export const useEnhancedScrollAnimation = ({
  threshold = 0.1,
  rootMargin = '0px',
  animationType = 'default',
  delay = 0,
  once = true
}: UseEnhancedScrollAnimationOptions = {}) => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  const observerCallback = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    
    if (entry.isIntersecting && (!once || !hasAnimated)) {
      setTimeout(() => {
        setIsVisible(true);
        if (once) setHasAnimated(true);
      }, delay);
    } else if (!once && !entry.isIntersecting) {
      setIsVisible(false);
    }
  }, [delay, once, hasAnimated]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      if (element) observer.unobserve(element);
    };
  }, [threshold, rootMargin, observerCallback]);

  const getAnimationClass = () => {
    const baseClass = `scroll-animate${animationType !== 'default' ? `-${animationType}` : ''}`;
    return `${baseClass} ${isVisible ? 'visible' : ''} gpu-accelerated`;
  };

  return { ref, isVisible, animationClass: getAnimationClass() };
};

// Hook for staggered children animations
export const useStaggeredChildren = (childrenCount: number, baseDelay = 100) => {
  const [visibleChildren, setVisibleChildren] = useState<boolean[]>(
    new Array(childrenCount).fill(false)
  );

  const triggerStaggeredAnimation = useCallback(() => {
    visibleChildren.forEach((_, index) => {
      setTimeout(() => {
        setVisibleChildren(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, index * baseDelay);
    });
  }, [visibleChildren, baseDelay]);

  return { visibleChildren, triggerStaggeredAnimation };
};