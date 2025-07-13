import React, { cloneElement, isValidElement } from 'react';
import { useStaggeredScrollAnimation } from '@/hooks/useStaggeredScrollAnimation';

interface StaggeredAnimationContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
  as?: keyof JSX.IntrinsicElements;
  variant?: 'default' | 'hero' | 'process' | 'features';
}

const StaggeredAnimationContainer: React.FC<StaggeredAnimationContainerProps> = ({
  children,
  className = '',
  staggerDelay = 200,
  threshold = 0.1,
  as = 'div',
  variant = 'default'
}) => {
  const { containerRef, visibleChildren } = useStaggeredScrollAnimation({
    threshold,
    staggerDelay,
    rootMargin: '50px 0px -50px 0px'
  });

  const Component = as as React.ElementType;

  // Add data-animate attribute and animation classes to children
  const animatedChildren = React.Children.map(children, (child, index) => {
    if (isValidElement(child)) {
      const isVisible = visibleChildren.has(index);
      
      return cloneElement(child, {
        ...child.props,
        'data-animate': true,
        className: `${child.props.className || ''} scroll-animate-stagger ${variant} ${
          isVisible ? 'visible' : ''
        }`.trim(),
        style: {
          ...child.props.style,
          transitionDelay: `${index * 30}ms` // Optimized fine-tuning delay for faster flow
        }
      });
    }
    return child;
  });

  return (
    <Component ref={containerRef} className={className}>
      {animatedChildren}
    </Component>
  );
};

export default StaggeredAnimationContainer;