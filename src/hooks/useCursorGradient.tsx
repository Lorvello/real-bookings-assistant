import { useEffect, useRef, useCallback } from 'react';

interface UseCursorGradientOptions {
  intensity?: number;
  radius?: number;
  enabled?: boolean;
}

export const useCursorGradient = ({
  intensity = 0.1,
  radius = 600,
  enabled = true
}: UseCursorGradientOptions = {}) => {
  const ref = useRef<HTMLElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current || !enabled) return;

    const rect = ref.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    ref.current.style.setProperty('--mouse-x', `${x}%`);
    ref.current.style.setProperty('--mouse-y', `${y}%`);
  }, [enabled]);

  const handleMouseEnter = useCallback(() => {
    if (!ref.current || !enabled) return;
    ref.current.classList.add('cursor-gradient-active');
  }, [enabled]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current || !enabled) return;
    ref.current.classList.remove('cursor-gradient-active');
  }, [enabled]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('mouseenter', handleMouseEnter, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseEnter, handleMouseLeave, enabled]);

  return { 
    ref, 
    className: enabled ? 'cursor-gradient' : ''
  };
};

// Hook for magnetic button effect
export const useMagneticHover = <T extends HTMLElement = HTMLElement>(strength = 0.5) => {
  const ref = useRef<T>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;

    ref.current.style.transform = `translate(${deltaX}px, ${deltaY}px) translateZ(0)`;
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = 'translate(0px, 0px) translateZ(0)';
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    element.addEventListener('mousemove', handleMouseMove, { passive: true });
    element.addEventListener('mouseleave', handleMouseLeave, { passive: true });

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseMove, handleMouseLeave]);

  return { 
    ref,
    className: 'magnetic-hover'
  };
};