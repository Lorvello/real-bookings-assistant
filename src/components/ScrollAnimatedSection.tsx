
import React from 'react';
import { useScrollAnimation, AnimationConfig } from '@/hooks/useScrollAnimation';

export type AnimationType = 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right';

interface ScrollAnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  animation?: AnimationType;
  config?: AnimationConfig;
  stagger?: number; // Auto-increment delay for child elements
}

const ScrollAnimatedSection: React.FC<ScrollAnimatedSectionProps> = ({ 
  children, 
  className = '', 
  delay = 0,
  as = 'section',
  animation = 'fade-up',
  config = {},
  stagger = 0
}) => {
  const { ref, isVisible } = useScrollAnimation(config);

  const Component = as as React.ElementType;

  return (
    <Component
      ref={ref}
      className={`scroll-animate-${animation} ${isVisible ? 'scroll-visible' : ''} ${className}`}
      style={{ 
        transitionDelay: `${delay}ms`,
        '--animation-delay': `${delay}ms`
      } as React.CSSProperties}
    >
      {children}
    </Component>
  );
};

export default ScrollAnimatedSection;
