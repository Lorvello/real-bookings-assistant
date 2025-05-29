
import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ScrollAnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}

const ScrollAnimatedSection: React.FC<ScrollAnimatedSectionProps> = ({ 
  children, 
  className = '', 
  delay = 0,
  as = 'section'
}) => {
  const { ref, isVisible } = useScrollAnimation(0.1);

  const Component = as as React.ElementType;

  return (
    <Component
      ref={ref}
      className={`scroll-animate ${isVisible ? 'visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Component>
  );
};

export default ScrollAnimatedSection;
