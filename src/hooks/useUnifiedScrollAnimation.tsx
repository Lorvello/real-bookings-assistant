import { useEffect, useRef, useState, useCallback } from 'react';

interface UnifiedScrollAnimationConfig {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  staggerDelay?: number;
  enableStagger?: boolean;
}

// Shared IntersectionObserver pool to reduce observer instances
class ObserverPool {
  private observers: Map<string, IntersectionObserver> = new Map();
  private callbacks: Map<Element, Set<(isVisible: boolean) => void>> = new Map();

  getObserver(config: IntersectionObserverInit): IntersectionObserver {
    const key = JSON.stringify(config);
    
    if (!this.observers.has(key)) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const callbacks = this.callbacks.get(entry.target);
            if (callbacks) {
              callbacks.forEach(cb => cb(entry.isIntersecting));
            }
          });
        },
        config
      );
      this.observers.set(key, observer);
    }
    
    return this.observers.get(key)!;
  }

  observe(
    element: Element,
    config: IntersectionObserverInit,
    callback: (isVisible: boolean) => void
  ) {
    const observer = this.getObserver(config);
    
    if (!this.callbacks.has(element)) {
      this.callbacks.set(element, new Set());
    }
    this.callbacks.get(element)!.add(callback);
    
    observer.observe(element);
  }

  unobserve(element: Element, callback: (isVisible: boolean) => void) {
    const callbacks = this.callbacks.get(element);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.callbacks.delete(element);
        // Find and unobserve from all observers
        this.observers.forEach(observer => observer.unobserve(element));
      }
    }
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.callbacks.clear();
  }
}

const observerPool = new ObserverPool();

// Unified scroll animation hook
export const useUnifiedScrollAnimation = (config: UnifiedScrollAnimationConfig = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '100px 0px 0px 0px',
    triggerOnce = true,
    staggerDelay = 0,
    enableStagger = false
  } = config;

  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [visibleChildren, setVisibleChildren] = useState<Set<number>>(new Set());
  const hasTriggered = useRef(false);

  const handleIntersection = useCallback((isIntersecting: boolean) => {
    if (isIntersecting && (!triggerOnce || !hasTriggered.current)) {
      requestAnimationFrame(() => {
        setIsVisible(true);
        hasTriggered.current = true;
      });
    } else if (!isIntersecting && !triggerOnce) {
      requestAnimationFrame(() => {
        setIsVisible(false);
      });
    }
  }, [triggerOnce]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observerConfig: IntersectionObserverInit = { threshold, rootMargin };
    
    observerPool.observe(element, observerConfig, handleIntersection);

    return () => {
      observerPool.unobserve(element, handleIntersection);
    };
  }, [threshold, rootMargin, handleIntersection]);

  // Staggered children animation
  useEffect(() => {
    if (!enableStagger || !ref.current || !isVisible) return;

    const children = Array.from(ref.current.children).filter(child =>
      child.hasAttribute('data-animate')
    );

    children.forEach((child, index) => {
      setTimeout(() => {
        setVisibleChildren(prev => new Set([...prev, index]));
      }, index * staggerDelay);
    });
  }, [isVisible, staggerDelay, enableStagger]);

  return { ref, isVisible, visibleChildren };
};

// Cleanup on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    observerPool.disconnect();
  });
}
