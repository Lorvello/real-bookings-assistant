import { useEffect, useRef, useState } from 'react';

interface UseStaggeredScrollAnimationProps {
  threshold?: number;
  staggerDelay?: number;
  rootMargin?: string;
}

export const useStaggeredScrollAnimation = ({
  threshold = 0.25,
  staggerDelay = 150,
  rootMargin = '100px 0px 0px 0px'
}: UseStaggeredScrollAnimationProps = {}) => {
  const containerRef = useRef<HTMLElement>(null);
  const [visibleChildren, setVisibleChildren] = useState<Set<number>>(new Set());
  const observersRef = useRef<Map<Element, IntersectionObserver>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Find all direct children with data-animate attribute
    const children = Array.from(container.children).filter(child => 
      child.hasAttribute('data-animate')
    );

    children.forEach((child, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            // Add staggered delay based on index
            setTimeout(() => {
              setVisibleChildren(prev => new Set([...prev, index]));
            }, index * staggerDelay);
            
            // Unobserve after animation triggers
            observer.unobserve(child);
          }
        },
        { threshold, rootMargin }
      );

      observer.observe(child);
      observersRef.current.set(child, observer);
    });

    return () => {
      observersRef.current.forEach(observer => observer.disconnect());
      observersRef.current.clear();
    };
  }, [threshold, staggerDelay, rootMargin]);

  return { containerRef, visibleChildren };
};