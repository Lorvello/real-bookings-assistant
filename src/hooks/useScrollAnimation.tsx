
import { useEffect, useRef, useState } from 'react';

export interface AnimationConfig {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  forceVisible?: boolean;
}

export const useScrollAnimation = (config: AnimationConfig = {}) => {
  const { threshold = 0.05, rootMargin = '200px 0px 0px 0px', triggerOnce = true, forceVisible = false } = config;
  const ref = useRef<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !isVisible)) {
          setIsVisible(true);
          if (triggerOnce && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!entry.isIntersecting && !triggerOnce) {
          setIsVisible(false);
        }
      },
      { 
        threshold,
        rootMargin
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold, rootMargin, triggerOnce, isVisible, forceVisible]);

  return { ref, isVisible };
};
