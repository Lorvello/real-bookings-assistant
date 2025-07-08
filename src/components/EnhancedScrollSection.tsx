import React from 'react';
import { useEnhancedScrollAnimation, AnimationType } from '@/hooks/useEnhancedScrollAnimation';
import { useCursorGradient } from '@/hooks/useCursorGradient';

interface EnhancedScrollSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animationType?: AnimationType;
  as?: keyof JSX.IntrinsicElements;
  enableCursorGradient?: boolean;
  once?: boolean;
}

const EnhancedScrollSection: React.FC<EnhancedScrollSectionProps> = ({ 
  children, 
  className = '', 
  delay = 0,
  animationType = 'default',
  as = 'section',
  enableCursorGradient = false,
  once = true
}) => {
  const { ref: scrollRef, animationClass } = useEnhancedScrollAnimation({
    delay,
    animationType,
    once
  });
  
  const { ref: cursorRef, className: cursorClassName } = useCursorGradient({
    enabled: enableCursorGradient
  });

  const Component = as as React.ElementType;

  // Combine refs
  const combinedRef = React.useCallback((node: HTMLElement) => {
    if (scrollRef.current !== node) {
      scrollRef.current = node;
    }
    if (cursorRef.current !== node) {
      cursorRef.current = node;
    }
  }, [scrollRef, cursorRef]);

  return (
    <Component
      ref={combinedRef}
      className={`${animationClass} ${cursorClassName} ${className}`}
    >
      {children}
    </Component>
  );
};

export default EnhancedScrollSection;